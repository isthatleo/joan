import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAppUser } from "@/lib/api/route-guards";

export async function POST(request: NextRequest) {
  try {
    const access = await requireAppUser(request);
    if (!access.ok) return access.response;

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    if (userId !== access.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db
      .update(notifications)
      .set({ read: true })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.read, false)
      ));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return NextResponse.json({ error: "Failed to mark all as read" }, { status: 500 });
  }
}
