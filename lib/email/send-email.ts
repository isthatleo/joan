import { Resend } from "resend";
import { renderToStaticMarkup } from "react-dom/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { emailSendLog } from "@/lib/db/schema";
import { EmailTemplate, EmailTemplateProps } from "@/components/email-template";
import { getIntegrationCredentials, getTenantCommunicationSettings } from "@/lib/integrations/server";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { eq } from "drizzle-orm";

const AttachmentSchema = z.object({
  filename: z.string().min(1),
  content: z.string().min(1),
  contentType: z.string().optional(),
});

export const sendEmailSchema = z
  .object({
    to: z.union([z.string().email(), z.array(z.string().email()).min(1)]),
    cc: z.array(z.string().email()).optional(),
    bcc: z.array(z.string().email()).optional(),
    replyTo: z.string().email().optional(),
    from: z.string().optional(),
    provider: z.string().trim().min(1).optional(),
    subject: z.string().trim().min(1).max(250),
    templateName: z.string().trim().min(1).optional(),
    template: z
      .object({
        templateName: z.string().trim().min(1).optional(),
        firstName: z.string().optional(),
        recipientName: z.string().optional(),
        preheader: z.string().optional(),
        heading: z.string().optional(),
        body: z.string().optional(),
        bodyHtml: z.string().optional(),
        ctaLabel: z.string().optional(),
        ctaUrl: z.string().url().optional(),
        secondaryCtaLabel: z.string().optional(),
        secondaryCtaUrl: z.string().url().optional(),
        brandName: z.string().optional(),
        brandColor: z.string().optional(),
        brandLogoUrl: z.string().url().optional(),
        footerNote: z.string().optional(),
        supportEmail: z.string().email().optional(),
        previewLabel: z.string().optional(),
        statusLabel: z.string().optional(),
        statusTone: z.enum(["default", "success", "warning", "danger", "info"]).optional(),
        summary: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
        sections: z.array(
          z.object({
            title: z.string(),
            body: z.string().optional(),
            bodyHtml: z.string().optional(),
          })
        ).optional(),
        footerLinks: z.array(z.object({ label: z.string(), href: z.string().url() })).optional(),
        variant: z.enum(["default", "alert", "success", "invoice", "report"]).optional(),
        items: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
      })
      .optional(),
    html: z.string().optional(),
    text: z.string().optional(),
    attachments: z.array(AttachmentSchema).optional(),
    tags: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
    scheduledAt: z.string().datetime().optional(),
    tenantSlug: z.string().trim().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.template && !value.html && !value.text) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["template"],
        message: "Provide one of template, html, or text",
      });
    }
  });

const DEFAULT_FROM = process.env.EMAIL_FROM || "Joan <onboarding@resend.dev>";
const FALLBACK_PROVIDER_ORDER = ["resend", "brevo", "sendgrid", "mailgun", "mailgram"] as const;

type ProviderId = (typeof FALLBACK_PROVIDER_ORDER)[number] | "gmail";

export type SendEmailPayload = z.infer<typeof sendEmailSchema>;

type ResolvedProvider = {
  provider: ProviderId;
  tenantId: string | null;
  credentials: Record<string, string>;
  fromAddress: string;
};

