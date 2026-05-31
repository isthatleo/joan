import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditPlatformBilling, ensureDefaultRetainerPlans, requireSuperAdmin } from "@/lib/platform-billing";

export const dynamic = "force-dynamic";

const updateRetainerSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  code: z.string().trim().min(2).max(80).regex(/^[a-z0-9_ -]+$/).transform((value) => value.toLowerCase().replace(/[\s-]+/g, "_")).optional(),
  description: z.string().trim().max(700).optional().or(z.literal("")),
  currency: z.string().trim().min(3).max(3).optional(),
  monthlyFee: z.coerce.number().min(0).optional(),
  setupFee: z.coerce.number().min(0).optional(),
  responseSlaHours: z.coerce.number().int().min(1).optional(),
  includedHours: z.coerce.number().int().min(0).optional(),
  overageRate: z.coerce.number().min(0).optional(),
  features: z.array(z.string().trim().min(1)).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireSuperAdmin(request);
  if (!access.ok) return access.response;
  await ensureDefaultRetainerPlans(access.user.id);
  const { id } = await params;

  const result = await db.execute(sql`
    SELECT
      rp.*,
      coalesce(count(t.id) FILTER (
        WHERE t.is_active = true
          AND t.deleted_at IS NULL
          AND (
            t.metadata->>'retainerPlanId' = rp.id::text OR
            t.metadata->>'retainerPlanCode' = rp.code
          )
      ), 0)::int AS active_tenants
    FROM retainer_plans rp
    LEFT JOIN tenants t ON true
    WHERE rp.id = ${id}
      AND rp.deleted_at IS NULL
    GROUP BY rp.id
    LIMIT 1
  `) as any;
  const retainer = result.rows?.[0];
  if (!retainer) return NextResponse.json({ error: "Retainer plan not found" }, { status: 404 });

  const tenantResult = await db.execute(sql`
    SELECT id, name, slug, contact_email, plan, is_active
    FROM tenants
    WHERE deleted_at IS NULL
      AND (
        metadata->>'retainerPlanId' = ${id} OR
        metadata->>'retainerPlanCode' = ${retainer.code}
      )
    ORDER BY name
    LIMIT 100
  `) as any;

  return NextResponse.json({ retainer, tenants: tenantResult.rows || [] });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireSuperAdmin(request);
  if (!access.ok) return access.response;
  await ensureDefaultRetainerPlans(access.user.id);
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = updateRetainerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid retainer plan", details: parsed.error.issues }, { status: 400 });
  }

  const currentResult = await db.execute(sql`SELECT * FROM retainer_plans WHERE id = ${id} AND deleted_at IS NULL LIMIT 1`) as any;
  if (!currentResult.rows?.[0]) return NextResponse.json({ error: "Retainer plan not found" }, { status: 404 });
  const current = currentResult.rows[0];
  const data = parsed.data;

  if (data.isDefault) {
    await db.execute(sql`UPDATE retainer_plans SET is_default = false, updated_at = now() WHERE is_default = true`);
  }

  const result = await db.execute(sql`
    UPDATE retainer_plans
    SET
      name = ${data.name ?? current.name},
      code = ${data.code ?? current.code},
      description = ${data.description ?? current.description},
      currency = ${data.currency ?? current.currency},
      monthly_fee = ${typeof data.monthlyFee === "number" ? data.monthlyFee.toFixed(2) : current.monthly_fee},
      setup_fee = ${typeof data.setupFee === "number" ? data.setupFee.toFixed(2) : current.setup_fee},
      response_sla_hours = ${data.responseSlaHours ?? current.response_sla_hours},
      included_hours = ${data.includedHours ?? current.included_hours},
      overage_rate = ${typeof data.overageRate === "number" ? data.overageRate.toFixed(2) : current.overage_rate},
      features = ${JSON.stringify(data.features ?? current.features ?? [])}::jsonb,
      is_active = ${data.isActive ?? current.is_active},
      is_default = ${data.isDefault ?? current.is_default},
      sort_order = ${data.sortOrder ?? current.sort_order},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `) as any;

  const retainer = result.rows?.[0];
  await auditPlatformBilling(access.user.id, "retainer_plan.updated", id, { code: retainer?.code, name: retainer?.name });
  return NextResponse.json({ retainer });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireSuperAdmin(request);
  if (!access.ok) return access.response;
  await ensureDefaultRetainerPlans(access.user.id);
  const { id } = await params;

  const result = await db.execute(sql`
    UPDATE retainer_plans
    SET is_active = false, deleted_at = now(), updated_at = now()
    WHERE id = ${id}
      AND deleted_at IS NULL
    RETURNING *
  `) as any;
  const retainer = result.rows?.[0];
  if (!retainer) return NextResponse.json({ error: "Retainer plan not found" }, { status: 404 });
  await auditPlatformBilling(access.user.id, "retainer_plan.deleted", id, { code: retainer.code, name: retainer.name });
  return NextResponse.json({ success: true, retainer });
}
