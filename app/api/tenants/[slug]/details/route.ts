import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenants, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Fetch tenant basic info by slug
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, slug),
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Fetch admin details if adminUserId exists
    let admin = null;
    if (tenant.adminUserId) {
      admin = await db.query.users.findFirst({
        where: eq(users.id, tenant.adminUserId),
        columns: {
          id: true,
          email: true,
          fullName: true,
          avatar: true,
          isActive: true,
        }
      });
    }

    // Fetch user count and details
    const usersList = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.tenantId, tenant.id));

    return NextResponse.json({
      success: true,
      tenant,
      admin,
      users: {
        count: usersList.length,
        list: usersList,
        active: usersList.filter(u => u.isActive).length,
      },
      billing: {
        metrics: {
          totalBilled: "0.00",
          totalPaid: "0.00",
          pendingAmount: "0.00",
        },
        invoiceStats: {
          total: 0,
          paid: 0,
          pending: 0,
          overdue: 0,
        },
        invoices: [],
      },
      usage: {
        totalPatients: 0,
        totalAppointments: 0,
        totalVisits: 0,
      },
    });
  } catch (error) {
    console.error("Error fetching tenant details:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenant details" },
      { status: 500 }
    );
  }
}
