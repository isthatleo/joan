import { redirect } from "next/navigation";

/**
 * Root route. The actual role-aware dashboard lives under (dashboard)/page.tsx.
 * Unauthenticated users land at /login (the AuthProvider in the dashboard
 * layout will redirect anyway, but this gives a clean default).
 */
export default function RootRedirect() {
  redirect("/login");
}
