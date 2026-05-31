import { NextRequest, NextResponse } from "next/server";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { requireTenantAdmin } from "@/lib/tenant-staff";
import { getPharmacyData } from "../route";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const data = await getPharmacyData(tenantId, request);
    const queue = data.prescriptions.map((item: any) => ({
      id: item.id,
      prescriptionId: item.id,
      patientName: item.patientName,
      patientId: item.patientId,
      medications: item.medications,
      status: item.status,
      priority: item.priority,
      createdAt: item.prescribedAt,
      completedAt: item.filledAt,
    }));

    return NextResponse.json(status === "all" ? queue : queue.filter((item: any) => item.status === status), {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Error fetching dispensing queue:", error);
    return NextResponse.json({ error: "Failed to fetch dispensing queue" }, { status: 500 });
  }
}
