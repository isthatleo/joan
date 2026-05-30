import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants, users } from "@/lib/db/schema";
import { getTenantSecuritySettings } from "@/lib/tenant-security";
import { getUserTwoFactor } from "@/lib/user-two-factor";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, slug) });
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const user = await db.query.users.findFirst({
    where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
    columns: { id: true, email: true, fullName: true, phone: true, tenantId: true },
  });
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const security = await getTenantSecuritySettings(tenant.id);
  if (!security.twoFactorRequired) {
    return NextResponse.json({ required: false });
  }

  const twoFactor = await getUserTwoFactor(user.id);
  if (twoFactor?.enabled && twoFactor.secretEncrypted) {
    return NextResponse.json({
      required: true,
      method: "authenticator",
      enrolled: true,
      setupRequired: false,
      message: "Enter the six-digit code from your authenticator app.",
    });
  }

  return NextResponse.json({
    required: true,
    method: "authenticator",
    enrolled: false,
    setupRequired: true,
    message: "Authenticator app enrollment is required before continuing.",
  });
}
