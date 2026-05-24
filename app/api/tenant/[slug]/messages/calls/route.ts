import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { MessagingCallService } from "@/lib/services/messaging-call.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const callService = new MessagingCallService();

async function resolveTenantUser(sessionEmail: string, slug: string) {
  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) return null;

  return db.query.users.findFirst({
    where: and(eq(users.tenantId, tenantId), ilike(users.email, sessionEmail), isNull(users.deletedAt)),
    columns: { id: true, tenantId: true },
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const currentUser = await resolveTenantUser(session.user.email, slug);
    if (!currentUser) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "incoming";
    const otherUserId = searchParams.get("otherUserId");

    if (type === "incoming") {
      const call = await callService.getIncoming(currentUser.id);
      return NextResponse.json({ call }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }

    if (type === "conversation" && otherUserId) {
      const call = await callService.getLatestForPair(currentUser.id, otherUserId);
      return NextResponse.json({ call }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }

    return NextResponse.json({ error: "Invalid call query" }, { status: 400 });
  } catch (error) {
    console.error("[tenant messages calls GET]", error);
    return NextResponse.json({ error: "Failed to fetch call state" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const currentUser = await resolveTenantUser(session.user.email, slug);
    if (!currentUser) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { calleeId, callType, offer } = await request.json();
    if (!calleeId || !callType || !offer) {
      return NextResponse.json({ error: "calleeId, callType, and offer are required" }, { status: 400 });
    }

    const callee = await db.query.users.findFirst({
      where: and(eq(users.id, calleeId), eq(users.tenantId, currentUser.tenantId), isNull(users.deletedAt)),
      columns: { id: true },
    });
    if (!callee) {
      return NextResponse.json({ error: "Callee not found" }, { status: 404 });
    }

    const call = await callService.createCall({
      tenantId: currentUser.tenantId,
      callerId: currentUser.id,
      calleeId,
      callType,
      offer,
    });

    return NextResponse.json({ call }, { status: 201, headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("[tenant messages calls POST]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create call" }, { status: 500 });
  }
}
