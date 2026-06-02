import { NextRequest, NextResponse } from "next/server";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { getPharmacySettings, listDrugInteractions, saveInteractions } from "@/lib/pharmacy/data";
import { requirePharmacistOrAdmin } from "@/lib/tenant-staff"; // Changed import to requirePharmacistOrAdmin

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function requireAdminTenant(headers: Headers, slug: string) {
  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) return { ok: false as const, status: 404, error: "Tenant not found" };
  const authCheck = await requirePharmacistOrAdmin(headers, tenantId); // Changed to requirePharmacistOrAdmin
  if (!authCheck.ok) return { ok: false as const, status: authCheck.status, error: authCheck.error };
  return { ok: true as const, tenantId, user: authCheck.user }; // Pass user from authCheck
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const context = await requireAdminTenant(request.headers, slug);
    if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

    const data = await listDrugInteractions(context.tenantId);
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Error fetching tenant drug interactions:", error);
    return NextResponse.json({ error: "Failed to fetch drug interactions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const context = await requireAdminTenant(request.headers, slug);
    if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

    const body = await request.json().catch(() => ({}));
    if (!body.medicationA || !body.medicationB || !body.effect || !body.recommendation) {
      return NextResponse.json({ error: "Medication pair, effect, and recommendation are required" }, { status: 400 });
    }

    const settings = await getPharmacySettings(context.tenantId);
    const interactions = [
      {
        id: body.id || crypto.randomUUID(),
        medicationA: String(body.medicationA).trim(),
        medicationB: String(body.medicationB).trim(),
        severity: body.severity || "moderate",
        effect: String(body.effect).trim(),
        recommendation: String(body.recommendation).trim(),
        source: body.source || "Hospital admin",
        active: body.active !== false,
        createdAt: body.createdAt || new Date().toISOString(),
      },
      ...settings.interactions.filter((item) => item.id !== body.id),
    ];

    await saveInteractions(context.tenantId, interactions, context.user?.id || null); // Use user from context
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving tenant drug interaction:", error);
    return NextResponse.json({ error: "Failed to save drug interaction" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const context = await requireAdminTenant(request.headers, slug);
    if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

    const body = await request.json().catch(() => ({}));
    const settings = await getPharmacySettings(context.tenantId);
    await saveInteractions(
      context.tenantId,
      settings.interactions.filter((item) => item.id !== body.id),
      context.user?.id || null, // Use user from context
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tenant drug interaction:", error);
    return NextResponse.json({ error: "Failed to delete drug interaction" }, { status: 500 });
  }
}