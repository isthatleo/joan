import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants, users } from "@/lib/db/schema";
import { getTenantSecuritySettings } from "@/lib/tenant-security";
import { OTPService } from "@/lib/services/otp.service";
import { NotificationService } from "@/lib/services/notification.service";

const otpService = new OTPService();
const notifications = new NotificationService();

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

  const otp = await otpService.createOTP(tenant.id, user.id, "2fa", 10);
  const message = `Your ${tenant.name} verification code is ${otp.code}. It expires in 10 minutes.`;
  const delivery: string[] = [];
  let sent = false;

  if (user.email) {
    await notifications.sendEmail(
      user.email,
      `${tenant.name} verification code`,
      message,
      { tenantSlug: slug }
    ).catch(() => null);
    delivery.push(`Email: ${user.email}`);
    sent = true;
  }

  if (user.phone) {
    await notifications.sendSMS(user.phone, message, { tenantSlugOrId: slug }).catch(() => null);
    delivery.push(`SMS: ${user.phone}`);
    sent = true;
  }

  if (!sent) {
    return NextResponse.json({ error: "No delivery channel is configured for this account" }, { status: 400 });
  }

  return NextResponse.json({
    required: true,
    delivery,
    expiresAt: otp.expiresAt,
  });
}
