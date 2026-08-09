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
    permissionsMap.set(r.permissions.key, r.role_permissions.scope || "tenant");
  }

  // Apply user overrides
  const overrides = await db
    .select()
    .from(userOverrides)
    .innerJoin(permissions, eq(userOverrides.permissionId, permissions.id))
    .where(eq(userOverrides.userId, userId));

  for (const o of overrides) {
    if (o.user_overrides.allowed) {
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
  // `isOwner` must be a caller-verified fact (e.g. a real guardian/patient
  // relationship looked up in the database) — it is NOT satisfied merely by
  // an id being present in the request. Passing an unverified id here would
  // let any "own"-scoped permission be used to access any other user's data.
  context?: { isOwner?: boolean; departmentId?: string }
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
      return context?.isOwner === true;
    default:
      return false;
  }
}
