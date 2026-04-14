import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { redis } from "@/lib/redis";
import twilio from "twilio";

const twiliClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export class NotificationService {
  async sendInApp(userId: string, message: string) {
    await db.insert(notifications).values({
      userId,
      type: "in_app",
      message,
      read: false,
    });

    // Publish to WebSocket
    await redis.publish("notifications", JSON.stringify({ userId, message }));
  }

  async sendSMS(phone: string, message: string) {
    try {
      await twiliClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
    } catch (error) {
      console.error("SMS Error:", error);
    }
  }

  async sendEmail(email: string, subject: string, body: string) {
    // Implement with SendGrid or similar
    console.log(`Sending email to ${email}: ${subject}`);
  }

  async sendWhatsApp(phone: string, message: string) {
    try {
      await twiliClient.messages.create({
        body: message,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${phone}`,
      });
    } catch (error) {
      console.error("WhatsApp Error:", error);
    }
  }

  async markAsRead(notificationId: string) {
    return db.update(notifications)
      .set({ read: true })
      .where((n, { eq }) => eq(n.id, notificationId));
  }
}
