import { db } from "@/lib/db";
import { roles, permissions, rolePermissions } from "@/lib/db/schema";
import { eq, like, desc, and } from "drizzle-orm";

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
    let query = db.select().from(roles);

    const conditions = [];

    if (options?.search) {
      conditions.push(like(roles.name, `%${options.search}%`));
    }

    if (options?.tenantId) {
      conditions.push(eq(roles.tenantId, options.tenantId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(desc(roles.createdAt));

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.offset(options.offset);
    }

    return query;
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
}

