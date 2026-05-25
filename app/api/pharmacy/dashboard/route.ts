import { NextRequest, NextResponse } from "next/server";
import { buildPharmacyDashboard } from "@/lib/pharmacy/data";
import { resolvePharmacyContext } from "@/lib/pharmacy/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const context = await resolvePharmacyContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

  try {
    const dashboard = await buildPharmacyDashboard(context.pharmacist.tenantId, context.pharmacist.id);
    return NextResponse.json(dashboard, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Failed to load pharmacy dashboard:", error);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
