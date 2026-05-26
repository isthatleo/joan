import { NextRequest, NextResponse } from "next/server";
import { getGuardianLabResultById, resolveGuardianPortalContext } from "@/lib/guardian-portal/data";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const context = await resolveGuardianPortalContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  const result = await getGuardianLabResultById(context.context, id);
  if (!result) return NextResponse.json({ error: "Lab result not found" }, { status: 404 });
  if (!result.patientPortalEligible) return NextResponse.json({ error: "Payment is required before downloading this result" }, { status: 403 });
  const resultLines = Array.isArray(result.resultData)
    ? result.resultData.map((entry: any) => `<tr><td style="padding:8px;border:1px solid #ddd;">${entry?.name || "Result"}</td><td style="padding:8px;border:1px solid #ddd;">${entry?.value || "-"}</td><td style="padding:8px;border:1px solid #ddd;">${entry?.unit || ""}</td><td style="padding:8px;border:1px solid #ddd;">${entry?.referenceRange || ""}</td></tr>`).join("")
    : `<tr><td colspan="4" style="padding:8px;border:1px solid #ddd;">${JSON.stringify(result.resultData || {}, null, 2)}</td></tr>`;
  const html = `<!doctype html><html><head><meta charset="utf-8" /><title>${result.testName}</title></head><body style="font-family:Arial,sans-serif;padding:32px;color:#111;"><div style="max-width:900px;margin:0 auto;border:2px solid #111;padding:24px;"><div style="display:flex;justify-content:space-between;align-items:flex-start;"><div><h1 style="margin:0;">${context.context.tenantName}</h1><p style="margin:4px 0 0;">Electronic Laboratory Result</p></div><div style="text-align:right;"><div style="font-weight:700;border:2px solid #111;padding:8px 12px;display:inline-block;">E-STAMP VERIFIED</div><p style="margin:8px 0 0;">Generated ${new Date().toLocaleString()}</p></div></div><hr style="margin:24px 0;" /><h2 style="margin:0 0 8px;">${result.childName}</h2><p style="margin:0 0 4px;">Test: ${result.testName}</p><p style="margin:0 0 4px;">Category: ${result.category}</p><p style="margin:0 0 16px;">Ordered: ${result.orderedAt || "-"} | Completed: ${result.completedAt || "-"}</p><table style="width:100%;border-collapse:collapse;"><thead><tr><th style="padding:8px;border:1px solid #ddd;text-align:left;">Finding</th><th style="padding:8px;border:1px solid #ddd;text-align:left;">Value</th><th style="padding:8px;border:1px solid #ddd;text-align:left;">Unit</th><th style="padding:8px;border:1px solid #ddd;text-align:left;">Reference</th></tr></thead><tbody>${resultLines}</tbody></table><p style="margin-top:16px;">Notes: ${result.notes || "None"}</p></div></body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Disposition": `attachment; filename="guardian-lab-result-${result.id}.html"` } });
}
