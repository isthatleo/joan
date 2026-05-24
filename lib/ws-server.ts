// WebSocket Server - run this separately
import { Server } from "socket.io";
import { createServer } from "http";
import { ensureRedisConnection, redis } from "@/lib/redis";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: "*" },
});
const activeSocketCounts = new Map<string, number>();

io.on("connection", (socket) => {
  const { tenantId, departmentId, userId } = socket.handshake.auth;

  if (userId) {
    // Join rooms
    if (tenantId) {
      socket.join(`tenant:${tenantId}`);
    }
    if (departmentId) {
      socket.join(`department:${departmentId}`);
    }
    socket.join(`user:${userId}`);

    // Track online status
    const currentCount = activeSocketCounts.get(userId) || 0;
    activeSocketCounts.set(userId, currentCount + 1);
    if (currentCount === 0) {
      io.emit("user-status", { userId, status: "online" });
    }
    socket.emit("presence:snapshot", { onlineUserIds: Array.from(activeSocketCounts.keys()) });

    console.log(`User ${userId} connected`);

    // Handle typing status
    socket.on("typing", (data) => {
      // data: { receiverId, isTyping }
      io.to(`user:${data.receiverId}`).emit("user-typing", {
        userId,
        isTyping: data.isTyping
      });
    });

    socket.on("message:new", (data) => {
      io.to(`user:${data.receiverId}`).emit("message:new", {
        senderId: userId,
        message: data.message,
      });
    });

    socket.on("message:read", (data) => {
      io.to(`user:${data.receiverId}`).emit("message:read", {
        readerId: userId,
        conversationUserId: data.conversationUserId,
        messageIds: data.messageIds || [],
      });
    });

    socket.on("call:start", (data) => {
      io.to(`user:${data.receiverId}`).emit("call:incoming", {
        callerId: userId,
        callType: data.callType,
      });
    });

    socket.on("call:offer", (data) => {
      io.to(`user:${data.receiverId}`).emit("call:offer", {
        callerId: userId,
        offer: data.offer,
        callType: data.callType,
      });
    });

    socket.on("call:answer", (data) => {
      io.to(`user:${data.receiverId}`).emit("call:answer", {
        answer: data.answer,
        receiverId: userId,
      });
    });

    socket.on("call:ice-candidate", (data) => {
      io.to(`user:${data.receiverId}`).emit("call:ice-candidate", {
        candidate: data.candidate,
        senderId: userId,
      });
    });

    socket.on("call:reject", (data) => {
      io.to(`user:${data.receiverId}`).emit("call:reject", {
        receiverId: userId,
      });
    });

    socket.on("call:end", (data) => {
      io.to(`user:${data.receiverId}`).emit("call:end", {
        senderId: userId,
      });
    });

    // Disconnect
    socket.on("disconnect", () => {
      const remainingCount = Math.max((activeSocketCounts.get(userId) || 1) - 1, 0);
      if (remainingCount === 0) {
        activeSocketCounts.delete(userId);
        io.emit("user-status", { userId, status: "offline" });
      } else {
        activeSocketCounts.set(userId, remainingCount);
      }
      console.log(`User ${userId} disconnected`);
    });
  }
});

// Redis subscriber
const redisSub = redis.duplicate();
void (async () => {
  try {
    await ensureRedisConnection();
    if (!redisSub.isOpen) {
      await redisSub.connect();
    }

    await redisSub.subscribe("queue-events", (message) => {
      const { type, payload } = JSON.parse(message);

      switch (type) {
        case "queue.updated":
          io.to(`tenant:${payload.tenantId}`).emit(type, payload);
          break;

        case "queue.called":
          io.to(`department:${payload.departmentId}`).emit(type, payload);
          break;

        case "notification":
          io.to(`user:${payload.userId}`).emit("notification", payload);
          break;
      }
    });

    await redisSub.subscribe("notifications", (message) => {
      const payload = JSON.parse(message);
      io.to(`user:${payload.userId}`).emit("notification", payload);
    });
  } catch (error) {
    console.error("Failed to initialize Redis subscriptions for realtime messaging:", error);
  }
})();

httpServer.listen(4000, () => {
  console.log("WebSocket server running on port 4000");
});
