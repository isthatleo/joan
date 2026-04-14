import { db } from "@/lib/db";
import { patients, patientAllergies, patientConditions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export class PatientRepo {
  async findById(id: string) {
    return db.query.patients.findFirst({
      where: eq(patients.id, id),
    });
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

  async createPatient(data: any) {
    return this.repo.create(data);
  }

  async getPatientFullContext(id: string) {
    return this.repo.getFullContext(id);
  }
}
