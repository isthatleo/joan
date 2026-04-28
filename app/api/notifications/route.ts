import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const countOnly = searchParams.get("countOnly") === "true";

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    if (countOnly) {
      // Get only the unread count
      const unreadResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));

      return NextResponse.json({
        unreadCount: unreadResult[0]?.count || 0,
      });
    }

    // Get notifications for user
    const userNotifications = await db.query.notifications.findMany({
      where: eq(notifications.userId, userId),
      orderBy: desc(notifications.createdAt),
      limit: 50,
    });

    return NextResponse.json({
      notifications: userNotifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title || n.type.charAt(0).toUpperCase() + n.type.slice(1),
        message: n.message,
        read: n.read,
        createdAt: n.createdAt,
        metadata: n.metadata,
      })),
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, type, title, message, metadata } = await request.json();

    if (!userId || !type || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Create notification
    const notification = await db.insert(notifications).values({
      userId,
      type,
      title: title || type.charAt(0).toUpperCase() + type.slice(1),
      message,
      metadata,
    }).returning();

    return NextResponse.json({
      notification: notification[0],
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }
}
