import { db } from "@/lib/db";
import { messages, notifications, users, userRoles, roles, messageCallSessions } from "@/lib/db/schema";
import { and, asc, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { ensureRedisConnection, redis } from "@/lib/redis";

const MESSAGE_PERMISSION_MATRIX: Record<string, string[]> = {
  super_admin: ["hospital_admin"],
  hospital_admin: ["super_admin", "doctor", "nurse", "lab_technician", "pharmacist", "accountant", "receptionist"],
  doctor: ["nurse", "lab_technician", "pharmacist", "accountant", "receptionist", "patient", "guardian"],
  nurse: ["doctor", "lab_technician", "pharmacist", "accountant", "receptionist"],
  lab_technician: ["doctor", "nurse", "pharmacist", "accountant"],
  pharmacist: ["doctor", "nurse", "lab_technician", "accountant"],
  accountant: ["doctor", "nurse", "lab_technician", "pharmacist", "receptionist"],
  receptionist: ["doctor", "nurse", "accountant"],
  patient: ["doctor"],
  guardian: ["doctor"],
};

function normalizeRole(role: string | null | undefined) {
  const normalized = (role || "patient").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "admin" || normalized === "hospital" || normalized === "hospitaladmin") return "hospital_admin";
  if (normalized === "lab" || normalized === "laboratory" || normalized === "lab_tech") return "lab_technician";
  if (normalized === "reception") return "receptionist";
  if (normalized === "accounts" || normalized === "accounting") return "accountant";
  return normalized;
}

function pickPrimaryRole(roleList: string[], fallbackRole?: string | null) {
  const normalizedFallback = normalizeRole(fallbackRole);
  const normalizedRoles = roleList.map(normalizeRole).filter(Boolean);
  return normalizedRoles.find((role) => role !== "patient") || normalizedRoles[0] || normalizedFallback;
}

