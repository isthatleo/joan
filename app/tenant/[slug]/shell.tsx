"use client";

import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { normalizeTenantModules, getModuleKeyForPath, isTenantModuleEnabled } from "@/lib/tenant-modules";
import { getTenantSettingsSyncEventName } from "@/lib/hospital-settings-sync";
import { applyTenantPreferences } from "@/lib/tenant-preferences";
import { getTenantLoginPath, isTenantLoginPath, withTenantPrefix } from "@/lib/tenant-routing";
import { useAuthStore } from "@/stores/auth";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  plan: string;
  logoUrl: string | null;
}

function PersistTenantContext({ tenant }: { tenant: TenantInfo }) {
  useEffect(() => {
    try {
      document.cookie = `x-tenant-slug=${tenant.slug}; path=/; SameSite=Lax`;
      sessionStorage.setItem("active_tenant_slug", tenant.slug);
      sessionStorage.setItem("active_tenant_id", tenant.id);
      sessionStorage.setItem("active_tenant_name", tenant.name);

      if (tenant.logoUrl) {
        sessionStorage.setItem("active_tenant_logo", tenant.logoUrl);
      } else {
        sessionStorage.removeItem("active_tenant_logo");
      }

      fetch(`/api/tenants/${tenant.slug}/settings`, {
        credentials: "include",
        cache: "no-store",
      })
        .then(async (response) => {
          if (!response.ok) return null;
          return response.json();
        })
        .then((data) => {
          if (data?.modules) {
            sessionStorage.setItem("active_tenant_modules", JSON.stringify(normalizeTenantModules(data.modules)));
          }
          if (data?.preferences) {
            sessionStorage.setItem("active_tenant_preferences", JSON.stringify(data.preferences));
            applyTenantPreferences(data.preferences);
          }
        })
        .catch(() => {});
    } catch {}
  }, [tenant.id, tenant.logoUrl, tenant.name, tenant.slug]);

  return null;
}

function AuthenticatedShell({
  tenant,
  children,
}: {
  tenant: TenantInfo;
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuthStore();
  const pathname = usePathname();
  const dashboardHref = user
    ? `/${user.role === "hospital_admin" ? "admin" : user.role === "lab_technician" ? "lab" : user.role === "pharmacist" ? "pharmacy" : user.role === "receptionist" ? "reception" : user.role}`
    : null;

  useEffect(() => {
    if (typeof window === "undefined" || !dashboardHref) return;

    const checkModuleAccess = () => {
      try {
        const raw = sessionStorage.getItem("active_tenant_modules");
        if (!raw) return;
        const modules = normalizeTenantModules(JSON.parse(raw));
        const moduleKey = getModuleKeyForPath(pathname);
        if (moduleKey && !isTenantModuleEnabled(modules, moduleKey) && pathname !== dashboardHref) {
          window.location.replace(dashboardHref);
        }
      } catch {}
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== "active_tenant_modules" && !event.key.startsWith("hospital_settings_")) return;
      checkModuleAccess();
    };

    checkModuleAccess();
    window.addEventListener(getTenantSettingsSyncEventName(), checkModuleAccess as EventListener);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(getTenantSettingsSyncEventName(), checkModuleAccess as EventListener);
      window.removeEventListener("storage", handleStorage);
    };
  }, [dashboardHref, pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const applyStoredPreferences = () => {
      try {
        const raw = sessionStorage.getItem("active_tenant_preferences");
        if (!raw) return;
        applyTenantPreferences(JSON.parse(raw));
      } catch {}
    };

    const refreshPreferences = async () => {
      try {
        const response = await fetch(`/api/tenants/${tenant.slug}/settings`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = await response.json().catch(() => null);
        if (data?.preferences) {
          sessionStorage.setItem("active_tenant_preferences", JSON.stringify(data.preferences));
          applyTenantPreferences(data.preferences);
        }
      } catch {}
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== "active_tenant_preferences" && !event.key.startsWith("hospital_settings_")) return;
      applyStoredPreferences();
    };

    const handleTenantSettingsEvent = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.preferences) {
        try {
          sessionStorage.setItem("active_tenant_preferences", JSON.stringify(detail.preferences));
        } catch {}
      }
      applyStoredPreferences();
    };

    applyStoredPreferences();
    const interval = window.setInterval(() => {
      void refreshPreferences();
    }, 10000);
    window.addEventListener("storage", handleStorage);
    window.addEventListener(getTenantSettingsSyncEventName(), handleTenantSettingsEvent as EventListener);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(getTenantSettingsSyncEventName(), handleTenantSettingsEvent as EventListener);
    };
  }, [tenant.slug]);

  useEffect(() => {
    if (!user || typeof window === "undefined" || isTenantLoginPath(pathname) || pathname.includes("/verify-2fa")) {
      return;
    }

    let timeoutId: number | null = null;
    let cancelled = false;

    const resetTimer = async () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      try {
        const response = await fetch(`/api/tenant/${tenant.slug}/security/session`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || cancelled) return;

        if (data?.twoFactorRequired && !data?.twoFactorVerified) {
          const verifyPath = withTenantPrefix("/verify-2fa", tenant.slug, window.location.hostname);
          window.location.replace(`${verifyPath}?redirect=${encodeURIComponent(pathname)}`);
          return;
        }

        const timeoutMinutes = Number(data?.sessionTimeout || 60);
        timeoutId = window.setTimeout(async () => {
          await authClient.signOut().catch(() => null);
          window.location.replace(getTenantLoginPath(tenant.slug, window.location.hostname));
        }, timeoutMinutes * 60 * 1000);
      } catch {}
    };

    const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    void resetTimer();
    activityEvents.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }));

    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, [pathname, tenant.slug, user]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-subtle">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
          Loading {tenant.name}...
        </div>
      </div>
    );
  }

  if (!user) {
    if (typeof window !== "undefined") {
      window.location.href = getTenantLoginPath(tenant.slug, window.location.hostname);
    }
    return null;
  }

  return (
    <div className="flex h-screen bg-subtle text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin">{children}</main>
      </div>
    </div>
  );
}

function TenantShellRouter({
  tenant,
  children,
}: {
  tenant: TenantInfo;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginRoute = isTenantLoginPath(pathname);

  if (isLoginRoute) {
    return <>{children}</>;
  }

  return (
    <AuthProvider>
      <AuthenticatedShell tenant={tenant}>{children}</AuthenticatedShell>
    </AuthProvider>
  );
}

export function TenantDashboardShell({
  tenant,
  children,
}: {
  tenant: TenantInfo;
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <PersistTenantContext tenant={tenant} />
      <TenantShellRouter tenant={tenant}>{children}</TenantShellRouter>
    </ThemeProvider>
  );
}
