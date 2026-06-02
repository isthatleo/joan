import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { MessagingStateService } from "@/lib/services/messaging-state.service";
import { MessagingService } from "@/lib/services/messaging.service";
import { resolveTenantMessagingUser } from "@/lib/tenant-messaging-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const stateService = new MessagingStateService();
const messagingService = new MessagingService();

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const currentUser = await resolveTenantMessagingUser(request, session.user.email, slug);
    if (!currentUser) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const otherUserId = searchParams.get("otherUserId") || undefined;
    const typingUserIds = await stateService.getTypingUserIds(currentUser.id, otherUserId);

    return NextResponse.json(
      { typingUserIds },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("[tenant messages typing GET]", error);
    return NextResponse.json({ error: "Failed to fetch typing state" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const currentUser = await resolveTenantMessagingUser(request, session.user.email, slug);
    if (!currentUser?.tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { receiverId, isTyping } = await request.json();
    if (!receiverId || typeof isTyping !== "boolean") {
      return NextResponse.json({ error: "receiverId and isTyping are required" }, { status: 400 });
    }

    const receiver = await db.query.users.findFirst({
      where: and(eq(users.id, receiverId), eq(users.isActive, true), isNull(users.deletedAt)),
      columns: { id: true },
    });

    if (!receiver) {
      return NextResponse.json({ error: "Receiver not found" }, { status: 404 });
    }

    const canMessage = await messagingService.canMessage(currentUser.id, receiverId, currentUser.tenantId);
    if (!canMessage) {
      return NextResponse.json({ error: "Insufficient permissions to update typing state" }, { status: 403 });
    }

    await stateService.setTyping(currentUser.id, receiverId, currentUser.tenantId, isTyping);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("[tenant messages typing POST]", error);
    return NextResponse.json({ error: "Failed to update typing state" }, { status: 500 });
  }
}
