import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL:
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : "https://joanhealth.tech/",
});
