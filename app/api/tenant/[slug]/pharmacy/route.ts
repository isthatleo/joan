import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import { auditLogs, inventoryItems, notifications, patients, prescriptionItems, prescriptions, roles, userRoles, users } from "@/lib/db/schema";
import { requireTenantAdmin } from "@/lib/tenant-staff";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VALID_STATUS = new Set(["pending", "review", "approved", "filled", "dispensed", "cancelled", "on_hold"]);
const VALID_PRIORITY = new Set(["low", "normal", "routine", "urgent", "critical", "stat"]);

function parseStock(value?: string | null) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIso(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString() : "";
}

function normalizeRole(value?: string | null) {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function normalizeStatus(value?: string | null) {
  return String(value || "pending").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

async function getPharmacyData(tenantId: string, request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const statusFilter = normalizeStatus(searchParams.get("status") || "all");
  const priorityFilter = String(searchParams.get("priority") || "all").toLowerCase();
  const limit = Math.min(Number(searchParams.get("limit") || "150") || 150, 300);

  const [prescriptionRows, inventoryRows, notificationRows, staffRows] = await Promise.all([
    db
      .select({
        id: prescriptions.id,
        patientId: prescriptions.patientId,
        patientFullName: patients.fullName,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientPhone: patients.phone,
        doctorId: prescriptions.doctorId,
        doctorName: users.fullName,
        doctorEmail: users.email,
        medication: prescriptions.medication,
        genericName: prescriptions.genericName,
        strength: prescriptions.strength,
        dosage: prescriptions.dosage,
        frequency: prescriptions.frequency,
        duration: prescriptions.duration,
        quantity: prescriptions.quantity,
        refills: prescriptions.refills,
        refillsRemaining: prescriptions.refillsRemaining,
        instructions: prescriptions.instructions,
        status: prescriptions.status,
        prescribedAt: prescriptions.prescribedAt,
        filledAt: prescriptions.filledAt,
        expiresAt: prescriptions.expiresAt,
        pharmacy: prescriptions.pharmacy,
        notes: prescriptions.notes,
        interactions: prescriptions.interactions,
        priority: prescriptions.priority,
        isEmergency: prescriptions.isEmergency,
        validUntil: prescriptions.validUntil,
        itemId: prescriptionItems.id,
        itemDrugName: prescriptionItems.drugName,
        itemGenericName: prescriptionItems.genericName,
        itemStrength: prescriptionItems.strength,
        itemDosage: prescriptionItems.dosage,
        itemFrequency: prescriptionItems.frequency,
        itemDuration: prescriptionItems.duration,
        itemQuantity: prescriptionItems.quantity,
        itemInstructions: prescriptionItems.instructions,
      })
      .from(prescriptions)
      .leftJoin(patients, eq(patients.id, prescriptions.patientId))
      .leftJoin(users, eq(users.id, prescriptions.doctorId))
      .leftJoin(prescriptionItems, and(eq(prescriptionItems.prescriptionId, prescriptions.id), isNull(prescriptionItems.deletedAt)))
      .where(and(eq(prescriptions.tenantId, tenantId), isNull(prescriptions.deletedAt)))
      .orderBy(desc(prescriptions.prescribedAt), desc(prescriptions.createdAt))
      .limit(limit),
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
        id: notifications.id,
        title: notifications.title,
        message: notifications.message,
        type: notifications.type,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(and(eq(notifications.tenantId, tenantId), eq(notifications.read, false), isNull(notifications.deletedAt)))
      .orderBy(desc(notifications.createdAt))
      .limit(10),
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

  const prescriptionsById = new Map<string, any>();
  for (const row of prescriptionRows) {
    const patientName = row.patientFullName || [row.patientFirstName, row.patientLastName].filter(Boolean).join(" ") || "Unknown patient";
    const current = prescriptionsById.get(row.id) || {
      id: row.id,
      patientId: row.patientId,
      patientName,
      patientPhone: row.patientPhone || "",
      doctorId: row.doctorId,
      doctorName: row.doctorName || row.doctorEmail || "Unassigned prescriber",
      medication: row.medication || row.itemDrugName || "Medication",
      genericName: row.genericName || row.itemGenericName || "",
      strength: row.strength || row.itemStrength || "",
      dosage: row.dosage || row.itemDosage || "",
      frequency: row.frequency || row.itemFrequency || "",
      duration: row.duration || row.itemDuration || "",
      quantity: row.quantity || row.itemQuantity || 0,
      refills: row.refills || 0,
      refillsRemaining: row.refillsRemaining || 0,
      instructions: row.instructions || row.itemInstructions || "",
      status: normalizeStatus(row.status),
      priority: String(row.isEmergency ? "critical" : row.priority || "normal").toLowerCase(),
      prescribedAt: toIso(row.prescribedAt),
      filledAt: toIso(row.filledAt),
      expiresAt: toIso(row.expiresAt || row.validUntil),
      pharmacy: row.pharmacy || "Main Pharmacy",
      notes: row.notes || "",
      interactions: Array.isArray(row.interactions) ? row.interactions : [],
      isEmergency: Boolean(row.isEmergency),
      medications: [],
    };

    if (row.itemId || row.medication) {
      current.medications.push({
        id: row.itemId || row.id,
        name: row.itemDrugName || row.medication || "Medication",
        genericName: row.itemGenericName || row.genericName || "",
        strength: row.itemStrength || row.strength || "",
        dosage: row.itemDosage || row.dosage || "",
        frequency: row.itemFrequency || row.frequency || "",
        duration: row.itemDuration || row.duration || "",
        quantity: row.itemQuantity || row.quantity || 0,
        instructions: row.itemInstructions || row.instructions || "",
      });
    }

    prescriptionsById.set(row.id, current);
  }

  const prescriptionList = Array.from(prescriptionsById.values())
    .filter((item) => statusFilter === "all" || item.status === statusFilter)
    .filter((item) => priorityFilter === "all" || item.priority === priorityFilter);

  const lowStock = inventoryRows.filter((item) => parseStock(item.stock) <= 10 && parseStock(item.stock) > 0);
  const outOfStock = inventoryRows.filter((item) => parseStock(item.stock) <= 0);
  const expiringSoon = inventoryRows.filter((item) => item.expiryDate && (new Date(item.expiryDate).getTime() - Date.now()) / 86400000 <= 30);
  const criticalInteractions = prescriptionList.filter((item) => item.interactions.length || item.isEmergency || item.priority === "critical");

  const pharmacistById = new Map<string, typeof staffRows[number]>();
  for (const member of staffRows) {
    const roleNames = [normalizeRole(member.baseRole), normalizeRole(member.linkedRole)];
    if (roleNames.includes("pharmacist")) pharmacistById.set(member.id, member);
  }

  const medicationVolume = new Map<string, number>();
  for (const prescription of prescriptionList) {
    for (const medication of prescription.medications.length ? prescription.medications : [{ name: prescription.medication, quantity: prescription.quantity }]) {
      const name = medication.name || "Medication";
      medicationVolume.set(name, (medicationVolume.get(name) || 0) + Number(medication.quantity || 1));
    }
  }

  return {
    stats: {
      totalPrescriptions: prescriptionsById.size,
      visiblePrescriptions: prescriptionList.length,
      pending: Array.from(prescriptionsById.values()).filter((item) => ["pending", "review", "on_hold"].includes(item.status)).length,
      filling: Array.from(prescriptionsById.values()).filter((item) => ["approved"].includes(item.status)).length,
      filledToday: Array.from(prescriptionsById.values()).filter((item) => item.filledAt && new Date(item.filledAt).toDateString() === new Date().toDateString()).length,
      filled: Array.from(prescriptionsById.values()).filter((item) => ["filled", "dispensed"].includes(item.status)).length,
      cancelled: Array.from(prescriptionsById.values()).filter((item) => item.status === "cancelled").length,
      lowStock: lowStock.length,
      outOfStock: outOfStock.length,
      expiringSoon: expiringSoon.length,
      criticalInteractions: criticalInteractions.length,
      pharmacistCount: pharmacistById.size,
      inventoryItems: inventoryRows.length,
    },
    prescriptions: prescriptionList,
    inventoryAlerts: [...outOfStock, ...lowStock, ...expiringSoon]
      .filter((item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index)
      .slice(0, 20)
      .map((item) => ({
        id: item.id,
        name: item.name || "Inventory item",
        stock: parseStock(item.stock),
        expiryDate: toIso(item.expiryDate),
        outOfStock: parseStock(item.stock) <= 0,
        lowStock: parseStock(item.stock) > 0 && parseStock(item.stock) <= 10,
        expiringSoon: Boolean(item.expiryDate && (new Date(item.expiryDate).getTime() - Date.now()) / 86400000 <= 30),
      })),
    topMedications: Array.from(medicationVolume.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, quantity]) => ({ name, quantity })),
    notifications: notificationRows,
    pharmacyStaff: Array.from(pharmacistById.values()).map((member) => ({
      id: member.id,
      fullName: member.fullName || member.email,
      email: member.email,
      isActive: Boolean(member.isActive),
    })),
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    return NextResponse.json(await getPharmacyData(tenantId, request), {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Error fetching tenant pharmacy dashboard:", error);
    return NextResponse.json({ error: "Failed to fetch pharmacy dashboard" }, { status: 500 });
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
    const prescriptionId = String(body.prescriptionId || "").trim();
    const action = String(body.action || "").trim();
    if (!prescriptionId || !action) return NextResponse.json({ error: "prescriptionId and action are required." }, { status: 400 });

    const prescription = await db.query.prescriptions.findFirst({
      where: and(eq(prescriptions.id, prescriptionId), eq(prescriptions.tenantId, tenantId), isNull(prescriptions.deletedAt)),
      columns: { id: true, doctorId: true, patientId: true, medication: true, status: true, priority: true },
    });
    if (!prescription) return NextResponse.json({ error: "Prescription not found" }, { status: 404 });

    const update: Record<string, any> = { updatedAt: new Date() };
    let auditAction = "pharmacy.prescription_updated";
    let notificationTitle = "";
    let notificationMessage = "";

    if (action === "flag_review") {
      update.status = "review";
      auditAction = "pharmacy.prescription_flagged_review";
      notificationTitle = "Prescription flagged for pharmacy review";
      notificationMessage = `${prescription.medication || "Prescription"} was flagged by hospital administration for pharmacist review.`;
    } else if (action === "escalate") {
      update.priority = "critical";
      update.isEmergency = true;
      auditAction = "pharmacy.prescription_escalated";
      notificationTitle = "Prescription escalated";
      notificationMessage = `${prescription.medication || "Prescription"} was escalated by hospital administration.`;
    } else if (action === "cancel") {
      update.status = "cancelled";
      update.notes = [String(body.reason || "").trim(), "Cancelled by hospital administration."].filter(Boolean).join(" ");
      auditAction = "pharmacy.prescription_cancelled";
      notificationTitle = "Prescription cancelled";
      notificationMessage = `${prescription.medication || "Prescription"} was cancelled by hospital administration.`;
    } else if (action === "update_status") {
      const status = normalizeStatus(body.status);
      if (!VALID_STATUS.has(status)) return NextResponse.json({ error: "Invalid prescription status." }, { status: 400 });
      update.status = status;
      auditAction = "pharmacy.prescription_status_updated";
    } else if (action === "update_priority") {
      const priority = String(body.priority || "").trim().toLowerCase();
      if (!VALID_PRIORITY.has(priority)) return NextResponse.json({ error: "Invalid prescription priority." }, { status: 400 });
      update.priority = priority;
      auditAction = "pharmacy.prescription_priority_updated";
    } else {
      return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
    }

    const [updated] = await db.update(prescriptions).set(update).where(eq(prescriptions.id, prescriptionId)).returning();

    if (notificationTitle && prescription.doctorId) {
      await db.insert(notifications).values({
        tenantId,
        userId: prescription.doctorId,
        type: "pharmacy_admin_action",
        title: notificationTitle,
        message: notificationMessage,
        metadata: { prescriptionId, patientId: prescription.patientId, action },
        read: false,
      }).catch(() => null);
    }

    await db.insert(auditLogs).values({
      tenantId,
      userId: admin.user?.id || null,
      action: auditAction,
      entity: "prescription",
      entityId: prescriptionId,
      metadata: { action, status: update.status || prescription.status, priority: update.priority || prescription.priority },
    }).catch(() => null);

    return NextResponse.json({ success: true, prescription: updated });
  } catch (error: any) {
    console.error("Error updating prescription:", error);
    return NextResponse.json({ error: error?.message || "Failed to update prescription" }, { status: 500 });
  }
}
