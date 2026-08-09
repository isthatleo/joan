import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { platformSettings } from "@/lib/db/schema";
import { decryptSecret, encryptSecret, maskSecret } from "@/lib/crypto";

const SETTINGS_KEY = "pesapal_gateway";

const BASE_URLS: Record<PesapalEnvironment, string> = {
  sandbox: "https://cybqa.pesapal.com/pesapalv3",
  production: "https://pay.pesapal.com/v3",
};

export type PesapalEnvironment = "sandbox" | "production";

export type PesapalConfig = {
  consumerKey: string;
  consumerSecretEncrypted: string;
  environment: PesapalEnvironment;
  ipnId: string | null;
  ipnUrl: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type PesapalConfigPublic = {
  configured: boolean;
  consumerKeyMasked: string;
  environment: PesapalEnvironment;
  ipnId: string | null;
  ipnUrl: string | null;
  updatedAt: string | null;
};

function baseUrl(environment: PesapalEnvironment) {
  return BASE_URLS[environment];
}

export async function getPesapalConfig(): Promise<PesapalConfig | null> {
  const row = await db.query.platformSettings.findFirst({ where: eq(platformSettings.key, SETTINGS_KEY) });
  if (!row?.value) return null;
  const value = row.value as Partial<PesapalConfig>;
  if (!value.consumerKey || !value.consumerSecretEncrypted) return null;
  return {
    consumerKey: value.consumerKey,
    consumerSecretEncrypted: value.consumerSecretEncrypted,
    environment: value.environment === "production" ? "production" : "sandbox",
    ipnId: value.ipnId || null,
    ipnUrl: value.ipnUrl || null,
    updatedAt: value.updatedAt || null,
    updatedBy: value.updatedBy || null,
  };
}

export function toPublicConfig(config: PesapalConfig | null): PesapalConfigPublic {
  if (!config) {
    return { configured: false, consumerKeyMasked: "", environment: "sandbox", ipnId: null, ipnUrl: null, updatedAt: null };
  }
  return {
    configured: true,
    consumerKeyMasked: maskSecret(config.consumerKey),
    environment: config.environment,
    ipnId: config.ipnId,
    ipnUrl: config.ipnUrl,
    updatedAt: config.updatedAt,
  };
}

export async function savePesapalConfig(input: {
  consumerKey: string;
  consumerSecret: string;
  environment: PesapalEnvironment;
  updatedBy?: string | null;
}) {
  const existing = await db.query.platformSettings.findFirst({ where: eq(platformSettings.key, SETTINGS_KEY) });
  const previous = existing?.value as Partial<PesapalConfig> | undefined;

  // Changing the consumer key/environment invalidates any cached IPN registration
  // (Pesapal ties the IPN id to the merchant account it was registered under).
  const credentialsChanged =
    previous?.consumerKey !== input.consumerKey || previous?.environment !== input.environment;

  const value: PesapalConfig = {
    consumerKey: input.consumerKey,
    consumerSecretEncrypted: encryptSecret(input.consumerSecret),
    environment: input.environment,
    ipnId: credentialsChanged ? null : previous?.ipnId || null,
    ipnUrl: credentialsChanged ? null : previous?.ipnUrl || null,
    updatedAt: new Date().toISOString(),
    updatedBy: input.updatedBy || null,
  };

  if (existing) {
    await db.update(platformSettings).set({ value, updatedAt: new Date(), updatedBy: input.updatedBy || null }).where(eq(platformSettings.id, existing.id));
  } else {
    await db.insert(platformSettings).values({ key: SETTINGS_KEY, value, updatedBy: input.updatedBy || null });
  }

  return value;
}

async function persistIpnRegistration(ipnId: string, ipnUrl: string) {
  const existing = await db.query.platformSettings.findFirst({ where: eq(platformSettings.key, SETTINGS_KEY) });
  if (!existing) return;
  const value = { ...(existing.value as Partial<PesapalConfig>), ipnId, ipnUrl } as PesapalConfig;
  await db.update(platformSettings).set({ value, updatedAt: new Date() }).where(eq(platformSettings.id, existing.id));
}

async function pesapalFetch<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { Accept: "application/json", "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Pesapal returned a non-JSON response (status ${res.status})`);
  }
  if (!res.ok || body?.error) {
    const message = body?.error?.message || body?.message || `Pesapal request failed (status ${res.status})`;
    throw new Error(message);
  }
  return body as T;
}

