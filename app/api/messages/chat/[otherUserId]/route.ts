import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { MessagingService } from "@/lib/services/messaging.service";
import { and, ilike, isNull } from "drizzle-orm";

const service = new MessagingService();

async function resolveCurrentAppUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.email) {
    return { session, appUser: null };
  }

  const appUser = await db.query.users.findFirst({
    where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
    columns: { id: true },
  });

  return { session, appUser };
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ otherUserId: string }> }
) {
  try {
    const { session, appUser } = await resolveCurrentAppUser(request);
    if (!session?.user?.email || !appUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { otherUserId } = await params;
    const result = await service.clearConversation(appUser.id, otherUserId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to clear conversation" },
      { status: 500 }
    );
  }
}
