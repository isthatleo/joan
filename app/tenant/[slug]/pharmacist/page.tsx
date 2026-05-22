"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { withTenantPrefix } from "@/lib/tenant-routing";

export default function PharmacistAliasPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();

  useEffect(() => {
    const hostname = typeof window !== "undefined" ? window.location.hostname : null;
    const target = withTenantPrefix("/pharmacy", slug, hostname);
    router.replace(target);
  }, [slug, router]);

  return null;
}

