"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  getResolvedTenantLoginPath,
  getTenantDashboardPath,
  isTenantLoginPath,
  resolveTenantSlug,
} from "@/lib/tenant-routing";
import { applyUserPreferences } from "@/lib/user-preferences";
import { PUBLIC_ROUTES, ROLE_HOME, type AppRole } from "@/lib/rbac";
import { useAuthStore } from "@/stores/auth";

type RoleLookup = {
  role: AppRole | null;
  tenantId: string | null;
  userId: string | null;
};

type CachedBootstrap = {
  email: string;
  tenantSlug: string | null;
  user: {
    id: string;
    email: string;
    fullName: string;
    role?: AppRole;
    tenantId?: string;
    hospitalId?: string;
    avatar?: string | null;
  };
  settings: any | null;
};

const AUTH_BOOTSTRAP_CACHE_KEY = "auth_bootstrap_cache";

async function fetchRole(email: string, userId: string, tenantSlug?: string | null): Promise<RoleLookup> {
  try {
    const response = await fetch("/api/auth/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, userId, tenantSlug }),
    });

    if (!response.ok) {
      return { role: null, tenantId: null, userId: null };
    }

    const data = await response.json();

    return {
      role: (data.role as AppRole) || null,
      tenantId: (data.tenantId as string | null | undefined) ?? null,
      userId: (data.userId as string | null | undefined) ?? null,
    };
  } catch {
    return { role: null, tenantId: null, userId: null };
  }
}

async function fetchUserProfile(userId: string) {
  try {
    const response = await fetch(`/api/users/profile?userId=${userId}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

async function fetchUserSettings() {
  try {
    const response = await fetch("/api/users/settings", {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

function shouldRedirectAuthenticatedUser(pathname: string, role: AppRole | null | undefined) {
  if (!role || role === "super_admin") {
    return false;
  }

  if (pathname === "/") {
    return true;
  }

  return /^\/tenant\/[^/]+\/?$/.test(pathname);
}

function readBootstrapCache(email: string, tenantSlug: string | null) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(AUTH_BOOTSTRAP_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const cached = JSON.parse(raw) as CachedBootstrap;
    if (cached.email !== email || cached.tenantSlug !== tenantSlug) {
      return null;
    }

    return cached;
  } catch {
    return null;
  }
}

function writeBootstrapCache(value: CachedBootstrap) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.setItem(AUTH_BOOTSTRAP_CACHE_KEY, JSON.stringify(value));
  } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: currentUser, setUser, setLoading, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const session = authClient.useSession();
  const isPublicAuthRoute = PUBLIC_ROUTES.includes(pathname) || isTenantLoginPath(pathname);
  const hydratedSessionKeyRef = useRef<string | null>(null);

  function getPostLoginPath(role: AppRole | null | undefined) {
    if (!role) {
      return "/";
    }

    const hostname = typeof window !== "undefined" ? window.location.hostname : null;
    const storedSlug = typeof window !== "undefined" ? sessionStorage.getItem("active_tenant_slug") : null;
    const resolvedSlug = resolveTenantSlug(pathname, hostname, storedSlug);

    if (resolvedSlug && role === "hospital_admin") {
      return getTenantDashboardPath(resolvedSlug, "hospital_admin", hostname);
    }

    return resolvedSlug ? getTenantDashboardPath(resolvedSlug, role, hostname) : (ROLE_HOME[role] ?? "/");
  }

  useEffect(() => {
    let cancelled = false;

    async function hydrateAuthenticatedUser(activeUser: any, tenantSlug: string | null) {
      const cached = readBootstrapCache(activeUser.email, tenantSlug);

      if (cached) {
        applyUserPreferences(cached.settings);
        setUser(cached.user);
        setLoading(false);
      }

      const roleData = await fetchRole(activeUser.email, activeUser.id, tenantSlug);
      if (cancelled) {
        return;
      }

      const appUserId = roleData.userId || activeUser.id;
      const basicUser = {
        id: appUserId,
        email: activeUser.email,
        fullName: activeUser.name || cached?.user.fullName || activeUser.email,
        role: (roleData.role || cached?.user.role || undefined) as any,
        tenantId: roleData.tenantId || cached?.user.tenantId || undefined,
        hospitalId: roleData.tenantId || cached?.user.hospitalId || undefined,
        avatar: cached?.user.avatar || null,
      };

      setUser(basicUser);
      setLoading(false);

      const [profile, settings] = await Promise.all([fetchUserProfile(appUserId), fetchUserSettings()]);
      if (cancelled) {
        return;
      }

      applyUserPreferences(settings);

      const enrichedUser = {
        ...basicUser,
        fullName: activeUser.name || profile?.fullName || basicUser.fullName,
        avatar: profile?.avatar || basicUser.avatar || null,
      };

      setUser(enrichedUser);
      writeBootstrapCache({
        email: activeUser.email,
        tenantSlug,
        user: enrichedUser,
        settings,
      });

      if (isPublicAuthRoute) {
        router.replace(getPostLoginPath(roleData.role || basicUser.role));
        return;
      }

      if (shouldRedirectAuthenticatedUser(pathname, roleData.role || basicUser.role)) {
        router.replace(getPostLoginPath(roleData.role || basicUser.role));
      }
    }

    async function syncSession() {
      if (session.isPending) {
        setLoading(true);
        return;
      }

      const hostname = typeof window !== "undefined" ? window.location.hostname : null;
      const storedSlug = typeof window !== "undefined" ? sessionStorage.getItem("active_tenant_slug") : null;
      const tenantSlug = resolveTenantSlug(pathname, hostname, storedSlug);
      const sessionData: any = session.data;
      const activeUser = sessionData?.user;
      const activeSessionKey = activeUser ? `${activeUser.email}:${tenantSlug || ""}` : null;

      if (activeUser) {
        if (hydratedSessionKeyRef.current === activeSessionKey && currentUser?.email === activeUser.email) {
          setLoading(false);

          if (isPublicAuthRoute && currentUser?.role) {
            router.replace(getPostLoginPath(currentUser.role));
            return;
          }

          if (shouldRedirectAuthenticatedUser(pathname, currentUser?.role)) {
            router.replace(getPostLoginPath(currentUser?.role));
          }

          return;
        }

        await hydrateAuthenticatedUser(activeUser, tenantSlug);
        hydratedSessionKeyRef.current = activeSessionKey;
        return;
      }

      if (cancelled) {
        return;
      }

      hydratedSessionKeyRef.current = null;

      if (isPublicAuthRoute) {
        logout();
        return;
      }

      try {
        const response = await fetch("/api/auth/get-session", {
          credentials: "include",
          cache: "no-store",
        });

        if (cancelled || !response.ok) {
          throw new Error("No active session");
        }

        const data = await response.json().catch(() => null);
        if (data?.user) {
          await hydrateAuthenticatedUser(data.user, tenantSlug);
          hydratedSessionKeyRef.current = `${data.user.email}:${tenantSlug || ""}`;
          return;
        }
      } catch {}

      logout();

      if (!isPublicAuthRoute) {
        router.push(getResolvedTenantLoginPath(pathname, hostname, storedSlug));
      }
    }

    syncSession();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.email, currentUser?.role, isPublicAuthRoute, logout, pathname, router, session.data, session.isPending, setLoading, setUser]);

  return <>{children}</>;
}
