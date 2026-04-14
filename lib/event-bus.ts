import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { redis } from "@/lib/redis";

export class EventBus {
  async publish(type: string, payload: any) {
    // Save to DB
    await db.insert(events).values({
      type,
      payload,
      tenantId: payload.tenantId,
    });

    // Publish to Redis
    await redis.publish(type, JSON.stringify(payload));
  }

  async subscribe(type: string, handler: (payload: any) => Promise<void>) {
    const sub = redis.duplicate();
    await sub.subscribe(type, async (message) => {
      try {
        const payload = JSON.parse(message);
        await handler(payload);
      } catch (error) {
        console.error("Event handler error:", error);
      }
    });
  }
}

export const eventBus = new EventBus();
