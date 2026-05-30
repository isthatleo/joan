import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  users,
  invoices,
  inventoryItems,
  queues,
  labOrders,
  systemAlerts,
} from "@/lib/db/schema";
import { eq, and, count, desc, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (!user?.tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 400 });
    }

    const alerts: any[] = [];

    const [
      overdueInvoicesResult,
      lowStockResult,
      pendingLabsResult,
      queueBackupResult,
      unresolvedSystemAlertsResult,
    ] = await Promise.allSettled([
      db
        .select({ count: count() })
        .from(invoices)
        .where(
          and(
            eq(invoices.tenantId, user.tenantId),
            eq(invoices.status, "overdue")
          )
        ),
      db
        .select({ count: count() })
        .from(inventoryItems)
        .where(
          and(
            eq(inventoryItems.tenantId, user.tenantId),
            sql`case when ${inventoryItems.stock} ~ '^[0-9]+(\\.[0-9]+)?$' then ${inventoryItems.stock}::numeric else null end <= 10`
          )
        ),
      db
        .select({ count: count() })
        .from(labOrders)
        .where(
          and(
            eq(labOrders.tenantId, user.tenantId),
            eq(labOrders.status, "pending")
          )
        ),
      db
        .select({ count: count() })
        .from(queues)
        .where(
          and(
            eq(queues.tenantId, user.tenantId),
            eq(queues.status, "waiting")
          )
        ),
      db
        .select({
          id: systemAlerts.id,
          title: systemAlerts.title,
          message: systemAlerts.message,
          severity: systemAlerts.severity,
          type: systemAlerts.type,
        })
        .from(systemAlerts)
        .where(
          and(
            eq(systemAlerts.tenantId, user.tenantId),
            eq(systemAlerts.isResolved, false)
          )
        )
        .orderBy(desc(systemAlerts.createdAt))
        .limit(3),
    ]);

    const overdueInvoices = overdueInvoicesResult.status === "fulfilled" ? overdueInvoicesResult.value : [];
    const lowStockRows = lowStockResult.status === "fulfilled" ? lowStockResult.value : [];
    const pendingLabs = pendingLabsResult.status === "fulfilled" ? pendingLabsResult.value : [];
    const queueBackup = queueBackupResult.status === "fulfilled" ? queueBackupResult.value : [];
    const unresolvedSystemAlerts = unresolvedSystemAlertsResult.status === "fulfilled" ? unresolvedSystemAlertsResult.value : [];

    const overdueInvoiceCount = overdueInvoices[0]?.count || 0;
    if (overdueInvoiceCount > 0) {
      alerts.push({
        id: "alert-1",
        title: "Overdue Invoices",
        message: `${overdueInvoiceCount} overdue invoice${overdueInvoiceCount === 1 ? "" : "s"} need attention`,
        severity: "urgent",
        type: "billing",
      });
    }

    const lowStockCount = lowStockRows[0]?.count || 0;
    if (lowStockCount > 0) {
      alerts.push({
        id: "alert-2",
        title: "Low Stock Items",
        message: `${lowStockCount} inventory item${lowStockCount === 1 ? "" : "s"} running low on stock`,
        severity: "warning",
        type: "inventory",
      });
    }

    const pendingLabCount = pendingLabs[0]?.count || 0;
    if (pendingLabCount > 0) {
      alerts.push({
        id: "alert-3",
        title: "Pending Lab Results",
        message: `${pendingLabCount} lab order${pendingLabCount === 1 ? "" : "s"} pending review`,
        severity: "info",
        type: "lab",
      });
    }

    const queueBacklogCount = queueBackup[0]?.count || 0;
    if (queueBacklogCount > 0) {
      alerts.push({
        id: "alert-4",
        title: "Queue Backup",
        message: `${queueBacklogCount} patient${queueBacklogCount === 1 ? "" : "s"} currently waiting`,
        severity: "warning",
        type: "operations",
      });
    }

    unresolvedSystemAlerts.forEach((alert) => {
      alerts.push({
        id: alert.id,
        title: alert.title,
        message: alert.message || "System alert requires review",
        severity: alert.severity || "info",
        type: alert.type || "system",
      });
    });

    return NextResponse.json(alerts);
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json([]);
  }
}

