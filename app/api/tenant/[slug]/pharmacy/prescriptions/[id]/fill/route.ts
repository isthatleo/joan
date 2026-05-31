import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import { auditLogs, prescriptions } from "@/lib/db/schema";
import { requireTenantAdmin } from "@/lib/tenant-staff";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  try {
    const { slug, id } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const [updated] = await db
      .update(prescriptions)
      .set({ status: "filled", filledAt: new Date(), updatedAt: new Date() })
      .where(and(eq(prescriptions.id, id), eq(prescriptions.tenantId, tenantId), isNull(prescriptions.deletedAt)))
      .returning({ id: prescriptions.id, status: prescriptions.status, filledAt: prescriptions.filledAt });

    if (!updated) return NextResponse.json({ error: "Prescription not found" }, { status: 404 });

    await db.insert(auditLogs).values({
      tenantId,
      userId: admin.user?.id || null,
      action: "pharmacy.prescription_filled",
      entity: "prescription",
      entityId: id,
      metadata: { source: "tenant pharmacy fill endpoint" },
    });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      filledAt: updated.filledAt?.toISOString?.() || updated.filledAt,
      message: "Prescription filled successfully",
    });
  } catch (error) {
    console.error("Error filling prescription:", error);
    return NextResponse.json({ error: "Failed to fill prescription" }, { status: 500 });
  }
}
