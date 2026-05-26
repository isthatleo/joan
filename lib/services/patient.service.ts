import { db } from "@/lib/db";
import { patients, patientAllergies, patientConditions } from "@/lib/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { getEligiblePatientIdsForTenant } from "@/lib/patient-access";

export class PatientRepo {
  async findById(id: string) {
    return db.query.patients.findFirst({
      where: eq(patients.id, id),
    });
  }

  async findByTenantId(tenantId: string) {
    const patientIds = await getEligiblePatientIdsForTenant(tenantId);
    if (!patientIds.length) return [];
    return db.select().from(patients).where(and(eq(patients.tenantId, tenantId), inArray(patients.id, patientIds), isNull(patients.deletedAt)));
  }

  async create(data: any) {
    return db.insert(patients).values(data).returning();
  }

  async getFullContext(id: string) {
    const patient = await this.findById(id);
    if (!patient) return null;

    const allergies = await db.select().from(patientAllergies).where(eq(patientAllergies.patientId, id));
    const conditions = await db.select().from(patientConditions).where(eq(patientConditions.patientId, id));

    return {
      ...patient,
      allergies,
      conditions,
    };
  }
}

export class PatientService {
  constructor(private repo = new PatientRepo()) {}

  async getPatient(id: string) {
    const patient = await this.repo.findById(id);
    if (!patient) throw new Error("Patient not found");
    return patient;
  }

  async getPatientsByTenant(tenantId: string) {
    return this.repo.findByTenantId(tenantId);
  }

  async createPatient(data: any) {
    return this.repo.create(data);
  }

  async getPatientFullContext(id: string) {
    return this.repo.getFullContext(id);
  }
}
