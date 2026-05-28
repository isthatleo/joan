import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants, users } from "@/lib/db/schema";
import { OTPService } from "@/lib/services/otp.service";

const otpService = new OTPService();

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, slug) });
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const user = await db.query.users.findFirst({
    where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
    columns: { id: true },
  });
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const code = String(body?.code || "").trim();
  if (!code) return NextResponse.json({ error: "Code is required" }, { status: 400 });

  const result = await otpService.verifyOTP(user.id, code, "2fa");
  if (!result.success) {
    await otpService.recordFailedAttempt(user.id, code, "2fa").catch(() => null);
    return NextResponse.json({ error: result.error || "Invalid verification code" }, { status: 400 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(`tenant_2fa_verified_${tenant.id}`, `${user.id}:${Date.now()}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
