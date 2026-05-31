import { NextRequest, NextResponse } from "next/server";
import { resolvePermissions, can } from "@/lib/auth/permission-engine";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { tenantSettings, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

const SETTINGS_KEY = "pharmacy_settings";

async function resolveTenantId(user: { id: string; email: string }) {
  const profile = await db.query.users.findFirst({
    where: eq(users.email, user.email),
    columns: { tenantId: true },
  });
  return profile?.tenantId || null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const permissions = await resolvePermissions(session.user.id);
    if (!can(permissions, "pharmacy.settings.read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const tenantId = await resolveTenantId(session.user);
    if (!tenantId) return NextResponse.json({ error: "No tenant context" }, { status: 400 });

    const row = await db.query.tenantSettings.findFirst({
      where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, SETTINGS_KEY)),
    });
    return NextResponse.json(row?.value || {});
  } catch (error) {
    console.error('Error fetching pharmacy settings:', error);
    return NextResponse.json({ error: "Failed to fetch pharmacy settings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const permissions = await resolvePermissions(session.user.id);
    if (!can(permissions, "pharmacy.settings.write")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const tenantId = await resolveTenantId(session.user);
    if (!tenantId) return NextResponse.json({ error: "No tenant context" }, { status: 400 });

    const settings = await request.json();

    const existing = await db.query.tenantSettings.findFirst({
      where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, SETTINGS_KEY)),
    });
    if (existing) {
      const [updated] = await db.update(tenantSettings).set({ value: settings, updatedAt: new Date(), updatedBy: session.user.id }).where(eq(tenantSettings.id, existing.id)).returning();
      return NextResponse.json(updated.value);
    }
    const [created] = await db.insert(tenantSettings).values({ tenantId, key: SETTINGS_KEY, value: settings, updatedBy: session.user.id }).returning();
    return NextResponse.json(created.value);
  } catch (error) {
    console.error('Error updating pharmacy settings:', error);
    return NextResponse.json({ error: "Failed to update pharmacy settings" }, { status: 500 });
  }
}
