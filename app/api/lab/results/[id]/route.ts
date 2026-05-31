import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { labResults, users } from "@/lib/db/schema";
import { parseLabResultData, serializeLabResultData } from "@/lib/doctor/lab-results";

async function resolveTenantId(user: { email: string }) {
  const profile = await db.query.users.findFirst({
    where: eq(users.email, user.email),
    columns: { tenantId: true },
  });
  return profile?.tenantId || null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const tenantId = await resolveTenantId(session.user);
    if (!tenantId) return NextResponse.json({ error: "No tenant context" }, { status: 400 });

    const { id } = await params;
    const result = await db.query.labResults.findFirst({
      where: and(eq(labResults.id, id), eq(labResults.tenantId, tenantId), isNull(labResults.deletedAt)),
    });

    if (!result) {
      return NextResponse.json({ error: "Lab result not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch lab result:", error);
    return NextResponse.json({ error: "Failed to fetch lab result" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const tenantId = await resolveTenantId(session.user);
    if (!tenantId) return NextResponse.json({ error: "No tenant context" }, { status: 400 });

    const { id } = await params;
    const payload = await request.json();

    const existing = await db.query.labResults.findFirst({
      where: and(eq(labResults.id, id), eq(labResults.tenantId, tenantId), isNull(labResults.deletedAt)),
    });

    if (!existing) {
      return NextResponse.json({ error: "Lab result not found" }, { status: 404 });
    }

    const parsed = parseLabResultData(existing.resultData, existing.fileUrl);
    const nextData =
      payload.resultData !== undefined
        ? parseLabResultData(payload.resultData, payload.fileUrl ?? existing.fileUrl)
        : {
            ...parsed,
            notes: payload.notes !== undefined ? String(payload.notes || "") || null : parsed.notes,
            status: payload.status ? String(payload.status) : parsed.status,
          };

    const [updated] = await db
      .update(labResults)
      .set({
        resultData: serializeLabResultData(nextData),
        fileUrl: payload.fileUrl !== undefined ? payload.fileUrl || null : existing.fileUrl,
        updatedAt: new Date(),
      })
      .where(eq(labResults.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update lab result:", error);
    return NextResponse.json({ error: "Failed to update lab result" }, { status: 500 });
  }
}
