import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { fileResponse, toCsv, getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    const ids = new URL(request.url).searchParams.get("ids")?.split(",").filter(Boolean) ?? [];

    const rows = await db.execute(sql`
      SELECT
        c.id,
        p.full_name AS patient_name,
        ip.provider AS insurance_provider,
        ip.policy_number,
        c.claim_amount,
        c.approved_amount,
        c.status,
        c.submitted_at
      FROM claims c
      LEFT JOIN insurance_policies ip ON c.policy_id = ip.id
      LEFT JOIN invoices i ON c.invoice_id = i.id
      LEFT JOIN patients p ON COALESCE(i.patient_id, ip.patient_id) = p.id
      WHERE c.tenant_id = ${tenantId}
        AND c.deleted_at IS NULL
      ORDER BY c.submitted_at DESC
    `);
    const filteredRows = ids.length ? rows.rows.filter((row: any) => ids.includes(String(row.id))) : rows.rows;

    const csv = toCsv([
      ["Claim ID", "Patient", "Provider", "Policy", "Claim Amount", "Approved Amount", "Status", "Submitted At"],
      ...filteredRows.map((row: any) => [
        row.id,
        row.patient_name,
        row.insurance_provider,
        row.policy_number,
        row.claim_amount,
        row.approved_amount,
        row.status,
        row.submitted_at,
      ]),
    ]);

    return fileResponse(csv, "insurance-claims.csv", "text/csv");
  } catch (error) {
    console.error("Failed to export insurance claims:", error);
    return NextResponse.json({ error: "Failed to export insurance claims" }, { status: 500 });
  }
}
