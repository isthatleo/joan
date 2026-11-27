import { TenantService } from "@/lib/services/tenant.service";
import { buildTenantLoginUrl } from "@/lib/tenant-routing";

const tenantService = new TenantService();

type TenantRecord = NonNullable<Awaited<ReturnType<TenantService["getTenantBySlug"]>>>;

export type DefaultTenantSignIn = {
  slug: string;
  name: string;
  loginUrl: string;
};

/**
 * Resolves the workspace a public "Sign in" action should open.
 *
 * Priority:
 * 1. preferredSlug (the tenant subdomain, when /login is opened on one)
 * 2. NEXT_PUBLIC_DEFAULT_TENANT_SLUG (read-only; no env file is written)
 * 3. The most recently created active, non-deleted tenant
 *
 * The origin override lets route handlers build a tenant URL from the current
 * request host, which keeps localhost and preview deployments working.
 */
export async function getDefaultTenantForSignIn(
  originOverride?: string,
  preferredSlug?: string | null
): Promise<DefaultTenantSignIn | null> {
  const configuredSlug = process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG?.trim().toLowerCase();
  const slugToTry = preferredSlug?.trim().toLowerCase() || configuredSlug || null;

  let tenant: TenantRecord | null = null;
  if (slugToTry) {
    tenant = (await tenantService.getTenantBySlug(slugToTry)) ?? null;
  }

  if (!tenant || !tenant.isActive || tenant.deletedAt) {
    const [activeTenant] = await tenantService.getAllTenants({ status: true, limit: 1 });
    tenant = activeTenant ?? null;
  }

  if (!tenant || !tenant.isActive || tenant.deletedAt) {
    return null;
  }

  return {
    slug: tenant.slug,
    name: tenant.name || tenant.slug,
    loginUrl: buildTenantLoginUrl(tenant.slug, undefined, originOverride),
  };
}
