import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { TenantAdminAccess } from "@/components/auth/TenantAdminAccess";
import { getFreshTenantBySlug } from "@/lib/tenant-cache";

function formatTenantName(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

interface TenantAdminLoginPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ role?: string }>;
}

export default async function TenantAdminLoginPage({
  params,
  searchParams,
}: TenantAdminLoginPageProps) {
  const { slug } = await params;
  const { role } = await searchParams;
  const tenant = await getFreshTenantBySlug(slug);

  if (!tenant || !tenant.isActive || tenant.deletedAt) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-subtle p-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <Building2 className="size-7" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Tenant Not Found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The hospital &quot;{slug}&quot; does not exist or is not currently available.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <ArrowLeft className="size-4" />
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <TenantAdminAccess
      slug={tenant.slug}
      tenantId={tenant.id}
      tenantName={tenant.name || formatTenantName(slug)}
      role={role}
      loginPath={`/tenant-login/${tenant.slug}`}
      adminPath={`/tenant-login/${tenant.slug}/admin`}
    />
  );
}
