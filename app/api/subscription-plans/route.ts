import { NextRequest, NextResponse } from "next/server";
import { eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { subscriptionPlans } from "@/lib/db/schema";
import { auditPlatformBilling, ensureDefaultSubscriptionPlans, listSubscriptionPlans, requireSuperAdmin } from "@/lib/platform-billing";

export const dynamic = "force-dynamic";

const planSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(80).regex(/^[a-z0-9_ -]+$/).transform((v) => v.toLowerCase().replace(/[\s-]+/g, "_")),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  currency: z.string().trim().min(3).max(3).default("USD"),
  monthlyPrice: z.coerce.number().min(0),
  yearlyPrice: z.coerce.number().min(0),
  staffLimit: z.coerce.number().int().min(0),
  clientLimit: z.coerce.number().int().min(0),
  storageGb: z.coerce.number().int().min(0),
  features: z.array(z.string().trim().min(1)).default([]),
  modules: z.array(z.string().trim().min(1)).default([]),
  supportLevel: z.string().trim().min(1).default("standard"),
  billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  sortOrder: z.coerce.number().int().default(0),
});

export async function GET(request: NextRequest) {
  const access = await requireSuperAdmin(request);
  if (!access.ok) return access.response;
  const includeInactive = new URL(request.url).searchParams.get("includeInactive") === "true";
  const plans = await listSubscriptionPlans(includeInactive);
  return NextResponse.json({ plans });
}

export async function POST(request: NextRequest) {
  const access = await requireSuperAdmin(request);
  if (!access.ok) return access.response;

  await ensureDefaultSubscriptionPlans(access.user.id);
  const body = await request.json().catch(() => ({}));
  const parsed = planSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan", details: parsed.error.issues }, { status: 400 });
  }

  const data = parsed.data;
  if (data.isDefault) {
    await db.update(subscriptionPlans).set({ isDefault: false, updatedAt: new Date() }).where(eq(subscriptionPlans.isDefault, true));
  }

  const [plan] = await db.insert(subscriptionPlans).values({
    ...data,
    monthlyPrice: data.monthlyPrice.toFixed(2),
    yearlyPrice: data.yearlyPrice.toFixed(2),
    createdBy: access.user.id,
  }).returning();

  await auditPlatformBilling(access.user.id, "subscription_plan.created", plan.id, { code: plan.code, name: plan.name });
  return NextResponse.json({ plan }, { status: 201 });
}
