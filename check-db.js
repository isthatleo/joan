import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

async function checkTenants() {
  const sql = neon(DATABASE_URL);

  try {
    const result = await sql`SELECT COUNT(*) as count FROM tenants`;
    console.log("Tenant count:", result[0].count);

    const tenants = await sql`SELECT id, name, slug FROM tenants LIMIT 5`;
    console.log("Tenants:", tenants);
  } catch (error) {
    console.error("Error:", error);
  }
}

checkTenants();
