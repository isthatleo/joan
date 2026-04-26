const { config } = require("dotenv");
config();

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_EMTKlq59JYQs@ep-spring-dust-anfktbmz-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const { db } = require("./lib/db/index");
const { tenants, roles, permissions, rolePermissions, userRoles, users } = require("./lib/db/schema");
const { eq } = require("drizzle-orm");
const bcrypt = require("bcryptjs");

async function seedSuperAdmin() {
  try {
    // Create default tenant if it doesn't exist
    let [tenant] = await db.select().from(tenants).where(eq(tenants.slug, "default")).limit(1);
    if (!tenant) {
      [tenant] = await db.insert(tenants).values({
        name: "Default Tenant",
        slug: "default",
        plan: "premium",
        isActive: true,
      }).returning();
      console.log("Default tenant created");
    }

    // Create super admin user if doesn't exist
    let [user] = await db.select().from(users).where(eq(users.email, "leonardlomude@icloud.com")).limit(1);
    if (!user) {
      const hashedPassword = await bcrypt.hash("Myname@78", 10);
      [user] = await db.insert(users).values({
        tenantId: tenant.id,
        email: "leonardlomude@icloud.com",
        passwordHash: hashedPassword,
        fullName: "Leonard Lomude",
        isActive: true,
      }).returning();
      console.log("Super admin user created");
    }

    // Create super_admin role if doesn't exist
    let [superAdminRole] = await db.select().from(roles).where(eq(roles.name, "super_admin")).limit(1);
    if (!superAdminRole) {
      [superAdminRole] = await db.insert(roles).values({
        tenantId: tenant.id,
        name: "super_admin",
      }).returning();
      console.log("Super admin role created");
    }

    // Create basic permissions if they don't exist
    const permissionData = [
      { key: "dashboard.read", resource: "dashboard", action: "read", description: "Read dashboard" },
      { key: "admin.manage", resource: "admin", action: "manage", description: "Manage admin functions" },
      { key: "patient.read", resource: "patient", action: "read", description: "Read patients" },
      { key: "analytics.read", resource: "analytics", action: "read", description: "Read analytics" },
      { key: "compliance.read", resource: "compliance", action: "read", description: "Read compliance" },
    ];

    for (const perm of permissionData) {
      const [existingPerm] = await db.select().from(permissions).where(eq(permissions.key, perm.key)).limit(1);
      if (!existingPerm) {
        await db.insert(permissions).values(perm);
      }
    }

    // Get all permissions
    const allPermissions = await db.select().from(permissions);

    // Assign all permissions to super_admin role
    for (const perm of allPermissions) {
      const [existing] = await db.select().from(rolePermissions).where(
        eq(rolePermissions.roleId, superAdminRole.id) && eq(rolePermissions.permissionId, perm.id)
      ).limit(1);
      if (!existing) {
        await db.insert(rolePermissions).values({
          roleId: superAdminRole.id,
          permissionId: perm.id,
          scope: "global",
        });
      }
    }

    // Assign super_admin role to user
    const [existingUserRole] = await db.select().from(userRoles).where(
      eq(userRoles.userId, user.id) && eq(userRoles.roleId, superAdminRole.id)
    ).limit(1);
    if (!existingUserRole) {
      await db.insert(userRoles).values({
        userId: user.id,
        roleId: superAdminRole.id,
      });
      console.log("Super admin role assigned to user");
    }

    console.log("Super admin setup completed successfully");
  } catch (error) {
    console.error("Error seeding super admin:", error);
  } finally {
    process.exit(0);
  }
}

seedSuperAdmin();
