import Stripe from "stripe";
import { createHash, createHmac, createSign } from "crypto";
import { getIntegrationCredentials, getTenantCommunicationSettings, listActiveProviders } from "@/lib/integrations/server";
import { sendEmail, type SendEmailPayload } from "@/lib/email/send-email";
import { NotificationService } from "@/lib/services/notification.service";
import { sendTenantCollaborationAlert } from "@/lib/integrations/collaboration";
import { dispatchTenantCustomIntegrationEvent } from "@/lib/integrations/custom";

type RuntimeResult<T = unknown> = {
  ok: boolean;
  provider: string;
  data?: T;
  error?: string;
};

type PaymentIntentInput = {
  amount: number;
  currency: string;
  description?: string;
  invoiceId?: string;
  customerEmail?: string;
  returnUrl?: string;
  metadata?: Record<string, string>;
};

type StorageUploadInput = {
  key: string;
  content: string | Buffer;
  contentType?: string;
  metadata?: Record<string, string>;
};

type AnalyticsEventInput = {
  event: string;
  distinctId?: string;
  userId?: string;
  properties?: Record<string, unknown>;
};

type CollaborationInput = {
  title?: string;
  message: string;
};

function cents(amount: number) {
  return Math.max(0, Math.round(Number(amount || 0) * 100));
}

function safeCurrency(currency: string) {
  return String(currency || "USD").toLowerCase();
}

