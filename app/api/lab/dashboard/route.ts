import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventoryItems, labOrders, labResults, notifications, patients } from "@/lib/db/schema";
import { getLabCatalog } from "@/lib/lab/catalog";
import { resolveLabContext } from "@/lib/lab/server";
import { parseLabResultData } from "@/lib/doctor/lab-results";

export const dynamic = "force-dynamic";

const patientNameSql = sql<string>`trim(concat(coalesce(${patients.firstName}, ''), ' ', coalesce(${patients.lastName}, '')))`;

function parseStock(value: string | null | undefined) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const context = await resolveLabContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

  try {
    const tenantId = context.technician.tenantId;
    const [orderRows, resultRows, inventoryRows, recentOrders, unreadNotifications, catalog] = await Promise.all([
      db.select({ status: labOrders.status, priority: labOrders.priority, orderedAt: labOrders.orderedAt, completedAt: labOrders.completedAt }).from(labOrders).where(and(eq(labOrders.tenantId, tenantId), isNull(labOrders.deletedAt))),
      db.select({ id: labResults.id, resultData: labResults.resultData }).from(labResults).where(and(eq(labResults.tenantId, tenantId), isNull(labResults.deletedAt))),
      db.select({ stock: inventoryItems.stock, expiryDate: inventoryItems.expiryDate }).from(inventoryItems).where(and(eq(inventoryItems.tenantId, tenantId), isNull(inventoryItems.deletedAt))),
      db.select({ id: labOrders.id, patientId: patients.id, patientName: patientNameSql, testType: labOrders.testName, status: labOrders.status, priority: labOrders.priority, orderedAt: labOrders.orderedAt }).from(labOrders).innerJoin(patients, eq(patients.id, labOrders.patientId)).where(and(eq(labOrders.tenantId, tenantId), isNull(labOrders.deletedAt))).orderBy(desc(labOrders.orderedAt)).limit(8),
      db.select({ id: notifications.id, title: notifications.title, message: notifications.message, createdAt: notifications.createdAt, type: notifications.type }).from(notifications).where(and(eq(notifications.tenantId, tenantId), eq(notifications.userId, context.technician.id), eq(notifications.read, false))).orderBy(desc(notifications.createdAt)).limit(5),
      getLabCatalog(tenantId),
    ]);

    const completedOrders = orderRows.filter((row) => row.status === "completed");
    const turnaroundHours = completedOrders.map((row) => row.orderedAt && row.completedAt ? (new Date(row.completedAt).getTime() - new Date(row.orderedAt).getTime()) / 3600000 : null).filter((value): value is number => value !== null && Number.isFinite(value));
    const criticalResults = resultRows.filter((row) => {
      const parsed = parseLabResultData(row.resultData, null);
      return parsed.flag === "critical" || String(parsed.summary || "").toLowerCase().includes("critical");
    }).length;
    const lowStock = inventoryRows.filter((row) => parseStock(row.stock) <= Math.max(5, Math.floor(parseStock(row.stock) * 0.25) || 5)).length;
    const expiringSoon = inventoryRows.filter((row) => row.expiryDate && (new Date(row.expiryDate).getTime() - Date.now()) / 86400000 <= 30).length;

    return NextResponse.json({
      metrics: {
        totalOrders: orderRows.length,
        pendingOrders: orderRows.filter((row) => row.status === "pending").length,
        inProgressOrders: orderRows.filter((row) => row.status === "in-progress").length,
        completedToday: completedOrders.filter((row) => row.completedAt && new Date(row.completedAt).toDateString() === new Date().toDateString()).length,
        criticalResults,
        averageTurnaroundHours: turnaroundHours.length ? Number((turnaroundHours.reduce((sum, item) => sum + item, 0) / turnaroundHours.length).toFixed(1)) : 0,
        lowStock,
        expiringSoon,
        unreadAlerts: unreadNotifications.length,
      },
      recentOrders,
      testCatalog: catalog.slice(0, 8),
      notifications: unreadNotifications,
      analytics: {
        completedRate: orderRows.length ? Number(((completedOrders.length / orderRows.length) * 100).toFixed(1)) : 0,
        routineOrders: orderRows.filter((row) => row.priority === "routine").length,
        urgentOrders: orderRows.filter((row) => row.priority === "urgent").length,
        criticalOrders: orderRows.filter((row) => row.priority === "critical").length,
      },
    });
  } catch (error) {
    console.error("Failed to load lab dashboard:", error);
    return NextResponse.json({ error: "Failed to load lab dashboard" }, { status: 500 });
  }
}
