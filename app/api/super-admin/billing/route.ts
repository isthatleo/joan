import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPlatformInvoice, getPlatformBillingPayload, requireSuperAdmin } from "@/lib/platform-billing";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const invoiceSchema = z.object({
  tenantId: z.string().uuid(),
  planId: z.string().uuid().optional().nullable(),
  status: z.enum(["draft", "sent"]).default("sent"),
  currency: z.string().trim().min(3).max(3).default("USD"),
  billingEmail: z.string().email().optional().or(z.literal("")),
  billingName: z.string().trim().max(160).optional().or(z.literal("")),
  dueAt: z.coerce.date(),
  periodStart: z.coerce.date().optional().nullable(),
  periodEnd: z.coerce.date().optional().nullable(),
  tax: z.coerce.number().min(0).default(0),
  notes: z.string().trim().max(1500).optional().or(z.literal("")),
  kind: z.string().trim().max(80).default("manual_platform_invoice"),
  lineItems: z.array(z.object({
    description: z.string().trim().min(2).max(300),
    quantity: z.coerce.number().min(0.01),
    unitPrice: z.coerce.number().min(0),
  })).min(1),
});

export async function GET(request: NextRequest) {
  const access = await requireSuperAdmin(request);
  if (!access.ok) return access.response;
  const payload = await getPlatformBillingPayload();
  return NextResponse.json(payload);
}

export async function POST(request: NextRequest) {
  const access = await requireSuperAdmin(request);
  if (!access.ok) return access.response;

  const body = await request.json().catch(() => ({}));
  const parsed = invoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid invoice", details: parsed.error.issues }, { status: 400 });
  }

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, parsed.data.tenantId) });
  if (!tenant || tenant.deletedAt || !tenant.isActive) {
    return NextResponse.json({ error: "Tenant not found or inactive" }, { status: 404 });
  }

  const invoice = await createPlatformInvoice({
    ...parsed.data,
    tenantId: tenant.id,
    tenantName: tenant.name,
    tenantSlug: tenant.slug,
    billingEmail: parsed.data.billingEmail || tenant.contactEmail || null,
    billingName: parsed.data.billingName || tenant.name,
    notes: parsed.data.notes || null,
    createdBy: access.user.id,
  });

  return NextResponse.json({ invoice }, { status: 201 });
}
