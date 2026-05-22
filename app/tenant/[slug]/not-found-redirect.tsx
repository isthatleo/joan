"use client";

import { useEffect } from "react";
import { getTenantLoginPath } from "@/lib/tenant-routing";

export function TenantNotFoundRedirect({ slug }: { slug: string }) {
  useEffect(() => {
    // Redirect to public tenant login where it will show tenant not found error
    window.location.href = getTenantLoginPath(slug, window.location.hostname);
  }, [slug]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-subtle p-6">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
        Loading…
      </div>
    </div>
  );
}

