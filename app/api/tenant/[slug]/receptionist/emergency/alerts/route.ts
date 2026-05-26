import { NextRequest, NextResponse } from "next/server";
import { createEmergencyAlert, getEmergencyAlerts, getTenantBySlug } from "@/lib/receptionist/data";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    const alerts = await getEmergencyAlerts(tenant.id);
    return NextResponse.json(alerts);
  } catch (error) {
    console.error("Failed to fetch emergency alerts:", error);
    return NextResponse.json({ error: "Failed to fetch emergency alerts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    const payload = await request.json();
    const alert = await createEmergencyAlert(tenant.id, payload);
    return NextResponse.json(alert);
  } catch (error) {
    console.error("Failed to create emergency alert:", error);
    return NextResponse.json({ error: "Failed to create emergency alert" }, { status: 500 });
  }
}
