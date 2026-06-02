import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { messagePresence, messageTypingStates } from "@/lib/db/schema";

const ONLINE_WINDOW_MS = 90_000;
const TYPING_WINDOW_MS = 5_000;

export class MessagingStateService {
  async heartbeat(userId: string, tenantId: string) {
    const now = new Date();
    const existing = await db.query.messagePresence.findFirst({
      where: eq(messagePresence.userId, userId),
      columns: { id: true },
    });

    if (existing) {
      await db
        .update(messagePresence)
        .set({
          tenantId,
          lastSeenAt: now,
          updatedAt: now,
          deletedAt: null,
        })
        .where(eq(messagePresence.userId, userId));
      return;
    }

    await db.insert(messagePresence).values({
      tenantId,
      userId,
      lastSeenAt: now,
    });
  }

  async getOnlineUserIds(tenantId: string, userIds?: string[]) {
    const cutoff = new Date(Date.now() - ONLINE_WINDOW_MS);
    const conditions = [eq(messagePresence.tenantId, tenantId), gt(messagePresence.lastSeenAt, cutoff)];
    if (userIds?.length) {
      conditions.push(inArray(messagePresence.userId, userIds));
    }

    const rows = await db
      .select({ userId: messagePresence.userId })
      .from(messagePresence)
      .where(and(...conditions));

    return rows.map((row) => row.userId);
  }

  async getOnlineUserIdsForUsers(userIds: string[]) {
    if (userIds.length === 0) return [];

    const cutoff = new Date(Date.now() - ONLINE_WINDOW_MS);
    const rows = await db
      .select({ userId: messagePresence.userId })
      .from(messagePresence)
      .where(and(inArray(messagePresence.userId, Array.from(new Set(userIds))), gt(messagePresence.lastSeenAt, cutoff)));

    return rows.map((row) => row.userId);
  }

  async setTyping(senderId: string, receiverId: string, tenantId: string, isTyping: boolean) {
    await this.clearExpiredTyping();

    if (!isTyping) {
      await db
        .delete(messageTypingStates)
        .where(and(eq(messageTypingStates.senderId, senderId), eq(messageTypingStates.receiverId, receiverId)));
      return;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + TYPING_WINDOW_MS);
    const existing = await db.query.messageTypingStates.findFirst({
      where: and(eq(messageTypingStates.senderId, senderId), eq(messageTypingStates.receiverId, receiverId)),
      columns: { id: true },
    });

    if (existing) {
      await db
        .update(messageTypingStates)
        .set({
          tenantId,
          expiresAt,
          updatedAt: now,
          deletedAt: null,
        })
        .where(and(eq(messageTypingStates.senderId, senderId), eq(messageTypingStates.receiverId, receiverId)));
      return;
    }

    await db.insert(messageTypingStates).values({
      tenantId,
      senderId,
      receiverId,
      expiresAt,
    });
  }

  async getTypingUserIds(receiverId: string, senderId?: string) {
    await this.clearExpiredTyping();

    const conditions = [eq(messageTypingStates.receiverId, receiverId), gt(messageTypingStates.expiresAt, new Date())];
    if (senderId) {
      conditions.push(eq(messageTypingStates.senderId, senderId));
    }

    const rows = await db
      .select({ senderId: messageTypingStates.senderId })
      .from(messageTypingStates)
      .where(and(...conditions));

    return rows.map((row) => row.senderId);
  }

  async clearExpiredTyping() {
    await db.delete(messageTypingStates).where(sql`${messageTypingStates.expiresAt} <= now()`);
  }
}
