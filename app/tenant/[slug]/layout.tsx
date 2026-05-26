import { TenantDashboardShell } from "./shell";
import { TenantNotFoundRedirect } from "./not-found-redirect";
import { getCachedTenantBySlug } from "@/lib/tenant-cache";

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
