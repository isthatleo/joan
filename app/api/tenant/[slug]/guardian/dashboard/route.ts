import { NextRequest, NextResponse } from "next/server";
import { getGuardianDashboardData, resolveGuardianPortalContext } from "@/lib/guardian-portal/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const context = await resolveGuardianPortalContext(request.headers, slug);
    if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
    return NextResponse.json(await getGuardianDashboardData(context.context), {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load guardian dashboard";
    console.error("Guardian dashboard route error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
