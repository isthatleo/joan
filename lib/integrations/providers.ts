// Integration provider registry. Each provider declares its credential fields,
// category, docs, and how to verify the credentials.

export type IntegrationCategory =
  | "email"
  | "communication"
  | "ai"
  | "data"
  | "productivity"
  | "scraping"
  | "recruiting"
  | "calendar";

export type IntegrationField = {
  key: string;
  label: string;
  type: "text" | "password" | "url";
  required?: boolean;
  placeholder?: string;
  help?: string;
};

export type IntegrationProvider = {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  docsUrl: string;
  fields: IntegrationField[];
  /**
   * Optional verification — returns { ok, error?, account? } when called server-side
   * with decrypted credentials. Implemented lazily to avoid importing fetch in client bundle.
   */
  verify?: (creds: Record<string, string>) => Promise<{ ok: boolean; error?: string; account?: string }>;
};

async function jsonFetch(url: string, init: RequestInit) {
  try {
    const res = await fetch(url, init);
    const text = await res.text();
    let body: any = text;
    try { body = JSON.parse(text); } catch {}
    return { ok: res.ok, status: res.status, body };
  } catch (e: any) {
    return { ok: false, status: 0, body: e?.message || "Network error" };
  }
}

export const INTEGRATION_PROVIDERS: IntegrationProvider[] = [
  {
    id: "sendgrid",
    name: "SendGrid",
    category: "email",
    description: "Transactional and marketing email delivery.",
    docsUrl: "https://docs.sendgrid.com/",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", required: true, placeholder: "SG...." },
      { key: "fromEmail", label: "Default From Email", type: "text", placeholder: "noreply@hospital.com" },
      { key: "fromName", label: "Default From Name", type: "text", placeholder: "Hospital Name" },
    ],
    verify: async (c) => {
      const r = await jsonFetch("https://api.sendgrid.com/v3/user/account", {
        headers: { Authorization: `Bearer ${c.apiKey}` },
      });
      return r.ok ? { ok: true, account: r.body?.email || c.fromEmail } : { ok: false, error: `SendGrid error: ${r.status}` };
    },
  },
  {
    id: "resend",
    name: "Resend",
    category: "email",
    description: "Transactional email delivery.",
    docsUrl: "https://resend.com/docs",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", required: true, placeholder: "re_..." },
      { key: "fromEmail", label: "Default From Email", type: "text", placeholder: "noreply@hospital.com" },
      { key: "fromName", label: "Default From Name", type: "text", placeholder: "Hospital Name" },
    ],
    verify: async (c) => {
      const r = await jsonFetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${c.apiKey}` },
      });
      return r.ok ? { ok: true, account: c.fromEmail } : { ok: false, error: `Resend error: ${r.status}` };
    },
  },
  {
    id: "brevo",
    name: "Brevo (Sendinblue)",
    category: "email",
    description: "Email, SMS and marketing automation.",
    docsUrl: "https://developers.brevo.com/",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", required: true, placeholder: "xkeysib-..." },
      { key: "fromEmail", label: "Default From Email", type: "text" },
    ],
    verify: async (c) => {
      const r = await jsonFetch("https://api.brevo.com/v3/account", {
        headers: { "api-key": c.apiKey, accept: "application/json" },
      });
      return r.ok ? { ok: true, account: r.body?.email || c.fromEmail } : { ok: false, error: `Brevo error: ${r.status}` };
    },
  },
  {
    id: "mailgun",
    name: "Mailgun",
    category: "email",
    description: "Email API for transactional and bulk mail.",
    docsUrl: "https://documentation.mailgun.com/",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", required: true },
      { key: "domain", label: "Sending Domain", type: "text", required: true, placeholder: "mg.hospital.com" },
      { key: "region", label: "Region", type: "text", placeholder: "us | eu" },
    ],
    verify: async (c) => {
      const base = c.region === "eu" ? "https://api.eu.mailgun.net" : "https://api.mailgun.net";
      const r = await jsonFetch(`${base}/v3/domains/${encodeURIComponent(c.domain)}`, {
        headers: { Authorization: "Basic " + Buffer.from(`api:${c.apiKey}`).toString("base64") },
      });
      return r.ok ? { ok: true, account: c.domain } : { ok: false, error: `Mailgun error: ${r.status}` };
    },
  },
  {
    id: "mailgram",
    name: "Mailgram",
    category: "email",
    description: "Custom email relay and outbound messaging configuration.",
    docsUrl: "https://mailgram.com/",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", required: true },
      { key: "baseUrl", label: "API Base URL", type: "url", placeholder: "https://api.mailgram.com" },
      { key: "fromEmail", label: "Default From Email", type: "text", placeholder: "noreply@hospital.com" },
      { key: "fromName", label: "Default From Name", type: "text", placeholder: "Hospital Name" },
    ],
  },
  {
    id: "twilio",
    name: "Twilio",
    category: "communication",
    description: "SMS, voice and WhatsApp messaging.",
    docsUrl: "https://www.twilio.com/docs",
    fields: [
      { key: "accountSid", label: "Account SID", type: "text", required: true, placeholder: "AC..." },
      { key: "authToken", label: "Auth Token", type: "password", required: true },
      { key: "phoneNumber", label: "From Number", type: "text", placeholder: "+15551234567" },
    ],
    verify: async (c) => {
      const r = await jsonFetch(`https://api.twilio.com/2010-04-01/Accounts/${c.accountSid}.json`, {
        headers: { Authorization: "Basic " + Buffer.from(`${c.accountSid}:${c.authToken}`).toString("base64") },
      });
      return r.ok ? { ok: true, account: r.body?.friendly_name } : { ok: false, error: `Twilio error: ${r.status}` };
    },
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "productivity",
    description: "Payment processing and billing orchestration.",
    docsUrl: "https://docs.stripe.com/api",
    fields: [
      { key: "publishableKey", label: "Publishable Key", type: "password", required: true, placeholder: "pk_..." },
      { key: "secretKey", label: "Secret Key", type: "password", required: true, placeholder: "sk_..." },
      { key: "webhookSecret", label: "Webhook Secret", type: "password", placeholder: "whsec_..." },
    ],
    verify: async (c) => {
      const r = await jsonFetch("https://api.stripe.com/v1/account", {
        headers: { Authorization: `Bearer ${c.secretKey}` },
      });
      return r.ok ? { ok: true, account: r.body?.email || r.body?.id } : { ok: false, error: `Stripe error: ${r.status}` };
    },
  },
  {
    id: "aws-s3",
    name: "AWS S3",
    category: "data",
    description: "Cloud object storage for exports, archives, and documents.",
    docsUrl: "https://docs.aws.amazon.com/AmazonS3/latest/API/Welcome.html",
    fields: [
      { key: "accessKey", label: "Access Key ID", type: "password", required: true },
      { key: "secretKey", label: "Secret Access Key", type: "password", required: true },
      { key: "region", label: "Region", type: "text", required: true, placeholder: "us-east-1" },
      { key: "bucketName", label: "Bucket", type: "text", required: true },
    ],
  },
  {
    id: "auth0",
    name: "Auth0",
    category: "productivity",
    description: "Identity and authentication management.",
    docsUrl: "https://auth0.com/docs/api",
    fields: [
      { key: "domain", label: "Domain", type: "url", required: true, placeholder: "https://tenant.us.auth0.com" },
      { key: "clientId", label: "Client ID", type: "text", required: true },
      { key: "clientSecret", label: "Client Secret", type: "password", required: true },
      { key: "audience", label: "Audience", type: "text" },
    ],
  },
  {
    id: "gmail",
    name: "Gmail",
    category: "email",
    description: "Send and read email from a Google account (OAuth refresh token).",
    docsUrl: "https://developers.google.com/gmail/api",
    fields: [
      { key: "clientId", label: "OAuth Client ID", type: "text", required: true },
      { key: "clientSecret", label: "OAuth Client Secret", type: "password", required: true },
      { key: "refreshToken", label: "Refresh Token", type: "password", required: true },
    ],
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    category: "calendar",
    description: "Sync appointments to Google Calendar.",
    docsUrl: "https://developers.google.com/calendar",
    fields: [
      { key: "clientId", label: "OAuth Client ID", type: "text", required: true },
      { key: "clientSecret", label: "OAuth Client Secret", type: "password", required: true },
      { key: "refreshToken", label: "Refresh Token", type: "password", required: true },
      { key: "calendarId", label: "Calendar ID", type: "text", placeholder: "primary" },
    ],
  },
  {
    id: "asana",
    name: "Asana",
    category: "productivity",
    description: "Task and project management.",
    docsUrl: "https://developers.asana.com/",
    fields: [
      { key: "accessToken", label: "Personal Access Token", type: "password", required: true },
      { key: "workspaceId", label: "Workspace ID", type: "text" },
    ],
    verify: async (c) => {
      const r = await jsonFetch("https://app.asana.com/api/1.0/users/me", {
        headers: { Authorization: `Bearer ${c.accessToken}` },
      });
      return r.ok ? { ok: true, account: r.body?.data?.email } : { ok: false, error: `Asana error: ${r.status}` };
    },
  },
  {
    id: "ashby",
    name: "Ashby",
    category: "recruiting",
    description: "Applicant tracking and recruiting.",
    docsUrl: "https://developers.ashbyhq.com/",
    fields: [{ key: "apiKey", label: "API Key", type: "password", required: true }],
    verify: async (c) => {
      const r = await jsonFetch("https://api.ashbyhq.com/user.list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + Buffer.from(`${c.apiKey}:`).toString("base64"),
        },
        body: JSON.stringify({}),
      });
      return r.ok ? { ok: true } : { ok: false, error: `Ashby error: ${r.status}` };
    },
  },
  {
    id: "databricks",
    name: "Databricks",
    category: "data",
    description: "Analytics and data warehouse queries.",
    docsUrl: "https://docs.databricks.com/api/",
    fields: [
      { key: "host", label: "Workspace URL", type: "url", required: true, placeholder: "https://dbc-xxx.cloud.databricks.com" },
      { key: "token", label: "Access Token", type: "password", required: true },
      { key: "warehouseId", label: "SQL Warehouse ID", type: "text" },
    ],
    verify: async (c) => {
      const r = await jsonFetch(`${c.host?.replace(/\/$/, "")}/api/2.0/preview/scim/v2/Me`, {
        headers: { Authorization: `Bearer ${c.token}` },
      });
      return r.ok ? { ok: true, account: r.body?.userName } : { ok: false, error: `Databricks error: ${r.status}` };
    },
  },
  {
    id: "snowflake",
    name: "Snowflake",
    category: "data",
    description: "Cloud data warehouse.",
    docsUrl: "https://docs.snowflake.com/",
    fields: [
      { key: "account", label: "Account Identifier", type: "text", required: true, placeholder: "xy12345.us-east-1" },
      { key: "username", label: "Username", type: "text", required: true },
      { key: "password", label: "Password / PAT", type: "password", required: true },
      { key: "warehouse", label: "Warehouse", type: "text" },
      { key: "database", label: "Database", type: "text" },
    ],
  },
  {
    id: "firecrawl",
    name: "Firecrawl",
    category: "scraping",
    description: "AI-powered web scraper and search.",
    docsUrl: "https://docs.firecrawl.dev/",
    fields: [{ key: "apiKey", label: "API Key", type: "password", required: true, placeholder: "fc-..." }],
    verify: async (c) => {
      const r = await jsonFetch("https://api.firecrawl.dev/v1/team/credit-usage", {
        headers: { Authorization: `Bearer ${c.apiKey}` },
      });
      return r.ok ? { ok: true } : { ok: false, error: `Firecrawl error: ${r.status}` };
    },
  },
  {
    id: "fireflies",
    name: "Fireflies.ai",
    category: "productivity",
    description: "Meeting transcription and notes.",
    docsUrl: "https://docs.fireflies.ai/",
    fields: [{ key: "apiKey", label: "API Key", type: "password", required: true }],
    verify: async (c) => {
      const r = await jsonFetch("https://api.fireflies.ai/graphql", {
        method: "POST",
        headers: { Authorization: `Bearer ${c.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query: "{ user { email } }" }),
      });
      return r.ok && !r.body?.issues ? { ok: true, account: r.body?.data?.user?.email } : { ok: false, error: "Fireflies error" };
    },
  },
  {
    id: "perplexity",
    name: "Perplexity",
    category: "ai",
    description: "AI-powered search and answer engine.",
    docsUrl: "https://docs.perplexity.ai/",
    fields: [{ key: "apiKey", label: "API Key", type: "password", required: true, placeholder: "pplx-..." }],
    verify: async (c) => {
      const r = await jsonFetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${c.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "sonar", messages: [{ role: "user", content: "ping" }], max_tokens: 1 }),
      });
      return r.ok ? { ok: true } : { ok: false, error: `Perplexity error: ${r.status}` };
    },
  },
  {
    id: "gemini_enterprise",
    name: "Gemini Enterprise",
    category: "ai",
    description: "Google's enterprise generative AI.",
    docsUrl: "https://cloud.google.com/vertex-ai",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", required: true },
      { key: "projectId", label: "Project ID", type: "text", required: true },
      { key: "location", label: "Location", type: "text", placeholder: "us-central1" },
    ],
  },
  {
    id: "aws-ses",
    name: "AWS SES",
    category: "email",
    description: "Amazon Simple Email Service.",
    docsUrl: "https://docs.aws.amazon.com/ses/",
    fields: [
      { key: "accessKey", label: "Access Key", type: "password", required: true },
      { key: "secretKey", label: "Secret Key", type: "password", required: true },
      { key: "region", label: "Region", type: "text", required: true, placeholder: "us-east-1" },
      { key: "fromEmail", label: "Default From Email", type: "text" },
      { key: "fromName", label: "Default From Name", type: "text" },
    ],
  },
  {
    id: "nexmo",
    name: "Nexmo (Vonage)",
    category: "communication",
    description: "SMS and communication APIs.",
    docsUrl: "https://developer.vonage.com/",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", required: true },
      { key: "apiSecret", label: "API Secret", type: "password", required: true },
      { key: "brandName", label: "Brand Name", type: "text" },
    ],
    verify: async (c) => {
      const r = await jsonFetch(`https://rest.nexmo.com/account/get-balance?api_key=${encodeURIComponent(c.apiKey)}&api_secret=${encodeURIComponent(c.apiSecret)}`, { method: "GET" });
      return r.ok ? { ok: true } : { ok: false, error: `Vonage error: ${r.status}` };
    },
  },
  {
    id: "aws-sns",
    name: "AWS SNS",
    category: "communication",
    description: "Simple Notification Service for SMS delivery.",
    docsUrl: "https://docs.aws.amazon.com/sns/",
    fields: [
      { key: "accessKey", label: "Access Key", type: "password", required: true },
      { key: "secretKey", label: "Secret Key", type: "password", required: true },
      { key: "region", label: "Region", type: "text", required: true },
      { key: "topicArn", label: "Topic ARN", type: "text" },
    ],
  },
  {
    id: "messagebird",
    name: "MessageBird",
    category: "communication",
    description: "SMS and omnichannel messaging.",
    docsUrl: "https://developers.messagebird.com/",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", required: true },
      { key: "originator", label: "Originator", type: "text" },
    ],
    verify: async (c) => {
      const r = await jsonFetch("https://rest.messagebird.com/balance", {
        headers: { Authorization: `AccessKey ${c.apiKey}` },
      });
      return r.ok ? { ok: true } : { ok: false, error: `MessageBird error: ${r.status}` };
    },
  },
  {
    id: "paypal",
    name: "PayPal",
    category: "productivity",
    description: "Online payment processing.",
    docsUrl: "https://developer.paypal.com/docs/api/overview/",
    fields: [
      { key: "clientId", label: "Client ID", type: "password", required: true },
      { key: "clientSecret", label: "Client Secret", type: "password", required: true },
      { key: "environment", label: "Environment", type: "text" },
    ],
    verify: async (c) => {
      const base = c.environment === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
      const r = await jsonFetch(`${base}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${c.clientId}:${c.clientSecret}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ grant_type: "client_credentials" }),
      });
      return r.ok ? { ok: true, account: c.clientId.slice(0, 8) } : { ok: false, error: `PayPal error: ${r.status}` };
    },
  },
  {
    id: "square",
    name: "Square",
    category: "productivity",
    description: "Point-of-sale and payment infrastructure.",
    docsUrl: "https://developer.squareup.com/docs",
    fields: [
      { key: "applicationId", label: "Application ID", type: "password", required: true },
      { key: "accessToken", label: "Access Token", type: "password", required: true },
      { key: "locationId", label: "Location ID", type: "text" },
    ],
    verify: async (c) => {
      const r = await jsonFetch("https://connect.squareup.com/v2/locations", {
        headers: { Authorization: `Bearer ${c.accessToken}`, "Square-Version": "2025-01-23" },
      });
      return r.ok ? { ok: true, account: r.body?.locations?.[0]?.name || c.locationId } : { ok: false, error: `Square error: ${r.status}` };
    },
  },
  {
    id: "authorize-net",
    name: "Authorize.Net",
    category: "productivity",
    description: "Payment gateway services.",
    docsUrl: "https://developer.authorize.net/api/reference/",
    fields: [
      { key: "apiLoginId", label: "API Login ID", type: "password", required: true },
      { key: "transactionKey", label: "Transaction Key", type: "password", required: true },
      { key: "environment", label: "Environment", type: "text" },
    ],
  },
  {
    id: "gcs",
    name: "Google Cloud Storage",
    category: "data",
    description: "Cloud object storage.",
    docsUrl: "https://cloud.google.com/storage/docs",
    fields: [
      { key: "projectId", label: "Project ID", type: "text", required: true },
      { key: "serviceAccountKey", label: "Service Account Key", type: "password", required: true },
      { key: "bucketName", label: "Bucket Name", type: "text", required: true },
    ],
  },
  {
    id: "azure-blob",
    name: "Azure Blob Storage",
    category: "data",
    description: "Microsoft cloud object storage.",
    docsUrl: "https://learn.microsoft.com/azure/storage/blobs/",
    fields: [
      { key: "accountName", label: "Account Name", type: "text", required: true },
      { key: "accountKey", label: "Account Key", type: "password", required: true },
      { key: "containerName", label: "Container Name", type: "text", required: true },
    ],
  },
  {
    id: "cloudinary",
    name: "Cloudinary",
    category: "data",
    description: "Media management and CDN.",
    docsUrl: "https://cloudinary.com/documentation",
    fields: [
      { key: "cloudName", label: "Cloud Name", type: "text", required: true },
      { key: "apiKey", label: "API Key", type: "password", required: true },
      { key: "apiSecret", label: "API Secret", type: "password", required: true },
    ],
    verify: async (c) => {
      const r = await jsonFetch(`https://api.cloudinary.com/v1_1/${c.cloudName}/usage`, {
        headers: { Authorization: "Basic " + Buffer.from(`${c.apiKey}:${c.apiSecret}`).toString("base64") },
      });
      return r.ok ? { ok: true, account: c.cloudName } : { ok: false, error: `Cloudinary error: ${r.status}` };
    },
  },
  {
    id: "google-analytics",
    name: "Google Analytics",
    category: "productivity",
    description: "Usage tracking and analytics.",
    docsUrl: "https://developers.google.com/analytics",
    fields: [
      { key: "measurementId", label: "Measurement ID", type: "text", required: true },
      { key: "apiSecret", label: "API Secret", type: "password" },
    ],
  },
  {
    id: "mixpanel",
    name: "Mixpanel",
    category: "productivity",
    description: "Product analytics platform.",
    docsUrl: "https://developer.mixpanel.com/",
    fields: [
      { key: "projectToken", label: "Project Token", type: "password", required: true },
      { key: "apiSecret", label: "API Secret", type: "password" },
    ],
  },
  {
    id: "sentry",
    name: "Sentry",
    category: "productivity",
    description: "Application error monitoring.",
    docsUrl: "https://docs.sentry.io/api/",
    fields: [
      { key: "dsn", label: "DSN", type: "text", required: true },
      { key: "environment", label: "Environment", type: "text" },
    ],
  },
  {
    id: "datadog",
    name: "DataDog",
    category: "productivity",
    description: "Infrastructure and application monitoring.",
    docsUrl: "https://docs.datadoghq.com/api/latest/",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", required: true },
      { key: "appKey", label: "Application Key", type: "password" },
      { key: "site", label: "Site", type: "text" },
    ],
    verify: async (c) => {
      const site = c.site ? `api.${c.site}.datadoghq.com` : "api.datadoghq.com";
      const r = await jsonFetch(`https://${site}/api/v1/validate`, {
        headers: { "DD-API-KEY": c.apiKey, ...(c.appKey ? { "DD-APPLICATION-KEY": c.appKey } : {}) },
      });
      return r.ok && r.body?.valid !== false ? { ok: true } : { ok: false, error: `Datadog error: ${r.status}` };
    },
  },
  {
    id: "slack",
    name: "Slack",
    category: "communication",
    description: "Team alerts and notification delivery.",
    docsUrl: "https://api.slack.com/",
    fields: [
      { key: "webhookUrl", label: "Webhook URL", type: "url" },
      { key: "botToken", label: "Bot Token", type: "password" },
      { key: "channel", label: "Channel", type: "text" },
    ],
    verify: async (c) => {
      if (c.webhookUrl) {
        const r = await jsonFetch(c.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "Joan integration test message" }),
        });
        return r.ok ? { ok: true } : { ok: false, error: `Slack webhook error: ${r.status}` };
      }
      if (c.botToken) {
        const r = await jsonFetch("https://slack.com/api/auth.test", {
          headers: { Authorization: `Bearer ${c.botToken}` },
        });
        return r.ok && r.body?.ok ? { ok: true, account: r.body?.user } : { ok: false, error: r.body?.error || `Slack error: ${r.status}` };
      }
      return { ok: false, error: "Slack webhook URL or bot token is required" };
    },
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    category: "communication",
    description: "Teams channels and bot notifications.",
    docsUrl: "https://learn.microsoft.com/microsoftteams/platform/",
    fields: [
      { key: "webhookUrl", label: "Webhook URL", type: "url" },
      { key: "tenantId", label: "Tenant ID", type: "text" },
    ],
    verify: async (c) => {
      if (!c.webhookUrl) return { ok: false, error: "Teams webhook URL is required" };
      const r = await jsonFetch(c.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Joan integration test message" }),
      });
      return r.ok ? { ok: true } : { ok: false, error: `Teams webhook error: ${r.status}` };
    },
  },
  {
    id: "discord",
    name: "Discord",
    category: "communication",
    description: "Webhook-based alerting to Discord servers.",
    docsUrl: "https://discord.com/developers/docs/intro",
    fields: [
      { key: "webhookUrl", label: "Webhook URL", type: "url", required: true },
      { key: "botToken", label: "Bot Token", type: "password" },
    ],
    verify: async (c) => {
      const r = await jsonFetch(c.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Joan integration test message" }),
      });
      return r.ok ? { ok: true } : { ok: false, error: `Discord webhook error: ${r.status}` };
    },
  },
  {
    id: "zoom",
    name: "Zoom",
    category: "calendar",
    description: "Video meeting scheduling and conferencing.",
    docsUrl: "https://developers.zoom.us/docs/api/",
    fields: [
      { key: "clientId", label: "Client ID", type: "password", required: true },
      { key: "clientSecret", label: "Client Secret", type: "password", required: true },
      { key: "accountId", label: "Account ID", type: "text" },
    ],
    verify: async (c) => {
      const r = await jsonFetch("https://zoom.us/oauth/token", {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${c.clientId}:${c.clientSecret}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ grant_type: "account_credentials", account_id: c.accountId || "" }),
      });
      return r.ok ? { ok: true, account: c.accountId } : { ok: false, error: `Zoom error: ${r.status}` };
    },
  },
];

export function getProvider(id: string): IntegrationProvider | undefined {
  return INTEGRATION_PROVIDERS.find((p) => p.id === id);
}

export function providerPublicShape(p: IntegrationProvider) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description,
    docsUrl: p.docsUrl,
    fields: p.fields,
  };
}
