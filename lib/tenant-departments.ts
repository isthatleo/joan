import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { bedAssignments, departments, patients, tenantSettings, userSettings, users } from "@/lib/db/schema";

export type DepartmentMetadata = {
  description?: string;
  category?: string;
  level?: "major" | "minor" | "support";
  status?: "excellent" | "good" | "warning" | "critical";
  headUserId?: string;
  beds?: number;
  budget?: number;
  equipmentCount?: number;
  lastMaintenance?: string;
};

const METADATA_KEY = "department_metadata";

export const DEFAULT_DEPARTMENTS: Array<{ name: string } & DepartmentMetadata> = [
  { name: "Emergency", description: "Emergency triage, stabilization, trauma and urgent care.", category: "Clinical", level: "major", beds: 12, equipmentCount: 24 },
  { name: "Intensive Care Unit", description: "Critical care and high-dependency monitoring.", category: "Clinical", level: "major", beds: 10, equipmentCount: 35 },
  { name: "Outpatient Department", description: "Ambulatory consultations and follow-up clinics.", category: "Clinical", level: "major", beds: 0, equipmentCount: 12 },
  { name: "Internal Medicine", description: "Adult medical diagnosis, care and ward management.", category: "Clinical", level: "major", beds: 24, equipmentCount: 18 },
  { name: "Surgery", description: "Surgical consultations, operating theatre coordination and post-op care.", category: "Clinical", level: "major", beds: 20, equipmentCount: 30 },
  { name: "Pediatrics", description: "Neonatal, child and adolescent clinical care.", category: "Clinical", level: "major", beds: 18, equipmentCount: 18 },
  { name: "Obstetrics & Gynecology", description: "Maternity, reproductive health and women's health services.", category: "Clinical", level: "major", beds: 20, equipmentCount: 22 },
  { name: "Cardiology", description: "Heart and vascular outpatient and inpatient care.", category: "Specialty", level: "major", beds: 8, equipmentCount: 15 },
  { name: "Neurology", description: "Neurological diagnosis, treatment and follow-up care.", category: "Specialty", level: "minor", beds: 6, equipmentCount: 10 },
  { name: "Orthopedics", description: "Bone, joint, trauma and rehabilitation coordination.", category: "Specialty", level: "minor", beds: 10, equipmentCount: 12 },
  { name: "Radiology", description: "Imaging services including X-ray, ultrasound, CT and MRI workflows.", category: "Diagnostics", level: "major", beds: 0, equipmentCount: 20 },
  { name: "Laboratory", description: "Specimen processing, pathology, microbiology and result reporting.", category: "Diagnostics", level: "major", beds: 0, equipmentCount: 28 },
  { name: "Pharmacy", description: "Medication dispensing, inventory and drug safety support.", category: "Support", level: "major", beds: 0, equipmentCount: 14 },
  { name: "Anesthesiology", description: "Anesthesia services and perioperative pain management.", category: "Clinical", level: "minor", beds: 0, equipmentCount: 12 },
  { name: "Oncology", description: "Cancer diagnosis, treatment and longitudinal care coordination.", category: "Specialty", level: "minor", beds: 8, equipmentCount: 10 },
  { name: "Psychiatry", description: "Mental health assessment, counseling and treatment services.", category: "Specialty", level: "minor", beds: 6, equipmentCount: 6 },
  { name: "Dermatology", description: "Skin, hair and nail specialty services.", category: "Specialty", level: "minor", beds: 0, equipmentCount: 5 },
  { name: "ENT", description: "Ear, nose and throat specialty services.", category: "Specialty", level: "minor", beds: 0, equipmentCount: 7 },
  { name: "Ophthalmology", description: "Eye care, vision assessment and ophthalmic procedures.", category: "Specialty", level: "minor", beds: 0, equipmentCount: 8 },
  { name: "Dental", description: "Oral health, dental procedures and preventive dentistry.", category: "Specialty", level: "minor", beds: 0, equipmentCount: 8 },
  { name: "Physiotherapy", description: "Rehabilitation, mobility restoration and functional recovery.", category: "Support", level: "minor", beds: 0, equipmentCount: 10 },
  { name: "Nutrition & Dietetics", description: "Clinical nutrition, diet plans and inpatient dietary support.", category: "Support", level: "minor", beds: 0, equipmentCount: 4 },
  { name: "Medical Records", description: "Patient records, documentation governance and chart management.", category: "Administration", level: "support", beds: 0, equipmentCount: 6 },
  { name: "Billing", description: "Billing, invoices, claims and payment administration.", category: "Administration", level: "support", beds: 0, equipmentCount: 6 },
  { name: "Reception", description: "Front desk, appointments, registration and patient flow.", category: "Administration", level: "support", beds: 0, equipmentCount: 6 },
  { name: "Administration", description: "Hospital administration, governance and operational management.", category: "Administration", level: "support", beds: 0, equipmentCount: 8 },
  { name: "Housekeeping", description: "Environmental hygiene, cleaning schedules and ward readiness.", category: "Operations", level: "support", beds: 0, equipmentCount: 10 },
  { name: "Maintenance", description: "Facility maintenance, biomedical support and repairs.", category: "Operations", level: "support", beds: 0, equipmentCount: 12 },
  { name: "Security", description: "Physical security, access control and safety monitoring.", category: "Operations", level: "support", beds: 0, equipmentCount: 6 },
  { name: "Ambulance Services", description: "Ambulance dispatch, transfers and pre-hospital coordination.", category: "Operations", level: "support", beds: 0, equipmentCount: 10 },
];

