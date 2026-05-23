import { createClient } from "redis";

export const redis = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

let redisConnectionPromise: Promise<void> | null = null;

export async function ensureRedisConnection() {
  if (redis.isOpen) return;
  if (!redisConnectionPromise) {
    redisConnectionPromise = redis.connect().catch((error) => {
      redisConnectionPromise = null;
      throw error;
    });
  }
  await redisConnectionPromise;
}
