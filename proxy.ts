import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const url = request.nextUrl.clone();

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

  const subdomain = getSubdomain(hostname);

  if (subdomain) {
    const path = url.pathname === "/" ? "/login" : url.pathname;
    url.pathname = `/tenant/${subdomain}${path}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

function getSubdomain(hostname: string): string | null {
  const host = hostname.split(":")[0].toLowerCase();

  if (host.endsWith(".localhost")) {
    const parts = host.split(".");
    if (parts.length >= 2) {
      return parts[0].toLowerCase();
    }
  }

  const productionDomains = getProductionDomains();

  for (const domain of productionDomains) {
    if (host.endsWith(`.${domain}`)) {
      const subdomain = host.replace(`.${domain}`, "");
      if (subdomain && subdomain !== "www") {
        return subdomain.toLowerCase();
      }
    }
  }

  return null;
}

function getProductionDomains() {
  const configured = [
    process.env.NEXT_PUBLIC_ROOT_DOMAIN,
    process.env.ROOT_DOMAIN,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
    "joan.com",
    "joan.vercel.app",
    "joan-production.com",
  ];

  return configured
    .flatMap((value) => String(value || "").split(","))
    .map((value) => value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, ""))
    .filter(Boolean);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|assets).*)"],
};