function toRecipientList(value: string | string[]) {
  return Array.isArray(value) ? value : [value];
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function buildTextBody(payload: SendEmailPayload) {
  if (payload.text?.trim()) return payload.text.trim();
  if (payload.template?.body?.trim()) return payload.template.body.trim();
  if (payload.template?.bodyHtml?.trim()) return stripHtml(payload.template.bodyHtml);
  if (payload.html?.trim()) return stripHtml(payload.html);
  return payload.subject;
}

function buildHtmlBody(payload: SendEmailPayload) {
  if (payload.template) {
    return "<!DOCTYPE html>" + renderToStaticMarkup(EmailTemplate(payload.template as EmailTemplateProps));
  }
  if (payload.html?.trim()) return payload.html;
  if (payload.text?.trim()) {
    return `<html><body><pre style=\"font-family:Arial,sans-serif;white-space:pre-wrap\">${payload.text}</pre></body></html>`;
  }
  return `<html><body><p>${payload.subject}</p></body></html>`;
}

function pickFromAddress(payload: SendEmailPayload, credentials: Record<string, string>) {
  if (payload.from?.trim()) return payload.from.trim();
  if (credentials.fromEmail) {
    return credentials.fromName
      ? `${credentials.fromName} <${credentials.fromEmail}>`
      : credentials.fromEmail;
  }
  return DEFAULT_FROM;
}

async function resolveProvider(payload: SendEmailPayload): Promise<ResolvedProvider | null> {
  let tenantId: string | null = null;
  let communicationSettings: Record<string, any> = {};

  if (payload.tenantSlug) {
    tenantId = await getTenantIdBySlug(payload.tenantSlug);
    if (tenantId) {
      communicationSettings = await getTenantCommunicationSettings(tenantId).catch(() => ({}));
    }
  }

  const preferredProvider = (payload.provider || communicationSettings.emailProvider || "resend") as ProviderId;
  const candidates = [preferredProvider, ...FALLBACK_PROVIDER_ORDER].filter(
    (provider, index, items) => items.indexOf(provider) === index
  ) as ProviderId[];

  for (const provider of candidates) {
    const credentials = tenantId
      ? ((await getIntegrationCredentials(tenantId, provider).catch(() => null)) || {})
      : {};

    if (provider === "resend") {
      const apiKey = credentials.apiKey || process.env.RESEND_API_KEY || "";
      if (!apiKey) continue;
      const resolvedCredentials = { ...credentials, apiKey };
      return {
        provider,
        tenantId,
        credentials: resolvedCredentials,
        fromAddress: pickFromAddress(payload, resolvedCredentials),
      };
    }

    if (["brevo", "sendgrid", "mailgun", "mailgram"].includes(provider) && credentials.apiKey) {
      return {
        provider,
        tenantId,
        credentials,
        fromAddress: pickFromAddress(payload, credentials),
      };
    }
  }

  return null;
}

async function sendWithResend(payload: SendEmailPayload, provider: ResolvedProvider, html: string, text: string, idempotencyKey: string) {
  const resend = new Resend(provider.credentials.apiKey);
  const { data, error } = await resend.emails.send(
    {
      from: provider.fromAddress,
      to: toRecipientList(payload.to),
      cc: payload.cc,
      bcc: payload.bcc,
      reply_to: payload.replyTo,
      subject: payload.subject,
      html,
      text,
      tags: payload.tags,
      attachments: payload.attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: Buffer.from(attachment.content, "base64"),
        contentType: attachment.contentType,
      })),
      scheduled_at: payload.scheduledAt,
    },
    { idempotencyKey }
  );

  if (error) {
    return { ok: false as const, error: error.message || "Resend send failed" };
  }

  return { ok: true as const, providerMessageId: data?.id || null };
}

async function sendWithBrevo(payload: SendEmailPayload, provider: ResolvedProvider, html: string, text: string) {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": provider.credentials.apiKey,
    },
    body: JSON.stringify({
      sender: {
        name: provider.credentials.fromName || undefined,
        email: provider.credentials.fromEmail || provider.fromAddress.replace(/^.*<([^>]+)>.*$/, "$1"),
      },
      to: toRecipientList(payload.to).map((email) => ({ email })),
      cc: payload.cc?.map((email) => ({ email })),
      bcc: payload.bcc?.map((email) => ({ email })),
      replyTo: payload.replyTo ? { email: payload.replyTo } : undefined,
      subject: payload.subject,
      htmlContent: html,
      textContent: text,
      attachment: payload.attachments?.map((attachment) => ({
        name: attachment.filename,
        content: attachment.content,
      })),
      tags: payload.tags?.map((tag) => `${tag.name}:${tag.value}`),
    }),
  });

  const body = await response.text();
  let parsed: any = null;
  try { parsed = JSON.parse(body); } catch {}
  if (!response.ok) {
    return { ok: false as const, error: parsed?.message || `Brevo send failed (${response.status})` };
  }

  return { ok: true as const, providerMessageId: parsed?.messageId || null };
}

async function sendWithSendGrid(payload: SendEmailPayload, provider: ResolvedProvider, html: string, text: string) {
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.credentials.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{
        to: toRecipientList(payload.to).map((email) => ({ email })),
        cc: payload.cc?.map((email) => ({ email })),
        bcc: payload.bcc?.map((email) => ({ email })),
        custom_args: Object.fromEntries((payload.tags || []).map((tag) => [tag.name, tag.value])),
      }],
      from: {
        email: provider.credentials.fromEmail || provider.fromAddress.replace(/^.*<([^>]+)>.*$/, "$1"),
        name: provider.credentials.fromName || undefined,
      },
      reply_to: payload.replyTo ? { email: payload.replyTo } : undefined,
      subject: payload.subject,
      content: [
        { type: "text/plain", value: text },
        { type: "text/html", value: html },
      ],
      attachments: payload.attachments?.map((attachment) => ({
        content: attachment.content,
        filename: attachment.filename,
        type: attachment.contentType,
        disposition: "attachment",
      })),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { ok: false as const, error: errorText || `SendGrid send failed (${response.status})` };
  }

  return { ok: true as const, providerMessageId: response.headers.get("x-message-id") || null };
}

