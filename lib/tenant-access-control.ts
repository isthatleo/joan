import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { permissions, rolePermissions, roles, tenantSettings, userRoles, userSettings, users } from "@/lib/db/schema";
import { normalizeRole, requireTenantAdmin, STAFF_ROLE_LABELS } from "@/lib/tenant-staff";

export { requireTenantAdmin };

const ROLE_METADATA_KEY = "role_metadata";

export const DEFAULT_PERMISSIONS = [
  ["users.create", "users", "create", "Create tenant users"],
  ["users.read", "users", "read", "View tenant users"],
  ["users.update", "users", "update", "Update tenant users"],
  ["users.delete", "users", "delete", "Deactivate or remove tenant users"],
  ["roles.create", "roles", "create", "Create tenant roles"],
  ["roles.read", "roles", "read", "View tenant roles"],
  ["roles.update", "roles", "update", "Update tenant roles and permissions"],
  ["roles.delete", "roles", "delete", "Delete custom tenant roles"],
  ["patients.read", "patients", "read", "View patient records"],
  ["patients.update", "patients", "update", "Update patient records"],
  ["appointments.read", "appointments", "read", "View appointments"],
  ["appointments.update", "appointments", "update", "Update appointments"],
  ["billing.read", "billing", "read", "View billing and invoices"],
  ["billing.update", "billing", "update", "Manage billing and payments"],
  ["reports.read", "reports", "read", "View reports and analytics"],
  ["staff.read", "staff", "read", "View staff management"],
  ["staff.update", "staff", "update", "Manage staff access"],
  ["lab.read", "lab", "read", "View lab operations"],
  ["lab.update", "lab", "update", "Manage lab operations"],
  ["pharmacy.read", "pharmacy", "read", "View pharmacy operations"],
  ["pharmacy.update", "pharmacy", "update", "Manage pharmacy operations"],
  ["audit.read", "audit", "read", "View audit logs"],
  ["settings.update", "settings", "update", "Manage hospital settings"],
  ["departments.update", "departments", "update", "Manage departments"],
] as const;

export const SYSTEM_ROLES = [
  "hospital_admin",
  "doctor",
  "nurse",
  "lab_technician",
  "pharmacist",
  "accountant",
  "receptionist",
  "patient",
  "guardian",
] as const;

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  hospital_admin: DEFAULT_PERMISSIONS.map(([key]) => key),
  doctor: ["patients.read", "patients.update", "appointments.read", "appointments.update", "reports.read", "lab.read"],
  nurse: ["patients.read", "patients.update", "appointments.read", "staff.read"],
  lab_technician: ["patients.read", "lab.read", "lab.update", "reports.read"],
  pharmacist: ["patients.read", "pharmacy.read", "pharmacy.update", "reports.read"],
  accountant: ["patients.read", "billing.read", "billing.update", "reports.read"],
  receptionist: ["users.read", "patients.read", "appointments.read", "appointments.update"],
  patient: ["appointments.read", "billing.read"],
  guardian: ["appointments.read", "patients.read"],
};

function roleLabel(name: string) {
  const normalized = normalizeRole(name);
  return STAFF_ROLE_LABELS[normalized as keyof typeof STAFF_ROLE_LABELS] || normalized.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function roleDescription(name: string, description?: string) {
  if (description) return description;
  const label = roleLabel(name);
  if (normalizeRole(name) === "hospital_admin") return "Full hospital administration access for this tenant.";
  return `${label} access profile for tenant dashboard workflows.`;
}

async function readRoleMetadata(tenantId: string): Promise<Record<string, { description?: string; isSystem?: boolean }>> {
  const row = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, ROLE_METADATA_KEY)),
  });
  return (row?.value && typeof row.value === "object" ? row.value : {}) as Record<string, { description?: string; isSystem?: boolean }>;
}

async function writeRoleMetadata(tenantId: string, value: Record<string, { description?: string; isSystem?: boolean }>) {
  const current = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, ROLE_METADATA_KEY)),
  });
  if (current) {
    await db.update(tenantSettings).set({ value, updatedAt: new Date() }).where(eq(tenantSettings.id, current.id));
    return;
  }
  await db.insert(tenantSettings).values({ tenantId, key: ROLE_METADATA_KEY, value, updatedAt: new Date() });
}

export async function ensureDefaultPermissions() {
  const existing = await db.query.permissions.findMany();
  const existingKeys = new Set(existing.map((permission) => permission.key));
  const created = [];
  for (const [key, resource, action, description] of DEFAULT_PERMISSIONS) {
    if (existingKeys.has(key)) continue;
    const [permission] = await db.insert(permissions).values({ key, resource, action, description }).returning();
    created.push(permission);
  }
  return [...existing, ...created];
}

