import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, gte, ilike, isNull, lte, or, sql } from "drizzle-orm";
import { appointments, patients } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { resolveDoctorContext } from "@/lib/doctor/server";

function getDateRange(scope: string) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);

  switch (scope) {
    case "today":
      end.setDate(end.getDate() + 1);
      break;
    case "week":
      end.setDate(end.getDate() + 7);
      break;
    case "month":
      end.setMonth(end.getMonth() + 1);
      break;
    default:
      return null;
  }

  return { start, end };
}

export async function GET(request: NextRequest) {
  const context = await resolveDoctorContext(request.headers);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { doctor } = context;
  if (!doctor.tenantId) {
    return NextResponse.json({ error: "No tenant context" }, { status: 400 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || "all";
    const range = searchParams.get("range") || "upcoming";
    const search = searchParams.get("search")?.trim() || "";

    const conditions = [
      eq(appointments.tenantId, doctor.tenantId),
      eq(appointments.doctorId, doctor.id),
      isNull(appointments.deletedAt),
    ];

    if (status !== "all") {
      conditions.push(eq(appointments.status, status));
    }

    if (range === "upcoming") {
      conditions.push(gte(appointments.scheduledAt, new Date()));
    } else if (range !== "all") {
      const dateRange = getDateRange(range);
      if (dateRange) {
        conditions.push(gte(appointments.scheduledAt, dateRange.start));
        conditions.push(lte(appointments.scheduledAt, dateRange.end));
      }
    }

    if (search) {
      conditions.push(
        or(
          ilike(patients.firstName, `%${search}%`),
          ilike(patients.lastName, `%${search}%`),
          ilike(patients.email, `%${search}%`)
        )!
      );
    }

    const rows = await db
      .select({
        id: appointments.id,
        patientId: patients.id,
        patientName: sql<string>`trim(concat(coalesce(${patients.firstName}, ''), ' ', coalesce(${patients.lastName}, '')))`,
        patientEmail: patients.email,
        patientPhone: patients.phone,
        scheduledAt: appointments.scheduledAt,
        status: appointments.status,
        createdAt: appointments.createdAt,
      })
      .from(appointments)
      .innerJoin(patients, eq(patients.id, appointments.patientId))
      .where(and(...conditions))
      .orderBy(asc(appointments.scheduledAt));

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Doctor appointments API error:", error);
    return NextResponse.json({ error: "Failed to load appointments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await resolveDoctorContext(request.headers);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { doctor } = context;
  if (!doctor.tenantId) {
    return NextResponse.json({ error: "No tenant context" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const patientId = String(body.patientId || "").trim();
    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    const status = String(body.status || "scheduled");

    if (!patientId || !scheduledAt || Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: "Patient and schedule are required" }, { status: 400 });
    }

    const patient = await db.query.patients.findFirst({
      where: and(eq(patients.id, patientId), eq(patients.tenantId, doctor.tenantId), isNull(patients.deletedAt)),
      columns: { id: true },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const [created] = await db
      .insert(appointments)
      .values({
        tenantId: doctor.tenantId,
        doctorId: doctor.id,
        patientId,
        scheduledAt,
        status,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Create appointment API error:", error);
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const context = await resolveDoctorContext(request.headers);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { doctor } = context;
  if (!doctor.tenantId) {
    return NextResponse.json({ error: "No tenant context" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const id = String(body.id || "").trim();
    if (!id) {
      return NextResponse.json({ error: "Appointment id is required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.status) updateData.status = String(body.status);
    if (body.scheduledAt) {
      const scheduledAt = new Date(body.scheduledAt);
      if (Number.isNaN(scheduledAt.getTime())) {
        return NextResponse.json({ error: "Invalid appointment date" }, { status: 400 });
      }
      updateData.scheduledAt = scheduledAt;
    }

    const [updated] = await db
      .update(appointments)
      .set(updateData)
      .where(
        and(
          eq(appointments.id, id),
          eq(appointments.tenantId, doctor.tenantId),
          eq(appointments.doctorId, doctor.id)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update appointment API error:", error);
    return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 });
  }
}
