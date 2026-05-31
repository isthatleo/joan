import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients, appointments, visits, invoices, payments } from "@/lib/db/schema";
import { eq, gte, lte, and, sql, type SQL } from "drizzle-orm";
import { requireTenantUser } from "@/lib/api/route-guards";

type DateFilter = {
  start: Date;
  end: Date;
} | null;

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantUser(request, ["hospital_admin", "accountant", "doctor"]);
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const tenantId = access.user.tenantId;
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const format = searchParams.get("format") || "json";

    if (!tenantId || !type) {
      return NextResponse.json({ error: "Tenant context and report type required" }, { status: 400 });
    }

    const dateFilter = startDate && endDate ? {
      start: new Date(startDate),
      end: new Date(endDate)
    } : null;

    let reportData;

    switch (type) {
      case "patient-demographics":
        reportData = await generatePatientDemographicsReport(tenantId, dateFilter);
        break;
      case "appointment-summary":
        reportData = await generateAppointmentSummaryReport(tenantId, dateFilter);
        break;
      case "revenue-report":
        reportData = await generateRevenueReport(tenantId, dateFilter);
        break;
      case "clinical-outcomes":
        reportData = await generateClinicalOutcomesReport(tenantId, dateFilter);
        break;
      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }

    if (format === "csv") {
      return generateCSVResponse(reportData, type);
    }

    return NextResponse.json({
      reportType: type,
      generatedAt: new Date().toISOString(),
      dateRange: dateFilter,
      data: reportData,
    });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}

async function generatePatientDemographicsReport(tenantId: string, dateFilter: DateFilter) {
  const conditions: SQL[] = [eq(patients.tenantId, tenantId)];

  if (dateFilter) {
    conditions.push(gte(patients.createdAt, dateFilter.start));
    conditions.push(lte(patients.createdAt, dateFilter.end));
  }

  const patientList = await db.select().from(patients).where(and(...conditions));

  const demographics = {
    total: patientList.length,
    byAgeGroup: {
      "0-18": patientList.filter(p => p.dob && calculateAge(p.dob) <= 18).length,
      "19-35": patientList.filter(p => p.dob && calculateAge(p.dob) >= 19 && calculateAge(p.dob) <= 35).length,
      "36-55": patientList.filter(p => p.dob && calculateAge(p.dob) >= 36 && calculateAge(p.dob) <= 55).length,
      "56+": patientList.filter(p => p.dob && calculateAge(p.dob) >= 56).length,
    },
    byGender: {
      male: patientList.filter(p => p.gender === "male").length,
      female: patientList.filter(p => p.gender === "female").length,
      other: patientList.filter(p => p.gender === "other" || !p.gender).length,
    },
  };

  return demographics;
}

async function generateAppointmentSummaryReport(tenantId: string, dateFilter: DateFilter) {
  const conditions: SQL[] = [eq(appointments.tenantId, tenantId)];

  if (dateFilter) {
    conditions.push(gte(appointments.createdAt, dateFilter.start));
    conditions.push(lte(appointments.createdAt, dateFilter.end));
  }

  const appointmentList = await db.select().from(appointments).where(and(...conditions));

  return {
    total: appointmentList.length,
    byStatus: {
      scheduled: appointmentList.filter(a => a.status === "scheduled").length,
      completed: appointmentList.filter(a => a.status === "completed").length,
      cancelled: appointmentList.filter(a => a.status === "cancelled").length,
      noShow: appointmentList.filter(a => a.status === "no_show").length,
    },
    byDepartment: {},
    averageWaitTime: 0,
  };
}

async function generateRevenueReport(tenantId: string, dateFilter: DateFilter) {
  const dateStart = dateFilter?.start ?? null;
  const dateEnd = dateFilter?.end ?? null;
  const result = await db.execute(sql`
    WITH scoped_invoices AS (
      SELECT
        id,
        created_at,
        coalesce(nullif(regexp_replace(coalesce(total_amount, amount, '0'), '[^0-9.-]', '', 'g'), '')::numeric, 0) AS invoice_total,
        coalesce(description, 'Uncategorized') AS service
      FROM invoices
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND (${dateStart}::timestamp IS NULL OR created_at >= ${dateStart})
        AND (${dateEnd}::timestamp IS NULL OR created_at <= ${dateEnd})
    ),
    scoped_payments AS (
      SELECT
        invoice_id,
        coalesce(nullif(regexp_replace(coalesce(amount, '0'), '[^0-9.-]', '', 'g'), '')::numeric, 0) AS payment_total
      FROM payments
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND (${dateStart}::timestamp IS NULL OR created_at >= ${dateStart})
        AND (${dateEnd}::timestamp IS NULL OR created_at <= ${dateEnd})
    )
    SELECT
      coalesce((SELECT sum(invoice_total) FROM scoped_invoices), 0)::numeric AS total_revenue,
      coalesce((SELECT jsonb_object_agg(month, month_total) FROM (
        SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, sum(invoice_total)::numeric AS month_total
        FROM scoped_invoices
        GROUP BY 1
      ) monthly), '{}'::jsonb) AS by_month,
      coalesce((SELECT jsonb_object_agg(service, service_total) FROM (
        SELECT service, sum(invoice_total)::numeric AS service_total
        FROM scoped_invoices
        GROUP BY service
      ) services), '{}'::jsonb) AS by_service,
      coalesce((SELECT sum(payment_total) FROM scoped_payments), 0)::numeric AS collected
  `) as any;
  const row = result.rows?.[0] || {};

  return {
    totalRevenue: Number(row.total_revenue || 0),
    collected: Number(row.collected || 0),
    outstanding: Math.max(0, Number(row.total_revenue || 0) - Number(row.collected || 0)),
    byMonth: row.by_month || {},
    byService: row.by_service || {},
    insuranceVsSelfPay: {
      insurance: 0,
      selfPay: Number(row.total_revenue || 0),
    },
  };
}

async function generateClinicalOutcomesReport(tenantId: string, dateFilter: DateFilter) {
  const conditions: SQL[] = [eq(visits.tenantId, tenantId)];
  if (dateFilter) {
    conditions.push(gte(visits.createdAt, dateFilter.start));
    conditions.push(lte(visits.createdAt, dateFilter.end));
  }

  const visitRows = await db.select().from(visits).where(and(...conditions));
  const reasonCounts = visitRows.reduce<Record<string, number>>((acc, visit) => {
    const key = visit.reason || "Unspecified";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    totalVisits: visitRows.length,
    commonDiagnoses: Object.fromEntries(Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)),
    treatmentSuccess: {
      completedVisits: visitRows.length,
    },
    patientSatisfaction: null,
  };
}

function calculateAge(dob: Date): number {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

function generateCSVResponse(data: any, type: string): NextResponse {
  // Convert data to CSV format
  const csv = convertToCSV(data);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${type}-report.csv"`,
    },
  });
}

function convertToCSV(data: any): string {
  const rows = [];
  rows.push("Key,Value");

  function flatten(obj: any, prefix = "") {
    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === "object" && obj[key] !== null) {
        flatten(obj[key], fullKey);
      } else {
        rows.push(`${fullKey},${obj[key]}`);
      }
    }
  }

  flatten(data);
  return rows.join("\n");
}

