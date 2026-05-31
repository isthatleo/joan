import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenantSettings } from "@/lib/db/schema";
import { resolveLabContext } from "@/lib/lab/server";

export const dynamic = "force-dynamic";
const KEY = "qc_records";

function normalize(records: unknown): any[] {
  return Array.isArray(records) ? records : [];
}

async function getSetting(tenantId: string) {
  return db.query.tenantSettings.findFirst({ where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, KEY)) });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json();
  const context = await resolveLabContext(request.headers, body.slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  const { id } = await params;
  const setting = await getSetting(context.technician.tenantId);
  if (!setting) return NextResponse.json({ error: "Record not found" }, { status: 404 });
  const records = normalize(setting.value);
  const nextRecords = records.map((record) => record.id === id ? { ...record, ...body, reviewedAt: body.status === 'review' ? null : new Date().toISOString() } : record);
  await db.update(tenantSettings).set({ value: nextRecords, updatedAt: new Date(), updatedBy: context.technician.id }).where(eq(tenantSettings.id, setting.id));
  return NextResponse.json(nextRecords.find((record) => record.id === id) || null);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const slug = request.nextUrl.searchParams.get("slug");
  const context = await resolveLabContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  const { id } = await params;
  const setting = await getSetting(context.technician.tenantId);
  if (!setting) return NextResponse.json({ error: "Record not found" }, { status: 404 });
  const records = normalize(setting.value);
  const nextRecords = records.filter((record) => record.id !== id);
  await db.update(tenantSettings).set({ value: nextRecords, updatedAt: new Date(), updatedBy: context.technician.id }).where(eq(tenantSettings.id, setting.id));
  return NextResponse.json({ success: true });
}
