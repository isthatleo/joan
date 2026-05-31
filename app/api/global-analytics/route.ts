import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { ensureDefaultSubscriptionPlans, requireSuperAdmin } from "@/lib/platform-billing";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const access = await requireSuperAdmin(request);
  if (!access.ok) return access.response;

  try {
    await ensureDefaultSubscriptionPlans(access.user.id);
    const startedAt = Date.now();
    const result = await db.execute(sql`
      WITH tenant_rollup AS (
        SELECT
          t.id,
          t.name,
          t.slug,
          t.plan,
          t.is_active,
          t.created_at,
          coalesce(pat.patient_count, 0)::int AS patients,
          coalesce(appt.appointment_count, 0)::int AS appointments,
          coalesce(vis.visit_count, 0)::int AS visits,
          coalesce(lab.lab_count, 0)::int AS lab_orders,
          coalesce(rx.prescription_count, 0)::int AS prescriptions,
          coalesce(sess.live_sessions, 0)::int AS live_sessions,
          coalesce(act.events_30d, 0)::int AS events_30d,
          coalesce(inv.patient_revenue, 0)::numeric AS patient_revenue,
          coalesce(pin.platform_revenue, 0)::numeric AS platform_revenue,
          coalesce(pin.open_invoices, 0)::int AS open_platform_invoices
        FROM tenants t
        LEFT JOIN (SELECT tenant_id, count(*) patient_count FROM patients WHERE deleted_at IS NULL GROUP BY tenant_id) pat ON pat.tenant_id = t.id
        LEFT JOIN (SELECT tenant_id, count(*) appointment_count FROM appointments WHERE deleted_at IS NULL GROUP BY tenant_id) appt ON appt.tenant_id = t.id
        LEFT JOIN (SELECT tenant_id, count(*) visit_count FROM visits WHERE deleted_at IS NULL GROUP BY tenant_id) vis ON vis.tenant_id = t.id
        LEFT JOIN (SELECT tenant_id, count(*) lab_count FROM lab_orders WHERE deleted_at IS NULL GROUP BY tenant_id) lab ON lab.tenant_id = t.id
        LEFT JOIN (SELECT tenant_id, count(*) prescription_count FROM prescriptions WHERE deleted_at IS NULL GROUP BY tenant_id) rx ON rx.tenant_id = t.id
        LEFT JOIN (SELECT tenant_id, count(*) live_sessions FROM user_sessions WHERE is_active = true AND logout_at IS NULL AND expires_at > now() GROUP BY tenant_id) sess ON sess.tenant_id = t.id
        LEFT JOIN (SELECT tenant_id, count(*) events_30d FROM activity_logs WHERE timestamp >= now() - interval '30 days' GROUP BY tenant_id) act ON act.tenant_id = t.id
        LEFT JOIN (SELECT tenant_id, sum(coalesce(nullif(total_amount, '')::numeric, 0)) patient_revenue FROM invoices WHERE deleted_at IS NULL GROUP BY tenant_id) inv ON inv.tenant_id = t.id
        LEFT JOIN (
          SELECT
            tenant_id,
            sum(total) platform_revenue,
            count(*) FILTER (WHERE status IN ('draft', 'sent', 'overdue')) open_invoices
          FROM platform_invoices
          WHERE deleted_at IS NULL
          GROUP BY tenant_id
        ) pin ON pin.tenant_id = t.id
        WHERE t.deleted_at IS NULL
      ),
      summary AS (
        SELECT
          count(*)::int AS total_hospitals,
          count(*) FILTER (WHERE is_active = true)::int AS active_hospitals,
          count(*) FILTER (WHERE created_at >= now() - interval '30 days')::int AS new_hospitals_30d,
          sum(patients)::int AS total_patients,
          sum(appointments)::int AS total_appointments,
          sum(visits)::int AS total_visits,
          sum(lab_orders)::int AS total_lab_orders,
          sum(prescriptions)::int AS total_prescriptions,
          sum(live_sessions)::int AS live_sessions,
          sum(events_30d)::int AS events_30d,
          sum(patient_revenue)::numeric AS patient_revenue,
          sum(platform_revenue)::numeric AS platform_revenue,
          sum(open_platform_invoices)::int AS open_platform_invoices
        FROM tenant_rollup
      ),
      invoice_summary AS (
        SELECT
          coalesce(sum(total) FILTER (WHERE issued_at >= date_trunc('month', now())), 0)::numeric AS platform_revenue_this_month,
          coalesce(sum(total) FILTER (
            WHERE issued_at >= date_trunc('month', now()) - interval '1 month'
              AND issued_at < date_trunc('month', now())
          ), 0)::numeric AS platform_revenue_last_month,
          coalesce(sum(amount_paid), 0)::numeric AS paid_platform_revenue,
          count(*) FILTER (WHERE status = 'overdue' OR (status != 'paid' AND due_at < now()))::int AS overdue_invoices
        FROM platform_invoices
        WHERE deleted_at IS NULL
      ),
      health AS (
        SELECT
          coalesce(avg(cpu_usage), 0)::numeric AS cpu,
          coalesce(avg(memory_usage), 0)::numeric AS memory,
          coalesce(avg(disk_usage), 0)::numeric AS disk,
          coalesce(avg(api_response_time), 0)::numeric AS latency
        FROM system_metrics
        WHERE timestamp >= now() - interval '24 hours'
      ),
      errors AS (
        SELECT
          count(*)::int AS security_events,
          count(*) FILTER (WHERE is_resolved = false)::int AS unresolved_security_events,
          count(*) FILTER (WHERE severity IN ('high', 'critical'))::int AS high_risk_events
        FROM security_events
        WHERE created_at >= now() - interval '30 days'
      )
      SELECT row_to_json(summary) AS summary, row_to_json(invoice_summary) AS invoices, row_to_json(health) AS health, row_to_json(errors) AS errors
      FROM summary, invoice_summary, health, errors
    `) as any;
    const row = result.rows?.[0] || {};
    const summary = row.summary || {};
    const invoices = row.invoices || {};
    const health = row.health || {};
    const errors = row.errors || {};
    const toNum = (value: any) => Number(value || 0);
    const pct = (current: number, previous: number) => previous > 0 ? Number((((current - previous) / previous) * 100).toFixed(1)) : current > 0 ? 100 : 0;

    const topTenantsResult = await db.execute(sql`
      WITH tenant_revenue AS (
        SELECT
          t.id,
          t.name,
          t.slug,
          t.plan,
          coalesce(pat.patients, 0)::int AS patients,
          coalesce(pin.platform_revenue, 0)::numeric AS platform_revenue,
          coalesce(inv.patient_revenue, 0)::numeric AS patient_revenue,
          coalesce(act.events_30d, 0)::int AS events_30d
        FROM tenants t
        LEFT JOIN (SELECT tenant_id, count(*) patients FROM patients WHERE deleted_at IS NULL GROUP BY tenant_id) pat ON pat.tenant_id = t.id
        LEFT JOIN (SELECT tenant_id, sum(total) platform_revenue FROM platform_invoices WHERE deleted_at IS NULL GROUP BY tenant_id) pin ON pin.tenant_id = t.id
        LEFT JOIN (SELECT tenant_id, sum(coalesce(nullif(total_amount, '')::numeric, 0)) patient_revenue FROM invoices WHERE deleted_at IS NULL GROUP BY tenant_id) inv ON inv.tenant_id = t.id
        LEFT JOIN (SELECT tenant_id, count(*) events_30d FROM activity_logs WHERE timestamp >= now() - interval '30 days' GROUP BY tenant_id) act ON act.tenant_id = t.id
        WHERE t.deleted_at IS NULL
      )
      SELECT *, (platform_revenue + patient_revenue) AS total_revenue
      FROM tenant_revenue
      ORDER BY (platform_revenue + patient_revenue) DESC, patients DESC
      LIMIT 8
    `) as any;

    const planResult = await db.execute(sql`
      SELECT
        coalesce(sp.name, t.plan, 'Unassigned') AS plan,
        count(distinct t.id)::int AS count,
        coalesce(sum(pi.total), 0)::numeric AS revenue,
        coalesce(sum(sp.monthly_price), 0)::numeric AS mrr_capacity
      FROM tenants t
      LEFT JOIN subscription_plans sp ON sp.code = t.plan OR sp.id::text = t.plan
      LEFT JOIN platform_invoices pi ON pi.tenant_id = t.id AND pi.deleted_at IS NULL
      WHERE t.deleted_at IS NULL
      GROUP BY coalesce(sp.name, t.plan, 'Unassigned')
      ORDER BY revenue DESC, count DESC
    `) as any;

    const activityResult = await db.execute(sql`
      SELECT id, action, description, status, timestamp
      FROM activity_logs
      ORDER BY timestamp DESC NULLS LAST
      LIMIT 8
    `) as any;

    const monthlyResult = await db.execute(sql`
      SELECT
        to_char(month_bucket, 'Mon YYYY') AS label,
        coalesce(sum(total), 0)::numeric AS revenue,
        count(id)::int AS invoices
      FROM generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') month_bucket
      LEFT JOIN platform_invoices pi
        ON pi.issued_at >= month_bucket
        AND pi.issued_at < month_bucket + interval '1 month'
        AND pi.deleted_at IS NULL
      GROUP BY month_bucket
      ORDER BY month_bucket
    `) as any;

    const platformRevenue = toNum(summary.platform_revenue);
    const patientRevenue = toNum(summary.patient_revenue);
    const totalRevenue = platformRevenue + patientRevenue;
    const currentMonth = toNum(invoices.platform_revenue_this_month);
    const previousMonth = toNum(invoices.platform_revenue_last_month);
    const errorRate = toNum(summary.events_30d) > 0 ? Number(((toNum(errors.security_events) / toNum(summary.events_30d)) * 100).toFixed(3)) : 0;
    const uptime = Number(Math.max(95, 100 - errorRate).toFixed(2));

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      queryLatencyMs: Date.now() - startedAt,
      totalHospitals: toNum(summary.total_hospitals),
      activeHospitals: toNum(summary.active_hospitals),
      newHospitals30d: toNum(summary.new_hospitals_30d),
      totalPatients: toNum(summary.total_patients),
      totalAppointments: toNum(summary.total_appointments),
      totalVisits: toNum(summary.total_visits),
      totalLabOrders: toNum(summary.total_lab_orders),
      totalPrescriptions: toNum(summary.total_prescriptions),
      activeUsers: toNum(summary.live_sessions),
      liveSessions: toNum(summary.live_sessions),
      totalRevenue,
      platformRevenue,
      patientRevenue,
      paidPlatformRevenue: toNum(invoices.paid_platform_revenue),
      openPlatformInvoices: toNum(summary.open_platform_invoices),
      overdueInvoices: toNum(invoices.overdue_invoices),
      monthlyRecurring: currentMonth,
      revenueTrend: pct(currentMonth, previousMonth),
      monthlyGrowth: pct(toNum(summary.new_hospitals_30d), Math.max(1, toNum(summary.total_hospitals) - toNum(summary.new_hospitals_30d))),
      systemUptime: uptime,
      uptime,
      systemLoad: Math.round((toNum(health.cpu) * 0.55) + (toNum(health.memory) * 0.45)),
      databaseHealth: Math.max(0, 100 - toNum(errors.unresolved_security_events)),
      apiLatency: Math.round(toNum(health.latency) || Date.now() - startedAt),
      activeRequests: toNum(summary.events_30d),
      errorRate,
      highRiskEvents: toNum(errors.high_risk_events),
      unresolvedSecurityEvents: toNum(errors.unresolved_security_events),
      planDistribution: (planResult.rows || []).map((plan: any) => ({
        plan: plan.plan,
        count: toNum(plan.count),
        revenue: toNum(plan.revenue),
        mrrCapacity: toNum(plan.mrr_capacity),
      })),
      topRevenueTenants: (topTenantsResult.rows || []).map((tenant: any) => ({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        patients: toNum(tenant.patients),
        revenue: toNum(tenant.total_revenue),
        platformRevenue: toNum(tenant.platform_revenue),
        patientRevenue: toNum(tenant.patient_revenue),
        activity: toNum(tenant.events_30d),
        growth: 0,
      })),
      revenueTrends: {
        thisMonth: currentMonth,
        lastMonth: previousMonth,
        growth: pct(currentMonth, previousMonth),
        target: Math.max(previousMonth * 1.15, currentMonth),
        months: (monthlyResult.rows || []).map((item: any) => ({
          label: item.label,
          revenue: toNum(item.revenue),
          invoices: toNum(item.invoices),
        })),
      },
      systemMetrics: [
        { label: "CPU Load", value: `${Math.round(toNum(health.cpu))}%`, status: toNum(health.cpu) > 80 ? "warning" : "excellent" },
        { label: "Memory Load", value: `${Math.round(toNum(health.memory))}%`, status: toNum(health.memory) > 80 ? "warning" : "good" },
        { label: "Disk Usage", value: `${Math.round(toNum(health.disk))}%`, status: toNum(health.disk) > 85 ? "warning" : "excellent" },
        { label: "API Latency", value: `${Math.round(toNum(health.latency) || Date.now() - startedAt)}ms`, status: toNum(health.latency) > 250 ? "warning" : "excellent" },
        { label: "Security Events", value: String(toNum(errors.security_events)), status: toNum(errors.high_risk_events) ? "warning" : "good" },
      ],
      hospitalPerformance: (topTenantsResult.rows || []).map((tenant: any) => ({
        id: tenant.id,
        name: tenant.name,
        patients: toNum(tenant.patients),
        revenue: toNum(tenant.total_revenue),
        growth: 0,
      })),
      recentActivity: (activityResult.rows || []).map((item: any) => ({
        id: item.id,
        type: item.status === "success" ? "success" : "warning",
        message: item.description || item.action,
        timestamp: item.timestamp ? new Date(item.timestamp).toISOString() : new Date().toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching global analytics:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
