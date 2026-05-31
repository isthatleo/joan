import "dotenv/config";
import bcrypt from "bcryptjs";
import { and, eq, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import { roles, tenants, userRoles, users } from "@/lib/db/schema";
import { generateTemporaryPassword, upsertCredentialAuthUser, upsertForcePasswordSettings } from "@/lib/tenant-staff";

async function main() {
  const [, , slugArg, emailArg, passwordArg] = process.argv;
  const slug = slugArg?.trim().toLowerCase();
  const email = emailArg?.trim().toLowerCase();

  if (!slug || !email) {
    console.error("Usage: npm run tenant:repair-admin -- <tenant-slug> <admin-email> [new-password]");
    process.exit(1);
  }

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, slug) });
  if (!tenant) {
    throw new Error(`Tenant not found: ${slug}`);
  }

  let appUser = await db.query.users.findFirst({ where: ilike(users.email, email) });
  if (!appUser) {
    const [created] = await db
      .insert(users)
      .values({
        tenantId: tenant.id,
        email,
        fullName: email,
        role: "hospital_admin",
        isActive: true,
      })
      .returning();
    appUser = created;
  } else {
    const [updated] = await db
      .update(users)
      .set({
        tenantId: tenant.id,
        role: "hospital_admin",
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, appUser.id))
      .returning();
    appUser = updated;
  }

  let [adminRole] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.tenantId, tenant.id), eq(roles.name, "hospital_admin")))
    .limit(1);
  if (!adminRole) {
    [adminRole] = await db.insert(roles).values({ tenantId: tenant.id, name: "hospital_admin" }).returning();
  }

  const assigned = await db
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(and(eq(userRoles.userId, appUser.id), eq(userRoles.roleId, adminRole.id)))
    .limit(1);
  if (!assigned.length) {
    await db.insert(userRoles).values({ userId: appUser.id, roleId: adminRole.id });
  }

  const password = passwordArg || generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(password, 12);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, appUser.id));
  await upsertCredentialAuthUser({
    appUserId: appUser.id,
    email,
    fullName: appUser.fullName || email,
    passwordHash,
    emailVerified: true,
  });

  await upsertForcePasswordSettings(appUser.id, true);

  await db.update(tenants).set({
    adminUserId: appUser.id,
    isActive: true,
    provisioningStatus: "active",
    deletedAt: null,
    scheduledPurgeAt: null,
    updatedAt: new Date(),
  } as any).where(eq(tenants.id, tenant.id));

  console.log(JSON.stringify({
    ok: true,
    tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
    admin: { id: appUser.id, email, role: "hospital_admin" },
    temporaryPassword: password,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
