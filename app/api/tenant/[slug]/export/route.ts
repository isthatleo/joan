import { NextRequest, NextResponse } from "next/server";
import { buildTenantDataExport } from "@/lib/tenant-data-export";
import { getTenantAccess, tenantAccessResponse } from "@/lib/api/tenant-access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const access = await getTenantAccess(request, slug);
    if (!access.ok) return tenantAccessResponse(access);
    if (!access.canEditSettings && !access.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!access.tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { filename, zip } = await buildTenantDataExport(access.tenant.id);
    return new NextResponse(zip, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("[tenant-export]", error);
    return NextResponse.json(
      { error: "Failed to export tenant data", details: error?.message },
      { status: 500 },
    );
  }
}
