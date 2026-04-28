import { db } from "@/lib/db";
import { messages, users, userRoles, roles } from "@/lib/db/schema";
import { eq, and, or, desc, asc } from "drizzle-orm";

export class MessagingService {
  async sendMessage(data: {
    senderId: string;
    receiverId: string;
    patientId?: string;
    message: string;
    type?: string;
  }) {
    // Check permissions
    const canSend = await this.checkMessagePermissions(data.senderId, data.receiverId);
    if (!canSend) {
      throw new Error("Insufficient permissions to send message");
    }

    const msg = await db.insert(messages).values({
      senderId: data.senderId,
      receiverId: data.receiverId,
      patientId: data.patientId,
      message: data.message,
      type: data.type || "direct",
    }).returning();

    return msg[0];
  }

  async getConversations(userId: string) {
    // Get all messages sent/received by user
    const sentMessages = await db.query.messages.findMany({
      where: eq(messages.senderId, userId),
      with: {
        receiver: {
          columns: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: desc(messages.createdAt),
    });

    const receivedMessages = await db.query.messages.findMany({
      where: eq(messages.receiverId, userId),
      with: {
        sender: {
          columns: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: desc(messages.createdAt),
    });

    // Combine and deduplicate conversations
    const conversations = new Map();

    [...sentMessages, ...receivedMessages].forEach(msg => {
      const otherUser = msg.senderId === userId ? msg.receiver : msg.sender;
      if (!conversations.has(otherUser.id)) {
        conversations.set(otherUser.id, {
          user: otherUser,
          lastMessage: msg,
          unreadCount: msg.receiverId === userId && !msg.read ? 1 : 0,
        });
      } else if (msg.createdAt > conversations.get(otherUser.id).lastMessage.createdAt) {
        conversations.get(otherUser.id).lastMessage = msg;
      }
      if (msg.receiverId === userId && !msg.read) {
        conversations.get(otherUser.id).unreadCount++;
      }
    });

    return Array.from(conversations.values());
  }

  async getChatMessages(userId: string, otherUserId: string) {
    const chatMessages = await db.query.messages.findMany({
      where: or(
        and(eq(messages.senderId, userId), eq(messages.receiverId, otherUserId)),
        and(eq(messages.senderId, otherUserId), eq(messages.receiverId, userId))
      ),
      with: {
        sender: {
          columns: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        receiver: {
          columns: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: asc(messages.createdAt),
    });

    // Mark messages as read
    await db
      .update(messages)
      .set({ read: true })
      .where(and(
        eq(messages.senderId, otherUserId),
        eq(messages.receiverId, userId),
        eq(messages.read, false)
      ));

    return chatMessages;
  }

  async getBroadcasts(userId: string) {
    // Check if user has broadcast permissions
    const userRole = await db.query.userRoles.findFirst({
      where: eq(userRoles.userId, userId),
      with: {
        role: true,
      },
    });

    if (!["super_admin", "hospital_admin"].includes(userRole?.role?.name || "")) {
      throw new Error("Insufficient permissions for broadcasts");
    }

    return await db.query.messages.findMany({
      where: eq(messages.senderId, userId),
      with: {
        receiver: {
          columns: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: desc(messages.createdAt),
    });
  }

  async sendBroadcast(data: {
    senderId: string;
    roleTarget?: string; // Send to all users with this role
    tenantTarget?: boolean; // Send to all users in sender's tenant
    message: string;
  }) {
    // Check permissions
    const userRole = await db.query.userRoles.findFirst({
      where: eq(userRoles.userId, data.senderId),
      with: {
        role: true,
      },
    });

    if (!["super_admin", "hospital_admin"].includes(userRole?.role?.name || "")) {
      throw new Error("Insufficient permissions for broadcasts");
    }

    let targetUsers: string[] = [];

    if (data.roleTarget) {
      // Get all users with the target role
      const roleUsers = await db.query.userRoles.findMany({
        where: eq(userRoles.roleId, data.roleTarget),
        with: {
          user: {
            columns: {
              id: true,
            },
          },
        },
      });
      targetUsers = roleUsers.map(ru => ru.user.id);
    } else if (data.tenantTarget) {
      // Get all users in the same tenant
      const sender = await db.query.users.findFirst({
        where: eq(users.id, data.senderId),
        columns: {
          tenantId: true,
        },
      });

      if (sender?.tenantId) {
        const tenantUsers = await db.query.users.findMany({
          where: eq(users.tenantId, sender.tenantId),
          columns: {
            id: true,
          },
        });
        targetUsers = tenantUsers.map(u => u.id);
      }
    }

    // Send message to all target users
    const sentMessages = [];
    for (const receiverId of targetUsers) {
      if (receiverId !== data.senderId) { // Don't send to self
        const msg = await this.sendMessage({
          senderId: data.senderId,
          receiverId,
          message: data.message,
          type: "broadcast",
        });
        sentMessages.push(msg);
      }
    }

    return sentMessages;
  }

  private async checkMessagePermissions(senderId: string, receiverId: string): Promise<boolean> {
    // Get roles
    const [senderRole, receiverRole] = await Promise.all([
      db.query.userRoles.findFirst({
        where: eq(userRoles.userId, senderId),
        with: { role: true },
      }),
      db.query.userRoles.findFirst({
        where: eq(userRoles.userId, receiverId),
        with: { role: true },
      }),
    ]);

    const senderRoleName = senderRole?.role?.name || "patient";
    const receiverRoleName = receiverRole?.role?.name || "patient";

    // Permission matrix
    const permissions: Record<string, string[]> = {
      super_admin: ["hospital_admin"],
      hospital_admin: ["super_admin", "doctor", "nurse", "lab_technician", "pharmacist", "accountant", "receptionist"],
      doctor: ["hospital_admin", "nurse", "lab_technician", "pharmacist", "patient"],
      nurse: ["hospital_admin", "doctor", "lab_technician", "pharmacist"],
      lab_technician: ["hospital_admin", "doctor", "nurse", "pharmacist"],
      pharmacist: ["hospital_admin", "doctor", "nurse", "lab_technician"],
      accountant: ["hospital_admin"],
      receptionist: ["hospital_admin", "doctor"],
      patient: ["doctor"],
      guardian: ["doctor"],
    };

    return permissions[senderRoleName]?.includes(receiverRoleName) || false;
  }

  async getInboxCount(userId: string): Promise<number> {
    const result = await db.$count(
      messages,
      and(
        eq(messages.receiverId, userId),
        eq(messages.read, false)
      )
    );
    return result;
  }
}
