import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { dash } from "@better-auth/infra";

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import * as schema from "./auth-schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const sql = neon(process.env.DATABASE_URL, {
  fullResults: false,
});

const db = drizzle(sql, { schema });

const LOCAL_AUTH_PORTS = ["3000", "3100", "8080"];
const TRUSTED_HOST_SUFFIXES = [
  ".localhost",
  ".joanhealth.tech",
];

function splitEnvList(value?: string) {
  return (value || "")
    .split(",")
    .map((item) => item.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function normalizeOrigin(value?: string | null) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function normalizeHost(value?: string | null) {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return value || null;
  }
}

function isSafeDynamicOrigin(origin: string) {
  const parsed = normalizeOrigin(origin);
  if (!parsed) return false;

  try {
    const url = new URL(parsed);
    const hostname = url.hostname.toLowerCase();
    const protocolAllowed = url.protocol === "http:" || url.protocol === "https:";

    return (
      protocolAllowed &&
      (hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "::1" ||
        TRUSTED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix)))
    );
  } catch {
    return false;
  }
}

const configuredOrigins = [
  process.env.BETTER_AUTH_URL,
  process.env.NEXT_PUBLIC_APP_URL,
  ...splitEnvList(process.env.BETTER_AUTH_TRUSTED_ORIGINS),
]
  .map(normalizeOrigin)
  .filter((origin): origin is string => Boolean(origin));

const configuredHosts = [
  process.env.BETTER_AUTH_URL,
  process.env.NEXT_PUBLIC_APP_URL,
  ...splitEnvList(process.env.BETTER_AUTH_ALLOWED_HOSTS),
]
  .map(normalizeHost)
  .filter((host): host is string => Boolean(host));

const localTrustedOrigins = LOCAL_AUTH_PORTS.flatMap((port) => [
  `http://localhost:${port}`,
  `https://localhost:${port}`,
  `http://127.0.0.1:${port}`,
  `https://127.0.0.1:${port}`,
  `http://*.localhost:${port}`,
  `https://*.localhost:${port}`,
]);

const baseTrustedOrigins = Array.from(
  new Set([
    ...localTrustedOrigins,
    "https://*.joanhealth.tech",
    ...configuredOrigins,
  ]),
);

const allowedHosts = Array.from(
  new Set([
    ...LOCAL_AUTH_PORTS.flatMap((port) => [
      `localhost:${port}`,
      `127.0.0.1:${port}`,
      `*.localhost:${port}`,
    ]),
    "*.joanhealth.tech",
    ...configuredHosts,
  ]),
);

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  baseURL: {
    allowedHosts,
    fallback: process.env.BETTER_AUTH_URL || "https://joanhealth.tech/",
  },
  secret: process.env.BETTER_AUTH_SECRET,
  plugins: [nextCookies(), dash()],

  emailAndPassword: {
    enabled: true,
    password: {
      hash: (password) => bcrypt.hash(password, 12),
      verify: ({ hash, password }) => bcrypt.compare(password, hash),
    },
  },
  // Keep CSRF origin checks enabled.
  // Additionally trust configured BETTER_AUTH_URL / NEXT_PUBLIC_APP_URL to avoid
  // "invalid origin" when logging in from your custom domain (e.g. apex vs www).
  trustedOrigins: (request) => {
    const requestOrigins = [
      normalizeOrigin(request?.headers.get("origin")),
      normalizeOrigin(request?.headers.get("referer")),
    ].filter((origin): origin is string =>
      origin !== null && (isSafeDynamicOrigin(origin) || configuredOrigins.includes(origin)),
    );

    return Array.from(new Set([...baseTrustedOrigins, ...configuredOrigins, ...requestOrigins]));
  },
  experimental: {
    joins: true,
  },
  advanced: {
    // In production (Vercel HTTPS + custom domain), Secure cookies are required.
    // For local dev over http://, this will remain false.
    useSecureCookies:
      process.env.NODE_ENV === "production" ||
      (process.env.BETTER_AUTH_URL?.startsWith("https://") ?? false),
    defaultCookieAttributes: {
      sameSite: "lax",
      secure:
        process.env.NODE_ENV === "production" ||
        (process.env.BETTER_AUTH_URL?.startsWith("https://") ?? false),
    },
    csrfProtection: {
      enabled: true,
    },
    ipAddress: {
      // Vercel
      ipAddressHeaders: ["x-vercel-forwarded-for", "x-forwarded-for"],
    },
  },
});
