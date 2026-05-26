import { unstable_cache } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";

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