function keyName(value: string) {
  return value.trim().toLowerCase();
}

async function readMetadata(tenantId: string): Promise<Record<string, DepartmentMetadata>> {
  const row = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, METADATA_KEY)),
  });
  return ((row?.value as Record<string, DepartmentMetadata> | undefined) || {});
}

async function writeMetadata(tenantId: string, value: Record<string, DepartmentMetadata>) {
  const current = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, METADATA_KEY)),
  });

  if (current) {
    await db.update(tenantSettings).set({ value, updatedAt: new Date() }).where(eq(tenantSettings.id, current.id));
    return;
  }

  await db.insert(tenantSettings).values({ tenantId, key: METADATA_KEY, value, updatedAt: new Date() });
}

export async function syncDefaultDepartments(tenantId: string) {
  const existing = await db.query.departments.findMany({
    where: and(eq(departments.tenantId, tenantId), isNull(departments.deletedAt)),
  });
  const existingNames = new Set(existing.map((department) => keyName(department.name || "")));
  const metadata = await readMetadata(tenantId);

  let created = 0;
  for (const item of DEFAULT_DEPARTMENTS) {
    if (!existingNames.has(keyName(item.name))) {
      const [department] = await db.insert(departments).values({ tenantId, name: item.name }).returning();
      metadata[department.id] = {
        description: item.description,
        category: item.category,
        level: item.level,
        beds: item.beds || 0,
        equipmentCount: item.equipmentCount || 0,
        status: "good",
      };
      created += 1;
    }
  }

  await writeMetadata(tenantId, metadata);
  return { created };
}

export async function createDepartment(tenantId: string, input: { name: string } & DepartmentMetadata) {
  const name = input.name.trim();
  const existing = await db.query.departments.findFirst({
    where: and(eq(departments.tenantId, tenantId), eq(departments.name, name), isNull(departments.deletedAt)),
  });
  if (existing) throw new Error("A department with this name already exists.");

  const [department] = await db.insert(departments).values({ tenantId, name }).returning();
  const metadata = await readMetadata(tenantId);
  metadata[department.id] = {
    description: input.description || "",
    category: input.category || "Clinical",
    level: input.level || "minor",
    status: input.status || "good",
    headUserId: input.headUserId || "",
    beds: Number(input.beds || 0),
    budget: Number(input.budget || 0),
    equipmentCount: Number(input.equipmentCount || 0),
    lastMaintenance: input.lastMaintenance || "",
  };
  await writeMetadata(tenantId, metadata);
  return department;
}

