const { config } = require("dotenv");
config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

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

    // Create super admin user if doesn't exist. Email and password must be supplied
    // by the operator — never hardcode real account credentials in a seed script.
    const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL;
    const superAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD;
    if (!superAdminEmail || !superAdminPassword || superAdminPassword.length < 8) {
      throw new Error("Set SEED_SUPER_ADMIN_EMAIL and SEED_SUPER_ADMIN_PASSWORD (8+ chars) before running this script.");
    }

    let [user] = await db.select().from(users).where(eq(users.email, superAdminEmail)).limit(1);
    if (!user) {
      const hashedPassword = await bcrypt.hash(superAdminPassword, 10);
      [user] = await db.insert(users).values({
        tenantId: tenant.id,
        email: superAdminEmail,
        passwordHash: hashedPassword,
        fullName: "Super Admin",
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
