"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { withTenantPrefix } from "@/lib/tenant-routing";

export default function LabTechnicianAliasPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();

  useEffect(() => {
    const hostname = typeof window !== "undefined" ? window.location.hostname : null;
    const target = withTenantPrefix("/lab", slug, hostname);
    // Replace so the alias does not remain in history
    router.replace(target);
  }, [slug, router]);

  return null;
}

