import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getProvider } from "@/lib/integrations/providers";
import { getIntegrationCredentials, syncTenantCommunicationProviders } from "@/lib/integrations/server";
import { requireTenantIntegrationAdmin } from "@/lib/tenant-integration-access";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const access = await requireTenantIntegrationAdmin(request.headers, slug);
    if (!access.ok) return access.response;

    const [row] = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.id, id), eq(integrations.tenantId, access.tenant.id), isNull(integrations.deletedAt)))
      .limit(1);
    if (!row) return NextResponse.json({ error: "Integration not found" }, { status: 404 });

    const provider = getProvider(row.provider);
    if (!provider) return NextResponse.json({ error: "Unknown provider" }, { status: 400 });

    const creds = (await getIntegrationCredentials(access.tenant.id, row.provider)) || {};

    if (!provider.verify) {
      await db
        .update(integrations)
        .set({ status: "active", lastTestedAt: new Date(), testError: null })
        .where(eq(integrations.id, id));
      await syncTenantCommunicationProviders(access.tenant.id);
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
    await syncTenantCommunicationProviders(access.tenant.id);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[tenant integration test]", error);
    return NextResponse.json({ error: error?.message || "Integration test failed" }, { status: 500 });
  }
}
