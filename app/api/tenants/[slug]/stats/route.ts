import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenants, users, patients, appointments, invoices } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Get tenant by slug
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, slug),
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Get users count
    const usersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.tenantId, tenant.id));
    const usersCount = usersResult[0]?.count || 0;

    // Get patients count
    const patientsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(patients)
      .where(eq(patients.tenantId, tenant.id));
    const patientsCount = patientsResult[0]?.count || 0;

    // Get appointments count
    const appointmentsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(appointments)
      .where(eq(appointments.tenantId, tenant.id));
    const appointmentsCount = appointmentsResult[0]?.count || 0;

    // Get invoices count and total billing amount
    const invoicesResult = await db
      .select({
        count: sql<number>`count(*)`,
        totalAmount: sql<string>`coalesce(sum(cast(total_amount as numeric)), 0)`,
      })
      .from(invoices)
      .where(eq(invoices.tenantId, tenant.id));

    const invoicesCount = invoicesResult[0]?.count || 0;
    const totalBillingAmount = parseFloat(invoicesResult[0]?.totalAmount || "0");

    return NextResponse.json({
      usersCount,
      patientsCount,
      appointmentsCount,
      invoicesCount,
      totalBillingAmount,
    });
  } catch (error) {
    console.error("Error fetching tenant stats:", error);
    return NextResponse.json({ error: "Failed to fetch tenant stats" }, { status: 500 });
  }
}

