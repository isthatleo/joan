import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenantSettings, tenants } from "@/lib/db/schema";

export async function getCachedTenantBySlug(slug: string) {
  const normalizedSlug = slug.toLowerCase();

  return unstable_cache(
    async () =>
      db.query.tenants.findFirst({
        where: eq(tenants.slug, normalizedSlug),
      }),
    ["tenant-by-slug", normalizedSlug],
    {
      revalidate: 300,
      tags: [`tenant:${normalizedSlug}`],
    },
  )();
}

export async function getFreshTenantBySlug(slug: string) {
  return db.query.tenants.findFirst({
    where: eq(tenants.slug, slug.toLowerCase()),
  });
}

export async function getCachedTenantSecurityValue(tenantId: string) {
  return unstable_cache(
    async () => {
      const row = await db.query.tenantSettings.findFirst({
        where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "security")),
      });
      return (row?.value as Record<string, any> | undefined) || null;
    },
    ["tenant-security", tenantId],
    {
      revalidate: 60,
      tags: [`tenant-security:${tenantId}`],
    },
  )();
}

export function revalidateTenantAccessCache(slug: string) {
  const normalizedSlug = slug.toLowerCase();

  revalidateTag(`tenant:${normalizedSlug}`, { expire: 0 });
  revalidatePath(`/tenant/${normalizedSlug}`);
  revalidatePath(`/tenant/${normalizedSlug}/login`);
  revalidatePath(`/tenant-login/${normalizedSlug}`);
  revalidatePath("/tenants");
  revalidatePath("/tenants/deleted");
  revalidatePath(`/tenants/${normalizedSlug}`);
}
