"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { withTenantPrefix } from "@/lib/tenant-routing";

export function useTenantPath() {
  const params = useParams();
  const slug = params?.slug as string | undefined;
  const hostname = typeof window !== "undefined" ? window.location.hostname : null;

  return useMemo(
    () => (path: string) => withTenantPrefix(path, slug, hostname),
    [slug, hostname]
  );
}
