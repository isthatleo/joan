import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import { claims } from "@/lib/db/schema";
import { appealSchema } from "@/lib/accountant/route-schemas";
import { parseJsonBody, validateFinancePayload } from "@/lib/accountant/finance-api";

export async function POST(
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
    const parsed = validateFinancePayload(appealSchema, jsonResult.data);
    if (!parsed.ok) return parsed.response;

    const [updated] = await db
      .update(claims)
      .set({
        status: "appealed",
        notes: parsed.data.reason,
        appealDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      })
      .where(and(eq(claims.id, id), eq(claims.tenantId, tenantId), isNull(claims.deletedAt)))
      .returning({ id: claims.id });

    if (!updated) {
      return NextResponse.json({ error: "Insurance claim not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to submit claim appeal:", error);
    return NextResponse.json({ error: "Failed to submit claim appeal" }, { status: 500 });
  }
}
