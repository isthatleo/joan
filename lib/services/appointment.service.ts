import { db } from "@/lib/db";
import { appointments, visits } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export class AppointmentService {
  async createAppointment(data: {
    tenantId: string;
    patientId: string;
    doctorId: string;
    scheduledAt: Date;
    status: string;
  }) {
    return db.insert(appointments).values(data).returning();
  }

  async rescheduleAppointment(id: string, newTime: Date) {
    return db.update(appointments)
      .set({ scheduledAt: newTime })
      .where(eq(appointments.id, id));
  }

  async cancelAppointment(id: string) {
    return db.update(appointments)
      .set({ status: "cancelled" })
      .where(eq(appointments.id, id));
  }

  async getDoctorAppointments(doctorId: string, date: Date) {
    return db.query.appointments.findMany({
      where: eq(appointments.doctorId, doctorId),
    });
  }

  async getPatientAppointments(patientId: string) {
    return db.query.appointments.findMany({
      where: eq(appointments.patientId, patientId),
    });
  }
}
