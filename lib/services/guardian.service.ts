import { db } from "@/lib/db";
import { guardians, guardianPatients, patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export class GuardianService {
  async getChildren(userId: string) {
    const children = await db
      .select({
        id: patients.id,
        name: patients.firstName,
      })
      .from(guardianPatients)
      .innerJoin(guardians, eq(guardianPatients.guardianId, guardians.id))
      .innerJoin(patients, eq(guardianPatients.patientId, patients.id))
      .where(eq(guardians.userId, userId));

    return children;
  }

  async getChildDashboard(patientId: string) {
    // Simplified
    const patient = await db.query.patients.findFirst({
      where: eq(patients.id, patientId),
    });
    return {
      ...patient,
      appointments: [],
      medications: [],
      alerts: [],
    };
  }
}
