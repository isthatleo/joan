import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { MessagingStateService } from "@/lib/services/messaging-state.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const stateService = new MessagingStateService();

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
    if (!currentUser?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { receiverId, isTyping } = await request.json();
    if (!receiverId || typeof isTyping !== "boolean") {
      return NextResponse.json({ error: "receiverId and isTyping are required" }, { status: 400 });
    }

    const receiver = await db.query.users.findFirst({
      where: and(eq(users.id, receiverId), eq(users.tenantId, currentUser.tenantId), isNull(users.deletedAt)),
      columns: { id: true },
    });

    if (!receiver) {
      return NextResponse.json({ error: "Receiver not found" }, { status: 404 });
    }

    await stateService.setTyping(currentUser.id, receiverId, currentUser.tenantId, isTyping);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("[messages typing POST]", error);
    return NextResponse.json({ error: "Failed to update typing state" }, { status: 500 });
  }
}
