import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

async function checkUsers() {
  const sql = neon(DATABASE_URL);

  try {
    const result = await sql`SELECT COUNT(*) as count FROM users`;
    console.log("User count:", result[0].count);

    const users = await sql`SELECT id, email, full_name, tenant_id FROM users LIMIT 10`;
    console.log("Users:", users);

    // Check specific test users
    const testUsers = await sql`SELECT email, full_name, tenant_id FROM users WHERE email LIKE '%@test.com'`;
    console.log("Test users:", testUsers);

    // Check if any users have password hashes
    const usersWithPasswords = await sql`SELECT email, password_hash FROM users WHERE password_hash IS NOT NULL`;
    console.log("Users with passwords:", usersWithPasswords.length);
  } catch (error) {
    console.error("Error:", error);
  }
}

checkUsers();
