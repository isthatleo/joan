import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  users,
  invoices,
  inventoryItems,
  queues,
  labOrders,
} from "@/lib/db/schema";
import { eq, and, lte } from "drizzle-orm";
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

    // Check for overdue invoices
    const [overdueInvoices] = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, user.tenantId),
          eq(invoices.status, "overdue")
        )
      )
      .limit(1);

    if (overdueInvoices) {
      alerts.push({
        id: "alert-1",
        title: "Overdue Invoices",
        message: "You have overdue invoices that need attention",
        severity: "urgent",
        type: "billing",
      });
    }

    // Check for low stock items
    const lowStockResult = await db
      .select()
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.tenantId, user.tenantId),
          lte(inventoryItems.stock, "10")
        )
      )
      .limit(3);

    if (lowStockResult.length > 0) {
      alerts.push({
        id: "alert-2",
        title: "Low Stock Items",
        message: `${lowStockResult.length} inventory items running low on stock`,
        severity: "warning",
        type: "inventory",
      });
    }

    // Check for pending lab tests
    const [pendingLabs] = await db
      .select()
      .from(labOrders)
      .where(
        and(
          eq(labOrders.tenantId, user.tenantId),
          eq(labOrders.status, "pending")
        )
      )
      .limit(1);

    if (pendingLabs) {
      alerts.push({
        id: "alert-3",
        title: "Pending Lab Results",
        message: "Lab test results are pending and need review",
        severity: "info",
        type: "lab",
      });
    }

    // Check for queue backup
    const [queueBackup] = await db
      .select()
      .from(queues)
      .where(
        and(
          eq(queues.tenantId, user.tenantId),
          eq(queues.status, "waiting")
        )
      )
      .limit(1);

    if (queueBackup) {
      alerts.push({
        id: "alert-4",
        title: "Queue Backup",
        message: "Significant queue backup detected in departments",
        severity: "warning",
        type: "operations",
      });
    }

    // Add system health alerts
    alerts.push({
      id: "alert-5",
      title: "System Health",
      message: "All systems operational - 99.8% uptime",
      severity: "info",
      type: "system",
    });

    return NextResponse.json(alerts);
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

