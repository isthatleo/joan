import { drizzle } from "drizzle-orm/neon-http";
import { neon, neonConfig } from "@neondatabase/serverless";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Configure Neon with optimal settings for different environments
if (process.env.NODE_ENV === "development") {
  // In development, add connection pooling options
  neonConfig.poolQueryViaFetch = true;
  neonConfig.useSecureWebSocket = true;
  neonConfig.wsProxy = undefined; // Use direct websocket connection
}

// Create Neon client with comprehensive error handling
let sql: any;
try {
  sql = neon(process.env.DATABASE_URL, {
    fullResults: false,
  });
} catch (error) {
  console.error("Failed to initialize Neon client:", error);
  // Create a fallback minimal client that throws on use
  sql = (() => {
    throw new Error("Database not initialized. Please check DATABASE_URL.");
  });
}

// Add error handler to Neon client if available
if (sql.catch) {
  sql.catch((err: Error) => {
    console.error("Database connection error:", err.message);
  });
}

export const db = drizzle(sql, { schema });
