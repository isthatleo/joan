import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import { claims } from "@/lib/db/schema";
import { parseJsonBody, validateFinancePayload } from "@/lib/accountant/finance-api";
import { claimUpdateSchema } from "@/lib/accountant/route-schemas";
import { findOrCreateInsurancePolicy } from "@/lib/accountant/claims-service";

function formatClaimRow(row: any) {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name || "Unknown Patient",
    invoiceId: row.invoice_id,
    insuranceProvider: row.insurance_provider || "Unspecified",
    policyNumber: row.policy_number || "",
    claimAmount: Number(row.claim_amount || 0),
    approvedAmount: row.approved_amount != null ? Number(row.approved_amount) : undefined,
    status: row.status,
    submittedAt: row.submitted_at || row.created_at,
    processedAt: row.processed_at || undefined,
    denialReason: row.denial_reason || undefined,
    appealDeadline: row.appeal_deadline || undefined,
    notes: row.notes || "",
    documents: Array.isArray(row.documents) ? row.documents : [],
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug, id } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

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
        p.id AS patient_id,
        p.full_name AS patient_name,
        ip.provider AS insurance_provider,
        ip.policy_number
      FROM claims c
      LEFT JOIN insurance_policies ip ON c.policy_id = ip.id
      LEFT JOIN invoices i ON c.invoice_id = i.id
      LEFT JOIN patients p ON COALESCE(i.patient_id, ip.patient_id) = p.id
      WHERE c.tenant_id = ${tenantId}
        AND c.id = ${id}
        AND c.deleted_at IS NULL
      LIMIT 1
    `);

    const claim = result.rows[0];
    if (!claim) return NextResponse.json({ error: "Insurance claim not found" }, { status: 404 });

    return NextResponse.json(formatClaimRow(claim));
  } catch (error) {
    console.error("Failed to fetch insurance claim:", error);
    return NextResponse.json({ error: "Failed to fetch insurance claim" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug, id } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const jsonResult = await parseJsonBody(request);
    if (!jsonResult.ok) return jsonResult.response;

    const parsed = validateFinancePayload(claimUpdateSchema, jsonResult.data);
    if (!parsed.ok) return parsed.response;

    let policyId: string | undefined;
    if (parsed.data.patientId && parsed.data.insuranceProvider && parsed.data.policyNumber) {
      const policy = await findOrCreateInsurancePolicy(
        tenantId,
        parsed.data.patientId,
        parsed.data.insuranceProvider,
        parsed.data.policyNumber
      );
      policyId = policy.id;
    }

    const [updated] = await db
      .update(claims)
      .set({
        invoiceId: parsed.data.invoiceId ?? undefined,
        policyId,
        status: parsed.data.status,
        claimAmount: parsed.data.claimAmount,
        approvedAmount: parsed.data.approvedAmount,
        submittedAt: parsed.data.submittedAt ? new Date(parsed.data.submittedAt) : undefined,
        processedAt: parsed.data.processedAt ? new Date(parsed.data.processedAt) : undefined,
        denialReason: parsed.data.denialReason,
        appealDeadline: parsed.data.appealDeadline ? new Date(parsed.data.appealDeadline) : undefined,
        notes: parsed.data.notes,
        documents: parsed.data.documents,
        updatedAt: new Date(),
      })
      .where(and(eq(claims.id, id), eq(claims.tenantId, tenantId), isNull(claims.deletedAt)))
      .returning({ id: claims.id });

    if (!updated) {
      return NextResponse.json({ error: "Insurance claim not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update insurance claim:", error);
    return NextResponse.json({ error: "Failed to update insurance claim" }, { status: 500 });
  }
}
