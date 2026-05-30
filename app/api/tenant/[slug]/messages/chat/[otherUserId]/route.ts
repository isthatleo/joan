import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { MessagingService } from "@/lib/services/messaging.service";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { getTenantIdBySlug } from "@/lib/accountant/server";

const service = new MessagingService();

async function resolveTenantUser(sessionEmail: string, slug: string) {
  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) return null;

  return db.query.users.findFirst({
    where: and(
      eq(users.tenantId, tenantId),
      ilike(users.email, sessionEmail),
      eq(users.isActive, true),
      isNull(users.deletedAt)
    ),
    columns: { id: true, tenantId: true },
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; otherUserId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug, otherUserId } = await params;
    const currentUser = await resolveTenantUser(session.user.email, slug);
    if (!currentUser) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const result = await service.clearConversation(currentUser.id, otherUserId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to clear conversation" },
      { status: 500 }
    );
  }
}
