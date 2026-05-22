#!/usr/bin/env node

import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, ".env") });

const DATABASE_URL = process.env.DATABASE_URL;

async function listTenants() {
  const sql = neon(DATABASE_URL, { fullResults: true });

  try {
    const result = await sql`SELECT id, name, slug, plan, is_active FROM tenants ORDER BY created_at DESC`;
    const tenants = Array.isArray(result) ? result : [];

    console.log(`\n📋 Current Tenants in Database (${tenants.length}):`);
    console.log("─".repeat(80));

    if (tenants.length === 0) {
      console.log("   (no tenants found)");
    } else {
      tenants.forEach((t, i) => {
        console.log(`\n${i + 1}. ${t.name}`);
        console.log(`   Slug: ${t.slug}`);
        console.log(`   URL: http://${t.slug}.localhost:3000/`);
        console.log(`   Plan: ${t.plan}`);
        console.log(`   Active: ${t.is_active ? '✓ Yes' : '✗ No'}`);
        console.log(`   ID: ${t.id}`);
      });
    }

    console.log("\n" + "─".repeat(80));
    process.exit(0);
  } catch (error) {
    console.error("❌ Error listing tenants:", error);
    process.exit(1);
  }
}

listTenants();

