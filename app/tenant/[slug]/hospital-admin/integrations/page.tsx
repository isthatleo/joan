"use client";

import { useParams } from "next/navigation";
import { IntegrationManager } from "@/components/integrations/integration-manager";

export default function IntegrationsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  return (
    <div className="container mx-auto space-y-6 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          Connect hospital-wide services with encrypted credentials and sync the verified configuration across the tenant.
        </p>
      </div>

      <IntegrationManager
        slug={slug}
        title="Hospital Service Integrations"
        description="Manage secure provider credentials for communication, automation, analytics, recruiting, AI, and data workflows."
      />
    </div>
  );
}
