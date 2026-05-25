import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenantSettings } from "@/lib/db/schema";
import { resolveLabContext } from "@/lib/lab/server";

export const dynamic = "force-dynamic";

const KEY = "qc_records";

async function getSetting(tenantId: string) {
  return db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, KEY)),
  });
}

function normalize(records: any[]) {
  return (Array.isArray(records) ? records : []).map((record) => ({
    id: String(record.id),
    testName: String(record.testName || "Untitled QC record"),
    date: record.date || record.createdAt || new Date().toISOString(),
    result: String(record.result || ""),
    status: String(record.status || "review"),
    recordedBy: String(record.recordedBy || "Unknown technician"),
    recordedById: record.recordedById ? String(record.recordedById) : null,
    notes: record.notes ? String(record.notes) : "",
    instrument: record.instrument ? String(record.instrument) : "General",
    lotNumber: record.lotNumber ? String(record.lotNumber) : "",
    reviewedAt: record.reviewedAt || null,
  }));
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const context = await resolveLabContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

  const existing = await getSetting(context.technician.tenantId);
  const records = normalize(existing?.value || []);
  return NextResponse.json({
    records,
    stats: {
      total: records.length,
      pass: records.filter((record) => record.status === "pass").length,
      fail: records.filter((record) => record.status === "fail").length,
      review: records.filter((record) => record.status === "review").length,
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const context = await resolveLabContext(request.headers, body.slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!body.testName || !body.result) {
    return NextResponse.json({ error: "Test name and result are required" }, { status: 400 });
  }

  const existing = await getSetting(context.technician.tenantId);
  const records = normalize(existing?.value || []);
  const nextRecord = {
    id: crypto.randomUUID(),
    testName: String(body.testName).trim(),
    date: body.date || new Date().toISOString(),
    result: String(body.result).trim(),
    status: String(body.status || "review"),
    recordedBy: context.technician.fullName || context.technician.email,
    recordedById: context.technician.id,
    notes: body.notes ? String(body.notes).trim() : "",
    instrument: body.instrument ? String(body.instrument).trim() : "General",
    lotNumber: body.lotNumber ? String(body.lotNumber).trim() : "",
    reviewedAt: null,
  };
  const updatedRecords = [nextRecord, ...records];

  if (existing) {
    await db.update(tenantSettings).set({ value: updatedRecords, updatedAt: new Date(), updatedBy: context.technician.id }).where(eq(tenantSettings.id, existing.id));
  } else {
    await db.insert(tenantSettings).values({ tenantId: context.technician.tenantId, key: KEY, value: updatedRecords, updatedBy: context.technician.id });
  }

  return NextResponse.json(nextRecord, { status: 201 });
}
