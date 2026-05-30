import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleAuth } from "drizzle-orm/neon-http";
import { and, eq, ilike, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { departments, roles, tenants, userRoles, users, userSettings } from "@/lib/db/schema";
import * as authSchema from "@/lib/auth-schema";
import { mergeUserSettings } from "@/lib/user-settings";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const authSql = neon(process.env.DATABASE_URL, { fullResults: false });
const authDb = drizzleAuth(authSql, { schema: authSchema });

export const STAFF_ROLES = [
  "hospital_admin",
  "doctor",
  "nurse",
  "lab_technician",
  "pharmacist",
  "accountant",
  "receptionist",
] as const;

export type StaffRole = typeof STAFF_ROLES[number];

const STAFF_ROLE_SET = new Set<string>(STAFF_ROLES);

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  hospital_admin: "Hospital Admin",
  doctor: "Doctor",
  nurse: "Nurse",
  lab_technician: "Lab Technician",
  pharmacist: "Pharmacist",
  accountant: "Accountant",
  receptionist: "Receptionist",
};

export function normalizeRole(value?: string | null) {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function isStaffRole(value?: string | null): value is StaffRole {
  return STAFF_ROLE_SET.has(normalizeRole(value));
}

export function generateTemporaryPassword() {
  return `Joa-${crypto.randomBytes(5).toString("base64url")}1!`;
}

export function buildTenantLoginUrl(slug: string, role?: StaffRole) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000";
  const base = new URL(origin);
  const query = role ? `?role=${encodeURIComponent(role)}` : "";

  if (base.hostname === "localhost") {
    return `${base.protocol}//${slug}.localhost:${base.port || "3000"}/login${query}`;
  }

  if (base.hostname === "127.0.0.1") {
    return `${base.protocol}//localhost:${base.port || "3000"}/tenant-login/${slug}${query}`;
  }

  const hostParts = base.hostname.split(".");
  const bareHost = hostParts[0] === "www" ? hostParts.slice(1).join(".") : base.hostname;
  return `${base.protocol}//${slug}.${bareHost}${base.port ? `:${base.port}` : ""}/login${query}`;
}

export async function requireTenantAdmin(headers: Headers, tenantId: string) {
  const { auth } = await import("@/lib/auth");
  const session = await auth.api.getSession({ headers });
  if (!session?.user?.email) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }

  const appUser = await db.query.users.findFirst({
    where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
    columns: { id: true, email: true, tenantId: true, role: true, isActive: true },
  });

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    columns: { id: true, adminUserId: true },
  });

  const tenantAdminRows = await db
    .select({ userId: users.id })
    .from(users)
    .innerJoin(userRoles, eq(userRoles.userId, users.id))
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(eq(users.tenantId, tenantId), isNull(users.deletedAt), eq(roles.name, "hospital_admin")))
    .limit(1)
    .catch(() => []);

  const tenantHasNoAdmin = !tenant?.adminUserId && tenantAdminRows.length === 0;

  if (!appUser?.id) {
    if (tenantHasNoAdmin) {
      return { ok: true as const, user: null, session, bootstrap: true as const };
    }
    return { ok: false as const, status: 403, error: "Forbidden" };
  }

  if (appUser.isActive === false) {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }

  const roleRows = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, appUser.id))
    .catch(() => []);

  const assignedRoles = roleRows.map((row) => normalizeRole(row.roleName));
  const isSuperAdmin = assignedRoles.includes("super_admin") || normalizeRole(appUser.role) === "super_admin";
  const isTenantAdminUser = tenant?.adminUserId === appUser.id;
  const isTenantScopedUser = appUser.tenantId === tenantId;
  const isAdmin = isSuperAdmin || isTenantAdminUser || (isTenantScopedUser && (assignedRoles.includes("hospital_admin") || normalizeRole(appUser.role) === "hospital_admin"));

  if (!isAdmin && isTenantScopedUser) {
    // Bootstrap fallback: if no tenant admin exists yet, active tenant staff can open staff management
    // to create/repair the hospital admin account instead of leaving the tenant locked out.
    if (tenantHasNoAdmin && assignedRoles.some(isStaffRole)) {
      return { ok: true as const, user: appUser, session };
    }
  }

  if (!isAdmin) {
    return { ok: false as const, status: 403, error: "Hospital admin access required" };
  }

  return { ok: true as const, user: appUser, session };
}

export async function ensureRole(tenantId: string, roleName: StaffRole) {
  const normalized = normalizeRole(roleName) as StaffRole;
  let role = await db.query.roles.findFirst({
    where: and(eq(roles.tenantId, tenantId), eq(roles.name, normalized)),
  });

  if (!role) {
    [role] = await db.insert(roles).values({ tenantId, name: normalized }).returning();
  }

  return role;
}

