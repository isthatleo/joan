/**
 * Database initialization and synchronization script
 * This file ensures all tables are created and synced with Neon
 */

import { db } from "./index";
import { tenants, roles, permissions, rolePermissions, users } from "./schema";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

const PERMISSION_CONFIGS = [
  // Dashboard permissions
  { key: "dashboard.read", resource: "dashboard", action: "read", description: "View dashboard" },
  { key: "dashboard.write", resource: "dashboard", action: "write", description: "Edit dashboard" },

  // Admin permissions
  { key: "admin.manage", resource: "admin", action: "manage", description: "Full admin access" },
  { key: "tenants.read", resource: "tenants", action: "read", description: "View tenants" },
  { key: "tenants.write", resource: "tenants", action: "write", description: "Manage tenants" },
  { key: "users.read", resource: "users", action: "read", description: "View users" },
  { key: "users.write", resource: "users", action: "write", description: "Manage users" },
  { key: "roles.read", resource: "roles", action: "read", description: "View roles" },
  { key: "roles.write", resource: "roles", action: "write", description: "Manage roles" },

  // Patient permissions
  { key: "patient.read", resource: "patient", action: "read", description: "View patients" },
  { key: "patient.write", resource: "patient", action: "write", description: "Manage patients" },
  { key: "patient.delete", resource: "patient", action: "delete", description: "Delete patients" },

  // Appointment permissions
  { key: "appointment.read", resource: "appointment", action: "read", description: "View appointments" },
  { key: "appointment.write", resource: "appointment", action: "write", description: "Manage appointments" },
  { key: "appointment.cancel", resource: "appointment", action: "cancel", description: "Cancel appointments" },

  // Lab permissions
  { key: "lab.read", resource: "lab", action: "read", description: "View lab orders" },
  { key: "lab.write", resource: "lab", action: "write", description: "Manage lab orders" },
  { key: "lab.results", resource: "lab", action: "results", description: "View/enter lab results" },

  // Pharmacy permissions
  { key: "pharmacy.read", resource: "pharmacy", action: "read", description: "View pharmacy" },
  { key: "pharmacy.write", resource: "pharmacy", action: "write", description: "Manage pharmacy" },
  { key: "pharmacy.dispense", resource: "pharmacy", action: "dispense", description: "Dispense medications" },

  // Billing permissions
  { key: "billing.read", resource: "billing", action: "read", description: "View billing" },
  { key: "billing.write", resource: "billing", action: "write", description: "Manage billing" },
  { key: "billing.invoice", resource: "billing", action: "invoice", description: "Create invoices" },

  // Analytics permissions
  { key: "analytics.read", resource: "analytics", action: "read", description: "View analytics" },
  { key: "analytics.write", resource: "analytics", action: "write", description: "Manage analytics" },

  // Compliance permissions
  { key: "compliance.read", resource: "compliance", action: "read", description: "View compliance" },
  { key: "compliance.audit", resource: "compliance", action: "audit", description: "View audit logs" },

  // System permissions
  { key: "system.health", resource: "system", action: "health", description: "View system health" },
  { key: "system.settings", resource: "system", action: "settings", description: "Manage system settings" },
];

const ROLE_CONFIGS: Record<string, string[]> = {
  super_admin: ["admin.manage", "dashboard.read", "dashboard.write"],
  hospital_admin: ["admin.manage", "dashboard.read", "tenants.read", "users.read", "users.write"],
  doctor: ["dashboard.read", "patient.read", "appointment.read", "lab.read", "pharmacy.read"],
  nurse: ["dashboard.read", "patient.read", "patient.write", "vitals.read", "vitals.write"],
  lab_technician: ["lab.read", "lab.write", "lab.results"],
  pharmacist: ["pharmacy.read", "pharmacy.write", "pharmacy.dispense"],
  accountant: ["billing.read", "billing.write", "billing.invoice", "analytics.read"],
  receptionist: ["dashboard.read", "appointment.read", "appointment.write", "patient.read"],
  patient: ["dashboard.read", "patient.read"],
  guardian: ["dashboard.read", "patient.read"],
};

export async function initializeDatabase() {
  try {
    console.log("Starting database initialization...");

    // 1. Create default tenant
    let [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, "default"))
      .limit(1);

    if (!tenant) {
      console.log("Creating default tenant...");
      const result = await db
        .insert(tenants)
        .values({
          name: "Default Tenant",
          slug: "default",
          plan: "premium",
          isActive: true,
        })
        .returning();
      tenant = result[0];
    }

    // 2. Create permissions
    console.log("Syncing permissions...");
    for (const perm of PERMISSION_CONFIGS) {
      const existing = await db
        .select()
        .from(permissions)
        .where(eq(permissions.key, perm.key))
        .limit(1);

      if (!existing.length) {
        await db.insert(permissions).values(perm);
      }
    }

    // 3. Create roles with permissions
    console.log("Syncing roles and permissions...");
    for (const [roleName, permissionKeys] of Object.entries(ROLE_CONFIGS)) {
      let [role] = await db
        .select()
        .from(roles)
        .where(eq(roles.name, roleName))
        .limit(1);

      if (!role) {
        const result = await db
          .insert(roles)
          .values({
            tenantId: tenant.id,
            name: roleName,
          })
          .returning();
        role = result[0];
      }

      // Assign permissions to role
      for (const permKey of permissionKeys) {
        const [perm] = await db
          .select()
          .from(permissions)
          .where(eq(permissions.key, permKey))
          .limit(1);

        if (perm) {
          const existing = await db
            .select()
            .from(rolePermissions)
            .where(
              sql`${rolePermissions.roleId} = ${role.id} AND ${rolePermissions.permissionId} = ${perm.id}`
            )
            .limit(1);

          if (!existing.length) {
            await db.insert(rolePermissions).values({
              roleId: role.id,
              permissionId: perm.id,
              scope: "global",
            });
          }
        }
      }
    }

    // 4. Create or verify super admin user
    console.log("Syncing super admin user...");
    let [superAdminUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, "leonardlomude@icloud.com"))
      .limit(1);

    if (!superAdminUser) {
      const hashedPassword = await bcrypt.hash("Myname@78", 10);
      const result = await db
        .insert(users)
        .values({
          tenantId: tenant.id,
          email: "leonardlomude@icloud.com",
          passwordHash: hashedPassword,
          fullName: "Leonard Lomude",
          isActive: true,
        })
        .returning();
      superAdminUser = result[0];
    }

    console.log("✅ Database initialization completed successfully!");
    return {
      tenant,
      superAdminUser,
      success: true,
    };
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
}

export async function testDatabaseConnection() {
  try {
    console.log("Testing database connection...");
    const result = await db.execute(sql`SELECT 1`);
    console.log("✅ Database connection successful!");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
}

