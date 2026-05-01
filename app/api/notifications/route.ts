import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications, users } from "@/lib/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { z } from "zod";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const tenantId = searchParams.get("tenantId");
    const countOnly = searchParams.get("countOnly") === "true";
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    if (countOnly) {
      // Get only the unread count
      const conditions = [eq(notifications.userId, userId), eq(notifications.read, false)];
      if (tenantId) conditions.push(eq(notifications.tenantId, tenantId));

      const unreadResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(and(...conditions));

      return NextResponse.json({
        unreadCount: unreadResult[0]?.count || 0,
      });
    }

    // Get notifications for user
    const conditions = [eq(notifications.userId, userId)];
    if (tenantId) conditions.push(eq(notifications.tenantId, tenantId));
    if (unreadOnly) conditions.push(eq(notifications.read, false));

    const userNotifications = await db.query.notifications.findMany({
      where: and(...conditions),
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
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "create";
    const data = await request.json();

    if (action === "create") {
      const { userId, tenantId, type, title, message, metadata } = z.object({
        userId: z.string().uuid(),
        tenantId: z.string().uuid().optional(),
        type: z.string(),
        title: z.string().optional(),
        message: z.string(),
        metadata: z.record(z.any()).optional(),
      }).parse(data);

      // Create notification
      const notification = await db.insert(notifications).values({
        userId,
        tenantId,
        type,
        title: title || type.charAt(0).toUpperCase() + type.slice(1),
        message,
        metadata: metadata || {},
      }).returning();

      return NextResponse.json({
        notification: notification[0],
      });
    }

    if (action === "send-to-admins") {
      const { tenantId, type, title, message, metadata, excludeUserId } = z.object({
        tenantId: z.string().uuid(),
        type: z.string(),
        title: z.string(),
        message: z.string(),
        metadata: z.record(z.any()).optional(),
        excludeUserId: z.string().uuid().optional(),
      }).parse(data);

      // Find all active users for this tenant
      const adminUsers = await db.query.users.findMany({
        where: and(
          eq(users.tenantId, tenantId),
          eq(users.isActive, true)
        ),
      });

      // Filter out excluded user
      const notificationsList = adminUsers
        .filter((u) => u.id !== excludeUserId)
        .map((admin) => ({
          tenantId,
          userId: admin.id,
          type,
          title,
          message,
          metadata: metadata || {},
          read: false,
        }));

      if (notificationsList.length === 0) {
        return NextResponse.json({
          success: true,
          message: "No admins to notify",
          notificationCount: 0,
        });
      }

      await db.insert(notifications).values(notificationsList);

      // In production, send actual emails/SMS here using Resend/Twilio
      console.log(`[NOTIFICATION] Sent to ${notificationsList.length} admins: ${title}`);

      return NextResponse.json({
        success: true,
        message: `Notification sent to ${notificationsList.length} admins`,
        notificationCount: notificationsList.length,
      });
    }

    if (action === "mark-read") {
      const { notificationId } = z.object({
        notificationId: z.string().uuid(),
      }).parse(data);

      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.id, notificationId));

      return NextResponse.json({ success: true });
    }

    if (action === "mark-all-read") {
      const { userId } = z.object({
        userId: z.string().uuid(),
      }).parse(data);

      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.userId, userId));

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating notification:", error);
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }
}
