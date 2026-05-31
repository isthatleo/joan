import { db } from "@/lib/db";
import { roles, permissions, rolePermissions } from "@/lib/db/schema";
import { eq, like, desc, and, type SQL } from "drizzle-orm";

export class RoleService {
  async createRole(data: {
    tenantId?: string;
    name: string;
  }) {
    return db.insert(roles).values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
  }

  async getRole(id: string) {
    return db.query.roles.findFirst({
      where: eq(roles.id, id),
      with: {
        rolePermissions: {
          with: {
            permission: true,
          },
        },
      },
    });
  }

  async getAllRoles(options?: {
    search?: string;
    tenantId?: string;
    limit?: number;
    offset?: number;
  }) {
    const conditions: SQL[] = [];

    if (options?.search) {
      conditions.push(like(roles.name, `%${options.search}%`));
    }

    if (options?.tenantId) {
      conditions.push(eq(roles.tenantId, options.tenantId));
    }

    const baseQuery = conditions.length
      ? db.select().from(roles).where(and(...conditions)).orderBy(desc(roles.createdAt))
      : db.select().from(roles).orderBy(desc(roles.createdAt));

    return baseQuery.limit(options?.limit ?? 100).offset(options?.offset ?? 0);
  }

  async updateRole(id: string, data: Partial<{
    name: string;
  }>) {
    return db.update(roles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(roles.id, id))
      .returning();
  }

  async deleteRole(id: string) {
    return db.delete(roles).where(eq(roles.id, id));
  }

  // Permission management
  async createPermission(data: {
    key: string;
    resource: string;
    action: string;
    description?: string;
  }) {
    return db.insert(permissions).values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
  }

  async getPermission(id: string) {
    return db.query.permissions.findFirst({
      where: eq(permissions.id, id),
    });
  }

  async getAllPermissions() {
    return db.select().from(permissions);
  }

  async getPermissionByKey(key: string) {
    return db.query.permissions.findFirst({
      where: eq(permissions.key, key),
    });
  }

  async deletePermission(id: string) {
    return db.delete(permissions).where(eq(permissions.id, id));
  }

  // Role-Permission assignment
  async assignPermissionToRole(roleId: string, permissionId: string, scope: string = "tenant") {
    return db.insert(rolePermissions).values({
      roleId,
      permissionId,
      scope,
    }).returning();
  }

  async removePermissionFromRole(roleId: string, permissionId: string) {
    return db.delete(rolePermissions)
      .where(and(
        eq(rolePermissions.roleId, roleId),
        eq(rolePermissions.permissionId, permissionId)
      ));
  }

  async getRolePermissions(roleId: string) {
    return db.query.rolePermissions.findMany({
      where: eq(rolePermissions.roleId, roleId),
      with: {
        permission: true,
      },
    });
  }

  async getTenantPermissions(tenantId: string) {
    const tenantRoles = await db.query.roles.findMany({
      where: eq(roles.tenantId, tenantId),
    });

    const perms: Record<string, string[]> = {};

    const mappings = await db
      .select({ roleId: roles.id, roleName: roles.name, permKey: permissions.key })
      .from(rolePermissions)
      .innerJoin(roles, eq(roles.id, rolePermissions.roleId))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(eq(roles.tenantId, tenantId));

    mappings.forEach((m) => {
      const roleSlug = m.roleName.toLowerCase().replace(/ /g, "_");
      if (!perms[roleSlug]) perms[roleSlug] = [];
      perms[roleSlug].push(m.permKey);
    });

    return perms;
  }

  async updateTenantPermissions(tenantId: string, perms: Record<string, string[]>) {
    // This is a complex operation: we need to sync the roles and their permissions for this tenant
    // 1. Ensure all roles exist for this tenant
    // 2. Ensure all permissions exist in the permissions table
    // 3. Update the rolePermissions mapping

    for (const [roleSlug, permKeys] of Object.entries(perms)) {
      const roleName = roleSlug
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      // Find or create role
      let role = await db.query.roles.findFirst({
        where: and(eq(roles.tenantId, tenantId), eq(roles.name, roleName)),
      });

      if (!role) {
        const [newRole] = await db
          .insert(roles)
          .values({
            tenantId,
            name: roleName,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        role = newRole;
      }

      // Delete existing permissions for this role
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, role.id));

      // Add new permissions
      for (const key of permKeys) {
        let perm = await this.getPermissionByKey(key);
        if (!perm) {
          const [newPerm] = await this.createPermission({
            key,
            resource: key.split(" ")[0] || "General",
            action: key,
          });
          perm = newPerm;
        }

        await this.assignPermissionToRole(role.id, perm.id);
      }
    }
  }
}

