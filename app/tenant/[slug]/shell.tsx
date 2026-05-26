"use client";

import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { getTenantLoginPath, isTenantLoginPath } from "@/lib/tenant-routing";
import { useAuthStore } from "@/stores/auth";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

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
      }
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
