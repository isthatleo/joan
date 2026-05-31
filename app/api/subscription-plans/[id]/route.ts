import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { platformInvoices, subscriptionPlans } from "@/lib/db/schema";
import { auditPlatformBilling, requireSuperAdmin } from "@/lib/platform-billing";

export const dynamic = "force-dynamic";

const updatePlanSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  code: z.string().trim().min(2).max(80).regex(/^[a-z0-9_ -]+$/).transform((v) => v.toLowerCase().replace(/[\s-]+/g, "_")).optional(),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  currency: z.string().trim().min(3).max(3).optional(),
  monthlyPrice: z.coerce.number().min(0).optional(),
  yearlyPrice: z.coerce.number().min(0).optional(),
  staffLimit: z.coerce.number().int().min(0).optional(),
  clientLimit: z.coerce.number().int().min(0).optional(),
  storageGb: z.coerce.number().int().min(0).optional(),
  features: z.array(z.string().trim().min(1)).optional(),
  modules: z.array(z.string().trim().min(1)).optional(),
  supportLevel: z.string().trim().min(1).optional(),
  billingCycle: z.enum(["monthly", "yearly"]).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireSuperAdmin(request);
  if (!access.ok) return access.response;
  const { id } = await params;

  const plan = await db.query.subscriptionPlans.findFirst({ where: eq(subscriptionPlans.id, id) });
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  const invoices = await db.select().from(platformInvoices).where(eq(platformInvoices.planId, id)).orderBy(platformInvoices.issuedAt).limit(25);
  return NextResponse.json({ plan, invoices });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireSuperAdmin(request);
  if (!access.ok) return access.response;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = updatePlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan", details: parsed.error.issues }, { status: 400 });
  }

  const data: any = { ...parsed.data, updatedAt: new Date() };
  if (typeof data.monthlyPrice === "number") data.monthlyPrice = data.monthlyPrice.toFixed(2);
  if (typeof data.yearlyPrice === "number") data.yearlyPrice = data.yearlyPrice.toFixed(2);

  if (data.isDefault) {
    await db.update(subscriptionPlans).set({ isDefault: false, updatedAt: new Date() }).where(eq(subscriptionPlans.isDefault, true));
  }

  const [plan] = await db.update(subscriptionPlans).set(data).where(eq(subscriptionPlans.id, id)).returning();
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  await auditPlatformBilling(access.user.id, "subscription_plan.updated", plan.id, { code: plan.code, name: plan.name });
  return NextResponse.json({ plan });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireSuperAdmin(request);
  if (!access.ok) return access.response;
  const { id } = await params;

  const linked = await db.select({ id: platformInvoices.id }).from(platformInvoices).where(eq(platformInvoices.planId, id)).limit(1);
  const [plan] = await db.update(subscriptionPlans).set({
    isActive: false,
    deletedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(subscriptionPlans.id, id)).returning();
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  await auditPlatformBilling(access.user.id, "subscription_plan.deleted", plan.id, { code: plan.code, linkedInvoices: linked.length });
  return NextResponse.json({ success: true, plan });
}
