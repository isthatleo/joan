import { NextRequest, NextResponse } from "next/server";
import { and, ilike, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { MessagingService } from "@/lib/services/messaging.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const service = new MessagingService();

async function resolveCurrentAppUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.email) return null;

  return db.query.users.findFirst({
    where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
    columns: { id: true },
  });
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await resolveCurrentAppUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { otherUserId, messageIds } = await request.json();
    if (!otherUserId) {
      return NextResponse.json({ error: "otherUserId is required" }, { status: 400 });
    }

    const updated = await service.markConversationRead(currentUser.id, otherUserId, Array.isArray(messageIds) ? messageIds : undefined);
    return NextResponse.json(
      { updatedCount: updated.length },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("[messages read POST]", error);
    return NextResponse.json({ error: "Failed to update read state" }, { status: 500 });
  }
}
