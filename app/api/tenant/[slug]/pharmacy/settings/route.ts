import { NextRequest, NextResponse } from "next/server";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { getTenantSettingValue, upsertTenantSettingValue } from "@/lib/pharmacy/data";
import { requireTenantAdmin } from "@/lib/tenant-staff";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SETTINGS_KEY = "pharmacy_runtime_settings";

const DEFAULT_SETTINGS = {
  notificationsEnabled: true,
  emailAlerts: true,
  lowStockThreshold: 25,
  criticalStockThreshold: 10,
  autoReorder: false,
  reorderLeadTime: 3,
  dispensingQueueRefresh: 10,
  dashboardLayout: "default",
  showAnalytics: true,
  prescriptionValidation: true,
  interactionChecks: true,
  requireSecondVerification: false,
  workingHours: {
    startTime: "08:00",
    endTime: "18:00",
  },
};

async function requireContext(request: NextRequest, slug: string) {
  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) return { ok: false as const, status: 404, error: "Tenant not found" };
  const admin = await requireTenantAdmin(request.headers, tenantId);
  if (!admin.ok) return { ok: false as const, status: admin.status, error: admin.error };
  return { ok: true as const, tenantId, userId: admin.user?.id || null };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const context = await requireContext(request, slug);
    if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

    const settings = await getTenantSettingValue(context.tenantId, SETTINGS_KEY, DEFAULT_SETTINGS);
    return NextResponse.json(settings, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Error fetching pharmacy settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const context = await requireContext(request, slug);
    if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

    const body = await request.json().catch(() => ({}));
    const settings = {
      ...DEFAULT_SETTINGS,
      ...body,
      workingHours: {
        ...DEFAULT_SETTINGS.workingHours,
        ...(body.workingHours || {}),
      },
    };

    await upsertTenantSettingValue(context.tenantId, SETTINGS_KEY, settings, context.userId);
    return NextResponse.json({ success: true, message: "Settings updated successfully", settings });
  } catch (error) {
    console.error("Error saving pharmacy settings:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
