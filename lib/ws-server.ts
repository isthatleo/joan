// WebSocket Server - run this separately
import { Server } from "socket.io";
import { createServer } from "http";
import { redis } from "@/lib/redis";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  const { tenantId, departmentId, userId } = socket.handshake.auth;

  if (userId) {
    // Join rooms
    socket.join(`tenant:${tenantId}`);
    socket.join(`department:${departmentId}`);
    socket.join(`user:${userId}`);

    // Track online status
    redis.sadd("online-users", userId);
    io.emit("user-status", { userId, status: "online" });

    console.log(`User ${userId} connected`);

    // Handle typing status
    socket.on("typing", (data) => {
      // data: { receiverId, isTyping }
      io.to(`user:${data.receiverId}`).emit("user-typing", {
        userId,
        isTyping: data.isTyping
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
      redis.srem("online-users", userId);
      io.emit("user-status", { userId, status: "offline" });
      console.log(`User ${userId} disconnected`);
    });
  }
});

// Redis subscriber
const redisSub = redis.duplicate();
redisSub.subscribe("queue-events", (message) => {
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

redisSub.subscribe("notifications", (message) => {
  const { userId, message: msg, payload } = JSON.parse(message);
  io.to(`user:${userId}`).emit("notification", payload || { message: msg });
});

httpServer.listen(4000, () => {
  console.log("WebSocket server running on port 4000");
});
