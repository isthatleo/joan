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
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug, id } = await params;
    const currentUser = await resolveTenantUser(session.user.email, slug);
    if (!currentUser) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const deleted = await service.deleteMessage(currentUser.id, id);
    return NextResponse.json({ deleted });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete message" },
      { status: 500 }
    );
  }
}
