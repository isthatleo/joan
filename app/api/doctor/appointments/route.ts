import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { appointments, patients, users } from "@/lib/db/schema";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const status = searchParams.get("status") || "all";
    const date = searchParams.get("date") || "today";
    const search = searchParams.get("search") || "";

    if (!slug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    // Get doctor's user record to verify role
    const doctorUser = await db
      .select()
      .from(users)
      .where(and(eq(users.id, session.user.id), eq(users.role, "doctor")))
      .limit(1);

    if (!doctorUser.length) {
      return NextResponse.json({ error: "Doctor access required" }, { status: 403 });
    }

    // Build date filter
    let dateFilter = {};
    const now = new Date();

    switch (date) {
      case "today":
        dateFilter = {
          gte: startOfDay(now),
          lte: endOfDay(now),
        };
        break;
      case "week":
        dateFilter = {
          gte: startOfWeek(now),
          lte: endOfWeek(now),
        };
        break;
      case "month":
        dateFilter = {
          gte: startOfMonth(now),
          lte: endOfMonth(now),
        };
        break;
      default:
        // No date filter for "all"
        break;
    }

    // Build where conditions
    let whereConditions = [eq(appointments.doctorId, session.user.id)];

    if (status !== "all") {
      whereConditions.push(eq(appointments.status, status));
    }

    if (date !== "all") {
      whereConditions.push(sql`${appointments.scheduledDate} >= ${dateFilter.gte}`);
      whereConditions.push(sql`${appointments.scheduledDate} <= ${dateFilter.lte}`);
    }

    if (search) {
      // We'll filter by patient name in the query result
    }

    // Fetch appointments with patient details
    const appointmentsData = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        patientName: sql<string>`concat(${patients.firstName}, ' ', ${patients.lastName})`,
        patientEmail: patients.email,
        patientPhone: patients.phone,
        date: appointments.scheduledDate,
        time: appointments.scheduledTime,
        duration: appointments.duration,
        type: appointments.type,
        status: appointments.status,
        priority: appointments.priority,
        notes: appointments.notes,
        room: appointments.room,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
      })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .where(and(...whereConditions))
      .orderBy(desc(appointments.scheduledDate), appointments.scheduledTime);

    // Filter by search term if provided
    let filteredAppointments = appointmentsData;
    if (search) {
      filteredAppointments = appointmentsData.filter(apt =>
        apt.patientName.toLowerCase().includes(search.toLowerCase()) ||
        apt.type.toLowerCase().includes(search.toLowerCase())
      );
    }

    return NextResponse.json(filteredAppointments);

  } catch (error) {
    console.error("Doctor appointments API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { slug, patientId, date, time, duration, type, priority, notes, room } = body;

    if (!slug || !patientId || !date || !time || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify doctor role
    const doctorUser = await db
      .select()
      .from(users)
      .where(and(eq(users.id, session.user.id), eq(users.role, "doctor")))
      .limit(1);

    if (!doctorUser.length) {
      return NextResponse.json({ error: "Doctor access required" }, { status: 403 });
    }

    // Verify patient exists
    const patient = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!patient.length) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Create appointment
    const newAppointment = await db
      .insert(appointments)
      .values({
        patientId,
        doctorId: session.user.id,
        scheduledDate: new Date(date),
        scheduledTime: time,
        duration: duration || 30,
        type,
        status: "scheduled",
        priority: priority || "normal",
        notes,
        room,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(newAppointment[0]);

  } catch (error) {
    console.error("Create appointment API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, room, slug } = body;

    if (!id || !slug) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify doctor role
    const doctorUser = await db
      .select()
      .from(users)
      .where(and(eq(users.id, session.user.id), eq(users.role, "doctor")))
      .limit(1);

    if (!doctorUser.length) {
      return NextResponse.json({ error: "Doctor access required" }, { status: 403 });
    }

    // Update appointment
    const updateData: any = { updatedAt: new Date() };
    if (status) updateData.status = status;
    if (room !== undefined) updateData.room = room;

    const updatedAppointment = await db
      .update(appointments)
      .set(updateData)
      .where(and(eq(appointments.id, id), eq(appointments.doctorId, session.user.id)))
      .returning();

    if (!updatedAppointment.length) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    return NextResponse.json(updatedAppointment[0]);

  } catch (error) {
    console.error("Update appointment API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

