import { NextRequest, NextResponse } from "next/server";
import { getPatientDashboardData, resolvePatientPortalContext } from "@/lib/patient-portal/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const context = await resolvePatientPortalContext(request.headers, slug);
    if (!context.ok) {
      return NextResponse.json({ error: context.error }, { status: context.status });
    }

    const data = await getPatientDashboardData(context.context);
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load patient dashboard";
    console.error("Patient dashboard route error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
