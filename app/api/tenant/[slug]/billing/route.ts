import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { claims, invoices, payments, tenants } from "@/lib/db/schema";
import { eq, gte, lte, and, sql } from "drizzle-orm";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
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
        total: sql<number>`COALESCE(SUM(COALESCE(${invoices.totalAmount}, '0')::numeric), 0)`,
        paid: sql<number>`COALESCE(SUM(CASE WHEN ${invoices.status} = 'paid' THEN COALESCE(${invoices.totalAmount}, '0')::numeric ELSE 0 END), 0)`,
        outstanding: sql<number>`COALESCE(SUM(CASE WHEN ${invoices.status} != 'paid' OR ${invoices.status} IS NULL THEN COALESCE(${invoices.totalAmount}, '0')::numeric ELSE 0 END), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(invoices)
      .where(and(
        eq(invoices.tenantId, tenant.id),
        gte(invoices.createdAt, startDate)
      ));

    const revenue = revenueResult[0] || { total: 0, paid: 0, outstanding: 0, count: 0 };
    const totalBilled = Number(revenue.total) || 0;
    const paidBilled = Number(revenue.paid) || 0;

    // Get payment method breakdown
    const paymentMethodStats = await db
      .select({
        method: payments.method,
        count: sql<number>`COUNT(*)`,
        total: sql<number>`COALESCE(SUM(COALESCE(${payments.amount}, '0')::numeric), 0)`,
      })
      .from(payments)
      .where(and(
        eq(payments.tenantId, tenant.id),
        gte(payments.createdAt, startDate)
      ))
      .groupBy(payments.method);

    // Get insurance claim breakdown from the claims table
    const claimStats = await db
      .select({
        totalClaimed: sql<number>`COALESCE(SUM(COALESCE(${claims.claimAmount}, '0')::numeric), 0)`,
        approvedClaimed: sql<number>`COALESCE(SUM(CASE WHEN ${claims.status} IN ('approved', 'paid') THEN COALESCE(${claims.claimAmount}, '0')::numeric ELSE 0 END), 0)`,
        claimCount: sql<number>`COUNT(*)`,
      })
      .from(claims)
      .where(and(
        eq(claims.tenantId, tenant.id),
        gte(claims.createdAt, startDate)
      ));

    const claimSummary = claimStats[0] || { totalClaimed: 0, approvedClaimed: 0, claimCount: 0 };
    const claimedTotal = Number(claimSummary.totalClaimed) || 0;
    const approvedClaimed = Number(claimSummary.approvedClaimed) || 0;
    const insuranceBreakdown = {
      insurance: approvedClaimed,
      selfPay: Math.max(0, totalBilled - claimedTotal),
      total: claimedTotal,
      approved: approvedClaimed,
      claimCount: Number(claimSummary.claimCount) || 0,
    };

    // Calculate percentage of outstanding balance
    const outstandingBalance = Number(revenue.outstanding) || 0;
    const outstandingPercentage = totalBilled > 0 ? (outstandingBalance / totalBilled) * 100 : 0;
    const collectionRate = totalBilled > 0 ? (paidBilled / totalBilled) * 100 : 0;
    const paymentCount = paymentMethodStats.reduce((sum: number, stat: any) => sum + Number(stat.count || 0), 0);
    const insuranceTotal = Number(insuranceBreakdown.insurance || 0);
    const selfPayTotal = Number(insuranceBreakdown.selfPay || 0);

    return NextResponse.json({
      period,
      revenue: {
        total: paidBilled,
        billed: totalBilled,
        outstanding: outstandingBalance,
        outstandingPercentage: Math.round(outstandingPercentage * 100) / 100,
        collectionRate: Math.round(collectionRate * 100) / 100,
        invoiceCount: Number(revenue.count) || 0,
      },
      paymentMethods: paymentMethodStats.map((stat: any) => ({
        method: stat.method,
        count: Number(stat.count) || 0,
        total: Number(stat.total) || 0,
      })),
      insuranceBreakdown: {
        insurance: insuranceTotal,
        selfPay: selfPayTotal,
        total: Number(insuranceBreakdown.total || 0),
        approved: Number(insuranceBreakdown.approved || 0),
        claimCount: Number(insuranceBreakdown.claimCount || 0),
      },
      summary: {
        paymentCount,
        paymentMethodsCount: paymentMethodStats.length,
        totalBilled,
        paidBilled,
        outstandingBalance,
        claimCount: Number(insuranceBreakdown.claimCount || 0),
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching billing summary:", error);
    return NextResponse.json({ error: "Failed to fetch billing summary" }, { status: 500 });
  }
}
