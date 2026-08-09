import { NextRequest, NextResponse } from "next/server";
import { TenantService } from "@/lib/services/tenant.service";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, userRoles, roles } from "@/lib/db/schema";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { z } from "zod";
import { inferCountryFromCity } from "@/lib/address-city-inference";

const service = new TenantService();

function normalizeTenantAddress<T extends { city?: string; country?: string }>(data: T): T {
  return {
    ...data,
    country: data.country || inferCountryFromCity(data.city) || data.country,
  };
}

const createTenantSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  plan: z.enum(["Basic", "Standard", "Premium"]),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
});

const updateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  plan: z.enum(["Basic", "Standard", "Premium"]).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

async function resolveCurrentUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null as any);
  if (!session?.user?.email) return null;
  const appUser = await db.query.users.findFirst({
    where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
  });
  if (!appUser?.id) return null;

  const roleRows = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, appUser.id))
    .catch(() => []);
  const isSuperAdmin = appUser.role === "super_admin" || roleRows.some((r) => r.roleName === "super_admin");

  return { appUser, isSuperAdmin };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const plan = searchParams.get("plan") || undefined;
    const status = searchParams.get("status") ? searchParams.get("status") === "true" : undefined;
    const deleted = searchParams.get("deleted") === "true";
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : undefined;

    const current = await resolveCurrentUser(request);
    if (!current) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { appUser, isSuperAdmin } = current;

    if (searchParams.get("stats") === "true") {
      if (!isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const stats = await service.getTenantStats();
      return NextResponse.json(stats);
    }

    if (searchParams.get("usage") === "true") {
      if (!isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const usage = await service.getUsageStats();
      return NextResponse.json(usage);
    }

    if (deleted && !isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (deleted && isSuperAdmin) {
      await service.purgeDueTenants(10).catch((error) => {
        console.error("Automatic due tenant purge failed:", error);
      });
    }

    const tenants = await service.getAllTenants({
      search,
      plan,
      status,
      limit,
      offset,
      tenantId: isSuperAdmin ? undefined : appUser.tenantId?.toString(), // Only scope if not super admin
      deleted,
    });
    return NextResponse.json(tenants);
  } catch (error) {
    console.error("Error fetching tenants:", error);
    return NextResponse.json({ error: "Failed to fetch tenants" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const current = await resolveCurrentUser(request);
    if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!current.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const data = await request.json();
    const validatedData = createTenantSchema.parse(data);
    const tenant = await service.createTenant(normalizeTenantAddress(validatedData));
    return NextResponse.json(tenant[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error creating tenant:", error);
    return NextResponse.json({ error: "Failed to create tenant" }, { status: 500 });
  }
}

// Handle PUT for updating tenants
export async function PUT(request: NextRequest) {
  try {
    const current = await resolveCurrentUser(request);
    if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    if (!current.isSuperAdmin && current.appUser.tenantId?.toString() !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await request.json();
    const validatedData = updateTenantSchema.parse(data);
    if (!current.isSuperAdmin) {
      // Tenant admins may update their own contact/branding details, but not
      // reactivate/deactivate their own tenant or change its plan.
      delete validatedData.isActive;
      delete validatedData.plan;
    }
    const tenant = await service.updateTenant(id, normalizeTenantAddress(validatedData));
    return NextResponse.json(tenant[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error updating tenant:", error);
    return NextResponse.json({ error: "Failed to update tenant" }, { status: 500 });
  }
}
