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

  // Join rooms
  socket.join(`tenant:${tenantId}`);
  socket.join(`department:${departmentId}`);
  socket.join(`user:${userId}`);

  console.log(`User ${userId} connected`);

  // Disconnect
  socket.on("disconnect", () => {
    console.log(`User ${userId} disconnected`);
  });
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
  const { userId, message: msg } = JSON.parse(message);
  io.to(`user:${userId}`).emit("notification", { message: msg });
});

httpServer.listen(4000, () => {
  console.log("WebSocket server running on port 4000");
});
