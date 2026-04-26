/**
 * Enhanced Startup Initialization
 * Runs on server startup to ensure system is properly initialized
 */

import { initializeDatabase, testDatabaseConnection } from "@/lib/db/init";

let initialized = false;

export async function ensureSystemInitialized() {
  if (initialized) return true;

  try {
    console.log("🚀 Initializing Joan Healthcare OS...");

    // Test database connection
    const connected = await testDatabaseConnection();
    if (!connected) {
      console.error("❌ Cannot connect to database. System in read-only mode.");
      console.error("📝 To fix this, ensure DATABASE_URL is set correctly.");
      console.error("📌 See DATABASE_SETUP_COMPLETE.md for instructions.");
      return false;
    }

    // Initialize database schema and seed data
    const result = await initializeDatabase();

    if (result.success) {
      console.log("✅ System initialized successfully");
      console.log(`   - Default tenant: ${result.tenant.name}`);
      console.log(`   - Super admin user: ${result.superAdminUser.email}`);
      initialized = true;
      return true;
    }

    return false;
  } catch (error: any) {
    console.error("❌ System initialization failed:", error.message);
    return false;
  }
}

export function isInitialized() {
  return initialized;
}

export async function reinitialize() {
  initialized = false;
  return ensureSystemInitialized();
}

