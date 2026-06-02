import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tenants, users } from "@/lib/db/schema";
import { MessagingStateService } from "@/lib/services/messaging-state.service";
import { MessagingService } from "@/lib/services/messaging.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const stateService = new MessagingStateService();
const messagingService = new MessagingService();

async function resolveCurrentAppUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.email) return null;

  return db.query.users.findFirst({
    where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
    columns: { id: true, tenantId: true },
  });
}

async function resolveTypingTenantId(senderId: string, receiverId: string, senderTenantId?: string | null, receiverTenantId?: string | null) {
  if (senderTenantId) return senderTenantId;
  if (receiverTenantId) return receiverTenantId;

  const ownedTenant = await db.query.tenants.findFirst({
    where: and(eq(tenants.adminUserId, senderId), eq(tenants.isActive, true), isNull(tenants.deletedAt)),
    columns: { id: true },
  });
  if (ownedTenant?.id) return ownedTenant.id;

  const firstTenant = await db.query.tenants.findFirst({
    where: and(eq(tenants.isActive, true), isNull(tenants.deletedAt)),
    columns: { id: true },
  });
  return firstTenant?.id || null;
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await resolveCurrentAppUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const otherUserId = searchParams.get("otherUserId") || undefined;
    const typingUserIds = await stateService.getTypingUserIds(currentUser.id, otherUserId);
    return NextResponse.json(
      { typingUserIds },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("[messages typing GET]", error);
    return NextResponse.json({ error: "Failed to fetch typing state" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await resolveCurrentAppUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { receiverId, isTyping } = await request.json();
    if (!receiverId || typeof isTyping !== "boolean") {
      return NextResponse.json({ error: "receiverId and isTyping are required" }, { status: 400 });
    }

    const receiver = await db.query.users.findFirst({
      where: and(eq(users.id, receiverId), isNull(users.deletedAt)),
      columns: { id: true, tenantId: true },
    });

    if (!receiver) {
      return NextResponse.json({ error: "Receiver not found" }, { status: 404 });
    }

    const tenantId = await resolveTypingTenantId(currentUser.id, receiverId, currentUser.tenantId, receiver.tenantId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant available for typing state" }, { status: 409 });
    }

    const canMessage = await messagingService.canMessage(currentUser.id, receiverId, tenantId);
    if (!canMessage) {
      return NextResponse.json({ error: "Insufficient permissions to update typing state" }, { status: 403 });
    }

    await stateService.setTyping(currentUser.id, receiverId, tenantId, isTyping);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("[messages typing POST]", error);
    return NextResponse.json({ error: "Failed to update typing state" }, { status: 500 });
  }
}