export async function setStaffRole(userId: string, tenantId: string, roleName: StaffRole) {
  const staffRoles = await db.query.roles.findMany({
    where: and(eq(roles.tenantId, tenantId), inArray(roles.name, [...STAFF_ROLES])),
  });
  const staffRoleIds = staffRoles.map((role) => role.id);

  if (staffRoleIds.length) {
    await db.delete(userRoles).where(and(eq(userRoles.userId, userId), inArray(userRoles.roleId, staffRoleIds))).catch(() => null);
  }

  const role = await ensureRole(tenantId, roleName);
  const existing = await db.query.userRoles.findFirst({
    where: and(eq(userRoles.userId, userId), eq(userRoles.roleId, role.id)),
  });

  if (!existing) {
    await db.insert(userRoles).values({ userId, roleId: role.id });
  }
}

export async function upsertForcePasswordSettings(userId: string, forcePasswordChange: boolean, extra?: Record<string, unknown>) {
  const current = await db.query.userSettings.findFirst({ where: eq(userSettings.userId, userId) });
  const currentRaw = (current?.settings && typeof current.settings === "object" ? current.settings : {}) as Record<string, any>;
  const merged = mergeUserSettings({
    ...currentRaw,
    security: {
      ...(currentRaw.security || {}),
      forcePasswordChange,
      passwordLastChanged: forcePasswordChange ? "" : new Date().toISOString(),
      failedLoginAttempts: 0,
      lockoutUntil: "",
    },
  });

  const settings = {
    ...currentRaw,
    ...extra,
    ...merged,
  };

  await db
    .insert(userSettings)
    .values({ userId, settings, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { settings, updatedAt: new Date() },
    });

  return settings;
}