export async function ensureTenantRoles(tenantId: string) {
  const permissionRows = await ensureDefaultPermissions();
  const permissionByKey = new Map(permissionRows.map((permission) => [permission.key, permission]));
  const metadata = await readRoleMetadata(tenantId);
  const currentRoles = await db.query.roles.findMany({ where: eq(roles.tenantId, tenantId) });
  const currentNames = new Set(currentRoles.map((role) => normalizeRole(role.name)));
  const roleRows = [...currentRoles];

  for (const name of SYSTEM_ROLES) {
    if (!currentNames.has(name)) {
      const [role] = await db.insert(roles).values({ tenantId, name }).returning();
      roleRows.push(role);
    }
  }

  for (const role of roleRows) {
    const normalized = normalizeRole(role.name);
    if (!metadata[role.id]) metadata[role.id] = { isSystem: SYSTEM_ROLES.includes(normalized as any), description: roleDescription(normalized) };
    const defaults = DEFAULT_ROLE_PERMISSIONS[normalized] || [];
    for (const permissionKey of defaults) {
      const permission = permissionByKey.get(permissionKey);
      if (!permission) continue;
      const existing = await db.query.rolePermissions.findFirst({
        where: and(eq(rolePermissions.roleId, role.id), eq(rolePermissions.permissionId, permission.id)),
      });
      if (!existing) await db.insert(rolePermissions).values({ roleId: role.id, permissionId: permission.id, scope: "tenant" });
    }
  }

  await writeRoleMetadata(tenantId, metadata);
  return { roles: roleRows, permissions: permissionRows, metadata };
}

export async function getTenantAccessControl(tenantId: string) {
  await ensureTenantRoles(tenantId);
  const [roleRows, permissionRows, rolePermissionRows, userRoleRows, userRows, metadata] = await Promise.all([
    db.query.roles.findMany({ where: eq(roles.tenantId, tenantId), orderBy: [asc(roles.name)] }),
    db.query.permissions.findMany({ orderBy: [asc(permissions.resource), asc(permissions.action)] }),
    db.select({ roleId: rolePermissions.roleId, permissionId: rolePermissions.permissionId, scope: rolePermissions.scope }).from(rolePermissions),
    db.select({ userId: userRoles.userId, roleId: userRoles.roleId, roleName: roles.name }).from(userRoles).innerJoin(roles, eq(roles.id, userRoles.roleId)),
    db.select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      avatar: users.avatar,
      baseRole: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      settings: userSettings.settings,
    }).from(users).leftJoin(userSettings, eq(userSettings.userId, users.id)).where(and(eq(users.tenantId, tenantId), isNull(users.deletedAt))).orderBy(users.fullName, users.email),
    readRoleMetadata(tenantId),
  ]);

  const tenantRoleIds = new Set(roleRows.map((role) => role.id));
  const permissionById = new Map(permissionRows.map((permission) => [permission.id, permission]));
  const assignmentsByRole = new Map<string, typeof permissionRows>();
  for (const assignment of rolePermissionRows) {
    if (!assignment.roleId || !assignment.permissionId || !tenantRoleIds.has(assignment.roleId)) continue;
    const permission = permissionById.get(assignment.permissionId);
    if (!permission) continue;
    assignmentsByRole.set(assignment.roleId, [...(assignmentsByRole.get(assignment.roleId) || []), permission]);
  }

  const rolesByUserId = new Map<string, string[]>();
  for (const row of userRoleRows) {
    if (!row.userId || !row.roleId || !tenantRoleIds.has(row.roleId)) continue;
    rolesByUserId.set(row.userId, [...(rolesByUserId.get(row.userId) || []), normalizeRole(row.roleName)]);
  }

  const roleCards = roleRows.map((role) => {
    const normalized = normalizeRole(role.name);
    const assignedPermissions = assignmentsByRole.get(role.id) || [];
    const userCount = userRoleRows.filter((row) => row.roleId === role.id).length;
    return {
      id: role.id,
      name: normalized,
      label: roleLabel(normalized),
      description: roleDescription(normalized, metadata[role.id]?.description),
      userCount,
      permissions: assignedPermissions,
      permissionIds: assignedPermissions.map((permission) => permission.id),
      createdAt: role.createdAt,
      isSystem: metadata[role.id]?.isSystem ?? SYSTEM_ROLES.includes(normalized as any),
    };
  });

  const usersList = userRows.map((row) => {
    const assignedRoles = rolesByUserId.get(row.id) || [];
    const effectiveRole = assignedRoles[0] || normalizeRole(row.baseRole);
    const settings = (row.settings && typeof row.settings === "object" ? row.settings : {}) as Record<string, any>;
    return {
      id: row.id,
      fullName: row.fullName || row.email,
      email: row.email,
      phone: row.phone || "",
      avatar: row.avatar || null,
      role: effectiveRole || "unassigned",
      roleLabel: effectiveRole ? roleLabel(effectiveRole) : "Unassigned",
      roles: assignedRoles,
      department: settings.staffProfile?.department || "",
      isActive: Boolean(row.isActive),
      forcePasswordChange: Boolean(settings.security?.forcePasswordChange),
      lastActive: row.updatedAt || row.createdAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  });

  const resources = Array.from(new Set(permissionRows.map((permission) => permission.resource))).sort();
  const matrix = resources.map((resource) => {
    const resourcePermissions = permissionRows.filter((permission) => permission.resource === resource);
    const assignedRoleNames = roleCards
      .filter((role) => role.permissions.some((permission) => permission.resource === resource))
      .map((role) => role.label);
    return {
      resource,
      permissions: resourcePermissions,
      actions: {
        create: resourcePermissions.some((permission) => permission.action === "create"),
        read: resourcePermissions.some((permission) => permission.action === "read"),
        update: resourcePermissions.some((permission) => permission.action === "update"),
        delete: resourcePermissions.some((permission) => permission.action === "delete"),
      },
      assignedRoles: assignedRoleNames,
    };
  });

  return {
    roles: roleCards,
    permissions: permissionRows,
    permissionMatrix: matrix,
    users: usersList,
    stats: {
      totalRoles: roleCards.length,
      systemRoles: roleCards.filter((role) => role.isSystem).length,
      customRoles: roleCards.filter((role) => !role.isSystem).length,
      totalPermissions: permissionRows.length,
      resources: resources.length,
      users: usersList.length,
      activeUsers: usersList.filter((user) => user.isActive).length,
    },
  };
}

