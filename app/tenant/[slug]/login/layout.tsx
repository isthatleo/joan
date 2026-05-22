import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface LoginLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function TenantLoginLayout({ children, params }: LoginLayoutProps) {
  const { slug } = await params;
  if (!slug) return notFound();

  // For login, we allow access even if tenant is not found
  // The login page component will handle the tenant verification
  // and show an appropriate error message if needed
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, slug) });

  // Only return notFound if we explicitly know the tenant doesn't exist
  // But we'll let the client component handle showing the error
  if (!tenant && slug) {
    // Tenant doesn't exist, but we still render the login page so it can show the error
    // The login page component (/tenant/[slug]/login/page.tsx) handles this case
  }

  return children;
}

