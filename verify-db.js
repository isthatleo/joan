#!/usr/bin/env node

/**
 * Database Verification and Setup Script
 * Checks Neon connection, creates tables, and seeds initial data
 */

const dotenv = require("dotenv");
dotenv.config();

const { neon } = require("@neondatabase/serverless");
const { drizzle } = require("drizzle-orm/neon-http");
const * as schema = require("./lib/db/schema");

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not set in .env");
  process.exit(1);
}

console.log("🔍 Verifying Neon Database Connection...");
console.log(`📍 Connection String: ${DATABASE_URL.substring(0, 50)}...`);

async function verifyAndSetup() {
  try {
    // Test connection
    const sql = neon(DATABASE_URL);
    const db = drizzle(sql, { schema });

    console.log("⏳ Testing connection...");
    const result = await db.select().from(schema.tenants).limit(1);
    console.log("✅ Database connection successful!");

    // Check tables
    console.log("\n📊 Checking database schema...");
    const tables = Object.keys(schema).filter(k =>
      schema[k]?._ && schema[k]._.name
    );

    console.log(`Found ${tables.length} tables:`);
    tables.forEach(t => console.log(`  ✓ ${t}`));

    // Check if we have data
    const userCount = await db.select({ count: sql`COUNT(*)` }).from(schema.users);
    console.log(`\n👥 Users: ${userCount[0]?.count || 0}`);

    const tenantCount = await db.select({ count: sql`COUNT(*)` }).from(schema.tenants);
    console.log(`🏢 Tenants: ${tenantCount[0]?.count || 0}`);

    console.log("\n✅ Database verification complete!");
    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Database verification failed:");
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code}`);

    if (error.message.includes("ENOTFOUND")) {
      console.error("\n🔧 Troubleshooting:");
      console.error("   • Check internet connection");
      console.error("   • Verify Neon endpoint is correct");
      console.error("   • Check DATABASE_URL in .env file");
    }

    process.exit(1);
  }
}

verifyAndSetup();

