import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: null, // We'll handle sessions separately if needed
      account: null,
      verification: null,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    // Add if needed
  },
});
