import { NextRequest, NextResponse } from "next/server";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { requireTenantAdmin } from "@/lib/tenant-staff";

export const dynamic = "force-dynamic";

function barcodeSvg(value: string) {
  const text = value || "STAFF";
  const bars = Array.from(text).flatMap((char, index) => {
    const code = char.charCodeAt(0) + index;
    return [code % 2 ? 3 : 1, code % 3 ? 2 : 4, code % 5 ? 1 : 3];
  });
  let x = 12;
  const rects = bars.map((width, index) => {
    const rect = index % 2 === 0 ? `<rect x="${x}" y="10" width="${width}" height="58" rx="1" fill="#111827" />` : "";
    x += width + 2;
    return rect;
  }).join("");
  const width = Math.max(180, x + 12);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="96" viewBox="0 0 ${width} 96" role="img" aria-label="Staff barcode"><rect width="100%" height="100%" rx="12" fill="#fff"/>${rects}<text x="${width / 2}" y="86" text-anchor="middle" font-family="monospace" font-size="12" fill="#111827">${text.replace(/[<>&"]/g, "")}</text></svg>`;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const admin = await requireTenantAdmin(request.headers, tenantId);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const { searchParams } = new URL(request.url);
  const value = searchParams.get("data") || "STAFF";
  const type = searchParams.get("type") === "barcode" ? "barcode" : "qr";

  if (type === "barcode") {
    return new NextResponse(barcodeSvg(value), {
      headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const QRCode: any = await Function("return import('qrcode')")();
  const svg = await QRCode.toString(value, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 180,
    color: { dark: "#111827", light: "#ffffff" },
  });
  return new NextResponse(svg, {
    headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "no-store" },
  });
}
