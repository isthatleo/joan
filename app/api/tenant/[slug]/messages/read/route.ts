import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { MessagingService } from "@/lib/services/messaging.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const service = new MessagingService();

async function resolveTenantUser(sessionEmail: string, slug: string) {
  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) return null;

  return db.query.users.findFirst({
    where: and(eq(users.tenantId, tenantId), ilike(users.email, sessionEmail), eq(users.isActive, true), isNull(users.deletedAt)),
    columns: { id: true },
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const currentUser = await resolveTenantUser(session.user.email, slug);
    if (!currentUser) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
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
    console.error("[tenant messages read POST]", error);
    return NextResponse.json({ error: "Failed to update read state" }, { status: 500 });
  }
}
