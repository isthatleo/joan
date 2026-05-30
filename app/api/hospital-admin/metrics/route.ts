import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  patients,
  appointments,
  invoices,
  users,
  labOrders,
  inventoryItems,
  queues,
  bedAssignments,
  systemMetrics,
} from "@/lib/db/schema";
import { eq, count, and, gte, lte, desc, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

function toNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: unknown) {
  return toNumber(value).toFixed(2);
}

const invoiceTotalSql = sql<string>`
  coalesce(
    sum(
      case
        when ${invoices.totalAmount} ~ '^[0-9]+(\\.[0-9]+)?$'
          then ${invoices.totalAmount}::numeric
        when ${invoices.amount} ~ '^[0-9]+(\\.[0-9]+)?$'
          then ${invoices.amount}::numeric
        else 0
      end
    ),
    0
  )
`;

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get tenant ID from user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (!user?.tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 400 });
    }

    const tenantId = user.tenantId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Fetch all metrics
    const [
      patientCount,
      todayPatients,
      yesterdayPatients,
      activeAppointments,
      completedAppointments,
      yesterdayAppointments,
      totalRevenueResult,
      todayRevenueResult,
      yesterdayRevenueResult,
      pendingInvoicesResult,
      staffCount,
      pendingLabTests,
      completedLabTests,
      totalBeds,
      occupiedBeds,
      inventoryCount,
      lowStockItems,
      queueCount,
      latestSystemMetric,
    ] = await Promise.all([
      // Total patients
      db
        .select({ count: count() })
        .from(patients)
        .where(eq(patients.tenantId, tenantId)),

      // Patients today (new registrations)
      db
        .select({ count: count() })
        .from(patients)
        .where(
          and(
            eq(patients.tenantId, tenantId),
            gte(patients.createdAt, today),
            lte(patients.createdAt, tomorrow)
          )
        ),

      // Patients yesterday (trend baseline)
      db
        .select({ count: count() })
        .from(patients)
        .where(
          and(
            eq(patients.tenantId, tenantId),
            gte(patients.createdAt, yesterday),
            lte(patients.createdAt, today)
          )
        ),

      // Active appointments (today)
      db
        .select({ count: count() })
        .from(appointments)
        .where(
          and(
            eq(appointments.tenantId, tenantId),
            eq(appointments.status, "scheduled"),
            gte(appointments.scheduledAt, today),
            lte(appointments.scheduledAt, tomorrow)
          )
        ),

      // Completed appointments (today)
      db
        .select({ count: count() })
        .from(appointments)
        .where(
          and(
            eq(appointments.tenantId, tenantId),
            eq(appointments.status, "completed"),
            gte(appointments.updatedAt, today),
            lte(appointments.updatedAt, tomorrow)
          )
        ),

      // Completed appointments yesterday (trend baseline)
      db
        .select({ count: count() })
        .from(appointments)
        .where(
          and(
            eq(appointments.tenantId, tenantId),
            eq(appointments.status, "completed"),
            gte(appointments.updatedAt, yesterday),
            lte(appointments.updatedAt, today)
          )
        ),

      // Total revenue
      db
        .select({ total: invoiceTotalSql })
        .from(invoices)
        .where(eq(invoices.tenantId, tenantId)),

      // Today's revenue
      db
        .select({ total: invoiceTotalSql })
        .from(invoices)
        .where(
          and(
            eq(invoices.tenantId, tenantId),
            gte(invoices.createdAt, today),
            lte(invoices.createdAt, tomorrow)
          )
        ),

      // Yesterday's revenue (trend baseline)
      db
        .select({ total: invoiceTotalSql })
        .from(invoices)
        .where(
          and(
            eq(invoices.tenantId, tenantId),
            gte(invoices.createdAt, yesterday),
            lte(invoices.createdAt, today)
          )
        ),

      // Pending invoices
      db
        .select({ total: invoiceTotalSql })
        .from(invoices)
        .where(
          and(eq(invoices.tenantId, tenantId), eq(invoices.status, "pending"))
        ),

      // Total staff
      db
        .select({ count: count() })
        .from(users)
        .where(
          and(eq(users.tenantId, tenantId), eq(users.isActive, true))
        ),

      // Pending lab tests
      db
        .select({ count: count() })
        .from(labOrders)
        .where(
          and(
            eq(labOrders.tenantId, tenantId),
            eq(labOrders.status, "pending")
          )
        ),

      // Completed lab tests
      db
        .select({ count: count() })
        .from(labOrders)
        .where(
          and(
            eq(labOrders.tenantId, tenantId),
            eq(labOrders.status, "completed")
          )
        ),

      // Total configured beds
      db
        .select({ count: count() })
        .from(bedAssignments)
        .where(eq(bedAssignments.tenantId, tenantId)),

      // Occupied beds
      db
        .select({ count: count() })
        .from(bedAssignments)
        .where(
          and(
            eq(bedAssignments.tenantId, tenantId),
            eq(bedAssignments.status, "occupied")
          )
        ),

      // Total inventory items
      db
        .select({ count: count() })
        .from(inventoryItems)
        .where(eq(inventoryItems.tenantId, tenantId)),

      // Low stock items
      db
        .select({ count: count() })
        .from(inventoryItems)
        .where(
          and(
            eq(inventoryItems.tenantId, tenantId),
            sql`case when ${inventoryItems.stock} ~ '^[0-9]+(\\.[0-9]+)?$' then ${inventoryItems.stock}::numeric else null end <= 10`
          )
        ),

      // Queue count
      db
        .select({ count: count() })
        .from(queues)
        .where(
          and(
            eq(queues.tenantId, tenantId),
            eq(queues.status, "waiting")
          )
        ),

      db
        .select({
          uptime: systemMetrics.uptime,
          cpuUsage: systemMetrics.cpuUsage,
          memoryUsage: systemMetrics.memoryUsage,
          apiResponseTime: systemMetrics.apiResponseTime,
        })
        .from(systemMetrics)
        .where(eq(systemMetrics.tenantId, tenantId))
        .orderBy(desc(systemMetrics.timestamp))
        .limit(1),
    ]);

    const totalRevenueNum = toNumber(totalRevenueResult[0]?.total);
    const todayRevenueNum = toNumber(todayRevenueResult[0]?.total);
    const yesterdayRevenueNum = toNumber(yesterdayRevenueResult[0]?.total);
    const pendingInvoicesNum = toNumber(pendingInvoicesResult[0]?.total);
    const totalBedCount = totalBeds[0]?.count || 0;
    const occupiedBedCount = occupiedBeds[0]?.count || 0;

    const bedOccupancyPercent = totalBedCount > 0
      ? Math.min(Math.round((occupiedBedCount / totalBedCount) * 100), 100)
      : 0;

    const percentageChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const system = latestSystemMetric[0];

    return NextResponse.json({
      totalPatients: patientCount[0]?.count || 0,
      patientsToday: todayPatients[0]?.count || 0,
      patientsYesterday: yesterdayPatients[0]?.count || 0,
      patientTrendPercent: percentageChange(todayPatients[0]?.count || 0, yesterdayPatients[0]?.count || 0),
      activeAppointments: activeAppointments[0]?.count || 0,
      completedAppointments: completedAppointments[0]?.count || 0,
      completedAppointmentsYesterday: yesterdayAppointments[0]?.count || 0,
      appointmentTrendPercent: percentageChange(completedAppointments[0]?.count || 0, yesterdayAppointments[0]?.count || 0),
      totalRevenue: formatMoney(totalRevenueNum),
      todayRevenue: formatMoney(todayRevenueNum),
      yesterdayRevenue: formatMoney(yesterdayRevenueNum),
      revenueTrendPercent: percentageChange(todayRevenueNum, yesterdayRevenueNum),
      pendingInvoices: formatMoney(pendingInvoicesNum),
      bedOccupancy: bedOccupancyPercent,
      occupiedBeds: occupiedBedCount,
      totalBeds: totalBedCount,
      staffOnDuty: staffCount[0]?.count || 0,
      totalStaff: staffCount[0]?.count || 0,
      pendingLabTests: pendingLabTests[0]?.count || 0,
      completedLabTests: completedLabTests[0]?.count || 0,
      pharmacyItems: inventoryCount[0]?.count || 0,
      lowStockItems: lowStockItems[0]?.count || 0,
      criticalAlerts: 0,
      systemUptime: system?.uptime || null,
      cpuUsage: system?.cpuUsage ?? null,
      memoryUsage: system?.memoryUsage ?? null,
      apiResponseTime: system?.apiResponseTime ?? null,
      queueCount: queueCount[0]?.count || 0,
    });
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