async function sendWithMailgun(payload: SendEmailPayload, provider: ResolvedProvider, html: string, text: string) {
  const domain = provider.credentials.domain;
  if (!domain) return { ok: false as const, error: "Mailgun domain is required" };

  const baseUrl = provider.credentials.region === "eu" ? "https://api.eu.mailgun.net" : "https://api.mailgun.net";
  const form = new FormData();
  form.set("from", provider.fromAddress);
  for (const recipient of toRecipientList(payload.to)) form.append("to", recipient);
  for (const cc of payload.cc || []) form.append("cc", cc);
  for (const bcc of payload.bcc || []) form.append("bcc", bcc);
  if (payload.replyTo) form.set("h:Reply-To", payload.replyTo);
  form.set("subject", payload.subject);
  form.set("html", html);
  form.set("text", text);
  for (const attachment of payload.attachments || []) {
    form.append(
      "attachment",
      new Blob([Buffer.from(attachment.content, "base64")], { type: attachment.contentType || "application/octet-stream" }),
      attachment.filename
    );
  }

  const response = await fetch(`${baseUrl}/v3/${encodeURIComponent(domain)}/messages`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`api:${provider.credentials.apiKey}`).toString("base64"),
    },
    body: form,
  });

  const body = await response.text();
  let parsed: any = null;
  try { parsed = JSON.parse(body); } catch {}
  if (!response.ok) {
    return { ok: false as const, error: parsed?.message || body || `Mailgun send failed (${response.status})` };
  }

  return { ok: true as const, providerMessageId: parsed?.id || null };
}

async function sendWithMailgram(payload: SendEmailPayload, provider: ResolvedProvider, html: string, text: string) {
  const baseUrl = provider.credentials.baseUrl || "https://api.mailgram.com";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.credentials.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: provider.fromAddress,
      to: toRecipientList(payload.to),
      cc: payload.cc,
      bcc: payload.bcc,
      replyTo: payload.replyTo,
      subject: payload.subject,
      html,
      text,
      attachments: payload.attachments,
      tags: payload.tags,
    }),
  });

  const body = await response.text();
  let parsed: any = null;
  try { parsed = JSON.parse(body); } catch {}
  if (!response.ok) {
    return { ok: false as const, error: parsed?.error || body || `Mailgram send failed (${response.status})` };
  }

  return { ok: true as const, providerMessageId: parsed?.id || parsed?.messageId || null };
}

async function dispatchEmail(payload: SendEmailPayload, provider: ResolvedProvider, html: string, text: string, idempotencyKey: string) {
  switch (provider.provider) {
    case "resend":
      return sendWithResend(payload, provider, html, text, idempotencyKey);
    case "brevo":
      return sendWithBrevo(payload, provider, html, text);
    case "sendgrid":
      return sendWithSendGrid(payload, provider, html, text);
    case "mailgun":
      return sendWithMailgun(payload, provider, html, text);
    case "mailgram":
      return sendWithMailgram(payload, provider, html, text);
    default:
      return { ok: false as const, error: `Email provider ${provider.provider} is not supported for outbound sending yet` };
  }
}

export async function sendEmail(
  payload: SendEmailPayload,
  options?: {
    idempotencyKey?: string;
    sourceLogId?: string;
  }
) {
  const resolvedProvider = await resolveProvider(payload);
  if (!resolvedProvider) {
    return {
      ok: false as const,
      response: Response.json({ error: "No configured outbound email provider is available" }, { status: 503 }),
    };
  }

  const recipients = toRecipientList(payload.to);
  const templateName = payload.templateName || payload.template?.templateName;
  const html = buildHtmlBody(payload);
  const text = buildTextBody(payload);
  const metadata = {
    hasAttachments: Boolean(payload.attachments?.length),
    tags: payload.tags || [],
    sourceLogId: options?.sourceLogId || null,
    sendRequest: payload,
    preferredProvider: payload.provider || null,
  };

  const [logRow] = await db
    .insert(emailSendLog)
    .values({
      tenantId: resolvedProvider.tenantId,
      toAddress: recipients.join(","),
      fromAddress: resolvedProvider.fromAddress,
      subject: payload.subject,
      template: templateName || (payload.template ? "rich" : payload.html ? "html" : "text"),
      status: "queued",
      provider: resolvedProvider.provider,
      metadata,
    })
    .returning({ id: emailSendLog.id });

  const logId = logRow.id;
  const idempotencyKey = options?.idempotencyKey || `email-log/${logId}`;
  const result = await dispatchEmail(payload, resolvedProvider, html, text, idempotencyKey);

  if (!result.ok) {
    await db
      .update(emailSendLog)
      .set({ status: "failed", error: String(result.error || "Failed to send email"), updatedAt: new Date() })
      .where(eq(emailSendLog.id, logId));

    return {
      ok: false as const,
      response: Response.json(
        { error: result.error || "Failed to send email", logId, provider: resolvedProvider.provider },
        { status: 502 }
      ),
    };
  }

  await db
    .update(emailSendLog)
    .set({
      status: "sent",
      provider: resolvedProvider.provider,
      providerMessageId: result.providerMessageId || null,
      error: null,
      updatedAt: new Date(),
    })
    .where(eq(emailSendLog.id, logId));

  return {
    ok: true as const,
    data: {
      success: true,
      id: result.providerMessageId,
      logId,
      provider: resolvedProvider.provider,
    },
  };
}
