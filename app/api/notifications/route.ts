import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const read = searchParams.get("read");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    let query = db.select().from(notifications).where(eq(notifications.userId, userId));

    if (read !== null) {
      query = query.where(eq(notifications.read, read === "true"));
    }

    const notificationList = await query.orderBy(notifications.createdAt);
    return NextResponse.json(notificationList);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { userId, type, message } = data;

    if (!userId || !type || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [notification] = await db.insert(notifications).values({
      userId,
      type,
      message,
      read: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Notification ID required" }, { status: 400 });
    }

    const data = await request.json();
    const { read } = data;

    const [notification] = await db.update(notifications)
      .set({ read, updatedAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();

    return NextResponse.json(notification);
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}

