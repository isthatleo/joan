import { NextRequest, NextResponse } from "next/server";
import { getTenantAccess, tenantAccessResponse } from "@/lib/api/tenant-access";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const access = await getTenantAccess(request, slug);
    if (!access.ok) return tenantAccessResponse(access);
    if (!access.canEditSettings) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const tenant = access.tenant;
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Use the PATCH method with "activate" action
    const patchRequest = new Request(request.url.replace('/restore', ''), {
      method: 'PATCH',
      headers: request.headers,
      body: JSON.stringify({ action: 'activate' })
    });

    // Import the PATCH handler dynamically to avoid circular imports
    const { PATCH } = await import('../route');
    return PATCH(patchRequest, { params: Promise.resolve({ slug }) });
  } catch (error: any) {
    console.error("Error restoring tenant:", error);
    return NextResponse.json({
      error: "Failed to restore tenant",
      details: error?.message,
    }, { status: 500 });
  }
}
