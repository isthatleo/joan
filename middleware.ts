import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const url = request.nextUrl.clone();

  // Skip API routes, static files, and Next.js internals
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/favicon.ico") ||
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/tenant/") ||
    url.pathname.startsWith("/tenant-login/") ||
    url.pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Extract subdomain
  const subdomain = getSubdomain(hostname);

  if (subdomain) {
    const path = url.pathname === "/" ? "" : url.pathname;
    url.pathname = `/tenant/${subdomain}${path}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

function getSubdomain(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(":")[0].toLowerCase();

  // In development: subdomain.localhost
  if (host.endsWith(".localhost")) {
    const parts = host.split(".");
    if (parts.length >= 2) {
      return parts[0].toLowerCase();
    }
  }

  // In production: subdomain.joan.com or subdomain.yourdomain.com
  // You can configure this based on your domain
  const productionDomains = [
    "joan.com",
    "joan.vercel.app",
    "joan-production.com",
    // Add your production domains here
  ];

  for (const domain of productionDomains) {
    if (host.endsWith(`.${domain}`)) {
      const subdomain = host.replace(`.${domain}`, "");
      // Don't treat "www" as a tenant subdomain
      if (subdomain && subdomain !== "www") {
        return subdomain.toLowerCase();
      }
    }
  }

  return null;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|assets).*)"],
};
