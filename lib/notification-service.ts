import { db } from "@/lib/db";
import { notifications, appointments, users } from "@/lib/db/schema";
import { and, gte, lt } from "drizzle-orm";

export interface NotificationData {
  userId: string;
  type: string;
  title?: string;
  message: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  /**
   * Create a notification for a user
   */
  static async createNotification(data: NotificationData) {
    try {
      const notification = await db.insert(notifications).values({
        userId: data.userId,
        type: data.type,
        title: data.title || data.type.charAt(0).toUpperCase() + data.type.slice(1),
        message: data.message,
        metadata: data.metadata,
      }).returning();

      // TODO: Send real-time notification via WebSocket
      // await this.sendRealtimeNotification(data.userId, notification[0]);

      return notification[0];
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  /**
   * Create system-wide notifications for all users with specific roles
   */
  static async createSystemNotification(
    type: string,
    title: string,
    message: string,
    metadata?: Record<string, any>,
    targetRoles?: string[]
  ) {
    try {
      // Get all users (or filter by roles if specified)
      let users;
      if (targetRoles && targetRoles.length > 0) {
        // TODO: Implement role-based filtering when user roles are available
        users = await db.query.users.findMany();
      } else {
        users = await db.query.users.findMany();
      }

      const notifications = await Promise.all(
        users.map(user =>
          this.createNotification({
            userId: user.id,
            type,
            title,
            message,
            metadata,
          })
        )
      );

      return notifications;
    } catch (error) {
      console.error("Error creating system notifications:", error);
      throw error;
    }
  }

  /**
   * Predefined notification types and their default messages
   */
  static async notifyAppointmentCreated(appointmentId: string, patientId: string, doctorId: string) {
    // Notify doctor
    await this.createNotification({
      userId: doctorId,
      type: "appointment",
      title: "New Appointment Scheduled",
      message: "A new appointment has been scheduled for you.",
      metadata: { appointmentId, patientId, action: "created" },
    });

    // Notify patient (if patient user exists)
    // TODO: Link patients to users when patient accounts are implemented
  }

  static async notifyAppointmentUpdated(appointmentId: string, patientId: string, doctorId: string) {
    await this.createNotification({
      userId: doctorId,
      type: "appointment",
      title: "Appointment Updated",
      message: "An appointment has been updated.",
      metadata: { appointmentId, patientId, action: "updated" },
    });
  }

  static async notifyAppointmentCancelled(appointmentId: string, patientId: string, doctorId: string) {
    await this.createNotification({
      userId: doctorId,
      type: "appointment",
      title: "Appointment Cancelled",
      message: "An appointment has been cancelled.",
      metadata: { appointmentId, patientId, action: "cancelled" },
    });
  }

  static async notifyPatientRegistered(patientId: string) {
    await this.createSystemNotification(
      "patient",
      "New Patient Registered",
      "A new patient has been registered in the system.",
      { patientId, action: "registered" },
      ["admin", "super_admin", "doctor"]
    );
  }

  static async notifyLabResultReady(labOrderId: string, patientId: string, doctorId: string) {
    await this.createNotification({
      userId: doctorId,
      type: "lab",
      title: "Lab Results Ready",
      message: "Lab results are now available for review.",
      metadata: { labOrderId, patientId, action: "results_ready" },
    });
  }

  static async notifyPrescriptionCreated(prescriptionId: string, patientId: string, doctorId: string) {
    await this.createNotification({
      userId: doctorId,
      type: "prescription",
      title: "Prescription Created",
      message: "A new prescription has been created.",
      metadata: { prescriptionId, patientId, action: "created" },
    });
  }

  static async notifySystemAlert(message: string, severity: "low" | "medium" | "high" | "critical" = "medium") {
    await this.createSystemNotification(
      "system",
      "System Alert",
      message,
      { severity, action: "alert" },
      ["admin", "super_admin"]
    );
  }

  static async notifyFeatureUpdate(feature: string, description: string) {
    await this.createSystemNotification(
      "feature",
      "New Feature Available",
      `${feature}: ${description}`,
      { feature, action: "update" }
    );
  }

  static async notifyBugFixed(bug: string, description: string) {
    await this.createSystemNotification(
      "bug",
      "Bug Fixed",
      `${bug}: ${description}`,
      { bug, action: "fixed" }
    );
  }

  static async notifyUIUpdate(component: string, description: string) {
    await this.createSystemNotification(
      "ui",
      "UI Update",
      `${component}: ${description}`,
      { component, action: "update" }
    );
  }

  static async notifySecurityAlert(message: string) {
    await this.createSystemNotification(
      "security",
      "Security Alert",
      message,
      { action: "alert" },
      ["admin", "super_admin"]
    );
  }

  static async notifyMaintenanceScheduled(startTime: string, duration: string, description: string) {
    await this.createSystemNotification(
      "maintenance",
      "Scheduled Maintenance",
      `System maintenance scheduled for ${startTime} (${duration}). ${description}`,
      { startTime, duration, action: "scheduled" }
    );
  }

  static async notifyQueueUpdate(queueId: string, patientId: string, status: string) {
    // Notify relevant staff about queue updates
    await this.createSystemNotification(
      "queue",
      "Queue Update",
      `Patient queue status updated to: ${status}`,
      { queueId, patientId, status, action: "update" },
      ["admin", "super_admin", "staff"]
    );
  }

  static async notifyInventoryLow(itemName: string, currentStock: number, threshold: number) {
    await this.createSystemNotification(
      "inventory",
      "Low Inventory Alert",
      `${itemName} is running low (${currentStock} remaining, threshold: ${threshold})`,
      { itemName, currentStock, threshold, action: "low_stock" },
      ["admin", "super_admin", "pharmacy"]
    );
  }

  static async notifyPaymentReceived(invoiceId: string, amount: string, patientId: string) {
    await this.createSystemNotification(
      "payment",
      "Payment Received",
      `Payment of ${amount} received for invoice.`,
      { invoiceId, amount, patientId, action: "received" },
      ["admin", "super_admin", "billing"]
    );
  }

  static async notifyComplianceCheckFailed(checkName: string, details: string) {
    await this.createSystemNotification(
      "compliance",
      "Compliance Check Failed",
      `${checkName}: ${details}`,
      { checkName, details, action: "failed" },
      ["admin", "super_admin", "compliance"]
    );
  }

  static async notifyTodaysAppointments() {
    try {
      // Get today's date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get all appointments for today
      const todaysAppointments = await db.query.appointments.findMany({
        where: and(
          gte(appointments.scheduledAt, today),
          lt(appointments.scheduledAt, tomorrow)
        ),
        with: {
          patient: true,
          doctor: true
        }
      });

      // Create notifications for doctors and admins
      const notifications = [];

      for (const appointment of todaysAppointments) {
        // Notify the assigned doctor
        if (appointment.doctorId) {
          const doctorNotification = await this.createNotification({
            userId: appointment.doctorId,
            type: "appointment",
            title: "Today's Appointment Reminder",
            message: `You have an appointment with ${appointment.patient?.firstName} ${appointment.patient?.lastName} at ${appointment.scheduledAt.toLocaleTimeString()}`,
            metadata: {
              appointmentId: appointment.id,
              patientId: appointment.patientId,
              action: "reminder",
              time: appointment.scheduledAt.toISOString()
            }
          });
          notifications.push(doctorNotification);
        }

        // Notify admins about today's appointments
        const adminUsers = await db.query.users.findMany({
          // TODO: Filter by admin role when roles are properly implemented
        });

        for (const admin of adminUsers) {
          const adminNotification = await this.createNotification({
            userId: admin.id,
            type: "appointment",
            title: "Today's Appointments Overview",
            message: `Appointment scheduled: ${appointment.patient?.firstName} ${appointment.patient?.lastName} with ${appointment.doctor?.fullName} at ${appointment.scheduledAt.toLocaleTimeString()}`,
            metadata: {
              appointmentId: appointment.id,
              patientId: appointment.patientId,
              doctorId: appointment.doctorId,
              action: "overview",
              time: appointment.scheduledAt.toISOString()
            }
          });
          notifications.push(adminNotification);
        }
      }

      return notifications;
    } catch (error) {
      console.error("Error creating today's appointment notifications:", error);
      throw error;
    }
  }
}
