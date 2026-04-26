"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useAuthStore } from "@/stores/auth";
import { PUBLIC_ROUTES, type AppRole } from "@/lib/rbac";

/**
 * Resolves the current user's role from our Drizzle/Neon role tables.
 * Better Auth manages the user/session; our existing /api/auth/role
 * endpoint maps email → app role.
 */
async function fetchRole(email: string, userId: string) {
  try {
    const res = await fetch("/api/auth/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, userId }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.role as AppRole) || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  // Better Auth session hook
  const session = authClient.useSession();

  useEffect(() => {
    let cancelled = false;

    async function syncSession() {
      // Better Auth: still loading
      if (session.isPending) {
        setLoading(true);
        return;
      }

      const sessionData: any = session.data;
      const u = sessionData?.user;

      if (u) {
        const role = await fetchRole(u.email, u.id);
        if (cancelled) return;
        setUser({
          id: u.id,
          email: u.email,
          fullName: u.name || u.email,
          role: (role || undefined) as any,
        });
        setLoading(false);

        // If user has no role yet → onboarding/signup; otherwise hop off public pages
        if (PUBLIC_ROUTES.includes(pathname)) {
          router.push("/");
        }
      } else {
        if (cancelled) return;
        logout();
        if (!PUBLIC_ROUTES.includes(pathname)) {
          router.push("/login");
        }
      }
    }

    syncSession();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.data, session.isPending, pathname]);

  return <>{children}</>;
}
