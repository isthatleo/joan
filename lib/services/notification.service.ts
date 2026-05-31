import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { redis } from "@/lib/redis";
import { createHash, createHmac } from "crypto";
import { eq } from "drizzle-orm";
import twilio from "twilio";
import { getIntegrationCredentials, getTenantCommunicationSettings } from "@/lib/integrations/server";
import { sendEmail as sendTenantEmail } from "@/lib/email/send-email";

function getEnvTwilioClient() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return null;
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

async function getTenantTwilioConfig(tenantSlugOrId?: string) {
  if (!tenantSlugOrId) return null;
  const communication = await getTenantCommunicationSettings(tenantSlugOrId).catch(() => ({} as Record<string, any>)) as Record<string, any>;
  if ((communication?.smsProvider || "twilio") !== "twilio") return null;
  const creds = await getIntegrationCredentials(tenantSlugOrId, "twilio").catch(() => null);
  if (!creds?.accountSid || !creds?.authToken) return null;
  return {
    client: twilio(creds.accountSid, creds.authToken),
    fromNumber: creds.phoneNumber || process.env.TWILIO_PHONE_NUMBER || "",
  };
}

async function sendTenantSmsViaConfiguredProvider(phone: string, message: string, tenantSlugOrId?: string) {
  if (!tenantSlugOrId) return false;
  const communication = await getTenantCommunicationSettings(tenantSlugOrId).catch(() => ({} as Record<string, any>)) as Record<string, any>;
  const provider = communication?.smsProvider || "twilio";
  const creds = await getIntegrationCredentials(tenantSlugOrId, provider).catch(() => null);
  if (!creds) return false;

  if (provider === "twilio" && creds.accountSid && creds.authToken) {
    const client = twilio(creds.accountSid, creds.authToken);
    await client.messages.create({
      body: message,
      from: creds.phoneNumber || process.env.TWILIO_PHONE_NUMBER || "",
      to: phone,
    });
    return true;
  }

  if (provider === "nexmo" && creds.apiKey && creds.apiSecret) {
    const response = await fetch("https://rest.nexmo.com/sms/json", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        api_key: creds.apiKey,
        api_secret: creds.apiSecret,
        from: creds.brandName || "Joan",
        to: phone.replace(/^\+/, ""),
        text: message,
      }),
    });
    const data = await response.json().catch(() => ({}));
    const firstMessage = Array.isArray(data?.messages) ? data.messages[0] : null;
    if (!response.ok || (firstMessage && firstMessage.status !== "0")) {
      throw new Error(firstMessage?.["error-text"] || `Vonage SMS failed (${response.status})`);
    }
    return true;
  }

  if (provider === "messagebird" && creds.apiKey) {
    const response = await fetch("https://rest.messagebird.com/messages", {
      method: "POST",
      headers: {
        Authorization: `AccessKey ${creds.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        originator: creds.originator || "Joan",
        recipients: [phone],
        body: message,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.issues?.[0]?.description || `MessageBird SMS failed (${response.status})`);
    }
    return true;
  }

  if (provider === "aws-sns" && creds.accessKey && creds.secretKey && creds.region) {
    const endpoint = `https://sns.${creds.region}.amazonaws.com/`;
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const body = new URLSearchParams({
      Action: "Publish",
      Version: "2010-03-31",
      PhoneNumber: phone,
      Message: message,
    }).toString();
    const payloadHash = createHash("sha256").update(body, "utf8").digest("hex");
    const host = `sns.${creds.region}.amazonaws.com`;
    const canonicalHeaders = `content-type:application/x-www-form-urlencoded; charset=utf-8\nhost:${host}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = "content-type;host;x-amz-date";
    const canonicalRequest = ["POST", "/", "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
    const credentialScope = `${dateStamp}/${creds.region}/sns/aws4_request`;
    const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, createHash("sha256").update(canonicalRequest, "utf8").digest("hex")].join("\n");
    const hmac = (key: Buffer | string, value: string) => createHmac("sha256", key).update(value, "utf8").digest();
    const kDate = hmac(`AWS4${creds.secretKey}`, dateStamp);
    const kRegion = hmac(kDate, creds.region);
    const kService = hmac(kRegion, "sns");
    const signingKey = hmac(kService, "aws4_request");
    const signature = createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
        "X-Amz-Date": amzDate,
        Authorization: `AWS4-HMAC-SHA256 Credential=${creds.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      },
      body,
    });
    if (!response.ok) throw new Error(`AWS SNS SMS failed (${response.status})`);
    return true;
  }

  return false;
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
      const sentViaTenantProvider = await sendTenantSmsViaConfiguredProvider(phone, message, options?.tenantSlugOrId);
      if (sentViaTenantProvider) return;

      const client = getEnvTwilioClient();
      const from = process.env.TWILIO_PHONE_NUMBER;
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
      .where(eq(notifications.id, notificationId));
  }
}
