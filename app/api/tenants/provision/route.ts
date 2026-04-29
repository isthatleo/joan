import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  tenants,
  users,
  departments,
  roles,
  userRoles,
  auditLogs,
  provisioningRuns,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const provisionSchema = z.object({
  name: z.string().trim().min(2).max(120),
  plan: z.enum(["Basic", "Standard", "Premium"]),
  contactEmail: z.string().trim().email(),
  contactPhone: z.string().trim().min(3).max(40).optional().or(z.literal("")),
  address: z.string().trim().max(240).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  country: z.string().trim().max(120).optional().or(z.literal("")),
  timezone: z.string().trim().max(60).default("UTC"),
  logoUrl: z.string().trim().url().optional().or(z.literal("")),
  adminEmail: z.string().trim().email(),
  adminFullName: z.string().trim().min(2).max(120),
  adminPhone: z.string().trim().max(40).optional().or(z.literal("")),
  seedDepartments: z.array(z.string().trim().min(1).max(80)).default([]),
  modules: z.array(z.string()).default([]),
});

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function uniqueSlug(base: string): Promise<string> {
  const candidate = base || `hospital-${Date.now().toString(36)}`;
  const existing = await db.select().from(tenants).where(eq(tenants.slug, candidate));
  if (existing.length === 0) return candidate;
  return `${candidate}-${Math.random().toString(36).slice(2, 6)}`;
}

function generateTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const nums = "23456789";
  const syms = "!@#$%^&*";
  const all = upper + lower + nums + syms;
  const pick = (set: string) => set[crypto.randomInt(0, set.length)];
  const required = [pick(upper), pick(lower), pick(nums), pick(syms)];
  const rest = Array.from({ length: 8 }, () => pick(all));
  const arr = [...required, ...rest];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
}

