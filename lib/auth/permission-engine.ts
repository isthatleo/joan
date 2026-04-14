import { db } from "@/lib/db";
import { userRoles, rolePermissions, userOverrides, permissions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type Scope = "own" | "department" | "tenant" | "global";

export async function resolvePermissions(userId: string) {
  const roles = await db
    .select()
    .from(userRoles)
    .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(userRoles.userId, userId));

  const permissionsMap = new Map<string, string>();

  for (const r of roles) {
    permissionsMap.set(r.permissions.key, r.rolePermissions.scope);
  }

  // Apply user overrides
  const overrides = await db
    .select()
    .from(userOverrides)
    .innerJoin(permissions, eq(userOverrides.permissionId, permissions.id))
    .where(eq(userOverrides.userId, userId));

  for (const o of overrides) {
    if (o.userOverrides.allowed) {
      permissionsMap.set(o.permissions.key, "global");
    } else {
      permissionsMap.delete(o.permissions.key);
    }
  }

  return permissionsMap;
}

export function can(
  permissions: Map<string, string>,
  required: string,
  context?: { ownerId?: string; departmentId?: string }
) {
  const scope = permissions.get(required);
  if (!scope) return false;

  switch (scope) {
    case "global":
      return true;
    case "tenant":
      return true;
    case "department":
      return context?.departmentId !== undefined;
    case "own":
      return context?.ownerId !== undefined;
    default:
      return false;
  }
}
