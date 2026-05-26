import { NextRequest, NextResponse } from "next/server";
import { getCachedTenantBySlug } from "@/lib/tenant-cache";

/**
 * Public endpoint to get tenant information by slug
 * This is used by the tenant login page to verify tenant exists
 * No authentication required
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    const tenant = await getCachedTenantBySlug(slug);

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    if (!tenant.isActive) {
      return NextResponse.json(
        { error: "Tenant is not active" },
        { status: 403 }
      );
    }

    // Return only public information
    return NextResponse.json({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      logoUrl: tenant.logoUrl,
    });
  } catch (error) {
    console.error("Error fetching tenant:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenant" },
      { status: 500 }
    );
  }
}

