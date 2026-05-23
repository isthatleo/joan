import { db } from "@/lib/db";
import { messages, notifications, users, userRoles, roles } from "@/lib/db/schema";
import { and, asc, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { ensureRedisConnection, redis } from "@/lib/redis";

const MESSAGE_PERMISSION_MATRIX: Record<string, string[]> = {
  super_admin: ["hospital_admin"],
  hospital_admin: ["super_admin", "doctor", "nurse", "lab_technician", "pharmacist", "accountant", "receptionist", "patient", "guardian"],
  doctor: ["hospital_admin", "nurse", "lab_technician", "pharmacist", "accountant", "receptionist", "patient", "guardian"],
  nurse: ["hospital_admin", "doctor", "lab_technician", "pharmacist", "accountant", "receptionist"],
  lab_technician: ["hospital_admin", "doctor", "nurse", "pharmacist", "accountant"],
  pharmacist: ["hospital_admin", "doctor", "nurse", "lab_technician", "accountant"],
  accountant: ["hospital_admin", "doctor", "nurse", "lab_technician", "pharmacist", "receptionist"],
  receptionist: ["hospital_admin", "doctor", "nurse", "accountant"],
  patient: ["doctor"],
  guardian: ["doctor"],
};

function normalizeRole(role: string | null | undefined) {
  return (role || "patient").toLowerCase();
}

function pickPrimaryRole(roleList: string[], fallbackRole?: string | null) {
  const normalizedFallback = normalizeRole(fallbackRole);
  const normalizedRoles = roleList.map(normalizeRole).filter(Boolean);
  return normalizedRoles.find((role) => role !== "patient") || normalizedRoles[0] || normalizedFallback;
}

export class MessagingService {
  async sendMessage(data: {
    senderId: string;
    receiverId: string;
    patientId?: string;
    message: string;
    type?: string;
  }) {
    const canSend = await this.checkMessagePermissions(data.senderId, data.receiverId);
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
        columns: { fullName: true, email: true },
      }),
      db.query.users.findFirst({
        where: eq(users.id, data.receiverId),
        columns: { tenantId: true },
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
            metadata: { senderId: data.senderId, messageId: created.id },
          })
        );
      } catch (publishError) {
        console.error("Failed to publish messaging notification:", publishError);
      }
    })();

    return created;
  }

  async getConversations(userId: string) {
    const [sentMessages, receivedMessages] = await Promise.all([
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
    ]);

    const conversationMap = new Map<string, { user: { id: string; fullName: string | null; email: string; avatar: string | null }; lastMessage: any; unreadCount: number }>();

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

    return Array.from(conversationMap.values()).sort(
      (a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
    );
  }

  async getChatMessages(userId: string, otherUserId: string) {
    const chatMessages = await db.query.messages.findMany({
      where: or(
        and(eq(messages.senderId, userId), eq(messages.receiverId, otherUserId), isNull(messages.deletedAt)),
        and(eq(messages.senderId, otherUserId), eq(messages.receiverId, userId), isNull(messages.deletedAt))
      ),
      with: {
        sender: { columns: { id: true, fullName: true, email: true, avatar: true } },
        receiver: { columns: { id: true, fullName: true, email: true, avatar: true } },
      },
      orderBy: asc(messages.createdAt),
    });

    await db
      .update(messages)
      .set({ read: true })
      .where(and(eq(messages.senderId, otherUserId), eq(messages.receiverId, userId), eq(messages.read, false)));

    return chatMessages;
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

  async getAvailableContacts(userId: string, search?: string) {
    const currentUser = await this.getMessagingUser(userId);
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
        AND (${currentUser.role === "super_admin" || !currentUser.tenantId} OR u.tenant_id = ${currentUser.tenantId})
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

  private async checkMessagePermissions(senderId: string, receiverId: string): Promise<boolean> {
    const [sender, receiver] = await Promise.all([
      this.getMessagingUser(senderId),
      this.getMessagingUser(receiverId),
    ]);

    const allowedRoles = MESSAGE_PERMISSION_MATRIX[sender.role] || [];
    const sameTenant = !sender.tenantId || !receiver.tenantId || sender.tenantId === receiver.tenantId;

    if (sender.role === "super_admin") {
      return allowedRoles.includes(receiver.role);
    }

    return sameTenant && allowedRoles.includes(receiver.role);
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
