import { NextRequest, NextResponse } from "next/server";
import { TenantService } from "@/lib/services/tenant.service";
import { verifyAuth } from "@/lib/api/auth-middleware";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const service = new TenantService();

const createTenantSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  plan: z.enum(["Basic", "Standard", "Premium"]),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
});

const updateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  plan: z.enum(["Basic", "Standard", "Premium"]).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const plan = searchParams.get("plan") || undefined;
    const status = searchParams.get("status") ? searchParams.get("status") === "true" : undefined;
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

    if (auth.authenticated && auth.user?.sub) {
      try {
        const user = await db.query.users.findFirst({
          where: eq(users.id, auth.user.sub as string),
        });
        userTenantId = user?.tenantId?.toString();
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
      tenantId: userTenantId // Filter by user's tenant
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
    const tenant = await service.createTenant(validatedData);
    return NextResponse.json(tenant[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 });
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
    const tenant = await service.updateTenant(id, validatedData);
    return NextResponse.json(tenant[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 });
    }
    console.error("Error updating tenant:", error);
    return NextResponse.json({ error: "Failed to update tenant" }, { status: 500 });
  }
}
