#!/usr/bin/env node

/**
 * Create test tenants with real data
 * Usage: node create-test-tenant.js --name "Hospital Name" --slug "hospital-slug" --plan "Premium"
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

// Parse command line arguments
const args = process.argv.slice(2);
const nameArg = args.includes("--name") ? args[args.indexOf("--name") + 1] : undefined;
const slugArg = args.includes("--slug") ? args[args.indexOf("--slug") + 1] : undefined;
const planArg = args.includes("--plan") ? args[args.indexOf("--plan") + 1] : "Premium";

if (!nameArg || !slugArg) {
  console.error("❌ Usage: node create-test-tenant.js --name \"Hospital Name\" --slug \"hospital-slug\" [--plan \"Premium\"]");
  process.exit(1);
}

async function createTenant() {
  const sql = neon(DATABASE_URL, { fullResults: true });

  try {
    console.log("🏥 Creating test tenant...");
    console.log(`   Name: ${nameArg}`);
    console.log(`   Slug: ${slugArg}`);
    console.log(`   Plan: ${planArg}`);

    // Check if tenant already exists
    const existingResult = await sql`SELECT id, slug FROM tenants WHERE slug = ${slugArg}`;
    const existing = Array.isArray(existingResult) ? existingResult[0] : null;

    if (existing) {
      console.warn(`⚠️  Tenant with slug "${slugArg}" already exists`);
      console.log(`   ID: ${existing.id}`);
      process.exit(0);
    }

    // Create the tenant with proper email
    const contactEmail = `contact@${slugArg}.local`;
    const result = await sql`
      INSERT INTO tenants (
        name,
        slug,
        plan,
        is_active,
        provisioning_status,
        timezone,
        contact_email,
        contact_phone
      )
      VALUES (
        ${nameArg},
        ${slugArg},
        ${planArg},
        true,
        'active',
        'UTC',
        ${contactEmail},
        '+1-555-0000'
      )
      RETURNING id, name, slug, plan, is_active, created_at
    `;

    const tenantData = Array.isArray(result) ? result[0] : result;
    
    if (!tenantData) {
      console.error("❌ Failed to create tenant - no result returned");
      process.exit(1);
    }

    console.log("\n✅ Tenant created successfully!");
    console.log(`   ID: ${tenantData.id || 'N/A'}`);
    console.log(`   Name: ${tenantData.name || nameArg}`);
    console.log(`   Slug: ${tenantData.slug || slugArg}`);
    console.log(`   Plan: ${tenantData.plan || planArg}`);
    console.log(`   Active: ${tenantData.is_active ?? true}`);
    console.log(`   Contact: ${contactEmail}`);
    console.log(`\n📝 You can now visit: http://${slugArg}.localhost:3000/`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating tenant:", error);
    process.exit(1);
  }
}

createTenant();
