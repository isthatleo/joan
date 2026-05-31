import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vitals, visits } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireTenantUser } from "@/lib/api/route-guards";

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantUser(request, ["doctor", "nurse", "hospital_admin", "patient", "guardian"]);
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const visitId = searchParams.get("visitId");

    if (!visitId) {
      return NextResponse.json({ error: "Visit ID required" }, { status: 400 });
    }

    const vitalsList = await db.query.vitals.findMany({
      where: eq(vitals.visitId, visitId),
    });

    return NextResponse.json(vitalsList);
  } catch (error) {
    console.error("Error fetching vitals:", error);
    return NextResponse.json({ error: "Failed to fetch vitals" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantUser(request, ["nurse", "doctor"]);
    if (!access.ok) return access.response;

    const data = await request.json();
    const { visitId, temperature, bloodPressure, heartRate, weight, height, notes } = data;

    if (!visitId) {
      return NextResponse.json({ error: "Visit ID required" }, { status: 400 });
    }

    const visit = await db.query.visits.findFirst({
      where: eq(visits.id, visitId),
      columns: { id: true, tenantId: true },
    });
    if (!visit || visit.tenantId !== access.user.tenantId) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    const [vital] = await db.insert(vitals).values({
      visitId,
      temperature,
      bloodPressure,
      heartRate,
      recordedBy: access.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json(vital, { status: 201 });
  } catch (error) {
    console.error("Error recording vitals:", error);
    return NextResponse.json({ error: "Failed to record vitals" }, { status: 500 });
  }
}

