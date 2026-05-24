import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications, users } from "@/lib/db/schema";
import { and, eq, ilike, isNull } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function resolveCurrentAppUser(sessionEmail: string | undefined) {
  if (!sessionEmail) return null;
  return db.query.users.findFirst({
    where: and(ilike(users.email, sessionEmail), isNull(users.deletedAt)),
    columns: { id: true },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const appUser = await resolveCurrentAppUser(session.user.email);
    const { id: notificationId } = await params;

    if (!notificationId) {
      return NextResponse.json({ error: "Notification ID required" }, { status: 400 });
    }

    const existing = await db.query.notifications.findFirst({
      where: eq(notifications.id, notificationId),
      columns: { id: true, userId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    if (existing.userId !== session.user.id && existing.userId !== appUser?.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Mark notification as read
    const updated = await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, notificationId))
      .returning();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 });
  }
}
