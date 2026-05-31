import { neon } from "@neondatabase/serverless";
import { getCookieCache, getSessionCookie } from "better-auth/cookies";
import { eq } from "drizzle-orm";
import { drizzle as drizzleAuth } from "drizzle-orm/neon-http";
import { auth } from "@/lib/auth";
import * as authSchema from "@/lib/auth-schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const authSql = neon(process.env.DATABASE_URL, { fullResults: false });
const authDb = drizzleAuth(authSql, { schema: authSchema });

export async function resolveBetterAuthSession(headers: Headers) {
  const directSession = await auth.api.getSession({ headers }).catch(() => null as any);
  if (directSession?.user?.email) {
    return directSession;
  }

  const cachedSession = await getCookieCache(headers).catch(() => null as any);
  if (cachedSession?.user?.email) {
    return cachedSession;
  }

  const token = getSessionCookie(headers);
  if (!token) {
    return null;
  }

  const sessionRow = await authDb.query.session.findFirst({
    where: eq(authSchema.session.token, token),
  });
  if (!sessionRow || sessionRow.expiresAt <= new Date()) {
    return null;
  }

  const userRow = await authDb.query.user.findFirst({
    where: eq(authSchema.user.id, sessionRow.userId),
  });
  if (!userRow?.email) {
    return null;
  }

  return {
    session: sessionRow,
    user: userRow,
  };
}
