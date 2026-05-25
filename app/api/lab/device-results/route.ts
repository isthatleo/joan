import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenantSettings } from "@/lib/db/schema";
import { resolveLabContext } from "@/lib/lab/server";

export const dynamic = "force-dynamic";

async function loadSetting(tenantId: string, key: string) {
  return db.query.tenantSettings.findFirst({ where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, key)) });
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const context = await resolveLabContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

  const [devicesSetting, queueSetting] = await Promise.all([
    loadSetting(context.technician.tenantId, "lab_device_integrations"),
    loadSetting(context.technician.tenantId, "lab_device_results_queue"),
  ]);

  const devices = Array.isArray(devicesSetting?.value) ? devicesSetting.value : [];
  const pendingResults = (Array.isArray(queueSetting?.value) ? queueSetting.value : []).filter((entry: any) => String(entry.status || "pending") !== "imported");

  return NextResponse.json({
    devices,
    pendingResults,
  });
}
