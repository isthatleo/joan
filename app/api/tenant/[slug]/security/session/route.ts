import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants, users } from "@/lib/db/schema";
import { getTenantSecuritySettings } from "@/lib/tenant-security";
import { getUserTwoFactor } from "@/lib/user-two-factor";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, slug) });
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const user = await db.query.users.findFirst({
    where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
    columns: { id: true, email: true, tenantId: true, role: true },
  });
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const security = await getTenantSecuritySettings(tenant.id);
  const twoFactor = await getUserTwoFactor(user.id);
  const verificationCookie = request.cookies.get(`tenant_2fa_verified_${tenant.id}`)?.value || "";
  const verifiedUserId = verificationCookie.split(":")[0] || "";
  const verified = !security.twoFactorRequired || verifiedUserId === user.id;

  return NextResponse.json({
    security,
    twoFactorRequired: security.twoFactorRequired,
    twoFactorVerified: verified,
    twoFactorMethod: twoFactor?.enabled ? "authenticator" : "setup_required",
    twoFactorEnrolled: twoFactor?.enabled === true,
    twoFactorSetupRequired: security.twoFactorRequired && twoFactor?.enabled !== true,
    sessionTimeout: security.sessionTimeout,
    userId: user.id,
    tenantId: tenant.id,
  });
}
