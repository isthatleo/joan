import { NextRequest, NextResponse } from "next/server";
import { getLabCatalog } from "@/lib/lab/catalog";
import { resolveLabContext } from "@/lib/lab/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const context = await resolveLabContext(request.headers, slug);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  try {
    const tests = await getLabCatalog(context.technician.tenantId);
    return NextResponse.json({ tests });
  } catch (error) {
    console.error("Failed to fetch lab test catalog:", error);
    return NextResponse.json({ error: "Failed to fetch lab test catalog" }, { status: 500 });
  }
}
