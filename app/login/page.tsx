import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Building2, Mail, ShieldCheck } from "lucide-react";
import { getDefaultTenantForSignIn } from "@/lib/default-tenant";
import { getTenantSubdomain } from "@/lib/tenant-routing";

export const dynamic = "force-dynamic";

/**
 * The former global role grid is intentionally gone. Visiting /login now
 * sends staff and hospital users to their tenant workspace login, where
 * the role selector and Staff/Admins entry cards live.
 */
export default async function LoginPage() {
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host")?.split(",")[0]?.trim() || headerList.get("host");
  const hostname = host?.split(":")[0].toLowerCase() || null;
  const protocol =
    headerList.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (hostname?.includes("localhost") ? "http" : "https");
  const origin = host ? `${protocol}://${host}` : undefined;
  const subdomain = getTenantSubdomain(hostname);

  const tenant = await getDefaultTenantForSignIn(origin, subdomain).catch(() => null);
  if (tenant) {
    if (subdomain && subdomain === tenant.slug) {
      redirect(`/tenant-login/${tenant.slug}`);
    }
    redirect(tenant.loginUrl);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-subtle p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <Building2 className="size-7" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">No tenant workspace available</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign-in is routed through an active hospital workspace. Ask your administrator to provision
          a tenant, or use the links below.
        </p>
        <div className="mt-6 grid gap-2">
          <Link
            href="/master"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <ShieldCheck className="size-4" />
            Super admin console
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <Mail className="size-4" />
            Contact support
          </Link>
        </div>
      </div>
    </div>
  );
}
