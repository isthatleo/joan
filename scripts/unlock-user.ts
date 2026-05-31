import { and, eq, ilike, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { userSettings, users } from "@/lib/db/schema";
import { mergeUserSettings } from "@/lib/user-settings";

const email = (process.argv[2] || process.env.UNLOCK_EMAIL || "").trim().toLowerCase();

if (!email) {
  console.error("Usage: npm run user:unlock -- user@example.com");
  process.exit(1);
}

async function main() {
  const user = await db.query.users.findFirst({
    where: and(ilike(users.email, email), isNull(users.deletedAt)),
    columns: { id: true, email: true, fullName: true, role: true },
  });

  if (!user) {
    throw new Error(`No active user found for ${email}`);
  }

  const settingsRecord = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, user.id),
  });

  const merged = mergeUserSettings((settingsRecord?.settings as Record<string, any> | undefined) || {});
  const nextSettings = mergeUserSettings({
    ...merged,
    security: {
      ...merged.security,
      failedLoginAttempts: 0,
      lockoutUntil: "",
    },
  });

  await db
    .insert(userSettings)
    .values({
      userId: user.id,
      settings: nextSettings,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: {
        settings: nextSettings,
        updatedAt: new Date(),
      },
    });

  console.log(`Unlocked ${user.email} (${user.role || "no role"})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
