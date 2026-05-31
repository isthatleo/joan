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
  user?: CachedBootstrap["user"] | null;
  settings?: any | null;
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
const DEVICE_FINGERPRINT_CACHE_KEY = "device_fingerprint_cache";

async function fetchRole(email: string, userId: string, tenantSlug?: string | null, requestedRole?: AppRole | null): Promise<RoleLookup> {
  try {
    const response = await fetch("/api/auth/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, userId, tenantSlug, requestedRole }),
    });

    if (!response.ok) {
      return { role: null, tenantId: null, userId: null };
    }

    const data = await response.json();

    return {
      role: (data.role as AppRole) || null,
      tenantId: (data.tenantId as string | null | undefined) ?? null,
      userId: (data.userId as string | null | undefined) ?? null,
      user: data.user || null,
      settings: data.settings || null,
    };
  } catch {
    return { role: null, tenantId: null, userId: null };
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

function getDeviceMetadata() {
  if (typeof window === "undefined") {
    return { screenResolution: "unknown", language: "unknown", timezone: "UTC" };
  }

  return {
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language || "unknown",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  };
}

async function registerDeviceFingerprint(user: CachedBootstrap["user"]) {
  if (typeof window === "undefined" || !user?.id) return;

  const cacheKey = `${user.id}:${user.tenantId || "platform"}`;
  try {
    const cached = JSON.parse(sessionStorage.getItem(DEVICE_FINGERPRINT_CACHE_KEY) || "null");
    if (cached?.cacheKey === cacheKey && cached?.fingerprintId) {
      return;
    }
  } catch {}

  try {
    const fingerprintResponse = await fetch("/api/fingerprinting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        userId: user.id,
        tenantId: user.tenantId || null,
        ...getDeviceMetadata(),
      }),
    });
    const fingerprintPayload = await fingerprintResponse.json().catch(() => null);
    if (!fingerprintResponse.ok || !fingerprintPayload?.fingerprintId) return;

    sessionStorage.setItem(
      DEVICE_FINGERPRINT_CACHE_KEY,
      JSON.stringify({
        cacheKey,
        fingerprintId: fingerprintPayload.fingerprintId,
        isNewDevice: Boolean(fingerprintPayload.isNewDevice),
        recordedAt: new Date().toISOString(),
      })
    );

    if (user.tenantId) {
      await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: user.id,
          tenantId: user.tenantId,
          deviceFingerprintId: fingerprintPayload.fingerprintId,
        }),
      }).catch(() => null);
    }
  } catch {
    // Fingerprinting must never block dashboard rendering.
  }
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
    let pendingSessionTimeout: number | null = null;

    async function hydrateAuthenticatedUser(activeUser: any, tenantSlug: string | null) {
      const requestedRole: AppRole | null = /^\/(?:tenant\/[^/]+\/)?admin(?:\/|$)/.test(pathname) ? "hospital_admin" : null;
      const cached = readBootstrapCache(activeUser.email, tenantSlug);

      if (cached && (!requestedRole || cached.user.role === requestedRole)) {
        applyUserPreferences(cached.settings);
        setUser(cached.user);
        setLoading(false);
        void registerDeviceFingerprint(cached.user);
      }

      const roleData = await fetchRole(activeUser.email, activeUser.id, tenantSlug, requestedRole);
      if (cancelled) {
        return;
      }

      const appUserId = roleData.userId || activeUser.id;
      const basicUser = roleData.user || {
        id: appUserId,
        email: activeUser.email,
        fullName: activeUser.name || cached?.user.fullName || activeUser.email,
        role: (roleData.role || cached?.user.role || undefined) as any,
        tenantId: roleData.tenantId || cached?.user.tenantId || undefined,
        hospitalId: roleData.tenantId || cached?.user.hospitalId || undefined,
        avatar: cached?.user.avatar || null,
      };
      const settings = roleData.settings ?? cached?.settings ?? null;

      applyUserPreferences(settings);
      setUser(basicUser);
      setLoading(false);
      void registerDeviceFingerprint(basicUser);

      writeBootstrapCache({
        email: activeUser.email,
        tenantSlug,
        user: basicUser,
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
        pendingSessionTimeout = window.setTimeout(async () => {
          if (cancelled) return;

          try {
            const controller = new AbortController();
            const timeout = window.setTimeout(() => controller.abort(), 3_000);
            const response = await fetch("/api/auth/get-session", {
              credentials: "include",
              cache: "no-store",
              signal: controller.signal,
            });
            window.clearTimeout(timeout);

            const hostname = typeof window !== "undefined" ? window.location.hostname : null;
            const storedSlug = typeof window !== "undefined" ? sessionStorage.getItem("active_tenant_slug") : null;
            const tenantSlug = resolveTenantSlug(pathname, hostname, storedSlug);
            const data = response.ok ? await response.json().catch(() => null) : null;

            if (cancelled) return;

            if (data?.user) {
              await hydrateAuthenticatedUser(data.user, tenantSlug);
              hydratedSessionKeyRef.current = `${data.user.email}:${tenantSlug || ""}`;
              return;
            }

            logout();
            if (!isPublicAuthRoute) {
              router.replace(getResolvedTenantLoginPath(pathname, hostname, storedSlug));
            }
          } catch {
            if (cancelled) return;
            const hostname = typeof window !== "undefined" ? window.location.hostname : null;
            const storedSlug = typeof window !== "undefined" ? sessionStorage.getItem("active_tenant_slug") : null;
            logout();
            if (!isPublicAuthRoute) {
              router.replace(getResolvedTenantLoginPath(pathname, hostname, storedSlug));
            }
          }
        }, 5_000);
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
      if (pendingSessionTimeout) {
        window.clearTimeout(pendingSessionTimeout);
      }
    };
  }, [currentUser?.email, currentUser?.role, isPublicAuthRoute, logout, pathname, router, session.data, session.isPending, setLoading, setUser]);

  return <>{children}</>;
}
