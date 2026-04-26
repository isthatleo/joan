import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, patients, appointments, visits } from "@/lib/db/schema";
import { eq, gte, lte, sql, count } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    const dateFilter = startDate && endDate ? {
      gte: new Date(startDate),
      lte: new Date(endDate)
    } : null;

    let analytics = {};

    switch (type) {
      case "patients":
        analytics = await getPatientAnalytics(tenantId, dateFilter);
        break;
      case "appointments":
        analytics = await getAppointmentAnalytics(tenantId, dateFilter);
        break;
      case "revenue":
        analytics = await getRevenueAnalytics(tenantId, dateFilter);
        break;
      default:
        analytics = await getGeneralAnalytics(tenantId);
    }

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}

async function getGeneralAnalytics(tenantId: string) {
  const [userCount] = await db.select({ count: count() }).from(users).where(eq(users.tenantId, tenantId));
  const [patientCount] = await db.select({ count: count() }).from(patients).where(eq(patients.tenantId, tenantId));
  const [appointmentCount] = await db.select({ count: count() }).from(appointments).where(eq(appointments.tenantId, tenantId));

  return {
    users: userCount.count,
    patients: patientCount.count,
    appointments: appointmentCount.count,
    timestamp: new Date().toISOString(),
  };
}

async function getPatientAnalytics(tenantId: string, dateFilter: any) {
  let query = db.select().from(patients).where(eq(patients.tenantId, tenantId));

  if (dateFilter) {
    query = query.where(gte(patients.createdAt, dateFilter.gte))
                  .where(lte(patients.createdAt, dateFilter.lte));
  }

  const patientList = await query;

  // Group by month
  const monthlyData = patientList.reduce((acc: any, patient) => {
    const month = patient.createdAt.toISOString().slice(0, 7);
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  return {
    total: patientList.length,
    monthly: monthlyData,
    demographics: {
      ageGroups: { "0-18": 0, "19-35": 0, "36-55": 0, "56+": 0 },
      gender: { male: 0, female: 0, other: 0 },
    },
  };
}

async function getAppointmentAnalytics(tenantId: string, dateFilter: any) {
  let query = db.select().from(appointments).where(eq(appointments.tenantId, tenantId));

  if (dateFilter) {
    query = query.where(gte(appointments.createdAt, dateFilter.gte))
                  .where(lte(appointments.createdAt, dateFilter.lte));
  }

  const appointmentList = await query;

  return {
    total: appointmentList.length,
    completed: appointmentList.filter(a => a.status === "completed").length,
    pending: appointmentList.filter(a => a.status === "pending").length,
    cancelled: appointmentList.filter(a => a.status === "cancelled").length,
  };
}

async function getRevenueAnalytics(tenantId: string, dateFilter: any) {
  // This would typically aggregate from invoices/payments
  // For now, return mock data structure
  return {
    total: 125000,
    monthly: {
      "2026-04": 125000,
      "2026-03": 118000,
      "2026-02": 112000,
    },
    byService: {
      "Consultation": 45000,
      "Lab Tests": 32000,
      "Medications": 28000,
      "Procedures": 20000,
    },
  };
}

