import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, payments, tenants } from "@/lib/db/schema";
import { eq, gte, lte, and, sql } from "drizzle-orm";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const slug = resolvedParams.slug;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month"; // month, quarter, year

    // Get tenant ID
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug));
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "quarter":
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get revenue data (sum of paid invoices)
    const revenueResult = await db
      .select({
        total: sql<number>`SUM(${invoices.totalAmount})`,
        paid: sql<number>`SUM(CASE WHEN ${invoices.status} = 'paid' THEN ${invoices.totalAmount} ELSE 0 END)`,
        outstanding: sql<number>`SUM(CASE WHEN ${invoices.status} != 'paid' THEN ${invoices.totalAmount} ELSE 0 END)`,
      })
      .from(invoices)
      .where(and(
        eq(invoices.tenantId, tenant.id),
        gte(invoices.createdAt, startDate)
      ));

    const revenue = revenueResult[0] || { total: 0, paid: 0, outstanding: 0 };

    // Get payment method breakdown
    const paymentMethodStats = await db
      .select({
        method: payments.method,
        count: sql<number>`COUNT(*)`,
        total: sql<number>`SUM(${payments.amount})`,
      })
      .from(payments)
      .where(and(
        eq(payments.tenantId, tenant.id),
        gte(payments.createdAt, startDate)
      ))
      .groupBy(payments.method);

    // Get insurance vs self-pay breakdown
    const insuranceStats = await db
      .select({
        isInsurance: sql<boolean>`CASE WHEN ${invoices.insuranceClaimId} IS NOT NULL THEN true ELSE false END`,
        total: sql<number>`SUM(${invoices.totalAmount})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(invoices)
      .where(and(
        eq(invoices.tenantId, tenant.id),
        gte(invoices.createdAt, startDate)
      ))
      .groupBy(sql`CASE WHEN ${invoices.insuranceClaimId} IS NOT NULL THEN true ELSE false END`);

    const insuranceBreakdown = {
      insurance: 0,
      selfPay: 0,
    };

    insuranceStats.forEach(stat => {
      if (stat.isInsurance) {
        insuranceBreakdown.insurance = Number(stat.total) || 0;
      } else {
        insuranceBreakdown.selfPay = Number(stat.total) || 0;
      }
    });

    // Calculate percentage of outstanding balance
    const totalBilled = Number(revenue.total) || 0;
    const outstandingBalance = Number(revenue.outstanding) || 0;
    const outstandingPercentage = totalBilled > 0 ? (outstandingBalance / totalBilled) * 100 : 0;

    return NextResponse.json({
      period,
      revenue: {
        total: Number(revenue.paid) || 0,
        outstanding: outstandingBalance,
        outstandingPercentage: Math.round(outstandingPercentage * 100) / 100,
      },
      paymentMethods: paymentMethodStats.map(stat => ({
        method: stat.method,
        count: Number(stat.count) || 0,
        total: Number(stat.total) || 0,
      })),
      insuranceBreakdown,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching billing summary:", error);
    return NextResponse.json({ error: "Failed to fetch billing summary" }, { status: 500 });
  }
}
