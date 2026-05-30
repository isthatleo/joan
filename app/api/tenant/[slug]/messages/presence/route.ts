import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { MessagingStateService } from "@/lib/services/messaging-state.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const stateService = new MessagingStateService();

async function resolveTenantUser(sessionEmail: string, slug: string) {
  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) return null;

  return db.query.users.findFirst({
    where: and(eq(users.tenantId, tenantId), ilike(users.email, sessionEmail), eq(users.isActive, true), isNull(users.deletedAt)),
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
    if (!currentUser?.tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
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
    console.error("[tenant messages presence GET]", error);
    return NextResponse.json({ error: "Failed to fetch presence" }, { status: 500 });
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
    if (!currentUser?.tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    await stateService.heartbeat(currentUser.id, currentUser.tenantId);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("[tenant messages presence POST]", error);
    return NextResponse.json({ error: "Failed to update presence" }, { status: 500 });
  }
}
