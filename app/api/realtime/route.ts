import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications, messages, appointments, labOrders } from "@/lib/db/schema";
import { eq, and, gte, lt } from "drizzle-orm";

// Store active connections
const activeConnections = new Map<string, ReadableStreamDefaultController>();

// Event types that trigger real-time updates
export type RealtimeEvent =
  | { type: "message"; data: any }
  | { type: "notification"; data: any }
  | { type: "appointment_update"; data: any }
  | { type: "queue_update"; data: any }
  | { type: "lab_result"; data: any }
  | { type: "vital_update"; data: any }
  | { type: "prescription_update"; data: any };

// Broadcast event to specific user
export function broadcastToUser(userId: string, event: RealtimeEvent) {
  const controller = activeConnections.get(userId);
  if (controller) {
    try {
      controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
    } catch (error) {
      console.error("Failed to send real-time event:", error);
      activeConnections.delete(userId);
    }
  }
}

// Broadcast event to all users in a tenant
export function broadcastToTenant(tenantId: string, event: RealtimeEvent, excludeUserId?: string) {
  activeConnections.forEach((controller, userId) => {
    if (excludeUserId && userId === excludeUserId) return;
    // In a real implementation, you'd check if the user belongs to the tenant
    try {
      controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
    } catch (error) {
      console.error("Failed to send tenant event:", error);
      activeConnections.delete(userId);
    }
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const tenantId = searchParams.get("tenantId");

  if (!userId || !tenantId) {
    return NextResponse.json({ error: "User ID and Tenant ID required" }, { status: 400 });
  }

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Store the connection
      activeConnections.set(userId, controller);

      // Send initial connection confirmation
      controller.enqueue(`data: ${JSON.stringify({ type: "connected", userId })}\n\n`);

      // Send current unread counts
      sendInitialData(userId, tenantId, controller);

      // Set up cleanup on connection close
      request.signal.addEventListener("abort", () => {
        activeConnections.delete(userId);
      });
    },
    cancel() {
      activeConnections.delete(userId);
    }
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}

async function sendInitialData(userId: string, tenantId: string, controller: ReadableStreamDefaultController) {
  try {
    // Get unread messages count
    const unreadMessages = await db
      .select()
      .from(messages)
      .where(and(
        eq(messages.receiverId, userId),
        eq(messages.read, false)
      ));

    // Get unread notifications count
    const unreadNotifications = await db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.read, false)
      ));

    // Get today's appointments
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysAppointments = await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.tenantId, tenantId),
        gte(appointments.scheduledAt, today),
        lt(appointments.scheduledAt, tomorrow)
      ));

    // Get pending lab results
    const pendingResults = await db
      .select()
      .from(labOrders)
      .where(and(
        eq(labOrders.tenantId, tenantId),
        eq(labOrders.status, "completed")
      ));

    // Send initial data
    const initialData = {
      type: "initial_data",
      data: {
        unreadMessages: unreadMessages.length,
        unreadNotifications: unreadNotifications.length,
        todaysAppointments: todaysAppointments.length,
        pendingLabResults: pendingResults.length
      }
    };

    controller.enqueue(`data: ${JSON.stringify(initialData)}\n\n`);
  } catch (error) {
    console.error("Failed to send initial data:", error);
  }
}

// Helper function to trigger real-time updates when data changes
export async function triggerRealtimeUpdate(
  userId: string,
  tenantId: string,
  eventType: RealtimeEvent["type"],
  eventData: any
) {
  const event: RealtimeEvent = {
    type: eventType,
    data: {
      ...eventData,
      timestamp: new Date().toISOString()
    }
  };

  // Broadcast to specific user
  broadcastToUser(userId, event);

  // For certain events, also broadcast to tenant (e.g., queue updates, lab results)
  if (["queue_update", "lab_result", "appointment_update"].includes(eventType)) {
    broadcastToTenant(tenantId, event, userId);
  }
}
