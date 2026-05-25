import { NextRequest, NextResponse } from "next/server";
import { listPatientsForPharmacy } from "@/lib/pharmacy/data";
import { resolvePharmacyContext } from "@/lib/pharmacy/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const context = await resolvePharmacyContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

  const patients = await listPatientsForPharmacy(context.pharmacist.tenantId);
  return NextResponse.json({ patients }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
