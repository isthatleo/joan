import { TenantDashboardShell } from "./shell";
import { TenantNotFoundRedirect } from "./not-found-redirect";
import { getCachedTenantBySlug } from "@/lib/tenant-cache";
import { headers } from "next/headers";
import { getTenantSecuritySettings, isIpAllowed, normalizeClientIp } from "@/lib/tenant-security";

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const { slug } = await params;

  let tenant;
  try {
    tenant = await getCachedTenantBySlug(slug);
  } catch (error) {
    console.error("Database query failed for tenant slug:", slug, error);
    // Treat database errors as if the tenant was not found
    return <TenantNotFoundRedirect slug={slug} />;
  }

  // If tenant doesn't exist or is inactive, redirect to public login with error
  if (!tenant || !tenant.isActive) {
    return <TenantNotFoundRedirect slug={slug} />;
  }

  const tenantSecurity = await getTenantSecuritySettings(tenant.id).catch(() => null);
  if (tenantSecurity?.ipWhitelistEnabled) {
    const headerList = await headers();
    const clientIp = normalizeClientIp(
      headerList.get("x-forwarded-for") ||
      headerList.get("x-real-ip") ||
      headerList.get("cf-connecting-ip")
    );

    if (!isIpAllowed(clientIp, tenantSecurity.ipWhitelist)) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-subtle p-6">
          <div className="w-full max-w-lg rounded-xl border border-red-200 bg-background p-8 shadow-sm">
            <h1 className="text-xl font-semibold text-foreground">Access Restricted</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This tenant only allows access from approved network locations.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              If this is expected, contact your hospital administrator to update the tenant IP allowlist.
            </p>
          </div>
        </div>
      );
    }
  }

  return (
    <TenantDashboardShell
      tenant={{
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        logoUrl: tenant.logoUrl ?? null,
      }}
    >
      {children}
    </TenantDashboardShell>
  );
}
