import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenantSettings } from "@/lib/db/schema";
import { resolveLabContext } from "@/lib/lab/server";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json();
  const context = await resolveLabContext(request.headers, body.slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

  const { id } = await params;
  const setting = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, context.technician.tenantId), eq(tenantSettings.key, "lab_device_results_queue")),
  });

  if (!setting || !Array.isArray(setting.value)) {
    return NextResponse.json({ error: "Device result not found" }, { status: 404 });
  }

  const nextQueue = setting.value.map((entry: any) =>
    String(entry.id) === id
      ? {
          ...entry,
          status: body.status ? String(body.status) : entry.status,
          importedAt: body.status === "imported" ? new Date().toISOString() : entry.importedAt,
          reviewedAt: body.status === "reviewed" ? new Date().toISOString() : entry.reviewedAt,
        }
      : entry
  );

  await db.update(tenantSettings).set({ value: nextQueue, updatedAt: new Date() }).where(eq(tenantSettings.id, setting.id));
  return NextResponse.json(nextQueue.find((entry: any) => String(entry.id) === id) || null);
}
