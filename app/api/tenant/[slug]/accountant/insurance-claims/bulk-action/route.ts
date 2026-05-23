import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import { claims } from "@/lib/db/schema";
import { claimBulkActionSchema } from "@/lib/accountant/route-schemas";
import { parseJsonBody, validateFinancePayload } from "@/lib/accountant/finance-api";

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
    const parsed = validateFinancePayload(claimBulkActionSchema, jsonResult.data);
    if (!parsed.ok) return parsed.response;

    const nextStatus = parsed.data.action === "mark_under_review" ? "under_review" : "submitted";
    await db
      .update(claims)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(
        and(
          eq(claims.tenantId, tenantId),
          isNull(claims.deletedAt),
          inArray(claims.id, parsed.data.claimIds)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to apply claim bulk action:", error);
    return NextResponse.json({ error: "Failed to apply claim bulk action" }, { status: 500 });
  }
}
