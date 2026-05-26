import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { patients } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { resolveDoctorContext } from "@/lib/doctor/server";
import { getEligiblePatientIdsForTenant } from "@/lib/patient-access";

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
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "all";

    const eligiblePatientIds = await getEligiblePatientIdsForTenant(doctor.tenantId);
    if (!eligiblePatientIds.length) {
      return NextResponse.json({ patients: [], stats: { total: 0, active: 0, inactive: 0, newThisMonth: 0 } });
    }

    const conditions = [eq(patients.tenantId, doctor.tenantId), isNull(patients.deletedAt), inArray(patients.id, eligiblePatientIds)];
    if (status !== "all") {
      conditions.push(eq(patients.status, status));
    }
    if (search) {
      conditions.push(
        or(
          ilike(patients.firstName, `%${search}%`),
          ilike(patients.lastName, `%${search}%`),
          ilike(patients.email, `%${search}%`),
          ilike(patients.phone, `%${search}%`),
          ilike(patients.globalPatientId, `%${search}%`)
        )!
      );
    }

    const rows = await db
      .select({
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        fullName: sql<string>`trim(concat(coalesce(${patients.firstName}, ''), ' ', coalesce(${patients.lastName}, '')))`,
        email: patients.email,
        phone: patients.phone,
        gender: patients.gender,
        address: patients.address,
        dob: patients.dob,
        status: patients.status,
        globalPatientId: patients.globalPatientId,
        createdAt: patients.createdAt,
      })
      .from(patients)
      .where(and(...conditions))
      .orderBy(asc(patients.firstName), asc(patients.lastName));

    const [statsRow] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${patients.status} = 'active')::int`,
        inactive: sql<number>`count(*) filter (where ${patients.status} = 'inactive')::int`,
        newThisMonth: sql<number>`count(*) filter (where ${patients.createdAt} >= date_trunc('month', now()))::int`,
      })
      .from(patients)
      .where(and(eq(patients.tenantId, doctor.tenantId), isNull(patients.deletedAt)));

    return NextResponse.json({
      patients: rows,
      stats: {
        total: statsRow?.total ?? 0,
        active: statsRow?.active ?? 0,
        inactive: statsRow?.inactive ?? 0,
        newThisMonth: statsRow?.newThisMonth ?? 0,
      },
    });
  } catch (error) {
    console.error("Doctor patients API error:", error);
    return NextResponse.json({ error: "Failed to load patients" }, { status: 500 });
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
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();

    if (!firstName || !lastName) {
      return NextResponse.json({ error: "First name and last name are required" }, { status: 400 });
    }

    const [created] = await db
      .insert(patients)
      .values({
        tenantId: doctor.tenantId,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        globalPatientId: String(body.globalPatientId || "").trim() || `PT-${Date.now()}`,
        phone: String(body.phone || "").trim() || null,
        email: String(body.email || "").trim() || null,
        gender: String(body.gender || "").trim() || null,
        address: String(body.address || "").trim() || null,
        status: String(body.status || "active"),
        dob: body.dob ? new Date(body.dob) : null,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Create patient API error:", error);
    return NextResponse.json({ error: "Failed to create patient" }, { status: 500 });
  }
}


