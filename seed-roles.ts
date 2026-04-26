import { config } from "dotenv";
config();

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_EMTKlq59JYQs@ep-spring-dust-anfktbmz-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

import { db } from "./lib/db";
import { tenants, roles, permissions, rolePermissions, userRoles, users } from "./lib/db/schema";
import { eq } from "drizzle-orm";

async function seedRolesAndPermissions() {
  try {
    // Get the default tenant
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, "default")).limit(1);
    if (!tenant) {
      throw new Error("Default tenant not found");
    }

    // Define permissions
    const permissionData = [
      { key: "read:users", resource: "users", action: "read", description: "Read users" },
      { key: "write:users", resource: "users", action: "write", description: "Write users" },
      { key: "read:patients", resource: "patients", action: "read", description: "Read patients" },
      { key: "write:patients", resource: "patients", action: "write", description: "Write patients" },
      { key: "read:appointments", resource: "appointments", action: "read", description: "Read appointments" },
      { key: "write:appointments", resource: "appointments", action: "write", description: "Write appointments" },
      { key: "read:medical_records", resource: "medical_records", action: "read", description: "Read medical records" },
      { key: "write:medical_records", resource: "medical_records", action: "write", description: "Write medical records" },
      { key: "read:billing", resource: "billing", action: "read", description: "Read billing" },
      { key: "write:billing", resource: "billing", action: "write", description: "Write billing" },
      { key: "read:admin", resource: "admin", action: "read", description: "Read admin" },
      { key: "write:admin", resource: "admin", action: "write", description: "Write admin" },
      { key: "read:reports", resource: "reports", action: "read", description: "Read reports" },
      { key: "write:reports", resource: "reports", action: "write", description: "Write reports" },
    ];

    // Insert permissions
    const insertedPermissions = await db.insert(permissions).values(permissionData).returning();

    // Define roles
    const roleData = [
      { tenantId: tenant.id, name: "super_admin" },
      { tenantId: tenant.id, name: "hospital_admin" },
      { tenantId: tenant.id, name: "doctor" },
      { tenantId: tenant.id, name: "nurse" },
      { tenantId: tenant.id, name: "lab_technician" },
      { tenantId: tenant.id, name: "pharmacist" },
      { tenantId: tenant.id, name: "accountant" },
      { tenantId: tenant.id, name: "receptionist" },
      { tenantId: tenant.id, name: "patient" },
      { tenantId: tenant.id, name: "guardian" },
    ];

    // Insert roles
    const insertedRoles = await db.insert(roles).values(roleData).returning();

    // Get super_admin role
    const superAdminRole = insertedRoles.find(r => r.name === "super_admin");
    if (!superAdminRole) {
      throw new Error("Super admin role not found");
    }

    // Assign all permissions to super_admin
    const rolePermissionData = insertedPermissions.map(p => ({
      roleId: superAdminRole.id,
      permissionId: p.id,
      scope: "global" as const,
    }));

    await db.insert(rolePermissions).values(rolePermissionData);

    // Get the user
    const [user] = await db.select().from(users).where(eq(users.email, "leonardlomude@icloud.com")).limit(1);
    if (!user) {
      throw new Error("User not found");
    }

    // Assign super_admin role to user
    await db.insert(userRoles).values({
      userId: user.id,
      roleId: superAdminRole.id,
    });

    console.log("Roles and permissions seeded successfully");
  } catch (error) {
    console.error("Error seeding roles and permissions:", error);
  } finally {
    process.exit(0);
  }
}

seedRolesAndPermissions();
