import { NextResponse } from "next/server";
import { requireTenantAdmin } from "@/lib/tenant-staff";
import { getTenantBySlug } from "@/lib/tenant-integrations";

export async function requireTenantIntegrationAdmin(headers: Headers, slug: string) {
  const tenant = await getTenantBySlug(slug);
  if (!tenant) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Tenant not found" }, { status: 404 }),
    };
  }

  const admin = await requireTenantAdmin(headers, tenant.id);
  if (!admin.ok) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: admin.error || "Forbidden" }, { status: admin.status || 403 }),
    };
  }

  return {
    ok: true as const,
    tenant,
    admin,
    userId: admin.user?.id || admin.session?.user?.id || "system",
  };
}
