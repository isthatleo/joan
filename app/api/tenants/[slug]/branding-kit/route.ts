import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenantSettings, tenants } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

async function getTenantBySlug(slug: string) {
  return db.query.tenants.findFirst({ where: eq(tenants.slug, slug) });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const rows = await db
      .select()
      .from(tenantSettings)
      .where(and(eq(tenantSettings.tenantId, tenant.id), eq(tenantSettings.key, "branding")));

    const branding = (rows[0]?.value as Record<string, unknown> | undefined) || {};
    const payload = {
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        plan: tenant.plan,
      },
      branding: {
        hospitalName: tenant.name,
        logoUrl: tenant.logoUrl || branding.logoUrl || "",
        faviconUrl: branding.faviconUrl || "",
        primaryColor: branding.primaryColor || "#F97316",
        accentColor: branding.accentColor || "#EA580C",
        lightLogoUrl: branding.lightLogoUrl || "",
      },
      exportedAt: new Date().toISOString(),
      exportType: "tenant-branding-kit",
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug}-branding-kit.json"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("[tenant branding-kit GET]", error);
    return NextResponse.json({ error: "Failed to export branding kit" }, { status: 500 });
  }
}
