import { NextRequest, NextResponse } from "next/server";
import { and, ilike, isNull } from "drizzle-orm";
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
    if (!currentUser?.tenantId) {
      return NextResponse.json({ onlineUserIds: [] }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("userIds");
    const userIds = idsParam ? idsParam.split(",").map((id) => id.trim()).filter(Boolean) : undefined;
    const onlineUserIds = await stateService.getOnlineUserIds(currentUser.tenantId, userIds);

    return NextResponse.json(
      { onlineUserIds, currentUserId: currentUser.id },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("[messages presence GET]", error);
    return NextResponse.json({ error: "Failed to fetch presence" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await resolveCurrentAppUser(request);
    if (!currentUser?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await stateService.heartbeat(currentUser.id, currentUser.tenantId);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("[messages presence POST]", error);
    return NextResponse.json({ error: "Failed to update presence" }, { status: 500 });
  }
}
