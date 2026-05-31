import { NextRequest, NextResponse } from "next/server";
import { resolvePermissions, can } from "@/lib/auth/permission-engine";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { tenantSettings, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

const QUALITY_KEY = "pharmacy_quality_records";

async function resolveTenantId(user: { id: string; email: string }) {
  const profile = await db.query.users.findFirst({
    where: eq(users.email, user.email),
    columns: { tenantId: true },
  });
  return profile?.tenantId || null;
}

function normalizeRecords(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const permissions = await resolvePermissions(session.user.id);
    if (!can(permissions, "pharmacy.quality.read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const tenantId = await resolveTenantId(session.user);
    if (!tenantId) return NextResponse.json({ error: "No tenant context" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const filters = {
      result: searchParams.get('result') || undefined,
      testType: searchParams.get('testType') || undefined,
      inventoryItemId: searchParams.get('inventoryItemId') || undefined,
    };

    const row = await db.query.tenantSettings.findFirst({
      where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, QUALITY_KEY)),
    });
    const records = normalizeRecords(row?.value).filter((record) => {
      if (filters.result && record.result !== filters.result) return false;
      if (filters.testType && record.testType !== filters.testType) return false;
      if (filters.inventoryItemId && record.inventoryItemId !== filters.inventoryItemId) return false;
      return true;
    });
    return NextResponse.json(records);
  } catch (error) {
    console.error('Error fetching quality control records:', error);
    return NextResponse.json({ error: "Failed to fetch quality control records" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const permissions = await resolvePermissions(session.user.id);
    if (!can(permissions, "pharmacy.quality.write")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const tenantId = await resolveTenantId(session.user);
    if (!tenantId) return NextResponse.json({ error: "No tenant context" }, { status: 400 });

    const data = await request.json();

    const existing = await db.query.tenantSettings.findFirst({
      where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, QUALITY_KEY)),
    });
    const record = {
      ...data,
      id: data.id || crypto.randomUUID(),
      tenantId,
      testedBy: session.user.id,
      createdAt: new Date().toISOString(),
    };
    const nextRecords = [record, ...normalizeRecords(existing?.value)];
    if (existing) {
      await db.update(tenantSettings).set({ value: nextRecords, updatedAt: new Date(), updatedBy: session.user.id }).where(eq(tenantSettings.id, existing.id));
    } else {
      await db.insert(tenantSettings).values({ tenantId, key: QUALITY_KEY, value: nextRecords, updatedBy: session.user.id });
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error('Error creating quality control record:', error);
    return NextResponse.json({ error: "Failed to create quality control record" }, { status: 500 });
  }
}