export class MessagingService {
  private formatCallSummary(call: {
    callType: string;
    status: string;
    callerId: string;
    calleeId: string;
    startedAt?: Date | string | null;
    endedAt?: Date | string | null;
  }, viewerId: string) {
    const typeLabel = call.callType === "video" ? "video call" : "voice call";
    const startedAt = call.startedAt ? new Date(call.startedAt) : null;
    const endedAt = call.endedAt ? new Date(call.endedAt) : null;
    const durationSeconds =
      startedAt && endedAt ? Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)) : 0;

    if (call.status === "ended" && durationSeconds > 0) {
      return {
        message: `${call.callType === "video" ? "Video" : "Voice"} call - ${this.formatDuration(durationSeconds)}`,
        durationSeconds,
        missed: false,
      };
    }

    const viewerMissed = call.status === "missed" || (call.status === "rejected" && call.calleeId === viewerId);
    return {
      message: viewerMissed
        ? `Missed ${typeLabel}`
        : `Unanswered ${typeLabel}`,
      durationSeconds: 0,
      missed: true,
    };
  }

  private formatDuration(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  async sendMessage(data: {
    senderId: string;
    receiverId: string;
    patientId?: string;
    message: string;
    type?: string;
    tenantId?: string;
  }) {
    if (!data.receiverId) {
      throw new Error("Receiver is required");
    }
    if (!data.message?.trim()) {
      throw new Error("Message cannot be empty");
    }

    const canSend = await this.checkMessagePermissions(data.senderId, data.receiverId, data.tenantId);
    if (!canSend) {
      throw new Error("Insufficient permissions to send message");
    }

    const [created] = await db
      .insert(messages)
      .values({
        senderId: data.senderId,
        receiverId: data.receiverId,
        patientId: data.patientId,
        message: data.message.trim(),
        type: data.type || "direct",
      })
      .returning();

    const [sender, receiver] = await Promise.all([
      db.query.users.findFirst({
        where: eq(users.id, data.senderId),
        columns: { id: true, fullName: true, email: true, avatar: true },
      }),
      db.query.users.findFirst({
        where: eq(users.id, data.receiverId),
        columns: { id: true, tenantId: true, fullName: true, email: true, avatar: true },
      }),
    ]);

    const senderName = sender?.fullName || sender?.email || "Someone";

    await db.insert(notifications).values({
      userId: data.receiverId,
      tenantId: receiver?.tenantId || null,
      type: "message",
      title: "New Message",
      message: `New message from ${senderName}`,
      metadata: {
        senderId: data.senderId,
        messageId: created.id,
        messageType: data.type || "direct",
      },
      read: false,
    });

    void (async () => {
      try {
        await ensureRedisConnection();
        await redis.publish(
          "notifications",
          JSON.stringify({
            userId: data.receiverId,
            type: "message",
            title: "New Message",
            message: `New message from ${senderName}`,
            metadata: {
              senderId: data.senderId,
              messageId: created.id,
              receiverId: data.receiverId,
              message: {
                ...created,
                sender,
                receiver,
              },
            },
          })
        );
      } catch (publishError) {
        console.error("Failed to publish messaging notification:", publishError);
      }
    })();

    return created;
  }

  async getConversations(userId: string) {
    const [sentMessages, receivedMessages, callSessions] = await Promise.all([
      db.query.messages.findMany({
        where: and(eq(messages.senderId, userId), isNull(messages.deletedAt)),
        with: {
          receiver: {
            columns: { id: true, fullName: true, email: true, avatar: true },
          },
        },
        orderBy: desc(messages.createdAt),
      }),
      db.query.messages.findMany({
        where: and(eq(messages.receiverId, userId), isNull(messages.deletedAt)),
        with: {
          sender: {
            columns: { id: true, fullName: true, email: true, avatar: true },
          },
        },
        orderBy: desc(messages.createdAt),
      }),
      db.query.messageCallSessions.findMany({
        where: or(eq(messageCallSessions.callerId, userId), eq(messageCallSessions.calleeId, userId)),
        orderBy: desc(messageCallSessions.startedAt),
      }),
    ]);

    const conversationMap = new Map<string, { user: { id: string; fullName: string | null; email: string; avatar: string | null }; lastMessage: any; unreadCount: number }>();

    const callUserIds = new Set<string>();

    for (const session of callSessions || []) {
      const otherUserId = session.callerId === userId ? session.calleeId : session.callerId;
      if (otherUserId) callUserIds.add(otherUserId);
    }

    const callUsers = callUserIds.size > 0
      ? await db.query.users.findMany({
          where: inArray(users.id, Array.from(callUserIds)),
          columns: { id: true, fullName: true, email: true, avatar: true },
        })
      : [];
    const callUserMap = new Map(callUsers.map((entry) => [entry.id, entry]));

    for (const message of [...sentMessages, ...receivedMessages]) {
      const otherUser = message.senderId === userId ? (message as any).receiver : (message as any).sender;
      if (!otherUser?.id) continue;

      const existing = conversationMap.get(otherUser.id);
      if (!existing) {
        conversationMap.set(otherUser.id, {
          user: otherUser,
          lastMessage: message,
          unreadCount: message.receiverId === userId && !message.read ? 1 : 0,
        });
        continue;
      }

      if (new Date(message.createdAt).getTime() > new Date(existing.lastMessage.createdAt).getTime()) {
        existing.lastMessage = message;
      }
      if (message.receiverId === userId && !message.read) {
        existing.unreadCount += 1;
      }
    }

    for (const session of callSessions || []) {
      const otherUserId = session.callerId === userId ? session.calleeId : session.callerId;
      const otherUser = otherUserId ? callUserMap.get(otherUserId) : null;
      if (!otherUser?.id) continue;

      const callSummary = this.formatCallSummary(session, userId);
      const timelineEntry = {
        id: session.id,
        message: callSummary.message,
        createdAt: session.endedAt || session.startedAt,
        read: true,
        senderId: session.callerId,
        type: "call_event",
        callType: session.callType,
        callStatus: session.status,
        durationSeconds: callSummary.durationSeconds,
        missed: callSummary.missed,
      };

      const existing = conversationMap.get(otherUser.id);
      if (!existing) {
        conversationMap.set(otherUser.id, {
          user: otherUser,
          lastMessage: timelineEntry,
          unreadCount: 0,
        });
        continue;
      }

      if (new Date(timelineEntry.createdAt).getTime() > new Date(existing.lastMessage.createdAt).getTime()) {
        existing.lastMessage = timelineEntry;
      }
    }

    return Array.from(conversationMap.values()).sort(
      (a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
    );
  }

  async getChatMessages(userId: string, otherUserId: string, tenantId?: string) {
    const canRead = await this.checkMessagePermissions(userId, otherUserId, tenantId);
    if (!canRead) {
      throw new Error("Insufficient permissions to view this conversation");
    }

    const [chatMessages, callSessions, participants] = await Promise.all([
      db.query.messages.findMany({
        where: or(
          and(eq(messages.senderId, userId), eq(messages.receiverId, otherUserId), isNull(messages.deletedAt)),
          and(eq(messages.senderId, otherUserId), eq(messages.receiverId, userId), isNull(messages.deletedAt))
        ),
        with: {
          sender: { columns: { id: true, fullName: true, email: true, avatar: true } },
          receiver: { columns: { id: true, fullName: true, email: true, avatar: true } },
        },
        orderBy: asc(messages.createdAt),
      }),
      db.query.messageCallSessions.findMany({
        where: or(
          and(eq(messageCallSessions.callerId, userId), eq(messageCallSessions.calleeId, otherUserId)),
          and(eq(messageCallSessions.callerId, otherUserId), eq(messageCallSessions.calleeId, userId))
        ),
        orderBy: asc(messageCallSessions.startedAt),
      }),
      db.query.users.findMany({
        where: inArray(users.id, [userId, otherUserId]),
        columns: { id: true, fullName: true, email: true, avatar: true },
      }),
    ]);

    const participantMap = new Map(participants.map((entry) => [entry.id, entry]));

    await db
      .update(messages)
      .set({ read: true })
      .where(and(eq(messages.senderId, otherUserId), eq(messages.receiverId, userId), eq(messages.read, false)));

    void (async () => {
      try {
        await ensureRedisConnection();
        await redis.publish(
          "notifications",
          JSON.stringify({
            userId: otherUserId,
            type: "message.read",
            title: "Message Read",
            message: "A message was read",
            metadata: {
              senderId: otherUserId,
              readerId: userId,
              conversationUserId: userId,
            },
          })
        );
      } catch (publishError) {
        console.error("Failed to publish read receipt:", publishError);
      }
      })();

    const callTimeline = callSessions.map((session) => {
      const summary = this.formatCallSummary(session, userId);
      return {
        id: `call-${session.id}`,
        message: summary.message,
        createdAt: session.endedAt || session.startedAt,
        read: true,
        type: "call_event",
        callType: session.callType,
        callStatus: session.status,
        durationSeconds: summary.durationSeconds,
        missed: summary.missed,
        sender: participantMap.get(session.callerId) || { id: session.callerId, fullName: null, email: "", avatar: null },
        receiver: participantMap.get(session.calleeId) || { id: session.calleeId, fullName: null, email: "", avatar: null },
      };
    });

    return [...chatMessages, ...callTimeline].sort(
      (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  async markConversationRead(userId: string, otherUserId: string, messageIds?: string[]) {
    const readConditions = [
      eq(messages.senderId, otherUserId),
      eq(messages.receiverId, userId),
      eq(messages.read, false),
      isNull(messages.deletedAt),
    ];

    if (messageIds?.length) {
      readConditions.push(inArray(messages.id, messageIds));
    }

    const updated = await db
      .update(messages)
      .set({ read: true })
      .where(and(...readConditions))
      .returning({ id: messages.id });

    if (updated.length > 0) {
      void (async () => {
        try {
          await ensureRedisConnection();
          await redis.publish(
            "notifications",
            JSON.stringify({
              userId: otherUserId,
              type: "message.read",
              title: "Message Read",
              message: "A message was read",
              metadata: {
                senderId: otherUserId,
                readerId: userId,
                conversationUserId: userId,
                messageIds: updated.map((row) => row.id),
              },
            })
          );
        } catch (publishError) {
          console.error("Failed to publish read receipt:", publishError);
        }
      })();
    }

    return updated;
  }

  async getBroadcasts(userId: string) {
    const currentUser = await this.getMessagingUser(userId);
    if (!["super_admin", "hospital_admin"].includes(currentUser.role)) {
      throw new Error("Insufficient permissions for broadcasts");
    }

    return db.query.messages.findMany({
      where: and(eq(messages.senderId, userId), eq(messages.type, "broadcast")),
      with: {
        receiver: { columns: { id: true, fullName: true, email: true, avatar: true } },
      },
      orderBy: desc(messages.createdAt),
    });
  }

  async sendBroadcast(data: {
    senderId: string;
    roleTarget?: string;
    tenantTarget?: boolean;
    message: string;
  }) {
    const currentUser = await this.getMessagingUser(data.senderId);
    if (!["super_admin", "hospital_admin"].includes(currentUser.role)) {
      throw new Error("Insufficient permissions for broadcasts");
    }

    let targetUsers: string[] = [];

    if (data.roleTarget) {
      const roleName = data.roleTarget.replace(/^role:/, "");
      const roleRows = await db
        .select({ userId: userRoles.userId })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(roles.name, roleName));
      targetUsers = roleRows.map((row) => row.userId).filter(Boolean) as string[];
    } else if (data.tenantTarget && currentUser.tenantId) {
      const tenantUsers = await db.query.users.findMany({
        where: eq(users.tenantId, currentUser.tenantId),
        columns: { id: true },
      });
      targetUsers = tenantUsers.map((entry) => entry.id);
    }

    const sentMessages = [];
    for (const receiverId of targetUsers) {
      if (receiverId === data.senderId) continue;
      sentMessages.push(
        await this.sendMessage({
          senderId: data.senderId,
          receiverId,
          message: data.message,
          type: "broadcast",
        })
      );
    }

    return sentMessages;
  }

  async getAvailableContacts(userId: string, search?: string, tenantId?: string) {
    const currentUser = await this.getMessagingUser(userId);
    const currentTenantId = tenantId || currentUser.tenantId;
    const allowedRoles = MESSAGE_PERMISSION_MATRIX[currentUser.role] || [];
    if (allowedRoles.length === 0) return [];

    const rows = await db.$queryRaw`
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.avatar,
        u.role,
        COALESCE(
          ARRAY_AGG(DISTINCT LOWER(r.name)) FILTER (WHERE r.name IS NOT NULL),
          ARRAY[]::text[]
        ) AS linked_roles
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE u.deleted_at IS NULL
        AND u.is_active = true
        AND (
          ${currentUser.role === "super_admin" || !currentTenantId}
          OR u.tenant_id = ${currentTenantId}
          OR EXISTS (
            SELECT 1
            FROM user_roles sur
            INNER JOIN roles sr ON sr.id = sur.role_id
            WHERE sur.user_id = u.id
              AND LOWER(sr.name) = 'super_admin'
          )
        )
      GROUP BY u.id, u.full_name, u.email, u.avatar, u.role
      ORDER BY COALESCE(u.full_name, u.email) ASC
    `;

    const needle = search?.trim().toLowerCase();
    return (rows as any[])
      .filter((candidate) => candidate.id !== userId)
      .map((candidate) => {
        const linkedRoles = Array.isArray(candidate.linked_roles) ? candidate.linked_roles : [];
        const primaryRole = pickPrimaryRole(linkedRoles, candidate.role);
        return {
          id: candidate.id,
          fullName: candidate.full_name || null,
          email: candidate.email,
          avatar: candidate.avatar || null,
          role: primaryRole,
          linkedRoles,
        };
      })
      .filter((candidate) => {
        const rolesToCheck = [candidate.role, ...candidate.linkedRoles.map(normalizeRole)];
        const canMessage = rolesToCheck.some((role) => allowedRoles.includes(role));
        if (!canMessage) return false;
        if (!needle) return true;
        const roleText = Array.from(new Set(rolesToCheck)).join(" ").replace(/_/g, " ");
        return (
          (candidate.fullName || "").toLowerCase().includes(needle) ||
          candidate.email.toLowerCase().includes(needle) ||
          roleText.includes(needle)
        );
      })
      .map(({ linkedRoles, ...candidate }) => candidate)
      .sort((a, b) => (a.fullName || a.email).localeCompare(b.fullName || b.email));
  }

  async canMessage(senderId: string, receiverId: string, tenantId?: string) {
    return this.checkMessagePermissions(senderId, receiverId, tenantId);
  }

  private async getMessagingUser(userId: string) {
    const rows = await db.$queryRaw`
      SELECT
        u.id,
        u.tenant_id,
        u.role,
        u.email,
        u.full_name,
        COALESCE(
          ARRAY_AGG(DISTINCT LOWER(r.name)) FILTER (WHERE r.name IS NOT NULL),
          ARRAY[]::text[]
        ) AS linked_roles
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE u.id = ${userId}
        AND u.deleted_at IS NULL
        AND u.is_active = true
      GROUP BY u.id, u.tenant_id, u.role, u.email, u.full_name
      LIMIT 1
    `;

    const user = (rows as any[])[0];
    if (!user) {
      throw new Error("User not found");
    }

    return {
      id: user.id,
      tenantId: user.tenant_id || null,
      role: pickPrimaryRole(Array.isArray(user.linked_roles) ? user.linked_roles : [], user.role),
      email: user.email,
      fullName: user.full_name,
    };
  }

  private async checkMessagePermissions(senderId: string, receiverId: string, tenantId?: string): Promise<boolean> {
    const [sender, receiver] = await Promise.all([
      this.getMessagingUser(senderId),
      this.getMessagingUser(receiverId),
    ]);

    const allowedRoles = MESSAGE_PERMISSION_MATRIX[sender.role] || [];
    const senderTenantId = tenantId || sender.tenantId;
    const sameTenant = !senderTenantId || !receiver.tenantId || senderTenantId === receiver.tenantId;

    if (sender.role === "super_admin") {
      return allowedRoles.includes(receiver.role);
    }

    if (sameTenant && allowedRoles.includes(receiver.role)) {
      return true;
    }

    if (sameTenant && receiver.role === "hospital_admin" && sender.role !== "patient" && sender.role !== "guardian") {
      return this.hasExistingConversation(senderId, receiverId);
    }

    return false;
  }

  private async hasExistingConversation(userId: string, otherUserId: string) {
    const existing = await db.query.messages.findFirst({
      where: and(
        isNull(messages.deletedAt),
        or(
          and(eq(messages.senderId, userId), eq(messages.receiverId, otherUserId)),
          and(eq(messages.senderId, otherUserId), eq(messages.receiverId, userId))
        )
      ),
      columns: { id: true },
    });

    return Boolean(existing);
  }

  async getInboxCount(userId: string): Promise<number> {
    return db.$count(messages, and(eq(messages.receiverId, userId), eq(messages.read, false), isNull(messages.deletedAt)));
  }

  async deleteMessage(userId: string, messageId: string) {
    const existing = await db.query.messages.findFirst({
      where: and(eq(messages.id, messageId), isNull(messages.deletedAt)),
      columns: { id: true, senderId: true, receiverId: true },
    });

    if (!existing) {
      throw new Error("Message not found");
    }

    if (existing.senderId !== userId) {
      throw new Error("You can only delete messages you sent");
    }

    const [deleted] = await db
      .update(messages)
      .set({ deletedAt: new Date() })
      .where(eq(messages.id, messageId))
      .returning({ id: messages.id });

    return deleted;
  }

  async clearConversation(userId: string, otherUserId: string) {
    await this.checkMessagePermissions(userId, otherUserId);

    const deleted = await db
      .update(messages)
      .set({ deletedAt: new Date() })
      .where(
        and(
          isNull(messages.deletedAt),
          or(
            and(eq(messages.senderId, userId), eq(messages.receiverId, otherUserId)),
            and(eq(messages.senderId, otherUserId), eq(messages.receiverId, userId))
          )
        )
      )
      .returning({ id: messages.id });

    return { deletedCount: deleted.length };
  }
}
