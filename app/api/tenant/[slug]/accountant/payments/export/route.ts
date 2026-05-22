import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fileResponse, getTenantIdBySlug, toCsv } from "@/lib/accountant/server";

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

    const ids = new URL(request.url).searchParams.get("ids")?.split(",").filter(Boolean) ?? [];
    const rows = await db.$queryRaw`
      SELECT id, invoice_id, amount, method, status, created_at
      FROM payments
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
    `;
    const filteredRows = ids.length ? (rows as any[]).filter((row) => ids.includes(String(row.id))) : (rows as any[]);

    const csv = toCsv([
      ["Payment ID", "Invoice ID", "Amount", "Method", "Status", "Created At"],
      ...filteredRows.map((row) => [row.id, row.invoice_id, row.amount, row.method, row.status, row.created_at]),
    ]);
    return fileResponse(csv, "payments.csv", "text/csv");
  } catch (error) {
    console.error("Error exporting payments:", error);
    return NextResponse.json({ error: "Failed to export payments" }, { status: 500 });
  }
}
