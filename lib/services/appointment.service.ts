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
    const appointment = await db.insert(appointments).values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    // Send notifications to all parties
    if (appointment[0]) {
      await this.sendAppointmentNotifications(appointment[0]);
    }

    return appointment[0];
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

  async sendAppointmentNotifications(appointment: any) {
    try {
      // Send in-app notification to patient
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: appointment.patientId,
          type: 'appointment_scheduled',
          title: 'Appointment Scheduled',
          message: `Your appointment with Dr. ${appointment.doctorId} is confirmed for ${appointment.scheduledAt.toLocaleString()}`,
          metadata: { appointmentId: appointment.id }
        })
      });

      // Send notification to doctor (would need doctor user ID lookup in real implementation)
      // For now, we'll create a system notification for hospital staff
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'hospital-admin', // Placeholder - would need actual doctor/hospital admin user ID
          type: 'new_patient_appointment',
          title: 'New Patient Appointment',
          message: `New appointment scheduled: Patient ${appointment.patientId} with Dr. ${appointment.doctorId} on ${appointment.scheduledAt.toLocaleString()}`,
          metadata: { appointmentId: appointment.id }
        })
      });

    } catch (error) {
      console.error("An error occurred while sending appointment notifications:", error);
    }
  }
}
