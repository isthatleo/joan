#!/usr/bin/env node

/**
 * Clear all tenants from the database
 * Usage: node clear-tenants.js
 */

import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, ".env") });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}

async function clearTenants() {
  const sql = neon(DATABASE_URL, { fullResults: true });

  try {
    console.log("🗑️  Starting tenant cleanup...");

    // Get all tenants first to log what we're deleting
    const tenantsResult = await sql`SELECT id, name, slug FROM tenants`;
    const tenants = Array.isArray(tenantsResult) ? tenantsResult : [];

    console.log(`Found ${tenants.length} tenant(s) to delete:`);
    if (tenants.length > 0) {
      tenants.forEach(t => {
        console.log(`  - ${t.name} (${t.slug})`);
      });
    } else {
      console.log("  (no tenants found)");
    }

    // Delete in the right order to avoid foreign key constraints
    console.log("\n📝 Deleting related data...");

    // Delete user roles
    try {
      await sql`DELETE FROM user_roles`;
      console.log("  ✓ Deleted user_roles");
    } catch (e) {
      console.log("  ⊘ user_roles (empty or error)");
    }

    // Delete role permissions
    try {
      await sql`DELETE FROM role_permissions`;
      console.log("  ✓ Deleted role_permissions");
    } catch (e) {
      console.log("  ⊘ role_permissions (empty or error)");
    }

    // Delete user overrides
    try {
      await sql`DELETE FROM user_overrides`;
      console.log("  ✓ Deleted user_overrides");
    } catch (e) {
      console.log("  ⊘ user_overrides (empty or error)");
    }

    // Delete user settings
    try {
      await sql`DELETE FROM user_settings`;
      console.log("  ✓ Deleted user_settings");
    } catch (e) {
      console.log("  ⊘ user_settings (empty or error)");
    }

    // Delete users
    try {
      await sql`DELETE FROM users`;
      console.log("  ✓ Deleted users");
    } catch (e) {
      console.log("  ⊘ users (empty or error)");
    }

    // Delete roles
    try {
      await sql`DELETE FROM roles`;
      console.log("  ✓ Deleted roles");
    } catch (e) {
      console.log("  ⊘ roles (empty or error)");
    }

    // Delete branches
    try {
      await sql`DELETE FROM branches`;
      console.log("  ✓ Deleted branches");
    } catch (e) {
      console.log("  ⊘ branches (empty or error)");
    }

    // Delete departments
    try {
      await sql`DELETE FROM departments`;
      console.log("  ✓ Deleted departments");
    } catch (e) {
      console.log("  ⊘ departments (empty or error)");
    }

    // Delete tenants
    console.log("\n🔪 Deleting tenants...");
    try {
      await sql`DELETE FROM tenants`;
      console.log("  ✓ Deleted tenants");
    } catch (e) {
      console.log("  ⊘ tenants (empty or error)");
    }

    // Verify
    const verifyResult = await sql`SELECT COUNT(*) as count FROM tenants`;
    const count = Array.isArray(verifyResult) && verifyResult[0] ? verifyResult[0].count : 0;

    console.log(`\n✅ Cleanup complete! Remaining tenants: ${count}`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error clearing tenants:", error);
    process.exit(1);
  }
}

clearTenants();

