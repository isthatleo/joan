import type { AppRole } from "@/lib/rbac";

const FALLBACK_PRODUCTION_TENANT_DOMAINS = [
  "joan.com",
  "joan.vercel.app",
  "joan-production.com",
];

function getProductionTenantDomains() {
  const configured = [
    process.env.NEXT_PUBLIC_ROOT_DOMAIN,
    process.env.NEXT_PUBLIC_TENANT_DOMAINS,
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
  ];

  const domains = configured
    .flatMap((value) => String(value || "").split(","))
    .map((value) => value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "").replace(/^\*\./, ""))
    .filter(Boolean);

  return domains.length ? domains : FALLBACK_PRODUCTION_TENANT_DOMAINS;
}

function getAppOrigin() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "https://joan-healthcare-system.vercel.app/";
}

function getTenantRootDomain(base: URL) {
  const [configured] = getProductionTenantDomains();
  if (configured && !FALLBACK_PRODUCTION_TENANT_DOMAINS.includes(configured)) {
    return configured;
  }

  const hostParts = base.hostname.split(".");
  return hostParts[0] === "www" ? hostParts.slice(1).join(".") : base.hostname;
}

export const TENANT_ROLE_HOME: Record<Exclude<AppRole, "super_admin">, string> = {
  hospital_admin: "admin",
  doctor: "doctor",
  nurse: "nurse",
  lab_technician: "lab",
  pharmacist: "pharmacy",
  accountant: "accountant",
  receptionist: "reception",
  patient: "patient",
  guardian: "guardian",
};

export const TENANT_ROUTE_ALIASES: Record<string, string> = {
  "/hospital-admin": "admin",
  "/admin": "admin",
  "/doctor": "doctor",
  "/nurse": "nurse",
  "/lab": "lab",
  "/lab-technician": "lab",
  "/pharmacist": "pharmacy",
  "/pharmacy": "pharmacy",
  "/accountant": "accountant",
  "/accounts": "accountant",
  "/reception": "reception",
  "/receptionist": "reception",
  "/patient": "patient",
  "/patient-portal": "",
  "/guardian": "guardian",
};

export function getTenantSlugFromPath(pathname?: string | null) {
  const match = pathname?.match(/^\/tenant\/([^/]+)/);
  return match?.[1] || null;
}

export function isTenantLoginPath(pathname?: string | null) {
  if (!pathname) return false;
  return pathname === "/login" || /^\/tenant\/[^/]+\/login\/?$/.test(pathname) || /^\/tenant-login\/[^/]+\/?$/.test(pathname);
}

export function resolveTenantSlug(
  pathname?: string | null,
  hostname?: string | null,
  fallbackSlug?: string | null
) {
  return getTenantSlugFromPath(pathname) || getTenantSubdomain(hostname) || fallbackSlug || null;
}

export function getTenantSubdomain(hostname?: string | null) {
  const host = hostname?.split(":")[0].toLowerCase();
  if (!host) return null;

  if (host.endsWith(".localhost")) {
    const parts = host.split(".");
    return parts.length >= 2 ? parts[0] : null;
  }

  for (const domain of getProductionTenantDomains()) {
    if (host.endsWith(`.${domain}`)) {
      const subdomain = host.replace(`.${domain}`, "");
      if (subdomain && subdomain !== "www") {
        return subdomain;
      }
    }
  }

  return null;
}

export function buildTenantUrl(slug: string, path = "/login") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const base = new URL(getAppOrigin());

  if (base.hostname === "localhost") {
    return `${base.protocol}//${slug}.localhost:${base.port || "3000"}${normalizedPath}`;
  }

  if (base.hostname === "127.0.0.1") {
    if (normalizedPath.startsWith("/login")) {
      return `${base.protocol}//localhost:${base.port || "3000"}/tenant-login/${slug}${normalizedPath.includes("?") ? normalizedPath.slice(normalizedPath.indexOf("?")) : ""}`;
    }
    return `${base.protocol}//localhost:${base.port || "3000"}/tenant/${slug}${normalizedPath}`;
  }

  const domain = getTenantRootDomain(base);
  return `${base.protocol}//${slug}.${domain}${base.port ? `:${base.port}` : ""}${normalizedPath}`;
}

export function buildTenantLoginUrl(slug: string, params?: URLSearchParams | Record<string, string | undefined | null>) {
  const searchParams = params instanceof URLSearchParams ? params : new URLSearchParams();
  if (params && !(params instanceof URLSearchParams)) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) searchParams.set(key, value);
    });
  }
  const query = searchParams.toString();
  return buildTenantUrl(slug, `/login${query ? `?${query}` : ""}`);
}

export function isTenantSubdomainHost(hostname?: string | null, slug?: string | null) {
  const subdomain = getTenantSubdomain(hostname);
  if (!subdomain) return false;
  return slug ? subdomain === slug.toLowerCase() : true;
}

export function getTenantDashboardPath(slug: string, role?: AppRole | null, hostname?: string | null) {
  if (!role || role === "super_admin") {
    if (role === "super_admin") return "/super-admin";
    return isTenantSubdomainHost(hostname, slug) ? "/" : `/tenant/${slug}`;
  }
  const segment = TENANT_ROLE_HOME[role];
  if (isTenantSubdomainHost(hostname, slug)) {
    return segment ? `/${segment}` : "/";
  }
  return segment ? `/tenant/${slug}/${segment}` : `/tenant/${slug}`;
}

export function getTenantLoginPath(slug: string, hostname?: string | null) {
  return isTenantSubdomainHost(hostname, slug) ? "/login" : `/tenant-login/${slug}`;
}

export function getResolvedTenantLoginPath(
  pathname?: string | null,
  hostname?: string | null,
  fallbackSlug?: string | null
) {
  const slug = resolveTenantSlug(pathname, hostname, fallbackSlug);
  return slug ? getTenantLoginPath(slug, hostname) : "/login";
}

export function withTenantPrefix(path: string, slug?: string | null, hostname?: string | null) {
  if (!slug || !path.startsWith("/") || path.startsWith("/tenant/") || path.startsWith("/api/")) return path;
  if (isTenantSubdomainHost(hostname, slug)) {
    if (path === "/login") return "/login";
    return path;
  }
  if (path === "/") return `/tenant/${slug}`;
  if (path === "/login") return getTenantLoginPath(slug, hostname);
  return `/tenant/${slug}${path}`;
}

export function resolveTenantAlias(slug: string, pathname: string) {
  const tenantPrefix = `/tenant/${slug}`;
  const rest = pathname.startsWith(tenantPrefix) ? pathname.slice(tenantPrefix.length) || "/" : pathname;
  const [head, ...tail] = rest.split("/").filter(Boolean);
  const alias = TENANT_ROUTE_ALIASES[`/${head || ""}`];
  if (alias === undefined) return null;
  const suffix = tail.length ? `/${tail.join("/")}` : "";
  return alias ? `${tenantPrefix}/${alias}${suffix}` : tenantPrefix;
}
