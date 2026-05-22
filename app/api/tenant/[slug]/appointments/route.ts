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

    if (!slug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const appointments = await service.getAppointmentsByTenant(tenant.id);
    return NextResponse.json(appointments);
  } catch (error) {
    console.error("Error fetching tenant appointments:", error);
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }
}
