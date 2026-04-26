import { db } from "@/lib/db";
import { users, roles, userRoles, permissions, rolePermissions } from "@/lib/db/schema";
import { eq, like, desc, and } from "drizzle-orm";

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
  }) {
    let query = db.select().from(users);

    const conditions = [];

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

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(desc(users.createdAt));

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.offset(options.offset);
    }

    return query;
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
    userRoleRecords.forEach(ur => {
      ur.role?.rolePermissions?.forEach(rp => {
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

