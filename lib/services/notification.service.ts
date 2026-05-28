import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { redis } from "@/lib/redis";
import twilio from "twilio";
import { getIntegrationCredentials, getTenantCommunicationSettings } from "@/lib/integrations/server";
import { sendEmail as sendTenantEmail } from "@/lib/email/send-email";

function getEnvTwilioClient() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return null;
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

async function getTenantTwilioConfig(tenantSlugOrId?: string) {
  if (!tenantSlugOrId) return null;
  const communication = await getTenantCommunicationSettings(tenantSlugOrId).catch(() => ({}));
  if ((communication?.smsProvider || "twilio") !== "twilio") return null;
  const creds = await getIntegrationCredentials(tenantSlugOrId, "twilio").catch(() => null);
  if (!creds?.accountSid || !creds?.authToken) return null;
  return {
    client: twilio(creds.accountSid, creds.authToken),
    fromNumber: creds.phoneNumber || process.env.TWILIO_PHONE_NUMBER || "",
  };
}

export class NotificationService {
  async sendInApp(userId: string, message: string) {
    await db.insert(notifications).values({
      userId,
      type: "in_app",
      message,
      read: false,
    });

    await redis.publish("notifications", JSON.stringify({ userId, message }));
  }

  async sendSMS(phone: string, message: string, options?: { tenantSlugOrId?: string }) {
    try {
      const tenantTwilio = await getTenantTwilioConfig(options?.tenantSlugOrId);
      const client = tenantTwilio?.client || getEnvTwilioClient();
      const from = tenantTwilio?.fromNumber || process.env.TWILIO_PHONE_NUMBER;
      if (!client || !from) {
        throw new Error("No SMS provider is configured");
      }

      await client.messages.create({
        body: message,
        from,
        to: phone,
      });
    } catch (error) {
      console.error("SMS Error:", error);
      throw error;
    }
  }

  async sendEmail(email: string, subject: string, body: string, options?: { tenantSlug?: string; provider?: string; from?: string }) {
    const result = await sendTenantEmail({
      to: email,
      subject,
      text: body,
      tenantSlug: options?.tenantSlug,
      provider: options?.provider,
      from: options?.from,
    });

    if (!result.ok) {
      console.error("Email Error:", result.response);
      throw new Error("Failed to send email");
    }
  }

  async sendWhatsApp(phone: string, message: string, options?: { tenantSlugOrId?: string }) {
    try {
      const tenantTwilio = await getTenantTwilioConfig(options?.tenantSlugOrId);
      const client = tenantTwilio?.client || getEnvTwilioClient();
      const from = process.env.TWILIO_WHATSAPP_NUMBER;
      if (!client || !from) {
        throw new Error("No WhatsApp provider is configured");
      }

      await client.messages.create({
        body: message,
        from: `whatsapp:${from}`,
        to: `whatsapp:${phone}`,
      });
    } catch (error) {
      console.error("WhatsApp Error:", error);
      throw error;
    }
  }

  async markAsRead(notificationId: string) {
    return db.update(notifications)
      .set({ read: true })
      .where((n, { eq }) => eq(n.id, notificationId));
  }
}