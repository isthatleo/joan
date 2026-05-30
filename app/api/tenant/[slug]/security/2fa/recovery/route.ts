import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLogs, tenants, users } from "@/lib/db/schema";
import { getUserTwoFactor, issueBackupCodes, setUserTwoFactor } from "@/lib/user-two-factor";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug } = await params;
    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, slug) });
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const user = await db.query.users.findFirst({
      where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
      columns: { id: true, tenantId: true },
    });
    if (!user?.id || user.tenantId !== tenant.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const current = await getUserTwoFactor(user.id);
    if (!current?.enabled) return NextResponse.json({ error: "Authenticator 2FA is not enabled" }, { status: 400 });

    const { rawCodes, storedCodes } = issueBackupCodes();
    await setUserTwoFactor(user.id, { ...current, backupCodes: storedCodes });
    await db.insert(auditLogs).values({
      tenantId: tenant.id,
      userId: user.id,
      action: "tenant.user_totp_recovery_codes_rotated",
      entity: "user",
      entityId: user.id,
      metadata: { count: storedCodes.length },
    });

    return NextResponse.json({ backupCodes: rawCodes });
  } catch (error: any) {
    console.error("[tenant 2fa recovery]", error);
    return NextResponse.json({ error: error?.message || "Failed to rotate recovery codes" }, { status: 500 });
  }
}
