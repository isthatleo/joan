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

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug, id } = await params;
    const currentUser = await resolveTenantUser(session.user.email, slug);
    if (!currentUser) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const call = await callService.getById(id);
    if (!call || (call.callerId !== currentUser.id && call.calleeId !== currentUser.id)) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    return NextResponse.json({ call }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("[tenant messages call GET]", error);
    return NextResponse.json({ error: "Failed to fetch call" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug, id } = await params;
    const currentUser = await resolveTenantUser(session.user.email, slug);
    if (!currentUser) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { action, answer, candidate } = await request.json();
    let call = null;

    if (action === "answer") {
      if (!answer) {
        return NextResponse.json({ error: "answer is required" }, { status: 400 });
      }
      call = await callService.answerCall(id, currentUser.id, answer);
    } else if (action === "reject") {
      call = await callService.rejectCall(id, currentUser.id);
    } else if (action === "end") {
      call = await callService.endCall(id, currentUser.id);
    } else if (action === "candidate") {
      if (!candidate) {
        return NextResponse.json({ error: "candidate is required" }, { status: 400 });
      }
      call = await callService.appendCandidate(id, currentUser.id, candidate);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    return NextResponse.json({ call }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("[tenant messages call PATCH]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update call" }, { status: 500 });
  }
}
