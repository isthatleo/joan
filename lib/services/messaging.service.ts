import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { redis } from "@/lib/redis";

export class MessagingService {
  async sendMessage(data: {
    senderId: string;
    receiverId: string;
    patientId: string;
    message: string;
  }) {
    const msg = await db.insert(messages).values(data).returning();

    // Publish to WebSocket
    await redis.publish("messages", JSON.stringify({
      type: "message.sent",
      payload: msg,
    }));

    return msg;
  }

  async getConversation(userId1: string, userId2: string) {
    return db.query.messages.findMany();
  }

  async getInboxCount(userId: string) {
    return db.query.messages.findMany();
  }
}
