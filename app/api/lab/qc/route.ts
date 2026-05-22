import { NextRequest, NextResponse } from "next/server";
import { LabService } from "@/lib/services/lab.service";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tenantSettings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const service = new LabService();

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId") || session.user.tenantId;

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    // Fetch quality control records from tenant settings
    const settings = await db.query.tenantSettings.findFirst({
      where: and(
        eq(tenantSettings.tenantId, tenantId),
        eq(tenantSettings.key, "qc_records")
      ),
    });

    const records = settings?.value || [];
    return NextResponse.json(records);
  } catch (error) {
    console.error("Failed to fetch QC records:", error);
    return NextResponse.json({ error: "Failed to fetch QC records" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const tenantId = session.user.tenantId;

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    // Get existing QC records
    const existing = await db.query.tenantSettings.findFirst({
      where: and(
        eq(tenantSettings.tenantId, tenantId),
        eq(tenantSettings.key, "qc_records")
      ),
    });

    const records = existing?.value || [];
    const newRecord = {
      id: Math.random().toString(36).substr(2, 9),
      ...data,
      createdAt: new Date().toISOString(),
    };

    const updatedRecords = [...records, newRecord];

    if (existing) {
      await db.update(tenantSettings)
        .set({ value: updatedRecords })
        .where(eq(tenantSettings.id, existing.id));
    } else {
      await db.insert(tenantSettings).values({
        tenantId,
        key: "qc_records",
        value: updatedRecords,
      });
    }

    return NextResponse.json({ ...newRecord }, { status: 201 });
  } catch (error) {
    console.error("Failed to create QC record:", error);
    return NextResponse.json({ error: "Failed to create QC record" }, { status: 500 });
  }
}


