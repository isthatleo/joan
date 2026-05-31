import { TenantRoleLogin } from "@/components/auth/TenantRoleLogin";
import { TenantNotFoundRedirect } from "../not-found-redirect";
import { getFreshTenantBySlug } from "@/lib/tenant-cache";

function formatTenantName(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

interface TenantLoginPageProps {
  params: Promise<{ slug: string }>;
}

export default async function TenantLoginPage({ params }: TenantLoginPageProps) {
  const { slug } = await params;
  const tenant = await getFreshTenantBySlug(slug);
  if (!tenant || tenant.isActive === false || tenant.deletedAt) {
    return <TenantNotFoundRedirect slug={slug} />;
  }

  return <TenantRoleLogin slug={tenant.slug} tenantId={tenant.id} tenantName={tenant.name || formatTenantName(slug) || "Hospital Login"} />;
}