function hmac(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function hmacHex(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value, "utf8").digest("hex");
}

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function awsSignatureKey(secretKey: string, dateStamp: string, region: string, service: string) {
  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

async function jsonResponse(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function activeProviderCandidates(tenantSlugOrId: string, providers: string[]) {
  const active = await listActiveProviders(tenantSlugOrId).catch(() => [] as string[]);
  return providers.filter((provider) => active.includes(provider));
}

export async function sendTenantRuntimeEmail(tenantSlugOrId: string, payload: Omit<SendEmailPayload, "tenantSlug">) {
  const result = await sendEmail({ ...payload, tenantSlug: tenantSlugOrId });
  if (!result.ok) {
    const body = await result.response.json().catch(() => ({}));
    return { ok: false, provider: payload.provider || "email", error: body?.error || "Email send failed" };
  }
  return { ok: true, provider: result.data.provider, data: result.data };
}

export async function sendTenantRuntimeSms(tenantSlugOrId: string, phone: string, message: string) {
  const notificationService = new NotificationService();
  await notificationService.sendSMS(phone, message, { tenantSlugOrId });
  const communication = await getTenantCommunicationSettings(tenantSlugOrId).catch(() => ({} as Record<string, any>)) as Record<string, any>;
  return { ok: true, provider: communication.smsProvider || "twilio" };
}

async function createStripePayment(tenantSlugOrId: string, input: PaymentIntentInput): Promise<RuntimeResult> {
  const creds = await getIntegrationCredentials(tenantSlugOrId, "stripe");
  if (!creds?.secretKey) return { ok: false, provider: "stripe", error: "Stripe secret key is not configured" };
  const stripe = new Stripe(creds.secretKey, { apiVersion: "2023-10-16" });
  const intent = await stripe.paymentIntents.create({
    amount: cents(input.amount),
    currency: safeCurrency(input.currency),
    description: input.description,
    receipt_email: input.customerEmail,
    metadata: { invoiceId: input.invoiceId || "", ...(input.metadata || {}) },
    automatic_payment_methods: { enabled: true },
  });
  return { ok: true, provider: "stripe", data: { id: intent.id, clientSecret: intent.client_secret, status: intent.status } };
}

async function createPayPalOrder(tenantSlugOrId: string, input: PaymentIntentInput): Promise<RuntimeResult> {
  const creds = await getIntegrationCredentials(tenantSlugOrId, "paypal");
  if (!creds?.clientId || !creds?.clientSecret) return { ok: false, provider: "paypal", error: "PayPal credentials are not configured" };
  const base = creds.environment === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const tokenResponse = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });
  const token = await jsonResponse(tokenResponse);
  if (!tokenResponse.ok) return { ok: false, provider: "paypal", error: token?.error_description || "PayPal authentication failed" };
  const orderResponse = await fetch(`${base}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: input.invoiceId || undefined,
        description: input.description,
        amount: { currency_code: String(input.currency || "USD").toUpperCase(), value: Number(input.amount || 0).toFixed(2) },
      }],
      application_context: input.returnUrl ? { return_url: input.returnUrl, cancel_url: input.returnUrl } : undefined,
    }),
  });
  const order = await jsonResponse(orderResponse);
  if (!orderResponse.ok) return { ok: false, provider: "paypal", error: order?.message || "PayPal order creation failed" };
  return { ok: true, provider: "paypal", data: order };
}

async function createSquarePaymentLink(tenantSlugOrId: string, input: PaymentIntentInput): Promise<RuntimeResult> {
  const creds = await getIntegrationCredentials(tenantSlugOrId, "square");
  if (!creds?.accessToken || !creds?.locationId) return { ok: false, provider: "square", error: "Square access token/location is not configured" };
  const response = await fetch("https://connect.squareup.com/v2/online-checkout/payment-links", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      "Square-Version": "2025-01-23",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      idempotency_key: `${input.invoiceId || "payment"}-${Date.now()}`,
      quick_pay: {
        name: input.description || "Hospital payment",
        price_money: { amount: cents(input.amount), currency: String(input.currency || "USD").toUpperCase() },
        location_id: creds.locationId,
      },
      checkout_options: input.returnUrl ? { redirect_url: input.returnUrl } : undefined,
    }),
  });
  const data = await jsonResponse(response);
  if (!response.ok) return { ok: false, provider: "square", error: data?.issues?.[0]?.detail || "Square payment link creation failed" };
  return { ok: true, provider: "square", data };
}

async function createAuthorizeNetTransaction(tenantSlugOrId: string, input: PaymentIntentInput): Promise<RuntimeResult> {
  const creds = await getIntegrationCredentials(tenantSlugOrId, "authorize-net");
  if (!creds?.apiLoginId || !creds?.transactionKey) return { ok: false, provider: "authorize-net", error: "Authorize.Net credentials are not configured" };
  const endpoint = creds.environment === "production"
    ? "https://api.authorize.net/xml/v1/request.api"
    : "https://apitest.authorize.net/xml/v1/request.api";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      createTransactionRequest: {
        merchantAuthentication: { name: creds.apiLoginId, transactionKey: creds.transactionKey },
        refId: input.invoiceId,
        transactionRequest: {
          transactionType: "authOnlyTransaction",
          amount: Number(input.amount || 0).toFixed(2),
          order: { invoiceNumber: input.invoiceId, description: input.description },
        },
      },
    }),
  });
  const data = await jsonResponse(response);
  if (!response.ok || data?.messages?.resultCode === "Error") {
    return { ok: false, provider: "authorize-net", error: data?.messages?.message?.[0]?.text || "Authorize.Net transaction failed" };
  }
  return { ok: true, provider: "authorize-net", data };
}

export async function createTenantPaymentIntent(tenantSlugOrId: string, input: PaymentIntentInput): Promise<RuntimeResult> {
  const providers = await activeProviderCandidates(tenantSlugOrId, ["stripe", "paypal", "square", "authorize-net"]);
  for (const provider of providers) {
    try {
      const result =
        provider === "stripe" ? await createStripePayment(tenantSlugOrId, input) :
        provider === "paypal" ? await createPayPalOrder(tenantSlugOrId, input) :
        provider === "square" ? await createSquarePaymentLink(tenantSlugOrId, input) :
        await createAuthorizeNetTransaction(tenantSlugOrId, input);
      if (result.ok) return result;
    } catch (error: any) {
      return { ok: false, provider, error: error?.message || "Payment provider failed" };
    }
  }
  return { ok: false, provider: "payment", error: "No active payment provider is configured" };
}

async function uploadToCloudinary(tenantSlugOrId: string, input: StorageUploadInput): Promise<RuntimeResult> {
  const creds = await getIntegrationCredentials(tenantSlugOrId, "cloudinary");
  if (!creds?.cloudName || !creds?.apiKey || !creds?.apiSecret) return { ok: false, provider: "cloudinary", error: "Cloudinary credentials are not configured" };
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const publicId = input.key.replace(/\.[^.]+$/, "");
  const signature = createHash("sha1")
    .update(`public_id=${publicId}&timestamp=${timestamp}${creds.apiSecret}`)
    .digest("hex");
  const form = new FormData();
  form.set("file", `data:${input.contentType || "application/octet-stream"};base64,${Buffer.isBuffer(input.content) ? input.content.toString("base64") : Buffer.from(input.content).toString("base64")}`);
  form.set("api_key", creds.apiKey);
  form.set("timestamp", timestamp);
  form.set("public_id", publicId);
  form.set("signature", signature);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${creds.cloudName}/auto/upload`, { method: "POST", body: form });
  const data = await jsonResponse(response);
  if (!response.ok) return { ok: false, provider: "cloudinary", error: data?.error?.message || "Cloudinary upload failed" };
  return { ok: true, provider: "cloudinary", data };
}

