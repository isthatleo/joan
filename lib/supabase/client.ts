"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ajpkoehaekcqhyjkxuxs.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqcGtvZWhhZWtjcWh5amt4dXhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzc0MzgsImV4cCI6MjA4NTgxMzQzOH0.Ak6xnbUnTsyEIBK4cbLrb8FwCIfqHdboRxXqnLQ4A6E";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
