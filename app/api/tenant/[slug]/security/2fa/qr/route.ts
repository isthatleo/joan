import QRCode from "qrcode";
import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tenants, users } from "@/lib/db/schema";
import { createTotpProvisioningUri, decryptTotpSecret } from "@/lib/totp";
import { getUserTwoFactor } from "@/lib/user-two-factor";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug } = await params;
    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, slug) });
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const user = await db.query.users.findFirst({
      where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
      columns: { id: true, email: true, tenantId: true },
    });
    if (!user?.id || user.tenantId !== tenant.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const twoFactor = await getUserTwoFactor(user.id);
    const pendingSecret = decryptTotpSecret(twoFactor?.pendingSecretEncrypted);
    if (!pendingSecret) {
      return NextResponse.json({ error: "Authenticator setup has not been started" }, { status: 400 });
    }

    const otpauthUrl = createTotpProvisioningUri({
      secret: pendingSecret,
      issuer: tenant.name || "Joan Healthcare OS",
      account: user.email,
    });
    const svg = await QRCode.toString(otpauthUrl, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 2,
      width: 220,
      color: {
        dark: "#111827",
        light: "#FFFFFF",
      },
    });

    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "no-store, private",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    console.error("[tenant 2fa qr]", error);
    return NextResponse.json({ error: error?.message || "Failed to generate authenticator QR code" }, { status: 500 });
  }
}
