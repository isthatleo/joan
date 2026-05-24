import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { MessagingCallService } from "@/lib/services/messaging-call.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const callService = new MessagingCallService();

async function resolveCurrentAppUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.email) return null;

  return db.query.users.findFirst({
    where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
    columns: { id: true, tenantId: true },
  });
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await resolveCurrentAppUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    console.error("[messages calls GET]", error);
    return NextResponse.json({ error: "Failed to fetch call state" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await resolveCurrentAppUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { calleeId, callType, offer } = await request.json();
    if (!calleeId || !callType || !offer) {
      return NextResponse.json({ error: "calleeId, callType, and offer are required" }, { status: 400 });
    }

    const callee = await db.query.users.findFirst({
      where: and(eq(users.id, calleeId), isNull(users.deletedAt)),
      columns: { id: true },
    });
    if (!callee) {
      return NextResponse.json({ error: "Callee not found" }, { status: 404 });
    }

    const call = await callService.createCall({
      tenantId: currentUser.tenantId ?? null,
      callerId: currentUser.id,
      calleeId,
      callType,
      offer,
    });

    return NextResponse.json({ call }, { status: 201, headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("[messages calls POST]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create call" }, { status: 500 });
  }
}
