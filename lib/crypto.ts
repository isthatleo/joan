import crypto from "crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.INTEGRATIONS_ENCRYPTION_KEY || process.env.BETTER_AUTH_SECRET || "";
  if (!raw) throw new Error("INTEGRATIONS_ENCRYPTION_KEY (or BETTER_AUTH_SECRET fallback) is not set");
  // Derive 32-byte key
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptSecret(plain: string): string {
  if (!plain) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptSecret(payload: string | null | undefined): string {
  if (!payload) return "";
  try {
    const [version, ivB64, tagB64, dataB64] = payload.split(":");
    if (version !== "v1") return "";
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const data = Buffer.from(dataB64, "base64");
    const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

export function maskSecret(plain: string): string {
  if (!plain) return "";
  if (plain.length <= 8) return "••••";
  return `${plain.slice(0, 4)}••••${plain.slice(-4)}`;
}
