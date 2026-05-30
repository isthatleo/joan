import crypto from "crypto";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buffer: Buffer) {
  let bits = "";
  let output = "";
  for (const byte of buffer) bits += byte.toString(2).padStart(8, "0");
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, "0");
    output += BASE32_ALPHABET[Number.parseInt(chunk, 2)];
  }
  return output;
}

function base32Decode(value: string) {
  const normalized = value.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) continue;
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret() {
  return base32Encode(crypto.randomBytes(20));
}

export function getTotpCode(secret: string, timestamp = Date.now(), stepSeconds = 30) {
  const counter = Math.floor(timestamp / 1000 / stepSeconds);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", base32Decode(secret)).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

export function verifyTotpCode(secret: string, code: string, window = 1) {
  const normalized = String(code || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  const now = Date.now();
  for (let offset = -window; offset <= window; offset += 1) {
    const expected = getTotpCode(secret, now + offset * 30_000);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(normalized))) return true;
  }
  return false;
}

export function createTotpProvisioningUri(input: { secret: string; issuer: string; account: string }) {
  const issuer = encodeURIComponent(input.issuer);
  const account = encodeURIComponent(input.account);
  return `otpauth://totp/${issuer}:${account}?secret=${input.secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}

export function createRecoveryCodes(count = 10) {
  return Array.from({ length: count }, () => crypto.randomBytes(5).toString("hex").toUpperCase().replace(/(.{5})/, "$1-"));
}

export function hashRecoveryCode(code: string) {
  return crypto.createHash("sha256").update(String(code || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase()).digest("hex");
}

export function encryptTotpSecret(secret: string) {
  return encryptSecret(secret);
}

export function decryptTotpSecret(secretEncrypted: string | null | undefined) {
  return decryptSecret(secretEncrypted);
}
