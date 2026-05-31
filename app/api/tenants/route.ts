import { NextRequest, NextResponse } from "next/server";
import { TenantService } from "@/lib/services/tenant.service";
import { verifyAuth } from "@/lib/api/auth-middleware";
import { db } from "@/lib/db";
import { users, userRoles, roles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const plan = searchParams.get("plan") || undefined;
    const status = searchParams.get("status") ? searchParams.get("status") === "true" : undefined;
    const deleted = searchParams.get("deleted") === "true";
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : undefined;

    if (searchParams.get("stats") === "true") {
      const stats = await service.getTenantStats();
      return NextResponse.json(stats);
    }

    if (searchParams.get("usage") === "true") {
      const usage = await service.getUsageStats();
      return NextResponse.json(usage);
    }

    // Get the authenticated user to scope results by their tenant
    const auth = await verifyAuth(request);
    let userTenantId: string | undefined;
    let isSuperAdmin = false;

    if (auth.authenticated && auth.user?.sub) {
      try {
        const user = await db.query.users.findFirst({
          where: eq(users.id, auth.user.sub as string),
        });
        userTenantId = user?.tenantId?.toString();

        // Check if user is super admin
        if (user) {
          const userRolesResult = await db
            .select({ roleName: roles.name })
            .from(userRoles)
            .innerJoin(roles, eq(userRoles.roleId, roles.id))
            .where(eq(userRoles.userId, user.id));

          isSuperAdmin = userRolesResult.some(r => r.roleName === 'super_admin');
        }
      } catch {
        // If we can't find the user's tenant, return empty
        userTenantId = undefined;
      }
    }

    const tenants = await service.getAllTenants({
      search,
      plan,
      status,
      limit,
      offset,
      tenantId: isSuperAdmin ? undefined : userTenantId, // Only scope if not super admin
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    const data = await request.json();
    const validatedData = updateTenantSchema.parse(data);
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
