import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoices, labOrders, labResults, payments } from "@/lib/db/schema";
import { resolveLabContext } from "@/lib/lab/server";
import { parseLabResultData } from "@/lib/doctor/lab-results";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const context = await resolveLabContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

  try {
    const tenantId = context.technician.tenantId;
    const [orders, results, tenantPayments] = await Promise.all([
      db.select({ status: labOrders.status, orderedAt: labOrders.orderedAt, completedAt: labOrders.completedAt }).from(labOrders).where(and(eq(labOrders.tenantId, tenantId), isNull(labOrders.deletedAt))),
      db.select({ resultData: labResults.resultData }).from(labResults).where(and(eq(labResults.tenantId, tenantId), isNull(labResults.deletedAt))),
      db.select({ amount: payments.amount, status: payments.status }).from(payments).where(and(eq(payments.tenantId, tenantId), isNull(payments.deletedAt))),
    ]);
    const completed = orders.filter((row) => row.status === "completed");
    const turnaround = completed.map((row) => row.orderedAt && row.completedAt ? (new Date(row.completedAt).getTime() - new Date(row.orderedAt).getTime()) / 3600000 : null).filter((value): value is number => value !== null && Number.isFinite(value));
    const revenue = tenantPayments.filter((row) => row.status === "completed").reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const criticalResults = results.filter((row) => parseLabResultData(row.resultData, null).flag === "critical").length;
    return NextResponse.json({
      stats: {
        totalOrders: orders.length,
        pendingOrders: orders.filter((row) => row.status === "pending").length,
        completedToday: completed.filter((row) => row.completedAt && new Date(row.completedAt).toDateString() === new Date().toDateString()).length,
        criticalResults,
        averageTurnaround: turnaround.length ? Number((turnaround.reduce((sum, item) => sum + item, 0) / turnaround.length).toFixed(1)) : 0,
        revenue,
      },
    });
  } catch (error) {
    console.error("Failed to fetch lab stats:", error);
    return NextResponse.json({ error: "Failed to fetch lab stats" }, { status: 500 });
  }
}
