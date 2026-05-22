import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenants, users, patients, appointments, visits } from "@/lib/db/schema";
import { eq, gte, lte, sql, count, avg } from "drizzle-orm";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const slug = resolvedParams.slug;
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "30d";

    if (!slug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    // Get tenant by slug
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const tenantId = tenant.id;

    // Calculate date range
    const now = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case "7d":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(now.getDate() - 90);
        break;
      case "1y":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Fetch patient analytics data
    const analyticsData = await getPatientAnalyticsData(tenantId, startDate, now);

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error("Error fetching patient analytics:", error);
    return NextResponse.json({ error: "Failed to fetch patient analytics" }, { status: 500 });
  }
}

async function getPatientAnalyticsData(tenantId: string, startDate: Date, endDate: Date) {
  // Patient counts
  const [totalPatients] = await db
    .select({ count: count() })
    .from(patients)
    .where(eq(patients.tenantId, tenantId));

  const [activePatients] = await db
    .select({ count: count() })
    .from(patients)
    .where(sql`${patients.tenantId} = ${tenantId} AND ${patients.createdAt} >= ${startDate}`);

  const [newPatientsThisMonth] = await db
    .select({ count: count() })
    .from(patients)
    .where(sql`${patients.tenantId} = ${tenantId} AND ${patients.createdAt} >= ${startDate} AND ${patients.createdAt} <= ${endDate}`);

  // Appointment statistics
  const [totalAppointments] = await db
    .select({ count: count() })
    .from(appointments)
    .where(eq(appointments.tenantId, tenantId));

  const [completedAppointments] = await db
    .select({ count: count() })
    .from(appointments)
    .where(sql`${appointments.tenantId} = ${tenantId} AND ${appointments.status} = 'completed'`);

  // Mock data for demonstration (replace with actual calculations)
  return {
    totalPatients: totalPatients.count,
    activePatients: activePatients.count,
    newPatientsThisMonth: newPatientsThisMonth.count,
    patientGrowth: 12.5,
    avgAge: 42,
    genderDistribution: {
      male: 45,
      female: 52,
      other: 3,
    },
    ageGroups: {
      "0-18": 15,
      "19-35": 28,
      "36-55": 35,
      "56+": 22,
    },
    appointmentStats: {
      totalAppointments: totalAppointments.count,
      completedAppointments: completedAppointments.count,
      noShowRate: 8.5,
      avgWaitTime: 25,
    },
    healthMetrics: {
      avgLengthOfStay: 4.2,
      readmissionRate: 6.8,
      patientSatisfaction: 89,
      chronicConditions: 34,
    },
    monthlyTrends: [
      { month: "Jan 2026", newPatients: 45, totalPatients: 1250, appointments: 380 },
      { month: "Feb 2026", newPatients: 52, totalPatients: 1302, appointments: 412 },
      { month: "Mar 2026", newPatients: 38, totalPatients: 1340, appointments: 395 },
    ],
  };
}
