import { config } from "dotenv";
config();

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_EMTKlq59JYQs@ep-spring-dust-anfktbmz-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

import { db } from "./lib/db";
import { tenants, roles, users, userRoles } from "./lib/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { user as authUser, account as authAccount } from "./lib/auth-schema";

async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(plain, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

const TEST_USERS = [
  { name: "Test Admin", email: "admin@test.com", role: "hospital_admin" },
  { name: "Test Doctor", email: "doctor@test.com", role: "doctor" },
  { name: "Test Nurse", email: "nurse@test.com", role: "nurse" },
  { name: "Test Lab Technician", email: "lab@test.com", role: "lab_technician" },
  { name: "Test Pharmacist", email: "pharmacist@test.com", role: "pharmacist" },
  { name: "Test Accountant", email: "accountant@test.com", role: "accountant" },
  { name: "Test Receptionist", email: "receptionist@test.com", role: "receptionist" },
  { name: "Test Patient", email: "patient@test.com", role: "patient" },
  { name: "Test Guardian", email: "guardian@test.com", role: "guardian" },
];

async function createTestUsers(tenantSlug: string) {
  try {
    console.log(`Creating test users for tenant: ${tenantSlug}`);

    // Find the tenant
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, tenantSlug)).limit(1);
    if (!tenant) {
      throw new Error(`Tenant with slug "${tenantSlug}" not found`);
    }

    console.log(`Found tenant: ${tenant.name} (${tenant.id})`);

    // Get all roles for this tenant
    const tenantRoles = await db.select().from(roles).where(eq(roles.tenantId, tenant.id));
    const roleMap = new Map(tenantRoles.map(r => [r.name, r.id]));

    console.log(`Found ${tenantRoles.length} roles for tenant`);

    // If no roles exist, create them
    if (tenantRoles.length === 0) {
      console.log("No roles found, creating default roles...");
      const DEFAULT_ROLES = [
        { name: "hospital_admin", description: "Full hospital administration and management" },
        { name: "doctor", description: "Manage patient consultations and medical records" },
        { name: "nurse", description: "Monitor patient care and vital statistics" },
        { name: "lab_technician", description: "Process lab tests and manage results" },
        { name: "pharmacist", description: "Manage medications and pharmacy inventory" },
        { name: "accountant", description: "Handle billing and financial management" },
        { name: "receptionist", description: "Schedule appointments and manage admissions" },
        { name: "patient", description: "Access your health records and appointments" },
        { name: "guardian", description: "Manage dependent care and medical records" },
      ];

      const insertedRoles = await db.insert(roles).values(
        DEFAULT_ROLES.map(role => ({
          tenantId: tenant.id,
          name: role.name,
        }))
      ).returning();

      // Update role map
      insertedRoles.forEach(role => roleMap.set(role.name, role.id));
      console.log(`Created ${insertedRoles.length} roles`);
    }

    // Hash passwords for both schemas
    const passwordHash = await hashPassword("Myname@78");
    const bcryptPasswordHash = await bcrypt.hash("Myname@78", 12);
    console.log("Passwords hashed");

    // Create test users
    for (const testUser of TEST_USERS) {
      console.log(`Creating user: ${testUser.name} (${testUser.email})`);

      // Check if user already exists
      const existingUser = await db.select().from(users).where(eq(users.email, testUser.email)).limit(1);

      let userId: string;
      if (existingUser.length > 0) {
        userId = existingUser[0].id;
        // Update existing user
        await db.update(users).set({
          tenantId: tenant.id,
          fullName: testUser.name,
          passwordHash,
          isActive: true,
          updatedAt: new Date(),
        }).where(eq(users.id, userId));
        console.log(`  Updated existing user`);
      } else {
        // Create new user
        const [newUser] = await db.insert(users).values({
          tenantId: tenant.id,
          email: testUser.email,
          passwordHash,
          fullName: testUser.name,
          isActive: true,
        }).returning();
        userId = newUser.id;
        console.log(`  Created new user`);
      }

      // Assign role
      const roleId = roleMap.get(testUser.role);
      if (!roleId) {
        console.log(`  Warning: Role "${testUser.role}" not found, skipping role assignment`);
        continue;
      }

      // Check if user already has this role
      const existingRoleAssignment = await db.select().from(userRoles)
        .where(eq(userRoles.userId, userId))
        .where(eq(userRoles.roleId, roleId))
        .limit(1);

      if (existingRoleAssignment.length === 0) {
        await db.insert(userRoles).values({
          userId,
          roleId,
        });
        console.log(`  Assigned role: ${testUser.role}`);
      } else {
        console.log(`  Role already assigned: ${testUser.role}`);
      }

      // Create/update user in auth schema
      const existingAuthUser = await db.select().from(authUser).where(eq(authUser.email, testUser.email)).limit(1);

      if (existingAuthUser.length === 0) {
        // Create auth user
        await db.insert(authUser).values({
          id: userId, // Use same ID as application user
          name: testUser.name,
          email: testUser.email,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`  Created auth user`);
      } else {
        // Update auth user
        await db.update(authUser).set({
          name: testUser.name,
          emailVerified: true,
          updatedAt: new Date(),
        }).where(eq(authUser.id, userId));
        console.log(`  Updated auth user`);
      }

       // Create/update account in auth schema
       const existingAccount = await db.select().from(authAccount).where(eq(authAccount.userId, userId)).limit(1);

       if (existingAccount.length === 0) {
         // Create account with generated ID
         await db.insert(authAccount).values({
           id: crypto.randomUUID(),
           accountId: testUser.email,
           providerId: "credential",
           userId,
           password: bcryptPasswordHash,
           createdAt: new Date(),
           updatedAt: new Date(),
         });
         console.log(`  Created auth account`);
       } else {
         // Update account password
         await db.update(authAccount).set({
           password: bcryptPasswordHash,
           updatedAt: new Date(),
         }).where(eq(authAccount.userId, userId));
         console.log(`  Updated auth account`);
       }
    }

    console.log("\nTest users created successfully!");
    console.log("All users have password: Myname@78");
    console.log("\nUser credentials:");
    TEST_USERS.forEach(user => {
      console.log(`  ${user.name}: ${user.email} / Myname@78`);
    });

  } catch (error) {
    console.error("Error creating test users:", error);
  } finally {
    process.exit(0);
  }
}

// Get tenant slug from command line arguments
const tenantSlug = process.argv[2];
if (!tenantSlug) {
  console.error("Usage: npx tsx create-test-users.ts <tenant-slug>");
  console.error("Example: npx tsx create-test-users.ts my-hospital-test");
  process.exit(1);
}

createTestUsers(tenantSlug);
