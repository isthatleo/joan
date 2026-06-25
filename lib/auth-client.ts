import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL:
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : "https://joan-healthcare-system.vercel.app/",
});
