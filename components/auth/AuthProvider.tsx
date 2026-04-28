"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useAuthStore } from "@/stores/auth";
import { PUBLIC_ROUTES, ROLE_HOME, type AppRole } from "@/lib/rbac";

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

/**
 * Fetches the user's profile data including avatar
 */
async function fetchUserProfile(userId: string) {
  try {
    const res = await fetch(`/api/users/profile?userId=${userId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data;
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
        const profile = await fetchUserProfile(u.id);
        if (cancelled) return;
        setUser({
          id: u.id,
          email: u.email,
          fullName: u.name || u.email,
          role: (role || undefined) as any,
          avatar: profile?.avatar || null,
        });
        setLoading(false);

        // If user has no role yet → onboarding/signup; otherwise hop off public pages
        if (PUBLIC_ROUTES.includes(pathname)) {
          router.push(role ? (ROLE_HOME[role as AppRole] ?? "/") : "/");
        }
      } else {
        if (cancelled) return;
        // Re-confirm with the server before logging out — useSession's local
        // cache can momentarily report null right after a navigation while
        // the cookie-backed session is still being hydrated.
        try {
          const res = await fetch("/api/auth/get-session", { credentials: "include" });
          if (cancelled) return;
          if (res.ok) {
            const data = await res.json().catch(() => null);
            if (data?.user) {
              const role = await fetchRole(data.user.email, data.user.id);
              const profile = await fetchUserProfile(data.user.id);
              if (cancelled) return;
              setUser({
                id: data.user.id,
                email: data.user.email,
                fullName: data.user.name || data.user.email,
                role: (role || undefined) as any,
                avatar: profile?.avatar || null,
              });
              setLoading(false);
              if (PUBLIC_ROUTES.includes(pathname)) {
                router.push(role ? (ROLE_HOME[role as AppRole] ?? "/") : "/");
              }
              return;
            }
          }
        } catch {}
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