export async function upsertCredentialAuthUser(input: {
  appUserId: string;
  email: string;
  fullName: string;
  passwordHash: string;
  emailVerified?: boolean;
}) {
  const existingAuthUser = await authDb.query.user.findFirst({
    where: ilike(authSchema.user.email, input.email),
  });
  const authUserId = existingAuthUser?.id || crypto.randomUUID();
  const now = new Date();

  if (!existingAuthUser) {
    await authDb.insert(authSchema.user).values({
      id: authUserId,
      name: input.fullName || input.email,
      email: input.email,
      emailVerified: input.emailVerified ?? true,
      image: null,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    await authDb
      .update(authSchema.user)
      .set({ name: input.fullName || existingAuthUser.name || input.email, updatedAt: now })
      .where(eq(authSchema.user.id, authUserId));
  }

  const credential = await authDb.query.account.findFirst({
    where: and(eq(authSchema.account.userId, authUserId), eq(authSchema.account.providerId, "credential")),
  });

  if (!credential) {
    await authDb.insert(authSchema.account).values({
      id: crypto.randomUUID(),
      accountId: authUserId,
      providerId: "credential",
      userId: authUserId,
      password: input.passwordHash,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    await authDb
      .update(authSchema.account)
      .set({ password: input.passwordHash, updatedAt: now })
      .where(eq(authSchema.account.id, credential.id));
  }

  return authUserId;
}

export async function getStaffRows(tenantId: string) {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      phone: users.phone,
      address: users.address,
      bio: users.bio,
      avatar: users.avatar,
      baseRole: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      linkedRole: roles.name,
      settings: userSettings.settings,
    })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(roles.id, userRoles.roleId))
    .leftJoin(userSettings, eq(userSettings.userId, users.id))
    .where(and(eq(users.tenantId, tenantId), isNull(users.deletedAt)))
    .orderBy(users.fullName, users.email);

  const rolesByUserId = new Map<string, string[]>();
  for (const row of rows) {
    const role = normalizeRole(row.linkedRole);
    if (!role) continue;
    rolesByUserId.set(row.id, [...(rolesByUserId.get(row.id) || []), role]);
  }

  const staffById = new Map<string, typeof rows[number]>();
  for (const row of rows) {
    const assignedRoles = rolesByUserId.get(row.id) || [];
    const effectiveRole = assignedRoles.find(isStaffRole) || (!assignedRoles.length && isStaffRole(row.baseRole) ? normalizeRole(row.baseRole) : "");
    if (!isStaffRole(effectiveRole)) continue;
    if (!staffById.has(row.id) || normalizeRole(row.linkedRole) === effectiveRole) {
      staffById.set(row.id, row);
    }
  }

  const departmentRows = await db.query.departments.findMany({
    where: eq(departments.tenantId, tenantId),
    columns: { id: true, name: true },
  }).catch(() => []);
  const departmentNames = new Set(departmentRows.map((department) => department.name).filter(Boolean));

  return Array.from(staffById.values()).map((row) => {
    const assignedRoles = rolesByUserId.get(row.id) || [];
    const role = (assignedRoles.find(isStaffRole) || normalizeRole(row.baseRole)) as StaffRole;
    const settings = (row.settings && typeof row.settings === "object" ? row.settings : {}) as Record<string, any>;
    const staffProfile = settings.staffProfile || {};
    const departmentId = String(staffProfile.departmentId || "");
    const matchedDepartment = departmentId ? departmentRows.find((departmentRow) => departmentRow.id === departmentId) : null;
    const department = String(staffProfile.department || matchedDepartment?.name || row.bio || STAFF_ROLE_LABELS[role] || "General");

    return {
      id: row.id,
      email: row.email,
      fullName: row.fullName || row.email,
      phone: row.phone || "",
      address: row.address || "",
      avatar: row.avatar || null,
      role,
      roleLabel: STAFF_ROLE_LABELS[role] || role.replace(/_/g, " "),
      roles: assignedRoles,
      departmentId,
      department,
      departmentKnown: Boolean(matchedDepartment) || departmentNames.has(department),
      title: staffProfile.title || STAFF_ROLE_LABELS[role] || "Staff",
      employeeId: staffProfile.employeeId || "",
      licenseNumber: staffProfile.licenseNumber || "",
      startDate: staffProfile.startDate || "",
      emergencyContact: staffProfile.emergencyContact || "",
      isActive: Boolean(row.isActive),
      forcePasswordChange: Boolean(settings.security?.forcePasswordChange),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  });
}

export async function createStaffMember(input: {
  tenantId: string;
  tenantSlug: string;
  email: string;
  fullName: string;
  phone?: string | null;
  address?: string | null;
  role: StaffRole;
  departmentId?: string | null;
  department?: string | null;
  title?: string | null;
  employeeId?: string | null;
  licenseNumber?: string | null;
  startDate?: string | null;
  emergencyContact?: string | null;
}) {
  const email = input.email.trim().toLowerCase();
  const existingAnyTenant = await db.query.users.findFirst({
    where: ilike(users.email, email),
  });

  if (existingAnyTenant && existingAnyTenant.tenantId && existingAnyTenant.tenantId !== input.tenantId) {
    throw new Error("This email is already assigned to another tenant.");
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  const now = new Date();
  let departmentName = input.department || "";
  if (input.departmentId) {
    const department = await db.query.departments.findFirst({
      where: and(eq(departments.id, input.departmentId), eq(departments.tenantId, input.tenantId), isNull(departments.deletedAt)),
      columns: { id: true, name: true },
    });
    if (!department) {
      throw new Error("Selected department was not found for this tenant.");
    }
    departmentName = department.name || departmentName;
  }

  let appUser = existingAnyTenant || null;
  if (!appUser) {
    const [created] = await db
      .insert(users)
      .values({
        tenantId: input.tenantId,
        email,
        fullName: input.fullName,
        phone: input.phone || null,
        address: input.address || null,
        bio: departmentName || null,
        role: input.role,
        isActive: true,
        passwordHash,
      })
      .returning();
    appUser = created;
  } else {
    const [updated] = await db
      .update(users)
      .set({
        tenantId: input.tenantId,
        fullName: input.fullName,
        phone: input.phone || null,
        address: input.address || null,
        bio: departmentName || null,
        role: input.role,
        isActive: true,
        passwordHash,
        updatedAt: now,
      })
      .where(eq(users.id, appUser.id))
      .returning();
    appUser = updated;
  }

  await setStaffRole(appUser.id, input.tenantId, input.role);
  await upsertForcePasswordSettings(appUser.id, true, {
    staffProfile: {
      departmentId: input.departmentId || "",
      department: departmentName,
      title: input.title || STAFF_ROLE_LABELS[input.role],
      employeeId: input.employeeId || "",
      licenseNumber: input.licenseNumber || "",
      startDate: input.startDate || "",
      emergencyContact: input.emergencyContact || "",
      provisionedAt: now.toISOString(),
    },
  });
  await upsertCredentialAuthUser({
    appUserId: appUser.id,
    email,
    fullName: input.fullName,
    passwordHash,
    emailVerified: true,
  });

  return {
    staff: appUser,
    temporaryPassword,
    loginUrl: buildTenantLoginUrl(input.tenantSlug, input.role),
  };
}
