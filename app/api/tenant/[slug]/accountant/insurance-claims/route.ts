import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import { claims } from "@/lib/db/schema";
import { parseJsonBody, validateFinancePayload } from "@/lib/accountant/finance-api";
import { claimCreateSchema } from "@/lib/accountant/route-schemas";
import { createClaimRecord, findOrCreateInsurancePolicy } from "@/lib/accountant/claims-service";

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
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug } = await params;
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
        AND c.deleted_at IS NULL
      ORDER BY COALESCE(c.submitted_at, c.created_at) DESC
    `);

    return NextResponse.json(result.rows.map(formatClaimRow));
  } catch (error) {
    console.error("Failed to fetch insurance claims:", error);
    return NextResponse.json({ error: "Failed to fetch insurance claims" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const jsonResult = await parseJsonBody(request);
    if (!jsonResult.ok) return jsonResult.response;

    const parsed = validateFinancePayload(claimCreateSchema, jsonResult.data);
    if (!parsed.ok) return parsed.response;

    const policy = await findOrCreateInsurancePolicy(
      tenantId,
      parsed.data.patientId,
      parsed.data.insuranceProvider,
      parsed.data.policyNumber
    );

    const created = await createClaimRecord({
      tenantId,
      invoiceId: parsed.data.invoiceId ?? null,
      policyId: policy.id,
      status: parsed.data.status,
      claimAmount: parsed.data.claimAmount,
      approvedAmount: parsed.data.approvedAmount ?? null,
      submittedAt: parsed.data.submittedAt ? new Date(parsed.data.submittedAt) : new Date(),
      processedAt: parsed.data.processedAt ? new Date(parsed.data.processedAt) : null,
      denialReason: parsed.data.denialReason ?? null,
      appealDeadline: parsed.data.appealDeadline ? new Date(parsed.data.appealDeadline) : null,
      notes: parsed.data.notes ?? null,
      documents: parsed.data.documents ?? [],
    });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    console.error("Failed to create insurance claim:", error);
    return NextResponse.json({ error: "Failed to create insurance claim" }, { status: 500 });
  }
}
