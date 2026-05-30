import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, inArray, isNull, sql } from "drizzle-orm";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import { auditLogs, inventoryItems, labOrders, labResults, notifications, patients, roles, userRoles, users } from "@/lib/db/schema";
import { parseLabResultData } from "@/lib/doctor/lab-results";
import { requireTenantAdmin } from "@/lib/tenant-staff";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const patientNameSql = sql<string>`trim(concat(coalesce(${patients.firstName}, ''), ' ', coalesce(${patients.lastName}, '')))`
const VALID_STATUS = new Set(["pending", "in-progress", "in_progress", "collected", "completed", "cancelled"]);
const VALID_PRIORITY = new Set(["routine", "normal", "urgent", "critical", "stat"]);

function normalizeStatus(status?: string | null) {
  return String(status || "pending").trim().toLowerCase().replace(/_/g, "-");
}

function parseStock(value: string | null | undefined) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIso(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString() : "";
}

function resultFlag(result: ReturnType<typeof parseLabResultData>) {
  if (result.values.some((value) => value.flag === "critical")) return "critical";
  if (result.values.some((value) => value.flag === "abnormal" || value.flag === "high" || value.flag === "low")) return "abnormal";
  return "";
}

async function getLabData(tenantId: string, request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const statusFilter = normalizeStatus(searchParams.get("status") || "all");
  const priorityFilter = String(searchParams.get("priority") || "all").toLowerCase();
  const categoryFilter = String(searchParams.get("category") || "all").toLowerCase();
  const limit = Math.min(Number(searchParams.get("limit") || "100") || 100, 250);

  const [orderRows, resultRows, inventoryRows, labStaffRows] = await Promise.all([
    db
      .select({
        id: labOrders.id,
        patientId: labOrders.patientId,
        patientName: patientNameSql,
        patientEmail: patients.email,
        patientPhone: patients.phone,
        doctorId: labOrders.doctorId,
        doctorName: users.fullName,
        doctorEmail: users.email,
        visitId: labOrders.visitId,
        testName: labOrders.testName,
        testCode: labOrders.testCode,
        category: labOrders.category,
        priority: labOrders.priority,
        status: labOrders.status,
        orderedAt: labOrders.orderedAt,
        collectedAt: labOrders.collectedAt,
        completedAt: labOrders.completedAt,
        dueDate: labOrders.dueDate,
        labLocation: labOrders.labLocation,
        notes: labOrders.notes,
      })
      .from(labOrders)
      .leftJoin(patients, eq(patients.id, labOrders.patientId))
      .leftJoin(users, eq(users.id, labOrders.doctorId))
      .where(and(eq(labOrders.tenantId, tenantId), isNull(labOrders.deletedAt)))
      .orderBy(desc(labOrders.orderedAt))
      .limit(limit),
    db
      .select({
        id: labResults.id,
        labOrderId: labResults.labOrderId,
        resultData: labResults.resultData,
        fileUrl: labResults.fileUrl,
        createdAt: labResults.createdAt,
      })
      .from(labResults)
      .where(and(eq(labResults.tenantId, tenantId), isNull(labResults.deletedAt)))
      .orderBy(desc(labResults.createdAt)),
    db
      .select({
        id: inventoryItems.id,
        name: inventoryItems.name,
        stock: inventoryItems.stock,
        expiryDate: inventoryItems.expiryDate,
      })
      .from(inventoryItems)
      .where(and(eq(inventoryItems.tenantId, tenantId), isNull(inventoryItems.deletedAt))),
    db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        baseRole: users.role,
        linkedRole: roles.name,
        isActive: users.isActive,
      })
      .from(users)
      .leftJoin(userRoles, eq(userRoles.userId, users.id))
      .leftJoin(roles, eq(roles.id, userRoles.roleId))
      .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true), isNull(users.deletedAt))),
  ]);

  const resultByOrderId = new Map<string, typeof resultRows[number]>();
  for (const result of resultRows) {
    if (result.labOrderId && !resultByOrderId.has(result.labOrderId)) {
      resultByOrderId.set(result.labOrderId, result);
    }
  }

  const orders = orderRows
    .map((order) => {
      const result = order.id ? resultByOrderId.get(order.id) : undefined;
      const parsedResult = result ? parseLabResultData(result.resultData, result.fileUrl || null) : null;
      const orderedAt = order.orderedAt ? new Date(order.orderedAt) : null;
      const dueDate = order.dueDate ? new Date(order.dueDate) : null;
      const completedAt = order.completedAt ? new Date(order.completedAt) : null;
      const overdue = Boolean(dueDate && !completedAt && dueDate.getTime() < Date.now());
      const turnaroundHours = orderedAt && completedAt ? Number(((completedAt.getTime() - orderedAt.getTime()) / 3600000).toFixed(1)) : null;

      return {
        id: order.id,
        patientId: order.patientId,
        patientName: order.patientName || "Unknown patient",
        patientEmail: order.patientEmail || "",
        patientPhone: order.patientPhone || "",
        doctorId: order.doctorId,
        doctorName: order.doctorName || "Unassigned",
        doctorEmail: order.doctorEmail || "",
        visitId: order.visitId,
        testName: order.testName || "Lab test",
        testCode: order.testCode || "",
        category: order.category || "General",
        priority: order.priority || "routine",
        status: normalizeStatus(order.status),
        orderedAt: toIso(order.orderedAt),
        collectedAt: toIso(order.collectedAt),
        completedAt: toIso(order.completedAt),
        dueDate: toIso(order.dueDate),
        labLocation: order.labLocation || "Main Laboratory",
        notes: order.notes || "",
        overdue,
        turnaroundHours,
        result: result ? {
          id: result.id,
          createdAt: toIso(result.createdAt),
          fileUrl: parsedResult?.fileUrl || result.fileUrl || "",
          status: parsedResult?.status || "available",
          flag: parsedResult ? resultFlag(parsedResult) : "",
          summary: parsedResult?.summary || parsedResult?.notes || "",
        } : null,
      };
    })
    .filter((order) => statusFilter === "all" || order.status === statusFilter)
    .filter((order) => priorityFilter === "all" || String(order.priority).toLowerCase() === priorityFilter)
    .filter((order) => categoryFilter === "all" || String(order.category).toLowerCase() === categoryFilter);

  const completedOrders = orders.filter((order) => order.status === "completed");
  const turnaround = completedOrders.map((order) => order.turnaroundHours).filter((value): value is number => typeof value === "number");
  const resultFlags = resultRows.map((result) => parseLabResultData(result.resultData, result.fileUrl || null));
  const lowStock = inventoryRows.filter((item) => parseStock(item.stock) <= 5);
  const expiringSoon = inventoryRows.filter((item) => item.expiryDate && (new Date(item.expiryDate).getTime() - Date.now()) / 86400000 <= 30);
  const labStaffById = new Map<string, typeof labStaffRows[number]>();
  for (const member of labStaffRows) {
    const rolesForMember = [member.baseRole, member.linkedRole].map((role) => String(role || "").toLowerCase());
    if (rolesForMember.includes("lab_technician") || rolesForMember.includes("lab")) {
      labStaffById.set(member.id, member);
    }
  }

  const categories = Array.from(new Set(orderRows.map((order) => order.category || "General"))).sort();
  const locations = Array.from(new Set(orderRows.map((order) => order.labLocation || "Main Laboratory"))).sort();
  const worklistPressure = orders.filter((order) => ["pending", "in-progress", "collected"].includes(order.status)).length;

  return {
    stats: {
      totalOrders: orderRows.length,
      visibleOrders: orders.length,
      pending: orderRows.filter((order) => normalizeStatus(order.status) === "pending").length,
      inProgress: orderRows.filter((order) => normalizeStatus(order.status) === "in-progress").length,
      collected: orderRows.filter((order) => normalizeStatus(order.status) === "collected").length,
      completed: orderRows.filter((order) => normalizeStatus(order.status) === "completed").length,
      cancelled: orderRows.filter((order) => normalizeStatus(order.status) === "cancelled").length,
      overdue: orders.filter((order) => order.overdue).length,
      critical: resultFlags.filter((result) => resultFlag(result) === "critical" || String(result.summary || "").toLowerCase().includes("critical")).length,
      completedToday: orderRows.filter((order) => order.completedAt && new Date(order.completedAt).toDateString() === new Date().toDateString()).length,
      averageTurnaround: turnaround.length ? Number((turnaround.reduce((sum, item) => sum + item, 0) / turnaround.length).toFixed(1)) : 0,
      completionRate: orderRows.length ? Math.round((orderRows.filter((order) => normalizeStatus(order.status) === "completed").length / orderRows.length) * 100) : 0,
      lowStock: lowStock.length,
      expiringSoon: expiringSoon.length,
      labStaff: labStaffById.size,
      worklistPressure,
    },
    orders,
    recentResults: resultRows.slice(0, 10).map((result) => {
      const order = orderRows.find((item) => item.id === result.labOrderId);
      const parsed = parseLabResultData(result.resultData, result.fileUrl || null);
      return {
        id: result.id,
        labOrderId: result.labOrderId,
        testName: order?.testName || "Lab result",
        patientName: order?.patientName || "Unknown patient",
        createdAt: toIso(result.createdAt),
        fileUrl: parsed.fileUrl || result.fileUrl || "",
        status: parsed.status || "available",
        flag: resultFlag(parsed),
        summary: parsed.summary || parsed.notes || "",
      };
    }),
    inventoryAlerts: [...lowStock, ...expiringSoon]
      .filter((item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index)
      .slice(0, 12)
      .map((item) => ({
        id: item.id,
        name: item.name || "Inventory item",
        stock: parseStock(item.stock),
        expiryDate: toIso(item.expiryDate),
        lowStock: parseStock(item.stock) <= 5,
        expiringSoon: Boolean(item.expiryDate && (new Date(item.expiryDate).getTime() - Date.now()) / 86400000 <= 30),
      })),
    labStaff: Array.from(labStaffById.values()).map((member) => ({
      id: member.id,
      fullName: member.fullName || member.email,
      email: member.email,
      isActive: Boolean(member.isActive),
    })),
    filters: { categories, locations },
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    return NextResponse.json(await getLabData(tenantId, request), {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Error fetching tenant lab dashboard:", error);
    return NextResponse.json({ error: "Failed to fetch lab dashboard" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const body = await request.json().catch(() => ({}));
    const orderId = String(body.orderId || "").trim();
    const action = String(body.action || "").trim();
    if (!orderId || !action) return NextResponse.json({ error: "orderId and action are required." }, { status: 400 });

    const order = await db.query.labOrders.findFirst({
      where: and(eq(labOrders.id, orderId), eq(labOrders.tenantId, tenantId), isNull(labOrders.deletedAt)),
      columns: { id: true, doctorId: true, patientId: true, testName: true, status: true },
    });
    if (!order) return NextResponse.json({ error: "Lab order not found" }, { status: 404 });

    const update: Record<string, any> = { updatedAt: new Date() };
    let auditAction = "lab.order_updated";
    let notificationTitle = "";
    let notificationMessage = "";

    if (action === "mark_in_progress") {
      update.status = "in-progress";
      auditAction = "lab.order_marked_in_progress";
    } else if (action === "escalate") {
      update.priority = "critical";
      update.dueDate = new Date();
      auditAction = "lab.order_escalated";
      notificationTitle = "Lab order escalated";
      notificationMessage = `${order.testName || "Lab order"} was escalated by hospital administration.`;
    } else if (action === "cancel") {
      update.status = "cancelled";
      update.notes = [String(body.reason || "").trim(), "Cancelled by hospital administration."].filter(Boolean).join(" ");
      auditAction = "lab.order_cancelled";
      notificationTitle = "Lab order cancelled";
      notificationMessage = `${order.testName || "Lab order"} was cancelled by hospital administration.`;
    } else if (action === "assign_location") {
      const labLocation = String(body.labLocation || "").trim();
      if (!labLocation) return NextResponse.json({ error: "Lab location is required." }, { status: 400 });
      update.labLocation = labLocation;
      auditAction = "lab.order_location_updated";
    } else if (action === "update_status") {
      const status = normalizeStatus(body.status);
      if (!VALID_STATUS.has(status)) return NextResponse.json({ error: "Invalid lab order status." }, { status: 400 });
      update.status = status;
      if (status === "collected") update.collectedAt = new Date();
      auditAction = "lab.order_status_updated";
    } else if (action === "update_priority") {
      const priority = String(body.priority || "").trim().toLowerCase();
      if (!VALID_PRIORITY.has(priority)) return NextResponse.json({ error: "Invalid lab order priority." }, { status: 400 });
      update.priority = priority;
      auditAction = "lab.order_priority_updated";
    } else {
      return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
    }

    const [updated] = await db.update(labOrders).set(update).where(eq(labOrders.id, orderId)).returning();

    if (notificationTitle && order.doctorId) {
      await db.insert(notifications).values({
        tenantId,
        userId: order.doctorId,
        type: "lab_admin_action",
        title: notificationTitle,
        message: notificationMessage,
        metadata: { orderId, patientId: order.patientId, action },
        read: false,
      }).catch(() => null);
    }

    await db.insert(auditLogs).values({
      tenantId,
      userId: admin.user?.id || null,
      action: auditAction,
      entity: "lab_order",
      entityId: orderId,
      metadata: { action, status: update.status || order.status, priority: update.priority || null, labLocation: update.labLocation || null },
    }).catch(() => null);

    return NextResponse.json({ success: true, order: updated });
  } catch (error: any) {
    console.error("Error updating lab order:", error);
    return NextResponse.json({ error: error?.message || "Failed to update lab order" }, { status: 500 });
  }
}
