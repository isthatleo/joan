import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tenants, users } from "@/lib/db/schema";
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

async function resolvePresenceTenantId(userId: string, tenantId?: string | null) {
  if (tenantId) return tenantId;

  const ownedTenant = await db.query.tenants.findFirst({
    where: and(eq(tenants.adminUserId, userId), eq(tenants.isActive, true), isNull(tenants.deletedAt)),
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
    const tenantId = await resolvePresenceTenantId(currentUser.id, currentUser.tenantId);
    if (!tenantId) return NextResponse.json({ onlineUserIds: [], currentUserId: currentUser.id }, { headers: { "Cache-Control": "no-store, max-age=0" } });

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("userIds");
    const userIds = idsParam ? idsParam.split(",").map((id) => id.trim()).filter(Boolean) : undefined;
    const onlineUserIds = userIds?.length
      ? await stateService.getOnlineUserIdsForUsers(userIds)
      : await stateService.getOnlineUserIds(tenantId);

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
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await resolvePresenceTenantId(currentUser.id, currentUser.tenantId);
    if (!tenantId) {
      return NextResponse.json({ error: "No active tenant available for presence" }, { status: 409 });
    }

    await stateService.heartbeat(currentUser.id, tenantId);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("[messages presence POST]", error);
    return NextResponse.json({ error: "Failed to update presence" }, { status: 500 });
  }
}
