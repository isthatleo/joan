import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients, appointments, visits, invoices } from "@/lib/db/schema";
import { eq, gte, lte, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const format = searchParams.get("format") || "json";

    if (!tenantId || !type) {
      return NextResponse.json({ error: "Tenant ID and report type required" }, { status: 400 });
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

    // Handle different formats
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

async function generatePatientDemographicsReport(tenantId: string, dateFilter: any) {
  let query = db.select().from(patients).where(eq(patients.tenantId, tenantId));

  if (dateFilter) {
    query = query.where(and(
      gte(patients.createdAt, dateFilter.start),
      lte(patients.createdAt, dateFilter.end)
    ));
  }

  const patientList = await query;

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

async function generateAppointmentSummaryReport(tenantId: string, dateFilter: any) {
  let query = db.select().from(appointments).where(eq(appointments.tenantId, tenantId));

  if (dateFilter) {
    query = query.where(and(
      gte(appointments.createdAt, dateFilter.start),
      lte(appointments.createdAt, dateFilter.end)
    ));
  }

  const appointmentList = await query;

  return {
    total: appointmentList.length,
    byStatus: {
      scheduled: appointmentList.filter(a => a.status === "scheduled").length,
      completed: appointmentList.filter(a => a.status === "completed").length,
      cancelled: appointmentList.filter(a => a.status === "cancelled").length,
      noShow: appointmentList.filter(a => a.status === "no_show").length,
    },
    byDepartment: {}, // Would aggregate by department
    averageWaitTime: 0, // Would calculate from queue data
  };
}

async function generateRevenueReport(tenantId: string, dateFilter: any) {
  // Mock revenue data - would aggregate from invoices/payments
  return {
    totalRevenue: 125000,
    byMonth: {
      "2026-04": 125000,
      "2026-03": 118000,
      "2026-02": 112000,
    },
    byService: {
      consultation: 45000,
      labTests: 32000,
      medications: 28000,
      procedures: 20000,
    },
    insuranceVsSelfPay: {
      insurance: 85000,
      selfPay: 40000,
    },
  };
}

async function generateClinicalOutcomesReport(tenantId: string, dateFilter: any) {
  // Mock clinical outcomes - would aggregate from visits/diagnoses
  return {
    totalVisits: 1250,
    commonDiagnoses: {
      "Hypertension": 245,
      "Diabetes": 189,
      "Respiratory Infection": 156,
      "Anxiety": 98,
    },
    treatmentSuccess: {
      "Medication Compliance": "87%",
      "Blood Pressure Control": "82%",
      "Diabetes Management": "79%",
    },
    patientSatisfaction: 4.2, // out of 5
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
  // Simple CSV conversion - would need to be more sophisticated for complex data
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

