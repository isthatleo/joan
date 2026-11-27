import { NextResponse } from "next/server";
import { getDefaultTenantForSignIn } from "@/lib/default-tenant";

export const dynamic = "force-dynamic";

/**
 * Public resolver for the landing-page "Sign in" action.
 * Returns the tenant login URL, or redirects directly when ?redirect=1 is set.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  let tenant: Awaited<ReturnType<typeof getDefaultTenantForSignIn>> = null;
  try {
    tenant = await getDefaultTenantForSignIn(requestUrl.origin);
  } catch {
    tenant = null;
  }

  if (!tenant) {
    return NextResponse.json(
      { error: "No active tenant is available for sign-in" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (requestUrl.searchParams.get("redirect") === "1") {
    return NextResponse.redirect(tenant.loginUrl, 307);
  }

  return NextResponse.json(tenant, {
    headers: { "Cache-Control": "no-store" },
  });
}
