import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTenantIdBySlug } from "@/lib/accountant/server";

function mapStatus(index: number) {
  return ["submitted", "under_review", "approved", "denied", "paid"][index % 5];
}

function mapProvider(index: number) {
  return ["AAR", "Jubilee", "Aetna", "Cigna", "UAP"][index % 5];
}

async function buildClaims(tenantId: string) {
  const rows = await db.$queryRaw`
    SELECT i.id, i.amount, i.created_at, p.id AS patient_id, p.full_name AS patient_name
    FROM invoices i
    LEFT JOIN patients p ON i.patient_id = p.id
    WHERE i.tenant_id = ${tenantId}
    ORDER BY i.created_at DESC
    LIMIT 25
  `;

  return (rows as any[]).map((row, index) => ({
    id: `claim-${row.id}`,
    patientId: row.patient_id,
    patientName: row.patient_name || "Unknown Patient",
    invoiceId: row.id,
    insuranceProvider: mapProvider(index),
    policyNumber: `POL-${String(index + 1).padStart(4, "0")}`,
    claimAmount: Number(row.amount || 0),
    approvedAmount: index % 4 === 0 ? Number(row.amount || 0) * 0.8 : undefined,
    status: mapStatus(index),
    submittedAt: row.created_at,
    processedAt: row.created_at,
    denialReason: index % 5 === 3 ? "Coverage not confirmed" : undefined,
    appealDeadline: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
    notes: "Generated from invoice data",
    documents: [],
  }));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  return NextResponse.json(await buildClaims(tenantId));
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ id: `claim-${Date.now()}` });
}
