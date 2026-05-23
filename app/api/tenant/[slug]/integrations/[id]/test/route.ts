import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrations, tenants } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getProvider } from "@/lib/integrations/providers";
import { getIntegrationCredentials, syncTenantCommunicationProviders } from "@/lib/integrations/server";

async function getTenant(slug: string) {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  return tenant ?? null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { slug, id } = await params;
  const tenant = await getTenant(slug);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const [row] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.id, id), eq(integrations.tenantId, tenant.id), isNull(integrations.deletedAt)))
    .limit(1);
  if (!row) return NextResponse.json({ error: "Integration not found" }, { status: 404 });

  const provider = getProvider(row.provider);
  if (!provider) return NextResponse.json({ error: "Unknown provider" }, { status: 400 });

  const creds = (await getIntegrationCredentials(tenant.id, row.provider)) || {};

  if (!provider.verify) {
    await db
      .update(integrations)
      .set({ status: "active", lastTestedAt: new Date(), testError: null })
      .where(eq(integrations.id, id));
    await syncTenantCommunicationProviders(tenant.id);
    return NextResponse.json({ ok: true, message: "Saved (no live test available)" });
  }

  const result = await provider.verify(creds);
  await db
    .update(integrations)
    .set({
      status: result.ok ? "active" : "error",
      lastTestedAt: new Date(),
      testError: result.ok ? null : result.error || "Verification failed",
      accountName: result.account || row.accountName,
    })
    .where(eq(integrations.id, id));
  await syncTenantCommunicationProviders(tenant.id);

  return NextResponse.json(result);
}