export async function requestPesapalToken(config: PesapalConfig): Promise<string> {
  const consumerSecret = decryptSecret(config.consumerSecretEncrypted);
  if (!consumerSecret) throw new Error("Pesapal consumer secret could not be decrypted");

  const response = await pesapalFetch<{ token: string }>(`${baseUrl(config.environment)}/api/Auth/RequestToken`, {
    method: "POST",
    body: JSON.stringify({ consumer_key: config.consumerKey, consumer_secret: consumerSecret }),
  });

  if (!response?.token) throw new Error("Pesapal did not return an access token");
  return response.token;
}

/**
 * Registers the platform's IPN callback URL with Pesapal on first use and caches the
 * returned ipn_id. Re-registers automatically if the callback URL or credentials changed.
 */
export async function ensureIpnRegistered(config: PesapalConfig, token: string, callbackUrl: string): Promise<string> {
  if (config.ipnId && config.ipnUrl === callbackUrl) return config.ipnId;

  const response = await pesapalFetch<{ ipn_id: string }>(`${baseUrl(config.environment)}/api/URLSetup/RegisterIPN`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ url: callbackUrl, ipn_notification_type: "POST" }),
  });

  if (!response?.ipn_id) throw new Error("Pesapal did not return an IPN id");
  await persistIpnRegistration(response.ipn_id, callbackUrl);
  return response.ipn_id;
}

export type PesapalOrderInput = {
  merchantReference: string;
  amount: number;
  currency: string;
  description: string;
  callbackUrl: string;
  notificationId: string;
  billingEmail: string;
  billingFirstName?: string;
  billingLastName?: string;
};

export type PesapalOrderResult = {
  orderTrackingId: string;
  merchantReference: string;
  redirectUrl: string;
};

export async function submitPesapalOrder(config: PesapalConfig, token: string, order: PesapalOrderInput): Promise<PesapalOrderResult> {
  const response = await pesapalFetch<{ order_tracking_id: string; merchant_reference: string; redirect_url: string }>(
    `${baseUrl(config.environment)}/api/Transactions/SubmitOrderRequest`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        id: order.merchantReference,
        currency: order.currency,
        amount: order.amount,
        description: order.description.slice(0, 100),
        callback_url: order.callbackUrl,
        notification_id: order.notificationId,
        billing_address: {
          email_address: order.billingEmail,
          first_name: order.billingFirstName || undefined,
          last_name: order.billingLastName || undefined,
        },
      }),
    },
  );

  if (!response?.redirect_url || !response?.order_tracking_id) {
    throw new Error("Pesapal did not return a checkout redirect URL");
  }

  return {
    orderTrackingId: response.order_tracking_id,
    merchantReference: response.merchant_reference,
    redirectUrl: response.redirect_url,
  };
}

export type PesapalTransactionStatus = {
  statusCode: 0 | 1 | 2 | 3;
  statusDescription: string;
  amount: number;
  currency: string;
  merchantReference: string;
  confirmationCode: string | null;
};

/**
 * The only trustworthy source of a payment's outcome. Pesapal's IPN/callback payloads
 * deliberately omit status for security reasons — this must always be called to confirm
 * a transaction, never the callback query params themselves.
 */
export async function getPesapalTransactionStatus(config: PesapalConfig, token: string, orderTrackingId: string): Promise<PesapalTransactionStatus> {
  const response = await pesapalFetch<{
    status_code: 0 | 1 | 2 | 3;
    payment_status_description: string;
    amount: number;
    currency: string;
    merchant_reference: string;
    confirmation_code: string | null;
  }>(
    `${baseUrl(config.environment)}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
    { method: "GET", headers: { Authorization: `Bearer ${token}` } },
  );

  return {
    statusCode: response.status_code,
    statusDescription: response.payment_status_description,
    amount: Number(response.amount || 0),
    currency: response.currency,
    merchantReference: response.merchant_reference,
    confirmationCode: response.confirmation_code || null,
  };
}
