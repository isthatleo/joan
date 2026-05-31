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

    const data = await getPharmacyData(tenantId, request);
    const activities = [
      ...data.prescriptions.slice(0, 15).map((item: any) => ({
        id: `rx-${item.id}`,
        type: "prescription",
        title: `Prescription ${item.status}`,
        description: `${item.medication || "Medication"} for ${item.patientName}`,
        timestamp: item.filledAt || item.prescribedAt || new Date().toISOString(),
      })),
      ...data.notifications.map((item: any) => ({
        id: `notification-${item.id}`,
        type: "notification",
        title: item.title,
        description: item.message,
        timestamp: item.createdAt,
      })),
    ].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

    return NextResponse.json(activities.slice(0, 20), { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Error fetching pharmacy activities:", error);
    return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 });
  }
}
