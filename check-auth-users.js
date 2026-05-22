import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

async function checkAuthUsers() {
  const sql = neon(DATABASE_URL);

  try {
    const result = await sql`SELECT COUNT(*) as count FROM "user"`;
    console.log("Auth user count:", result[0].count);

    const users = await sql`SELECT id, email, name, "emailVerified" FROM "user" LIMIT 10`;
    console.log("Auth users:", users);

    // Check accounts table for passwords
    const accounts = await sql`SELECT "userId", "providerId", password FROM account LIMIT 10`;
    console.log("Auth accounts:", accounts);
  } catch (error) {
    console.error("Error:", error);
  }
}

checkAuthUsers();
