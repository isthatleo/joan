"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function TenantNotFoundRedirect({ slug }: { slug: string }) {
  useEffect(() => {
    try {
      sessionStorage.removeItem("active_tenant_slug");
      sessionStorage.removeItem("active_tenant_name");
      sessionStorage.removeItem("active_tenant_id");
      sessionStorage.removeItem("active_tenant_logo");
      document.cookie = "x-tenant-slug=; path=/; max-age=0; SameSite=Lax";
      void authClient.signOut();
    } catch {}
  }, [slug]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-subtle p-6">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
          <AlertTriangle className="size-7" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Tenant Unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The tenant slug "{slug}" is archived, inactive, or no longer available. Active sessions for this tenant have been terminated.
        </p>
        <Link href="/login" className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white">
          <LogOut className="size-4" /> Return to main login
        </Link>
      </div>
    </div>
  );
}
