"use client";

import { useMemo } from "react";
import { useParams, usePathname } from "next/navigation";
import { resolveTenantSlug, withTenantPrefix } from "@/lib/tenant-routing";

export function useTenantPath() {
  const params = useParams();
  const pathname = usePathname();
  const hostname = typeof window !== "undefined" ? window.location.hostname : null;
  const fallbackSlug = typeof window !== "undefined" ? sessionStorage.getItem("active_tenant_slug") : null;
  const paramSlug = params?.slug as string | undefined;
  const slug = resolveTenantSlug(pathname, hostname, paramSlug || fallbackSlug || undefined);

  return useMemo(() => (path: string) => withTenantPrefix(path, slug, hostname), [slug, hostname]);
}
