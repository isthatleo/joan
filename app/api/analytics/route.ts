import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, patients, appointments } from "@/lib/db/schema";
import { and, count, eq, gte, lte, sql, type SQL } from "drizzle-orm";

type DateFilter = {
  gte: Date;
  lte: Date;
} | null;

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

async function getPatientAnalytics(tenantId: string, dateFilter: DateFilter) {
  const conditions: SQL[] = [eq(patients.tenantId, tenantId)];
  if (dateFilter) {
    conditions.push(gte(patients.createdAt, dateFilter.gte));
    conditions.push(lte(patients.createdAt, dateFilter.lte));
  }

  const patientList = await db.select().from(patients).where(and(...conditions));

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

async function getAppointmentAnalytics(tenantId: string, dateFilter: DateFilter) {
  const conditions: SQL[] = [eq(appointments.tenantId, tenantId)];
  if (dateFilter) {
    conditions.push(gte(appointments.createdAt, dateFilter.gte));
    conditions.push(lte(appointments.createdAt, dateFilter.lte));
  }

  const appointmentList = await db.select().from(appointments).where(and(...conditions));

  return {
    total: appointmentList.length,
    completed: appointmentList.filter(a => a.status === "completed").length,
    pending: appointmentList.filter(a => a.status === "pending").length,
    cancelled: appointmentList.filter(a => a.status === "cancelled").length,
  };
}

async function getRevenueAnalytics(tenantId: string, dateFilter: DateFilter) {
  const dateStart = dateFilter?.gte ?? null;
  const dateEnd = dateFilter?.lte ?? null;
  const result = await db.execute(sql`
    WITH scoped_invoices AS (
      SELECT
        id,
        created_at,
        status,
        description,
        items,
        coalesce(
          nullif(regexp_replace(coalesce(total_amount, amount, amount_due, '0'), '[^0-9.-]', '', 'g'), '')::numeric,
          0
        ) AS invoice_total
      FROM invoices
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND (${dateStart}::timestamp IS NULL OR created_at >= ${dateStart})
        AND (${dateEnd}::timestamp IS NULL OR created_at <= ${dateEnd})
    ),
    scoped_payments AS (
      SELECT
        invoice_id,
        created_at,
        status,
        coalesce(nullif(regexp_replace(coalesce(amount, '0'), '[^0-9.-]', '', 'g'), '')::numeric, 0) AS payment_total
      FROM payments
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND (${dateStart}::timestamp IS NULL OR created_at >= ${dateStart})
        AND (${dateEnd}::timestamp IS NULL OR created_at <= ${dateEnd})
    ),
    monthly_rows AS (
      SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, sum(invoice_total)::numeric AS total
      FROM scoped_invoices
      GROUP BY 1
      ORDER BY 1 DESC
    ),
    service_rows AS (
      SELECT
        coalesce(nullif(trim(description), ''), 'Uncategorized') AS service,
        sum(invoice_total)::numeric AS total
      FROM scoped_invoices
      GROUP BY 1
      ORDER BY total DESC
      LIMIT 12
    )
    SELECT
      coalesce((SELECT sum(invoice_total) FROM scoped_invoices), 0)::numeric AS total,
      coalesce((SELECT sum(payment_total) FROM scoped_payments WHERE lower(coalesce(status, '')) IN ('paid', 'completed', 'success', 'successful')), 0)::numeric AS collected,
      coalesce((SELECT sum(invoice_total) FROM scoped_invoices WHERE lower(coalesce(status, '')) IN ('pending', 'sent', 'overdue', 'unpaid')), 0)::numeric AS outstanding,
      coalesce((SELECT jsonb_object_agg(month, total) FROM monthly_rows), '{}'::jsonb) AS monthly,
      coalesce((SELECT jsonb_object_agg(service, total) FROM service_rows), '{}'::jsonb) AS by_service
  `) as any;
  const row = result.rows?.[0] || {};

  return {
    total: Number(row.total || 0),
    collected: Number(row.collected || 0),
    outstanding: Number(row.outstanding || 0),
    monthly: row.monthly || {},
    byService: row.by_service || {},
  };
}

