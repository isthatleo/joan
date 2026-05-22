import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenants, users, patients, appointments, visits } from "@/lib/db/schema";
import { eq, gte, lte, sql, count, sum, avg } from "drizzle-orm";

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

    // Calculate date range based on timeRange
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

    // Fetch analytics data
    const analyticsData = await getAnalyticsData(tenantId, startDate, now);

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error("Error fetching tenant analytics:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}

async function getAnalyticsData(tenantId: string, startDate: Date, endDate: Date) {
  // Patient metrics
  const [totalPatients] = await db
    .select({ count: count() })
    .from(patients)
    .where(eq(patients.tenantId, tenantId));

  const [newPatientsThisMonth] = await db
    .select({ count: count() })
    .from(patients)
    .where(sql`${patients.tenantId} = ${tenantId} AND ${patients.createdAt} >= ${startDate} AND ${patients.createdAt} <= ${endDate}`);

  const [avgLengthOfStay] = await db
    .select({ avg: avg(patients.createdAt) }) // This is a placeholder - would need actual length of stay field
    .from(patients)
    .where(eq(patients.tenantId, tenantId));

  // Appointment metrics
  const [totalAppointments] = await db
    .select({ count: count() })
    .from(appointments)
    .where(eq(appointments.tenantId, tenantId));

  const [completedAppointments] = await db
    .select({ count: count() })
    .from(appointments)
    .where(sql`${appointments.tenantId} = ${tenantId} AND ${appointments.status} = 'completed'`);

  // Financial metrics (placeholder - would need actual billing/invoice tables)
  const totalRevenue = 125000; // Placeholder
  const monthlyRevenue = 15000; // Placeholder
  const revenueGrowth = 8.5; // Placeholder
  const averageRevenuePerPatient = 2500; // Placeholder
  const outstandingInvoices = 8500; // Placeholder

  // Operational metrics
  const averageWaitTime = 25; // Placeholder in minutes
  const bedOccupancyRate = 78; // Placeholder percentage
  const staffUtilization = 82; // Placeholder percentage
  const appointmentFillRate = 85; // Placeholder percentage
  const emergencyResponseTime = 12; // Placeholder in minutes

  // Quality metrics
  const patientSatisfaction = 92; // Placeholder percentage
  const infectionRate = 0.8; // Placeholder percentage
  const medicationErrorRate = 0.3; // Placeholder percentage
  const mortalityRate = 1.2; // Placeholder percentage

  return {
    patientMetrics: {
      totalPatients: totalPatients.count,
      newPatientsThisMonth: newPatientsThisMonth.count,
      patientGrowth: 12.5, // Placeholder
      avgLengthOfStay: 4.2, // Placeholder in days
      readmissionRate: 8.5, // Placeholder percentage
    },
    financialMetrics: {
      totalRevenue,
      monthlyRevenue,
      revenueGrowth,
      averageRevenuePerPatient,
      outstandingInvoices,
    },
    operationalMetrics: {
      averageWaitTime,
      bedOccupancyRate,
      staffUtilization,
      appointmentFillRate,
      emergencyResponseTime,
    },
    qualityMetrics: {
      patientSatisfaction,
      infectionRate,
      medicationErrorRate,
      mortalityRate,
    },
  };
}
