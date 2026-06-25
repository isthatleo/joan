import { io } from "socket.io-client";

const socketUrl =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  (typeof window === "undefined" ? "https://joan-healthcare-system.vercel.app/" : `${window.location.protocol}//${window.location.hostname}:4000`);

let realtimeUnavailableUntil = 0;
let realtimeProbe: Promise<boolean> | null = null;

export const socket = io(socketUrl, {
  autoConnect: false,
  transports: ["polling", "websocket"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 800,
  reconnectionDelayMax: 3000,
  timeout: 5000,
  auth: {},
});

async function canReachRealtimeServer() {
  if (typeof window === "undefined") return false;
  if (Date.now() < realtimeUnavailableUntil) return false;
  if (realtimeProbe) return realtimeProbe;

  realtimeProbe = (async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 1200);
    try {
      const url = new URL("/socket.io/", socketUrl);
      url.searchParams.set("EIO", "4");
      url.searchParams.set("transport", "polling");
      url.searchParams.set("t", String(Date.now()));
      const response = await fetch(url.toString(), {
        cache: "no-store",
        mode: "cors",
        signal: controller.signal,
      });
      return response.ok;
    } catch {
      realtimeUnavailableUntil = Date.now() + 30_000;
      return false;
    } finally {
      window.clearTimeout(timeout);
      realtimeProbe = null;
    }
  })();

  return realtimeProbe;
}

export async function connectRealtimeSocket(auth?: Record<string, unknown>) {
  if (auth) {
    socket.auth = { ...(socket.auth || {}), ...auth };
  }
  if (socket.connected) return true;
  const reachable = await canReachRealtimeServer();
  if (!reachable) return false;
  socket.connect();
  return true;
}
