import Link from "next/link";
import { ArrowLeft, ArrowRight, Building2, ShieldCheck } from "lucide-react";
import { TenantRoleLogin } from "./TenantRoleLogin";

type TenantAdminAccessProps = {
  slug: string;
  tenantId?: string | null;
  tenantName: string;
  role?: string | null;
  loginPath: string;
  adminPath: string;
};

/**
 * Admin entry point reached from the Staff/Admins cards on tenant login.
 * Hospital Admin signs in inside the tenant workspace; Super Admin uses the
 * dedicated platform console.
 */
export function TenantAdminAccess({
  slug,
  tenantId,
  tenantName,
  role,
  loginPath,
  adminPath,
}: TenantAdminAccessProps) {
  if (role === "hospital_admin") {
    return (
      <TenantRoleLogin
        slug={slug}
        tenantId={tenantId}
        tenantName={tenantName}
        audience="admin"
        backHref={adminPath}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-subtle p-6">
      <div className="w-full max-w-2xl">
        <Link
          href={loginPath}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to tenant login
        </Link>

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <ShieldCheck className="size-7" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Admin access</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Choose the admin workspace for {tenantName}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href={`${adminPath}?role=hospital_admin`}
            className="group flex flex-col rounded-2xl border border-border bg-card p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
              <Building2 className="size-6" />
            </span>
            <span className="text-base font-bold text-foreground">Hospital Admin</span>
            <span className="mt-1 text-sm text-muted-foreground">
              Manage staff, departments, settings, and operations for this hospital.
            </span>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              Continue
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>

          <Link
            href="/master"
            className="group flex flex-col rounded-2xl border border-border bg-card p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-400/50 hover:shadow-md"
          >
            <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">
              <ShieldCheck className="size-6" />
            </span>
            <span className="text-base font-bold text-foreground">Super Admin</span>
            <span className="mt-1 text-sm text-muted-foreground">
              Platform-wide control across tenants, roles, billing, and system health.
            </span>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 dark:text-orange-300">
              Open console
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