export async function createTenantRole(tenantId: string, input: { name: string; description?: string; permissionIds?: string[] }) {
  const name = normalizeRole(input.name);
  if (!name) throw new Error("Role name is required.");
  const existing = await db.query.roles.findFirst({ where: and(eq(roles.tenantId, tenantId), eq(roles.name, name)) });
  if (existing) throw new Error("A role with this name already exists.");
  const [role] = await db.insert(roles).values({ tenantId, name }).returning();
  const metadata = await readRoleMetadata(tenantId);
  metadata[role.id] = { isSystem: false, description: input.description || "" };
  await writeRoleMetadata(tenantId, metadata);
  await setRolePermissions(tenantId, role.id, input.permissionIds || []);
  return role;
}

export async function deleteTenantRole(tenantId: string, roleId: string) {
  const data = await getTenantAccessControl(tenantId);
  const role = data.roles.find((item) => item.id === roleId);
  if (!role) throw new Error("Role not found.");
  if (role.isSystem) throw new Error("System roles cannot be deleted.");
  if (role.userCount > 0) throw new Error("Remove users from this role before deleting it.");
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
  await db.delete(roles).where(and(eq(roles.id, roleId), eq(roles.tenantId, tenantId)));
  const metadata = await readRoleMetadata(tenantId);
  delete metadata[roleId];
  await writeRoleMetadata(tenantId, metadata);
}

export async function setRolePermissions(tenantId: string, roleId: string, permissionIds: string[]) {
  const role = await db.query.roles.findFirst({ where: and(eq(roles.id, roleId), eq(roles.tenantId, tenantId)) });
  if (!role) throw new Error("Role not found.");
  const validPermissions = permissionIds.length ? await db.query.permissions.findMany({ where: inArray(permissions.id, permissionIds) }) : [];
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
  for (const permission of validPermissions) {
    await db.insert(rolePermissions).values({ roleId, permissionId: permission.id, scope: "tenant" });
  }
}

export async function setUserTenantRole(tenantId: string, userId: string, roleId: string) {
  const [user, role] = await Promise.all([
    db.query.users.findFirst({ where: and(eq(users.id, userId), eq(users.tenantId, tenantId), isNull(users.deletedAt)) }),
    db.query.roles.findFirst({ where: and(eq(roles.id, roleId), eq(roles.tenantId, tenantId)) }),
  ]);
  if (!user) throw new Error("User not found.");
  if (!role) throw new Error("Role not found.");
  const tenantRoles = await db.query.roles.findMany({ where: eq(roles.tenantId, tenantId), columns: { id: true } });
  const tenantRoleIds = tenantRoles.map((item) => item.id);
  if (tenantRoleIds.length) await db.delete(userRoles).where(and(eq(userRoles.userId, userId), inArray(userRoles.roleId, tenantRoleIds)));
  await db.insert(userRoles).values({ userId, roleId });
  await db.update(users).set({ role: normalizeRole(role.name), updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function getTenantUserAccessDetail(tenantId: string, userId: string) {
  const data = await getTenantAccessControl(tenantId);
  const user = data.users.find((item) => item.id === userId);
  if (!user) return null;
  const roleDetails = data.roles.filter((role) => user.roles.includes(role.name));
  return {
    ...user,
    roleDetails,
    permissions: roleDetails.flatMap((role) => role.permissions),
  };
}
