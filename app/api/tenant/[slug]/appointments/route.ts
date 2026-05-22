import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { AppointmentService } from "@/lib/services/appointment.service";
import { eq } from "drizzle-orm";

const service = new AppointmentService();

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const resolvedParams = await params;
    const slug = resolvedParams.slug;
    console.log(`[API] Fetching appointments for slug: ${slug}`);

    if (!slug) {
      console.warn("[API] Tenant slug is missing.");
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);

    if (!tenant) {
      console.warn(`[API] Tenant not found for slug: ${slug}`);
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    console.log(`[API] Found tenant: ${tenant.name} (${tenant.id}). Fetching appointments...`);
    const appointments = await service.getAppointmentsByTenant(tenant.id);
    console.log(`[API] Successfully fetched ${appointments.length} appointments for tenant ${tenant.id}.`);
    return NextResponse.json(appointments);
  } catch (error) {
    console.error("[API] Error fetching tenant appointments:", error);
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }
}