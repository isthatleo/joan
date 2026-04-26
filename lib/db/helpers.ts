/**
 * Enhanced database wrapper with error handling and retry logic
 */
import { db as baseDb } from "./index";
import { neonConfig } from "@neondatabase/serverless";

// Configure Neon for optimal performance
neonConfig.poolQueryViaFetch = true;
neonConfig.useSecureWebSocket = true;

export const db = baseDb;

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      console.warn(
        `Attempt ${attempt} failed: ${error.message}. Retrying in ${delay}ms...`
      );

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }

  throw lastError;
}

export async function ensureConnection(): Promise<boolean> {
  try {
    const result = await withRetry(async () => {
      return await db.execute("SELECT 1");
    });
    console.log("✅ Database connection verified");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
}

export function formatError(error: any): string {
  if (error.message) return error.message;
  if (error.detail) return error.detail;
  return "An unknown error occurred";
}

export function getErrorStatus(error: any): number {
  if (error.code === "23505") return 409; // Unique violation
  if (error.code === "23503") return 400; // Foreign key violation
  if (error.code === "23502") return 400; // Not null violation
  return 500;
}

