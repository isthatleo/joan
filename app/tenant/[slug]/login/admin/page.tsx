import { TenantAdminAccess } from "@/components/auth/TenantAdminAccess";
import { TenantNotFoundRedirect } from "../../not-found-redirect";
import { getFreshTenantBySlug } from "@/lib/tenant-cache";

interface TenantAdminLoginPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ role?: string }>;
}

function formatTenantName(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function TenantAdminLoginPage({
  params,
  searchParams,
}: TenantAdminLoginPageProps) {
  const { slug } = await params;
  const { role } = await searchParams;
  const tenant = await getFreshTenantBySlug(slug);

  if (!tenant || tenant.isActive === false || tenant.deletedAt) {
    return <TenantNotFoundRedirect slug={slug} />;
  }

  return (
    <TenantAdminAccess
      slug={tenant.slug}
      tenantId={tenant.id}
      tenantName={tenant.name || formatTenantName(slug) || "Hospital Login"}
      role={role}
      loginPath="/login"
      adminPath="/login/admin"
    />
  );
}
