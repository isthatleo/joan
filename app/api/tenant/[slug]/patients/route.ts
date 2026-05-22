import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenants, patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const resolvedParams = await params;
    const slug = resolvedParams.slug;

    if (!slug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    // Get tenant by slug
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Get patients for this tenant
    const tenantPatients = await db
      .select()
      .from(patients)
      .where(eq(patients.tenantId, tenant.id));

    return NextResponse.json(tenantPatients);
  } catch (error) {
    console.error("Error fetching tenant patients:", error);
    return NextResponse.json({ error: "Failed to fetch patients" }, { status: 500 });
  }
}