export async function getDepartmentRows(tenantId: string) {
  await syncDefaultDepartments(tenantId);

  const [departmentRows, staffRows, bedRows, patientRows, metadata] = await Promise.all([
    db.query.departments.findMany({
      where: and(eq(departments.tenantId, tenantId), isNull(departments.deletedAt)),
      orderBy: [asc(departments.name)],
    }),
    db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        isActive: users.isActive,
        bio: users.bio,
        settings: userSettings.settings,
      })
      .from(users)
      .leftJoin(userSettings, eq(userSettings.userId, users.id))
      .where(and(eq(users.tenantId, tenantId), isNull(users.deletedAt)))
      .catch(() => []),
    db.query.bedAssignments.findMany({ where: eq(bedAssignments.tenantId, tenantId) }).catch(() => []),
    db.query.patients.findMany({ where: and(eq(patients.tenantId, tenantId), isNull(patients.deletedAt)) }).catch(() => []),
    readMetadata(tenantId),
  ]);

  return departmentRows.map((department) => {
    const meta = metadata[department.id] || {};
    const staff = staffRows.filter((member) => {
      const settings = (member.settings && typeof member.settings === "object" ? member.settings : {}) as Record<string, any>;
      return settings.staffProfile?.departmentId === department.id || keyName(settings.staffProfile?.department || member.bio || "") === keyName(department.name || "");
    });
    const beds = Number(meta.beds || 0);
    const occupiedBeds = bedRows.filter((bed) => keyName(bed.ward || "") === keyName(department.name || "") && bed.status !== "available").length;
    const utilization = beds > 0 ? Math.round((occupiedBeds / beds) * 100) : 0;
    const status = (meta.status || (utilization >= 90 ? "critical" : utilization >= 75 ? "warning" : utilization >= 55 ? "good" : "excellent")) as DepartmentMetadata["status"];
    const head = meta.headUserId ? staffRows.find((member) => member.id === meta.headUserId) : null;

    return {
      id: department.id,
      name: department.name || "Department",
      description: meta.description || "Department profile and operational metrics.",
      category: meta.category || "Clinical",
      level: meta.level || "minor",
      headUserId: meta.headUserId || null,
      headOfDepartment: head?.fullName || head?.email || "Not assigned",
      totalStaff: staff.length,
      activeStaff: staff.filter((member) => member.isActive).length,
      beds,
      occupiedBeds,
      patients: patientRows.length && (department.name || "").toLowerCase().includes("outpatient") ? patientRows.length : 0,
      utilization,
      status,
      avgWaitTime: 0,
      revenue: 0,
      budget: Number(meta.budget || 0),
      equipmentCount: Number(meta.equipmentCount || 0),
      lastMaintenance: meta.lastMaintenance || "",
      appointmentCount: 0,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt,
    };
  });
}

export async function getDepartmentStats(tenantId: string) {
  const rows = await getDepartmentRows(tenantId);
  const totalBeds = rows.reduce((sum, row) => sum + row.beds, 0);
  const occupiedBeds = rows.reduce((sum, row) => sum + row.occupiedBeds, 0);
  return {
    totalDepartments: rows.length,
    totalStaff: rows.reduce((sum, row) => sum + row.totalStaff, 0),
    activeStaff: rows.reduce((sum, row) => sum + row.activeStaff, 0),
    totalBeds,
    occupiedBeds,
    totalPatients: rows.reduce((sum, row) => sum + row.patients, 0),
    averageUtilization: totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
    totalRevenue: rows.reduce((sum, row) => sum + row.revenue, 0),
  };
}
