import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventoryItems, labOrders, labResults, tenantSettings } from "@/lib/db/schema";
import { resolveLabContext } from "@/lib/lab/server";
import { parseLabResultData } from "@/lib/doctor/lab-results";

export const dynamic = "force-dynamic";

function parseStock(value: string | null | undefined) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const context = await resolveLabContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

  try {
    const tenantId = context.technician.tenantId;
    const [orders, results, inventory, qcSetting] = await Promise.all([
      db.select({ category: labOrders.category, priority: labOrders.priority, status: labOrders.status, orderedAt: labOrders.orderedAt, completedAt: labOrders.completedAt }).from(labOrders).where(and(eq(labOrders.tenantId, tenantId), isNull(labOrders.deletedAt))).orderBy(desc(labOrders.orderedAt)),
      db.select({ resultData: labResults.resultData, createdAt: labResults.createdAt }).from(labResults).where(and(eq(labResults.tenantId, tenantId), isNull(labResults.deletedAt))).orderBy(desc(labResults.createdAt)),
      db.select({ stock: inventoryItems.stock, expiryDate: inventoryItems.expiryDate }).from(inventoryItems).where(and(eq(inventoryItems.tenantId, tenantId), isNull(inventoryItems.deletedAt))),
      db.query.tenantSettings.findFirst({ where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, 'qc_records')) }),
    ]);

    const testsByCategory = orders.reduce((acc, row) => {
      const key = row.category || 'General';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const ordersByPriority = orders.reduce((acc, row) => {
      const key = row.priority || 'routine';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const dailyVolumeMap = new Map<string, number>();
    for (const row of orders) {
      const key = new Date(row.orderedAt || new Date()).toISOString().slice(0, 10);
      dailyVolumeMap.set(key, (dailyVolumeMap.get(key) || 0) + 1);
    }
    const completedOrders = orders.filter((row) => row.status === 'completed');
    const turnaround = completedOrders.map((row) => row.orderedAt && row.completedAt ? (new Date(row.completedAt).getTime() - new Date(row.orderedAt).getTime()) / 3600000 : null).filter((value): value is number => value !== null && Number.isFinite(value));
    const qcRecords = Array.isArray(qcSetting?.value) ? qcSetting.value : [];
    const criticalResults = results.filter((row) => parseLabResultData(row.resultData, null).flag === 'critical').length;
    const lowStock = inventory.filter((row) => parseStock(row.stock) <= Math.max(5, Math.floor(parseStock(row.stock) * 0.25) || 5)).length;

    return NextResponse.json({
      totalOrders: orders.length,
      completedOrders: completedOrders.length,
      pendingOrders: orders.filter((row) => row.status === 'pending').length,
      inProgressOrders: orders.filter((row) => row.status === 'in-progress').length,
      criticalResults,
      averageTurnaroundTime: turnaround.length ? Number((turnaround.reduce((sum, item) => sum + item, 0) / turnaround.length).toFixed(1)) : 0,
      testsByCategory,
      ordersByPriority,
      dailyVolume: Array.from(dailyVolumeMap.entries()).sort(([left], [right]) => left.localeCompare(right)).map(([date, count]) => ({ date, count })),
      qcPassRate: qcRecords.length ? Number(((qcRecords.filter((record) => record.status === 'pass').length / qcRecords.length) * 100).toFixed(1)) : 0,
      lowStock,
    });
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
