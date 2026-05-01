import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const url = request.nextUrl.clone();

  // Skip API routes, static files, and Next.js internals
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/favicon.ico") ||
    url.pathname.startsWith("/assets/") ||
    url.pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Extract subdomain
  const subdomain = getSubdomain(hostname);

  if (subdomain) {
    try {
      // Check if subdomain matches a tenant slug
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.slug, subdomain),
      });

      if (tenant && tenant.isActive) {
        // Rewrite to tenant-specific route
        url.pathname = `/tenant/${tenant.slug}${url.pathname}`;
        return NextResponse.rewrite(url);
      }
    } catch (error) {
      console.error("Middleware tenant lookup error:", error);
    }
  }

  return NextResponse.next();
}

function getSubdomain(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(":")[0];

  // In development: subdomain.localhost
  if (host.endsWith(".localhost")) {
    const parts = host.split(".");
    if (parts.length >= 2) {
      return parts[0];
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
        return subdomain;
      }
    }
  }

  return null;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|assets).*)"],
};