async function uploadToS3(tenantSlugOrId: string, input: StorageUploadInput): Promise<RuntimeResult> {
  const creds = await getIntegrationCredentials(tenantSlugOrId, "aws-s3");
  if (!creds?.accessKey || !creds?.secretKey || !creds?.region || !creds?.bucketName) return { ok: false, provider: "aws-s3", error: "AWS S3 credentials are not configured" };
  const body = Buffer.isBuffer(input.content) ? input.content : Buffer.from(input.content);
  const encodedKey = input.key.split("/").map(encodeURIComponent).join("/");
  const endpoint = `https://${creds.bucketName}.s3.${creds.region}.amazonaws.com/${encodedKey}`;
  const url = new URL(endpoint);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256(body);
  const canonicalHeaders = `content-type:${input.contentType || "application/octet-stream"}\nhost:${url.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = ["PUT", url.pathname, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const credentialScope = `${dateStamp}/${creds.region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, sha256(canonicalRequest)].join("\n");
  const signature = hmacHex(awsSignatureKey(creds.secretKey, dateStamp, creds.region, "s3"), stringToSign);
  const authorization = `AWS4-HMAC-SHA256 Credential=${creds.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const response = await fetch(endpoint, {
    method: "PUT",
    headers: {
      "Content-Type": input.contentType || "application/octet-stream",
      "X-Amz-Content-Sha256": payloadHash,
      "X-Amz-Date": amzDate,
      Authorization: authorization,
    },
    body: body as unknown as BodyInit,
  });
  if (!response.ok) return { ok: false, provider: "aws-s3", error: `S3 upload failed (${response.status})` };
  return { ok: true, provider: "aws-s3", data: { url: endpoint, key: input.key } };
}

async function uploadToAzureBlob(tenantSlugOrId: string, input: StorageUploadInput): Promise<RuntimeResult> {
  const creds = await getIntegrationCredentials(tenantSlugOrId, "azure-blob");
  if (!creds?.accountName || !creds?.accountKey || !creds?.containerName) return { ok: false, provider: "azure-blob", error: "Azure Blob credentials are not configured" };
  const body = Buffer.isBuffer(input.content) ? input.content : Buffer.from(input.content);
  const path = `/${creds.containerName}/${input.key.split("/").map(encodeURIComponent).join("/")}`;
  const url = `https://${creds.accountName}.blob.core.windows.net${path}`;
  const date = new Date().toUTCString();
  const version = "2023-11-03";
  const canonicalizedHeaders = `x-ms-blob-type:BlockBlob\nx-ms-date:${date}\nx-ms-version:${version}\n`;
  const canonicalizedResource = `/${creds.accountName}${path}`;
  const stringToSign = ["PUT", "", "", String(body.length), "", input.contentType || "application/octet-stream", "", "", "", "", "", "", canonicalizedHeaders + canonicalizedResource].join("\n");
  const signature = createHmac("sha256", Buffer.from(creds.accountKey, "base64")).update(stringToSign, "utf8").digest("base64");
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `SharedKey ${creds.accountName}:${signature}`,
      "x-ms-date": date,
      "x-ms-version": version,
      "x-ms-blob-type": "BlockBlob",
      "Content-Type": input.contentType || "application/octet-stream",
      "Content-Length": String(body.length),
    },
    body: body as unknown as BodyInit,
  });
  if (!response.ok) return { ok: false, provider: "azure-blob", error: `Azure Blob upload failed (${response.status})` };
  return { ok: true, provider: "azure-blob", data: { url, key: input.key } };
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getGoogleServiceAccountToken(serviceAccountKey: string, scope: string) {
  const key = JSON.parse(serviceAccountKey);
  if (!key.client_email || !key.private_key) throw new Error("Invalid Google service account key");
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(JSON.stringify({
    iss: key.client_email,
    scope,
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));
  const unsigned = `${header}.${claim}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(key.private_key);
  const assertion = `${unsigned}.${base64Url(signature)}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const data = await jsonResponse(response);
  if (!response.ok || !data?.access_token) throw new Error(data?.error_description || "Google token exchange failed");
  return data.access_token as string;
}

async function uploadToGcs(tenantSlugOrId: string, input: StorageUploadInput): Promise<RuntimeResult> {
  const creds = await getIntegrationCredentials(tenantSlugOrId, "gcs");
  if (!creds?.serviceAccountKey || !creds?.bucketName) return { ok: false, provider: "gcs", error: "Google Cloud Storage credentials are not configured" };
  try {
    const token = await getGoogleServiceAccountToken(creds.serviceAccountKey, "https://www.googleapis.com/auth/devstorage.read_write");
    const body = Buffer.isBuffer(input.content) ? input.content : Buffer.from(input.content);
    const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(creds.bucketName)}/o?uploadType=media&name=${encodeURIComponent(input.key)}`;
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": input.contentType || "application/octet-stream",
      },
      body: body as unknown as BodyInit,
    });
    const data = await jsonResponse(response);
    if (!response.ok) return { ok: false, provider: "gcs", error: data?.error?.message || `GCS upload failed (${response.status})` };
    return { ok: true, provider: "gcs", data };
  } catch (error: any) {
    return { ok: false, provider: "gcs", error: error?.message || "GCS upload failed" };
  }
}

export async function uploadTenantObject(tenantSlugOrId: string, input: StorageUploadInput): Promise<RuntimeResult> {
  const providers = await activeProviderCandidates(tenantSlugOrId, ["cloudinary", "aws-s3", "gcs", "azure-blob"]);
  for (const provider of providers) {
    const result =
      provider === "cloudinary" ? await uploadToCloudinary(tenantSlugOrId, input) :
      provider === "aws-s3" ? await uploadToS3(tenantSlugOrId, input) :
      provider === "gcs" ? await uploadToGcs(tenantSlugOrId, input) :
      await uploadToAzureBlob(tenantSlugOrId, input);
    if (result.ok) return result;
  }
  return { ok: false, provider: "storage", error: "No active storage provider is configured" };
}

export async function uploadTenantObjectToStorageProviders(tenantSlugOrId: string, input: StorageUploadInput): Promise<RuntimeResult[]> {
  const providers = await activeProviderCandidates(tenantSlugOrId, ["cloudinary", "aws-s3", "gcs", "azure-blob"]);
  if (providers.length === 0) {
    return [{ ok: false, provider: "storage", error: "No active storage provider is configured" }];
  }

  const results: RuntimeResult[] = [];
  for (const provider of providers) {
    try {
      const result =
        provider === "cloudinary" ? await uploadToCloudinary(tenantSlugOrId, input) :
        provider === "aws-s3" ? await uploadToS3(tenantSlugOrId, input) :
        provider === "gcs" ? await uploadToGcs(tenantSlugOrId, input) :
        await uploadToAzureBlob(tenantSlugOrId, input);
      results.push(result);
    } catch (error: any) {
      results.push({ ok: false, provider, error: error?.message || "Storage provider upload failed" });
    }
  }
  return results;
}

export async function trackTenantAnalyticsEvent(tenantSlugOrId: string, input: AnalyticsEventInput): Promise<RuntimeResult[]> {
  const providers = await activeProviderCandidates(tenantSlugOrId, ["google-analytics", "mixpanel", "datadog", "sentry"]);
  const results: RuntimeResult[] = [];
  for (const provider of providers) {
    const creds = await getIntegrationCredentials(tenantSlugOrId, provider).catch(() => null);
    try {
      if (provider === "google-analytics" && creds?.measurementId && creds?.apiSecret) {
        const response = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(creds.measurementId)}&api_secret=${encodeURIComponent(creds.apiSecret)}`, {
          method: "POST",
          body: JSON.stringify({ client_id: input.distinctId || input.userId || "tenant-server", events: [{ name: input.event, params: input.properties || {} }] }),
        });
        results.push({ ok: response.ok, provider, error: response.ok ? undefined : `GA event failed (${response.status})` });
      } else if (provider === "mixpanel" && creds?.projectToken) {
        const response = await fetch("https://api.mixpanel.com/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([{ event: input.event, properties: { token: creds.projectToken, distinct_id: input.distinctId || input.userId || "tenant-server", ...(input.properties || {}) } }]),
        });
        results.push({ ok: response.ok, provider, error: response.ok ? undefined : `Mixpanel event failed (${response.status})` });
      } else if (provider === "datadog" && creds?.apiKey) {
        const site = creds.site ? `api.${creds.site}.datadoghq.com` : "api.datadoghq.com";
        const response = await fetch(`https://${site}/api/v1/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "DD-API-KEY": creds.apiKey },
          body: JSON.stringify({ title: input.event, text: JSON.stringify(input.properties || {}), tags: [`tenant:${tenantSlugOrId}`] }),
        });
        results.push({ ok: response.ok, provider, error: response.ok ? undefined : `Datadog event failed (${response.status})` });
      } else if (provider === "sentry" && creds?.dsn) {
        results.push({ ok: true, provider, data: { dsn: creds.dsn, note: "Sentry DSN is available for runtime client/server initialization." } });
      } else {
        results.push({ ok: false, provider, error: "Provider is missing runtime credentials" });
      }
    } catch (error: any) {
      results.push({ ok: false, provider, error: error?.message || "Analytics dispatch failed" });
    }
  }
  return results;
}

export async function dispatchTenantIntegrationEvent(
  tenantSlugOrId: string,
  input: AnalyticsEventInput & CollaborationInput
) {
  const [analytics, collaboration, custom] = await Promise.all([
    trackTenantAnalyticsEvent(tenantSlugOrId, input),
    sendTenantCollaborationAlert(tenantSlugOrId, input.message || input.event, { title: input.title || input.event }),
    dispatchTenantCustomIntegrationEvent(tenantSlugOrId, input.event, input.properties || {}),
  ]);
  return { analytics, collaboration, custom };
}
