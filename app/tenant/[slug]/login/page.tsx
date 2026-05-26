import { TenantRoleLogin } from "@/components/auth/TenantRoleLogin";

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

  return <TenantRoleLogin slug={slug} tenantName={formatTenantName(slug) || "Hospital Login"} />;
}
