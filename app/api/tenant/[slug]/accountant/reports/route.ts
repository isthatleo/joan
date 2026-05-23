import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { listGeneratedReports } from "@/lib/accountant/report-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const rows = await listGeneratedReports(tenantId);
    return NextResponse.json(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        description: row.description || "",
        createdAt: row.createdAt,
        lastGenerated: row.generatedAt,
        status: row.status,
        format: row.format,
        size: row.size || "N/A",
        downloadUrl: row.downloadUrl || undefined,
      }))
    );
  } catch (error) {
    console.error("Failed to fetch reports:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}
