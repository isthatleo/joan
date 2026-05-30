import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tenants, users } from "@/lib/db/schema";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { MessagingCallService } from "@/lib/services/messaging-call.service";
import { MessagingService } from "@/lib/services/messaging.service";
import { getTenantSubdomain } from "@/lib/tenant-routing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const callService = new MessagingCallService();
const messagingService = new MessagingService();

async function resolveTenantId(request: NextRequest, slug: string, sessionEmail: string) {
  const directTenantId = await getTenantIdBySlug(slug);
  if (directTenantId) return directTenantId;

  const hostSlug = getTenantSubdomain(request.headers.get("host"));
  if (hostSlug && hostSlug !== slug) {
    const hostTenantId = await getTenantIdBySlug(hostSlug);
    if (hostTenantId) return hostTenantId;
  }

  const appUser = await db.query.users.findFirst({
    where: and(ilike(users.email, sessionEmail), eq(users.isActive, true), isNull(users.deletedAt)),
    columns: { id: true, tenantId: true },
  });
  if (appUser?.tenantId) return appUser.tenantId;

  if (appUser?.id) {
    const adminTenant = await db.query.tenants.findFirst({
      where: eq(tenants.adminUserId, appUser.id),
      columns: { id: true },
    });
    if (adminTenant?.id) return adminTenant.id;
  }

  return null;
}

async function resolveTenantUser(request: NextRequest, sessionEmail: string, slug: string) {
  const tenantId = await resolveTenantId(request, slug, sessionEmail);
  if (!tenantId) return null;

  const user = await db.query.users.findFirst({
    where: and(ilike(users.email, sessionEmail), eq(users.isActive, true), isNull(users.deletedAt)),
    columns: { id: true, tenantId: true },
  });
  if (!user) return null;
  return { id: user.id, tenantId };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const currentUser = await resolveTenantUser(request, session.user.email, slug);
    if (!currentUser?.tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    const tenantId = currentUser.tenantId;

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
    console.error("[tenant messages calls GET]", error);
    return NextResponse.json({ error: "Failed to fetch call state" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const currentUser = await resolveTenantUser(request, session.user.email, slug);
    if (!currentUser?.tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    const tenantId = currentUser.tenantId;

    const body = await request.json().catch(() => ({}));
    const calleeId = String(body.calleeId || "").trim();
    const callType = String(body.callType || "").trim();
    const offer = body.offer;
    if (!calleeId || (callType !== "audio" && callType !== "video") || !offer) {
      return NextResponse.json({ error: "calleeId, callType, and offer are required" }, { status: 400 });
    }

    const callee = await db.query.users.findFirst({
      where: and(eq(users.id, calleeId), eq(users.isActive, true), isNull(users.deletedAt)),
      columns: { id: true },
    });
    if (!callee) {
      return NextResponse.json({ error: "Callee not found" }, { status: 404 });
    }

    const canCall = await messagingService.canMessage(currentUser.id, calleeId, tenantId);
    if (!canCall) {
      return NextResponse.json({ error: "Insufficient permissions to call this user" }, { status: 403 });
    }

    const call = await callService.createCall({
      tenantId,
      callerId: currentUser.id,
      calleeId,
      callType,
      offer,
    });

    return NextResponse.json({ call }, { status: 201, headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("[tenant messages calls POST]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create call" }, { status: 500 });
  }
}
