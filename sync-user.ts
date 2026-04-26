import { config } from "dotenv";
config();

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_EMTKlq59JYQs@ep-spring-dust-anfktbmz-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

import { createClient } from "@supabase/supabase-js";
import { db } from "./lib/db";
import { users } from "./lib/db/schema";
import { eq } from "drizzle-orm";

const supabaseUrl = "https://ajpkoehaekcqhyjkxuxs.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqcGtvZWhhZWtjcWh5amt4dXhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzc0MzgsImV4cCI6MjA4NTgxMzQzOH0.Ak6xnbUnTsyEIBK4cbLrb8FwCIfqHdboRxXqnLQ4A6E";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function syncUserId() {
  try {
    // Sign in to get the session
    const { data, error } = await supabase.auth.signInWithPassword({
      email: "leonardlomude@icloud.com",
      password: "Myname@78",
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error("No user data");
    }

    const supabaseUserId = data.user.id;

    // Update the Drizzle user ID to match Supabase user ID
    await db
      .update(users)
      .set({ id: supabaseUserId })
      .where(eq(users.email, "leonardlomude@icloud.com"));

    console.log("User ID synced successfully:", supabaseUserId);
  } catch (error) {
    console.error("Error syncing user ID:", error);
  } finally {
    process.exit(0);
  }
}

syncUserId();
