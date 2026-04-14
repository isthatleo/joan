import { db } from "@/lib/db";
import { visits, diagnoses, vitals } from "@/lib/db/schema";

export class VisitService {
  async createVisit(data: {
    tenantId: string;
    patientId: string;
    doctorId: string;
    appointmentId: string;
    reason: string;
    notes: string;
  }) {
    return db.insert(visits).values(data).returning();
  }

  async addDiagnosis(data: {
    visitId: string;
    code: string;
    description: string;
  }) {
    return db.insert(diagnoses).values(data).returning();
  }

  async recordVitals(data: {
    visitId: string;
    temperature: string;
    bloodPressure: string;
    heartRate: string;
  }) {
    return db.insert(vitals).values(data).returning();
  }

  async getVisitDetails(visitId: string) {
    return db.query.visits.findFirst({
      where: (visits, { eq }) => eq(visits.id, visitId),
    });
  }

  async getPatientVisits(patientId: string) {
    return db.query.visits.findMany();
  }
}
