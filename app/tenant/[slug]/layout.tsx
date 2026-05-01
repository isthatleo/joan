"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface TenantLayoutProps {
  children: React.ReactNode;
}

export default function TenantLayout({ children }: TenantLayoutProps) {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params?.slug as string;
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTenant = async () => {
      if (!tenantSlug) {
        router.push("/login");
        return;
      }

      try {
        // In a real app, you'd fetch this from an API
        // For now, we'll assume the tenant exists based on the slug
        setTenant({ slug: tenantSlug, name: tenantSlug.replace("-", " ").toUpperCase() });
      } catch (error) {
        console.error("Failed to fetch tenant:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchTenant();
  }, [tenantSlug, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-subtle flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-subtle flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Tenant Not Found</h1>
          <p className="text-muted-foreground">The requested hospital could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-subtle">
      <div className="flex">
        <Sidebar tenantSlug={tenantSlug} />
        <div className="flex-1 flex flex-col">
          <Topbar tenant={tenant} />
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