async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(plain, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

const DEFAULT_DEPARTMENTS = [
  "Reception",
  "General Medicine",
  "Pharmacy",
  "Laboratory",
  "Emergency",
];

const STAGES = [
  "validate",
  "slug",
  "hospital",
  "admin",
  "role",
  "departments",
  "modules",
  "audit",
] as const;
type StageKey = (typeof STAGES)[number];

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };
      const stage = (key: StageKey, status: "start" | "done" | "error", extra: any = {}) =>
        send("stage", { key, status, ...extra });

      let provisioningRun: any = null;

      try {
        // ---- validate ----
        stage("validate", "start");
        const data = provisionSchema.parse(body);
        stage("validate", "done");

        // Create provisioning run record
        [provisioningRun] = await db.insert(provisioningRuns).values({
          status: "running",
          stage: "validate",
          metadata: { input: data },
        }).returning();

        // ---- slug ----
        stage("slug", "start");
        await db.update(provisioningRuns).set({ stage: "slug" }).where(eq(provisioningRuns.id, provisioningRun.id));
        const baseSlug = slugify(data.name);
        const slug = await uniqueSlug(baseSlug);
        stage("slug", "done", { slug, baseSlug });

        // ---- hospital ----
        stage("hospital", "start");
        await db.update(provisioningRuns).set({ stage: "hospital" }).where(eq(provisioningRuns.id, provisioningRun.id));
        const [tenant] = await db
          .insert(tenants)
          .values({
            name: data.name,
            slug,
            plan: data.plan,
            isActive: true,
            contactEmail: data.contactEmail,
            contactPhone: data.contactPhone || null,
            address: data.address || null,
            city: data.city || null,
            country: data.country || null,
            timezone: data.timezone || "UTC",
            logoUrl: data.logoUrl || null,
            provisioningStatus: "in_progress",
            metadata: { modules: data.modules },
          })
          .returning();
        stage("hospital", "done", { tenantId: tenant.id, slug });

        // Update run with tenant ID
        await db.update(provisioningRuns).set({ tenantId: tenant.id }).where(eq(provisioningRuns.id, provisioningRun.id));

        // ---- admin ----
        stage("admin", "start");
        await db.update(provisioningRuns).set({ stage: "admin" }).where(eq(provisioningRuns.id, provisioningRun.id));
        const tempPassword = generateTempPassword();
        const passwordHash = await hashPassword(tempPassword);
        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.email, data.adminEmail));
        let adminUser;
        if (existingUser.length > 0) {
          adminUser = existingUser[0];
          await db
            .update(users)
            .set({ tenantId: tenant.id, updatedAt: new Date() })
            .where(eq(users.id, adminUser.id));
        } else {
          const [inserted] = await db
            .insert(users)
            .values({
              tenantId: tenant.id,
              email: data.adminEmail,
              passwordHash,
              fullName: data.adminFullName,
              phone: data.adminPhone || null,
              isActive: true,
            })
            .returning();
          adminUser = inserted;
        }
        stage("admin", "done", { adminEmail: data.adminEmail, adminName: data.adminFullName });

        // ---- role ----
        stage("role", "start");
        await db.update(provisioningRuns).set({ stage: "role" }).where(eq(provisioningRuns.id, provisioningRun.id));
        let [adminRole] = await db
          .select()
          .from(roles)
          .where(eq(roles.name, "hospital_admin"));
        if (!adminRole) {
          [adminRole] = await db
            .insert(roles)
            .values({ tenantId: tenant.id, name: "hospital_admin" })
            .returning();
        }
        await db.insert(userRoles).values({ userId: adminUser.id, roleId: adminRole.id });
        stage("role", "done", { roleName: "hospital_admin" });

        // ---- departments ----
        stage("departments", "start");
        await db.update(provisioningRuns).set({ stage: "departments" }).where(eq(provisioningRuns.id, provisioningRun.id));
        const deptNames =
          data.seedDepartments.length > 0 ? data.seedDepartments : DEFAULT_DEPARTMENTS;
        if (deptNames.length > 0) {
          await db
            .insert(departments)
            .values(deptNames.map((n) => ({ tenantId: tenant.id, name: n })));
        }
        stage("departments", "done", { count: deptNames.length, departments: deptNames });

        // ---- modules ----
        stage("modules", "start");
        await db.update(provisioningRuns).set({ stage: "modules" }).where(eq(provisioningRuns.id, provisioningRun.id));
        await db
          .update(tenants)
          .set({
            adminUserId: adminUser.id,
            provisioningStatus: "active",
            provisionedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(tenants.id, tenant.id));
        stage("modules", "done", { count: data.modules.length, modules: data.modules });

        // ---- audit ----
        stage("audit", "start");
        await db.update(provisioningRuns).set({ stage: "audit" }).where(eq(provisioningRuns.id, provisioningRun.id));
        await db.insert(auditLogs).values({
          userId: adminUser.id,
          action: "tenant.provisioned",
          entity: "tenant",
          entityId: tenant.id,
          metadata: {
            name: tenant.name,
            slug,
            plan: tenant.plan,
            modules: data.modules,
            departments: deptNames,
          },
        });
        stage("audit", "done");

        // Mark provisioning run as completed
        await db.update(provisioningRuns).set({
          status: "completed",
          completedAt: new Date(),
          metadata: {
            input: data,
            result: {
              tenantId: tenant.id,
              slug,
              adminId: adminUser.id,
              departments: deptNames,
              modules: data.modules,
            }
          }
        }).where(eq(provisioningRuns.id, provisioningRun.id));

        send("done", {
          ok: true,
          tenant: { ...tenant, slug, adminUserId: adminUser.id },
          admin: {
            id: adminUser.id,
            email: adminUser.email,
            fullName: adminUser.fullName,
            tempPassword,
          },
          departments: deptNames,
        });
      } catch (error: any) {
        console.error("[tenants/provision] failed:", error);
        const message =
          error instanceof z.ZodError
            ? "Validation failed"
            : error?.message || "Failed to provision tenant";

        // Update provisioning run with failure
        if (provisioningRun) {
          await db.update(provisioningRuns).set({
            status: "failed",
            errorMessage: message,
            completedAt: new Date(),
          }).where(eq(provisioningRuns.id, provisioningRun.id));
        }

        send("error", {
          ok: false,
          error: message,
          details: error instanceof z.ZodError ? error.errors : undefined,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
