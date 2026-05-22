import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fileResponse, getTenantIdBySlug, toCsv } from "@/lib/accountant/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { slug } = await params;
  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) {
    return new Response(JSON.stringify({ error: "Tenant not found" }), { status: 404 });
  }

  const rows = await db.$queryRaw`
    SELECT created_at, amount, method, status
    FROM payments
    WHERE tenant_id = ${tenantId}
    ORDER BY created_at DESC
  `;

  return fileResponse(
    toCsv([
      ["Created At", "Amount", "Method", "Status"],
      ...(rows as any[]).map((row) => [row.created_at, row.amount, row.method, row.status]),
    ]),
    "revenue-report.csv",
    "text/csv"
  );
}
