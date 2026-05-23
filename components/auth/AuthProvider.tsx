"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { getResolvedTenantLoginPath, getTenantDashboardPath, isTenantLoginPath, resolveTenantSlug } from "@/lib/tenant-routing";
import { useAuthStore } from "@/stores/auth";
import { PUBLIC_ROUTES, ROLE_HOME, type AppRole } from "@/lib/rbac";
import { applyUserPreferences } from "@/lib/user-preferences";

type RoleLookup = {
  role: AppRole | null;
  tenantId: string | null;
  userId: string | null;
};

async function fetchRole(email: string, userId: string, tenantSlug?: string | null): Promise<RoleLookup> {
  try {
    const res = await fetch("/api/auth/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, userId, tenantSlug }),
    });
    if (!res.ok) return { role: null, tenantId: null, userId: null };
    const data = await res.json();
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
    const res = await fetch(`/api/users/profile?userId=${userId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchUserSettings() {
  try {
    const res = await fetch("/api/users/settings");
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function shouldRedirectAuthenticatedUser(pathname: string, role: AppRole | null | undefined) {
  if (!role || role === "super_admin" || role === "hospital_admin") {
    return false;
  }

  if (pathname === "/") {
    return true;
  }

  return /^\/tenant\/[^/]+\/?$/.test(pathname);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const isPublicAuthRoute = PUBLIC_ROUTES.includes(pathname) || isTenantLoginPath(pathname);
  const session = authClient.useSession();

  function getPostLoginPath(role: AppRole | null | undefined) {
    if (!role) return "/";
    const hostname = typeof window !== "undefined" ? window.location.hostname : null;
    const storedSlug = typeof window !== "undefined" ? sessionStorage.getItem("active_tenant_slug") : null;
    const resolvedSlug = resolveTenantSlug(pathname, hostname, storedSlug);
    return resolvedSlug ? getTenantDashboardPath(resolvedSlug, role, hostname) : (ROLE_HOME[role] ?? "/");
  }

  useEffect(() => {
    let cancelled = false;

    async function syncSession() {
      if (session.isPending) {
        setLoading(true);
        return;
      }

      const sessionData: any = session.data;
      const activeUser = sessionData?.user;
      const hostname = typeof window !== "undefined" ? window.location.hostname : null;
      const storedSlug = typeof window !== "undefined" ? sessionStorage.getItem("active_tenant_slug") : null;
      const tenantSlug = resolveTenantSlug(pathname, hostname, storedSlug);

      if (activeUser) {
        const roleData = await fetchRole(activeUser.email, activeUser.id, tenantSlug);
        const appUserId = roleData.userId || activeUser.id;
        const [profile, settings] = await Promise.all([
          fetchUserProfile(appUserId),
          fetchUserSettings(),
        ]);
        if (cancelled) return;
        applyUserPreferences(settings);
        setUser({
          id: appUserId,
          email: activeUser.email,
          fullName: activeUser.name || profile?.fullName || activeUser.email,
          role: (roleData.role || undefined) as any,
          tenantId: roleData.tenantId || undefined,
          hospitalId: roleData.tenantId || undefined,
          avatar: profile?.avatar || null,
        });
        setLoading(false);

        if (isPublicAuthRoute) {
          router.replace(getPostLoginPath(roleData.role));
          return;
        }

        if (shouldRedirectAuthenticatedUser(pathname, roleData.role)) {
          router.replace(getPostLoginPath(roleData.role));
        }
        return;
      }

      if (cancelled) return;

      try {
        const res = await fetch("/api/auth/get-session", { credentials: "include" });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.user) {
            const roleData = await fetchRole(data.user.email, data.user.id, tenantSlug);
            const appUserId = roleData.userId || data.user.id;
            const [profile, settings] = await Promise.all([
              fetchUserProfile(appUserId),
              fetchUserSettings(),
            ]);
            if (cancelled) return;
            applyUserPreferences(settings);
            setUser({
              id: appUserId,
              email: data.user.email,
              fullName: data.user.name || profile?.fullName || data.user.email,
              role: (roleData.role || undefined) as any,
              tenantId: roleData.tenantId || undefined,
              hospitalId: roleData.tenantId || undefined,
              avatar: profile?.avatar || null,
            });
            setLoading(false);
            if (isPublicAuthRoute) {
              router.replace(getPostLoginPath(roleData.role));
              return;
            }
            if (shouldRedirectAuthenticatedUser(pathname, roleData.role)) {
              router.replace(getPostLoginPath(roleData.role));
            }
            return;
          }
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
  }, [session.data, session.isPending, pathname, isPublicAuthRoute, logout, router, setLoading, setUser]);

  return <>{children}</>;
}
