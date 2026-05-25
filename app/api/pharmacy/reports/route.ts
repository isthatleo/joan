import { NextRequest, NextResponse } from "next/server";
import { buildPharmacyReports, getPharmacySettings, listPharmacyAnalytics, saveReportRuns } from "@/lib/pharmacy/data";
import { resolvePharmacyContext } from "@/lib/pharmacy/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const context = await resolvePharmacyContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

  const reports = await buildPharmacyReports(context.pharmacist.tenantId);
  return NextResponse.json(reports, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const context = await resolvePharmacyContext(request.headers, body.slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

  const reports = await buildPharmacyReports(context.pharmacist.tenantId);
  const analytics = await listPharmacyAnalytics(context.pharmacist.tenantId);
  const template = reports.templates.find((item) => item.id === body.template) || reports.templates[0];
  const run = {
    id: crypto.randomUUID(),
    template: template.id,
    format: body.format || "pdf",
    generatedAt: new Date().toISOString(),
    generatedBy: context.pharmacist.fullName || context.pharmacist.email,
    title: template.name,
  };
  const settings = await getPharmacySettings(context.pharmacist.tenantId);
  await saveReportRuns(context.pharmacist.tenantId, [...settings.reportRuns, run].slice(-20), context.pharmacist.id);
  return NextResponse.json({ run, template, preview: reports.preview, analytics });
}
