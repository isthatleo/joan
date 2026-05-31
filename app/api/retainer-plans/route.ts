import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createRetainerPlan, listRetainerPlans, requireSuperAdmin } from "@/lib/platform-billing";

export const dynamic = "force-dynamic";

const retainerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(80).regex(/^[a-z0-9_ -]+$/).transform((value) => value.toLowerCase().replace(/[\s-]+/g, "_")),
  description: z.string().trim().max(700).optional().or(z.literal("")),
  currency: z.string().trim().min(3).max(3).default("USD"),
  monthlyFee: z.coerce.number().min(0),
  setupFee: z.coerce.number().min(0).default(0),
  responseSlaHours: z.coerce.number().int().min(1).default(24),
  includedHours: z.coerce.number().int().min(0).default(0),
  overageRate: z.coerce.number().min(0).default(0),
  features: z.array(z.string().trim().min(1)).default([]),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  sortOrder: z.coerce.number().int().default(0),
});

export async function GET(request: NextRequest) {
  const access = await requireSuperAdmin(request);
  if (!access.ok) return access.response;
  const includeInactive = new URL(request.url).searchParams.get("includeInactive") === "true";
  const retainers = await listRetainerPlans(includeInactive);
  return NextResponse.json({ retainers });
}

export async function POST(request: NextRequest) {
  const access = await requireSuperAdmin(request);
  if (!access.ok) return access.response;
  const body = await request.json().catch(() => ({}));
  const parsed = retainerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid retainer plan", details: parsed.error.issues }, { status: 400 });
  }
  const retainer = await createRetainerPlan({ ...parsed.data, createdBy: access.user.id });
  return NextResponse.json({ retainer }, { status: 201 });
}
