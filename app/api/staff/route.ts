import { NextRequest, NextResponse } from "next/server";
import { AdminService } from "@/lib/services/admin.service";
import { verifyAuth } from "@/lib/api/auth-middleware";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const service = new AdminService();

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user to scope results by their tenant
    const auth = await verifyAuth(request);
    let userTenantId: string | undefined;

    if (auth.authenticated && auth.user?.sub) {
      try {
        const user = await db.query.users.findFirst({
          where: eq(users.id, auth.user.sub as string),
        });
        userTenantId = user?.tenantId?.toString();
      } catch (error: any) {
        console.error("Error fetching user for tenant ID:", error);
        userTenantId = undefined;
      }
    }

    if (!userTenantId) {
      return NextResponse.json({ error: "Tenant not found or user not authenticated" }, { status: 403 });
    }

    const staff = await service.getStaffList(userTenantId);
    return NextResponse.json(staff);
  } catch (error: any) {
    console.error("Error fetching staff:", error);
    return NextResponse.json({ error: "Failed to fetch staff", details: error.message, stack: error.stack }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const staff = await service.createStaff(data);
    return NextResponse.json(staff);
  } catch (error: any) {
    console.error("Error creating staff:", error);
    return NextResponse.json({ error: "Failed to create staff", details: error.message, stack: error.stack }, { status: 500 });
  }
}