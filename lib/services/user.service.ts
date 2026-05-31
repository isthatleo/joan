import { db } from "@/lib/db";
import { users, roles, userRoles, permissions, rolePermissions } from "@/lib/db/schema";
import { eq, like, desc, and, or, inArray, type SQL } from "drizzle-orm";

export class UserService {
  async createUser(data: {
    email: string;
    fullName: string;
    passwordHash?: string;
    tenantId?: string;
  }) {
    return db.insert(users).values({
      ...data,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
  }

  async getUser(id: string) {
    return db.query.users.findFirst({
      where: eq(users.id, id),
      with: {
        userRoles: {
          with: {
            role: true,
          },
        },
      },
    });
  }

  async getUserByEmail(email: string) {
    return db.query.users.findFirst({
      where: eq(users.email, email),
      with: {
        userRoles: {
          with: {
            role: true,
          },
        },
      },
    });
  }

  async getAllUsers(options?: {
    search?: string;
    tenantId?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
    roles?: string[];
  }) {
    const conditions: SQL[] = [];

    if (options?.search) {
      conditions.push(
        like(users.email, `%${options.search}%`)
      );
    }

    if (options?.tenantId) {
      conditions.push(eq(users.tenantId, options.tenantId));
    }

    if (options?.isActive !== undefined) {
      conditions.push(eq(users.isActive, options.isActive));
    }

    if (options?.roles && options.roles.length > 0) {
      // Join with userRoles and roles to filter by role names
      const roleConditions = options.roles.map(role => eq(roles.name, role));
      const roleFilter = or(...roleConditions);
      if (roleFilter) {
        const subquery = db
          .select({ userId: userRoles.userId })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(roleFilter);
        conditions.push(inArray(users.id, subquery));
      }
    }

    const baseQuery = conditions.length
      ? db.select().from(users).where(and(...conditions)).orderBy(desc(users.createdAt))
      : db.select().from(users).orderBy(desc(users.createdAt));

    return baseQuery.limit(options?.limit ?? 100).offset(options?.offset ?? 0);
  }

  async updateUser(id: string, data: Partial<{
    email: string;
    fullName: string;
    passwordHash: string;
    isActive: boolean;
    tenantId: string;
  }>) {
    return db.update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
  }

  async deleteUser(id: string) {
    return db.delete(users).where(eq(users.id, id));
  }

  async assignRole(userId: string, roleId: string) {
    return db.insert(userRoles).values({
      userId,
      roleId,
    }).returning();
  }

  async removeRole(userId: string, roleId: string) {
    return db.delete(userRoles)
      .where(and(
        eq(userRoles.userId, userId),
        eq(userRoles.roleId, roleId)
      ));
  }

  async getUserPermissions(userId: string) {
    const userRoleRecords = await db.query.userRoles.findMany({
      where: eq(userRoles.userId, userId),
      with: {
        role: {
          with: {
            rolePermissions: {
              with: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const permissions = new Set<string>();
    userRoleRecords.forEach((ur: any) => {
      ur.role?.rolePermissions?.forEach((rp: any) => {
        permissions.add(rp.permission.key);
      });
    });

    return Array.from(permissions);
  }

  async getUserStats() {
    const result = await db
      .select()
      .from(users);

    return {
      total: result.length,
      active: result.filter(u => u.isActive).length,
      inactive: result.filter(u => !u.isActive).length,
    };
  }

  async deactivateUser(id: string) {
    return db.update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
  }

  async activateUser(id: string) {
    return db.update(users)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
  }
}

