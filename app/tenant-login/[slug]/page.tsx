import Link from "next/link";
import { Building2 } from "lucide-react";
import { TenantRoleLogin } from "@/components/auth/TenantRoleLogin";
import { getFreshTenantBySlug } from "@/lib/tenant-cache";

interface PublicTenantLoginPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PublicTenantLoginPage({ params }: PublicTenantLoginPageProps) {
  const { slug } = await params;

  const tenant = await getFreshTenantBySlug(slug);

  if (!tenant || !tenant.isActive || tenant.deletedAt) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-subtle p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive shadow-lg">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Tenant Not Found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The hospital "{slug}" does not exist or is not currently available.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return <TenantRoleLogin slug={tenant.slug} tenantId={tenant.id} tenantName={tenant.name} />;
}
