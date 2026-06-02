import { and, desc, eq, gt, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, messageCallSessions } from "@/lib/db/schema";
import { ensureRedisConnection, redis } from "@/lib/redis";

const CALL_TTL_MS = 60_000;
const ACTIVE_STATUSES = ["ringing", "active"];

type CallStatus = "ringing" | "active" | "rejected" | "ended" | "missed";

export class MessagingCallService {
  private publishCallEvent(call: typeof messageCallSessions.$inferSelect, event: string, recipients?: string[]) {
    const userIds = Array.from(new Set(recipients || [call.callerId, call.calleeId]));
    void (async () => {
      try {
        await ensureRedisConnection();
        await Promise.all(
          userIds.map((userId) =>
            redis.publish(
              "messaging-events",
              JSON.stringify({
                userId,
                event,
                data: { call },
              })
            )
          )
        );
      } catch (error) {
        console.error("Failed to publish realtime call event:", error);
      }
    })();
  }

  async cleanupExpiredCalls() {
    const expiredSessions = await db
      .select({
        id: messageCallSessions.id,
        tenantId: messageCallSessions.tenantId,
        callerId: messageCallSessions.callerId,
        calleeId: messageCallSessions.calleeId,
        callType: messageCallSessions.callType,
        startedAt: messageCallSessions.startedAt,
      })
      .from(messageCallSessions)
      .where(
        sql`${messageCallSessions.expiresAt} <= now() AND ${messageCallSessions.status} IN ('ringing', 'active')`
      );

    await db
      .update(messageCallSessions)
      .set({
        status: "missed",
        endedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        sql`${messageCallSessions.expiresAt} <= now() AND ${messageCallSessions.status} IN ('ringing', 'active')`
      );

    if (expiredSessions.length > 0) {
      await db.insert(auditLogs).values(
        expiredSessions.map((session) => ({
          tenantId: session.tenantId,
          userId: session.callerId,
          action: "message_call.missed",
          entity: "message_call_session",
          entityId: session.id,
          metadata: {
            callType: session.callType,
            callerId: session.callerId,
            calleeId: session.calleeId,
            startedAt: session.startedAt,
            endedAt: new Date().toISOString(),
            source: "messaging",
          },
        }))
      );
    }
  }

  private async createAuditEntry(params: {
    tenantId?: string | null;
    actorUserId?: string | null;
    action: string;
    callId: string;
    callType: string;
    callerId: string;
    calleeId: string;
    startedAt?: Date | string | null;
    endedAt?: Date | string | null;
    durationSeconds?: number | null;
    extra?: Record<string, unknown>;
  }) {
    await db.insert(auditLogs).values({
      tenantId: params.tenantId ?? null,
      userId: params.actorUserId ?? null,
      action: params.action,
      entity: "message_call_session",
      entityId: params.callId,
      metadata: {
        source: "messaging",
        callType: params.callType,
        callerId: params.callerId,
        calleeId: params.calleeId,
        startedAt: params.startedAt ?? null,
        endedAt: params.endedAt ?? null,
        durationSeconds: params.durationSeconds ?? null,
        ...(params.extra ?? {}),
      },
    });
  }

  async createCall(params: {
    tenantId?: string | null;
    callerId: string;
    calleeId: string;
    callType: "audio" | "video";
    offer: RTCSessionDescriptionInit;
  }) {
    await this.cleanupExpiredCalls();
    const expiresAt = new Date(Date.now() + CALL_TTL_MS);

    const existing = await db.query.messageCallSessions.findFirst({
      where: and(
        or(
          and(eq(messageCallSessions.callerId, params.callerId), eq(messageCallSessions.calleeId, params.calleeId)),
          and(eq(messageCallSessions.callerId, params.calleeId), eq(messageCallSessions.calleeId, params.callerId))
        ),
        gt(messageCallSessions.expiresAt, new Date()),
        or(
          eq(messageCallSessions.status, "ringing"),
          eq(messageCallSessions.status, "active")
        )
      ),
      orderBy: desc(messageCallSessions.createdAt),
      columns: { id: true },
    });

    if (existing) {
      throw new Error("A call is already active for this conversation");
    }

    const [created] = await db
      .insert(messageCallSessions)
      .values({
        tenantId: params.tenantId ?? null,
        callerId: params.callerId,
        calleeId: params.calleeId,
        callType: params.callType,
        status: "ringing",
        offer: params.offer as any,
        callerCandidates: [],
        calleeCandidates: [],
        expiresAt,
      })
      .returning();

    await this.createAuditEntry({
      tenantId: created.tenantId,
      actorUserId: params.callerId,
      action: "message_call.started",
      callId: created.id,
      callType: created.callType,
      callerId: created.callerId,
      calleeId: created.calleeId,
      startedAt: created.startedAt,
      extra: {
        status: created.status,
      },
    });

    this.publishCallEvent(created, "call:incoming", [created.calleeId]);
    this.publishCallEvent(created, "call:update");

    return created;
  }

  async getLatestForPair(userId: string, otherUserId: string) {
    await this.cleanupExpiredCalls();
    return db.query.messageCallSessions.findFirst({
      where: and(
        or(
          and(eq(messageCallSessions.callerId, userId), eq(messageCallSessions.calleeId, otherUserId)),
          and(eq(messageCallSessions.callerId, otherUserId), eq(messageCallSessions.calleeId, userId))
        ),
        gt(messageCallSessions.expiresAt, new Date())
      ),
      orderBy: desc(messageCallSessions.createdAt),
    });
  }

  async getIncoming(userId: string) {
    await this.cleanupExpiredCalls();
    return db.query.messageCallSessions.findFirst({
      where: and(
        eq(messageCallSessions.calleeId, userId),
        eq(messageCallSessions.status, "ringing"),
        gt(messageCallSessions.expiresAt, new Date())
      ),
      orderBy: desc(messageCallSessions.createdAt),
    });
  }

  async getById(id: string) {
    await this.cleanupExpiredCalls();
    return db.query.messageCallSessions.findFirst({
      where: eq(messageCallSessions.id, id),
    });
  }

  async answerCall(id: string, userId: string, answer: RTCSessionDescriptionInit) {
    const [updated] = await db
      .update(messageCallSessions)
      .set({
        status: "active",
        answer: answer as any,
        updatedAt: new Date(),
      })
      .where(and(eq(messageCallSessions.id, id), eq(messageCallSessions.calleeId, userId)))
      .returning();

    if (updated) {
      await this.createAuditEntry({
        tenantId: updated.tenantId,
        actorUserId: userId,
        action: "message_call.answered",
        callId: updated.id,
        callType: updated.callType,
        callerId: updated.callerId,
        calleeId: updated.calleeId,
        startedAt: updated.startedAt,
        extra: {
          status: updated.status,
        },
      });
      this.publishCallEvent(updated, "call:update");
    }
    return updated;
  }

  async rejectCall(id: string, userId: string) {
    const [updated] = await db
      .update(messageCallSessions)
      .set({
        status: "rejected",
        endedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(messageCallSessions.id, id), eq(messageCallSessions.calleeId, userId)))
      .returning();

    if (updated) {
      await this.createAuditEntry({
        tenantId: updated.tenantId,
        actorUserId: userId,
        action: "message_call.rejected",
        callId: updated.id,
        callType: updated.callType,
        callerId: updated.callerId,
        calleeId: updated.calleeId,
        startedAt: updated.startedAt,
        endedAt: updated.endedAt,
        extra: {
          status: updated.status,
        },
      });
      this.publishCallEvent(updated, "call:update");
    }
    return updated;
  }

  async endCall(id: string, userId: string) {
    const [updated] = await db
      .update(messageCallSessions)
      .set({
        status: "ended",
        endedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(messageCallSessions.id, id),
          or(eq(messageCallSessions.callerId, userId), eq(messageCallSessions.calleeId, userId))
        )
      )
      .returning();

    if (updated) {
      const startedAt = updated.startedAt ? new Date(updated.startedAt) : null;
      const endedAt = updated.endedAt ? new Date(updated.endedAt) : new Date();
      const durationSeconds = startedAt ? Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)) : null;

      await this.createAuditEntry({
        tenantId: updated.tenantId,
        actorUserId: userId,
        action: "message_call.ended",
        callId: updated.id,
        callType: updated.callType,
        callerId: updated.callerId,
        calleeId: updated.calleeId,
        startedAt: updated.startedAt,
        endedAt: updated.endedAt,
        durationSeconds,
        extra: {
          status: updated.status,
        },
      });
      this.publishCallEvent(updated, "call:update");
    }
    return updated;
  }

  async appendCandidate(id: string, userId: string, candidate: RTCIceCandidateInit) {
    const session = await this.getById(id);
    if (!session) {
      throw new Error("Call not found");
    }

    const field = session.callerId === userId ? "callerCandidates" : session.calleeId === userId ? "calleeCandidates" : null;
    if (!field) {
      throw new Error("Forbidden");
    }

    const nextCandidates = Array.isArray((session as any)[field]) ? [...(session as any)[field], candidate] : [candidate];
    const [updated] = await db
      .update(messageCallSessions)
      .set({
        [field]: nextCandidates,
        updatedAt: new Date(),
      } as any)
      .where(eq(messageCallSessions.id, id))
      .returning();

    if (updated) {
      this.publishCallEvent(updated, "call:update");
    }

    return updated;
  }
}
