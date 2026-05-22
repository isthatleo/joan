"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { withTenantPrefix } from "@/lib/tenant-routing";

export default function PatientAliasPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();

  useEffect(() => {
    const hostname = typeof window !== "undefined" ? window.location.hostname : null;
    // Route patients to the patient home (my-health)
    const target = withTenantPrefix("/my-health", slug, hostname);
    router.replace(target);
  }, [slug, router]);

  return null;
}

