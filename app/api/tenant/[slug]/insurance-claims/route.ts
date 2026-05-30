import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import { requireTenantAdmin } from "@/lib/tenant-staff";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function money(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function iso(value: unknown) {
  if (!value) return "";
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function normalizeStatus(value: unknown) {
  return String(value || "submitted").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function claimNumber(id: string, submittedAt: string) {
  const year = submittedAt ? new Date(submittedAt).getFullYear() : new Date().getFullYear();
  return `CLM-${year}-${id.slice(0, 8).toUpperCase()}`;
}

function monthKey(value: string) {
  const date = value ? new Date(value) : new Date();
  return date.toLocaleString("en-US", { month: "short" });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const result = await db.execute(sql`
      SELECT
        c.id,
        c.invoice_id,
        c.status,
        c.claim_amount,
        c.approved_amount,
        c.submitted_at,
        c.processed_at,
        c.denial_reason,
        c.appeal_deadline,
        c.notes,
        c.documents,
        c.created_at,
        p.id AS patient_id,
        p.full_name AS patient_name,
        p.mrn AS patient_mrn,
        p.phone AS patient_phone,
        p.email AS patient_email,
        ip.provider AS insurance_provider,
        ip.policy_number,
        i.invoice_number,
        i.description AS invoice_description,
        i.total_amount AS invoice_total,
        i.amount_due AS invoice_due,
        i.status AS invoice_status
      FROM claims c
      LEFT JOIN insurance_policies ip ON c.policy_id = ip.id
      LEFT JOIN invoices i ON c.invoice_id = i.id
      LEFT JOIN patients p ON COALESCE(i.patient_id, ip.patient_id) = p.id
      WHERE c.tenant_id = ${tenantId}
        AND c.deleted_at IS NULL
      ORDER BY COALESCE(c.submitted_at, c.created_at) DESC
    `);

    const claims = result.rows.map((row: any) => {
      const submittedAt = iso(row.submitted_at || row.created_at);
      const claimAmount = money(row.claim_amount);
      const approvedAmount = money(row.approved_amount);
      const status = normalizeStatus(row.status);

      return {
        id: row.id,
        claimNumber: claimNumber(row.id, submittedAt),
        invoiceId: row.invoice_id || "",
        invoiceNumber: row.invoice_number || "",
        patient: {
          id: row.patient_id || "",
          name: row.patient_name || "Unknown patient",
          mrn: row.patient_mrn || "",
          phone: row.patient_phone || "",
          email: row.patient_email || "",
        },
        provider: row.insurance_provider || "Unspecified provider",
        policyNumber: row.policy_number || "",
        service: {
          type: row.invoice_description || "Insurance claim",
          description: row.notes || row.invoice_description || "No service description recorded.",
          billedAmount: money(row.invoice_total) || claimAmount,
          amountDue: money(row.invoice_due),
          invoiceStatus: row.invoice_status || "",
        },
        claimAmount,
        approvedAmount,
        status,
        submittedAt,
        processedAt: iso(row.processed_at),
        denialReason: row.denial_reason || "",
        appealDeadline: iso(row.appeal_deadline),
        notes: row.notes || "",
        documents: Array.isArray(row.documents) ? row.documents : [],
        ageDays: Math.max(0, Math.floor((Date.now() - new Date(submittedAt || Date.now()).getTime()) / 86400000)),
      };
    });

    const approved = claims.filter((claim) => ["approved", "paid"].includes(claim.status));
    const denied = claims.filter((claim) => claim.status === "denied");
    const pending = claims.filter((claim) => ["submitted", "under_review", "appealed", "pending"].includes(claim.status));
    const totalClaimed = claims.reduce((sum, claim) => sum + claim.claimAmount, 0);
    const totalApproved = claims.reduce((sum, claim) => sum + claim.approvedAmount, 0);
    const processedClaims = claims.filter((claim) => claim.processedAt);
    const avgProcessingDays = processedClaims.length
      ? Math.round(processedClaims.reduce((sum, claim) => sum + Math.max(0, (new Date(claim.processedAt).getTime() - new Date(claim.submittedAt).getTime()) / 86400000), 0) / processedClaims.length)
      : 0;

    const providerMap = new Map<string, { provider: string; claims: number; approved: number; denied: number; pending: number; claimed: number; approvedAmount: number }>();
    for (const claim of claims) {
      const entry = providerMap.get(claim.provider) || { provider: claim.provider, claims: 0, approved: 0, denied: 0, pending: 0, claimed: 0, approvedAmount: 0 };
      entry.claims += 1;
      entry.claimed += claim.claimAmount;
      entry.approvedAmount += claim.approvedAmount;
      if (["approved", "paid"].includes(claim.status)) entry.approved += 1;
      if (claim.status === "denied") entry.denied += 1;
      if (["submitted", "under_review", "appealed", "pending"].includes(claim.status)) entry.pending += 1;
      providerMap.set(claim.provider, entry);
    }

    const monthlyLabels = Array.from({ length: 6 }).map((_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));
      return date.toLocaleString("en-US", { month: "short" });
    });
    const trends = monthlyLabels.map((label) => {
      const monthlyClaims = claims.filter((claim) => monthKey(claim.submittedAt) === label);
      return {
        label,
        submitted: monthlyClaims.length,
        approved: monthlyClaims.filter((claim) => ["approved", "paid"].includes(claim.status)).length,
        claimed: monthlyClaims.reduce((sum, claim) => sum + claim.claimAmount, 0),
      };
    });

    return NextResponse.json({
      claims,
      stats: {
        totalClaims: claims.length,
        approvedClaims: approved.length,
        deniedClaims: denied.length,
        pendingClaims: pending.length,
        totalClaimed,
        totalApproved,
        outstandingAmount: Math.max(0, totalClaimed - totalApproved),
        approvalRate: claims.length ? Math.round((approved.length / claims.length) * 100) : 0,
        denialRate: claims.length ? Math.round((denied.length / claims.length) * 100) : 0,
        averageProcessingDays: avgProcessingDays,
        averageClaimValue: claims.length ? totalClaimed / claims.length : 0,
      },
      providers: Array.from(providerMap.values())
        .map((provider) => ({
          ...provider,
          approvalRate: provider.claims ? Math.round((provider.approved / provider.claims) * 100) : 0,
        }))
        .sort((a, b) => b.claims - a.claims),
      trends,
      aging: {
        under7: claims.filter((claim) => claim.ageDays < 7).length,
        days7to30: claims.filter((claim) => claim.ageDays >= 7 && claim.ageDays <= 30).length,
        over30: claims.filter((claim) => claim.ageDays > 30).length,
      },
      attention: claims
        .filter((claim) => claim.status === "denied" || claim.ageDays > 30 || claim.appealDeadline)
        .slice(0, 8),
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Error fetching insurance claims:", error);
    return NextResponse.json({ error: "Failed to fetch insurance claims" }, { status: 500 });
  }
}
