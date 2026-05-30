import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import { requireTenantAdmin } from "@/lib/tenant-staff";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function rangeDays(range: string) {
  if (range === "7d") return 7;
  if (range === "90d") return 90;
  if (range === "1y") return 365;
  return 30;
}

function num(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const range = new URL(request.url).searchParams.get("timeRange") || "30d";
    const days = rangeDays(range);

    const [
      patientRows,
      appointmentRows,
      visitRows,
      staffRows,
      invoiceRows,
      paymentRows,
      claimRows,
      expenseRows,
      auditRows,
      dailyRows,
      statusRows,
      roleRows,
    ] = await Promise.all([
      db.execute(sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE created_at >= NOW() - (${days}::text || ' days')::interval)::int AS recent,
          COUNT(*) FILTER (WHERE status = 'active')::int AS active
        FROM patients
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
      `),
      db.execute(sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE scheduled_at >= NOW() - (${days}::text || ' days')::interval)::int AS recent,
          COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
          COUNT(*) FILTER (WHERE status IN ('cancelled', 'canceled', 'no_show'))::int AS missed
        FROM appointments
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
      `),
      db.execute(sql`
        SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE created_at >= NOW() - (${days}::text || ' days')::interval)::int AS recent
        FROM visits
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
      `),
      db.execute(sql`
        SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_active = true)::int AS active
        FROM users
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND role <> 'patient'
      `),
      db.execute(sql`
        SELECT
          COUNT(*)::int AS total,
          COALESCE(SUM(COALESCE(total_amount, amount, '0')::numeric), 0) AS billed,
          COALESCE(SUM(COALESCE(amount_due, '0')::numeric), 0) AS outstanding,
          COUNT(*) FILTER (WHERE status = 'paid')::int AS paid
        FROM invoices
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
      `),
      db.execute(sql`
        SELECT
          COUNT(*)::int AS total,
          COALESCE(SUM(amount::numeric) FILTER (WHERE status = 'completed'), 0) AS revenue,
          COALESCE(AVG(amount::numeric) FILTER (WHERE status = 'completed'), 0) AS average_payment
        FROM payments
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND created_at >= NOW() - (${days}::text || ' days')::interval
      `),
      db.execute(sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status IN ('approved', 'paid'))::int AS approved,
          COUNT(*) FILTER (WHERE status = 'denied')::int AS denied,
          COALESCE(SUM(claim_amount), 0) AS claimed,
          COALESCE(SUM(approved_amount), 0) AS approved_amount
        FROM claims
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
      `),
      db.execute(sql`
        SELECT COALESCE(SUM(amount), 0) AS expenses
        FROM expenses
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND expense_date >= CURRENT_DATE - (${days}::text || ' days')::interval
      `),
      db.execute(sql`
        SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE action ILIKE '%failed%' OR action ILIKE '%error%')::int AS risk_events
        FROM audit_logs
        WHERE tenant_id = ${tenantId} AND created_at >= NOW() - (${days}::text || ' days')::interval
      `),
      db.execute(sql`
        SELECT
          TO_CHAR(day, 'Mon DD') AS label,
          COALESCE(patients_count, 0)::int AS patients,
          COALESCE(appointments_count, 0)::int AS appointments,
          COALESCE(revenue_amount, 0) AS revenue
        FROM generate_series(CURRENT_DATE - (${Math.min(days, 30)}::text || ' days')::interval, CURRENT_DATE, '1 day') AS days(day)
        LEFT JOIN LATERAL (
          SELECT COUNT(*) AS patients_count FROM patients WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND created_at::date = day::date
        ) p ON true
        LEFT JOIN LATERAL (
          SELECT COUNT(*) AS appointments_count FROM appointments WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND scheduled_at::date = day::date
        ) a ON true
        LEFT JOIN LATERAL (
          SELECT COALESCE(SUM(amount::numeric), 0) AS revenue_amount FROM payments WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND status = 'completed' AND created_at::date = day::date
        ) pay ON true
      `),
      db.execute(sql`
        SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::int AS count
        FROM appointments
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND scheduled_at >= NOW() - (${days}::text || ' days')::interval
        GROUP BY status
        ORDER BY count DESC
      `),
      db.execute(sql`
        SELECT COALESCE(role, 'unknown') AS role, COUNT(*)::int AS count
        FROM users
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
        GROUP BY role
        ORDER BY count DESC
      `),
    ]);

    const patients = patientRows.rows[0] as any;
    const appointments = appointmentRows.rows[0] as any;
    const visits = visitRows.rows[0] as any;
    const staff = staffRows.rows[0] as any;
    const invoices = invoiceRows.rows[0] as any;
    const payments = paymentRows.rows[0] as any;
    const claims = claimRows.rows[0] as any;
    const expenses = expenseRows.rows[0] as any;
    const audit = auditRows.rows[0] as any;

    const totalRevenue = num(payments.revenue);
    const totalExpenses = num(expenses.expenses);
    const totalAppointments = num(appointments.total);
    const completedAppointments = num(appointments.completed);

    return NextResponse.json({
      range,
      generatedAt: new Date().toISOString(),
      metrics: {
        totalPatients: num(patients.total),
        newPatients: num(patients.recent),
        activePatients: num(patients.active),
        totalStaff: num(staff.total),
        activeStaff: num(staff.active),
        totalAppointments,
        recentAppointments: num(appointments.recent),
        completedAppointments,
        missedAppointments: num(appointments.missed),
        completionRate: pct(completedAppointments, totalAppointments),
        totalVisits: num(visits.total),
        recentVisits: num(visits.recent),
        totalRevenue,
        netRevenue: totalRevenue - totalExpenses,
        outstandingInvoices: num(invoices.outstanding),
        collectionRate: pct(num(invoices.paid), num(invoices.total)),
        averagePayment: num(payments.average_payment),
        claimApprovalRate: pct(num(claims.approved), num(claims.total)),
        claimDenialRate: pct(num(claims.denied), num(claims.total)),
        auditEvents: num(audit.total),
        riskEvents: num(audit.risk_events),
      },
      trends: dailyRows.rows.map((row: any) => ({
        label: row.label,
        patients: num(row.patients),
        appointments: num(row.appointments),
        revenue: num(row.revenue),
      })),
      appointmentStatus: statusRows.rows.map((row: any) => ({ status: row.status, count: num(row.count) })),
      roleMix: roleRows.rows.map((row: any) => ({ role: row.role, count: num(row.count) })),
      financial: {
        billed: num(invoices.billed),
        paidRevenue: totalRevenue,
        expenses: totalExpenses,
        outstanding: num(invoices.outstanding),
        claimsSubmitted: num(claims.total),
        claimsApproved: num(claims.approved),
        claimAmount: num(claims.claimed),
        approvedClaimAmount: num(claims.approved_amount),
      },
      insights: [
        { title: "Appointment completion", value: `${pct(completedAppointments, totalAppointments)}%`, detail: `${completedAppointments} of ${totalAppointments} appointments completed.` },
        { title: "Revenue position", value: totalRevenue - totalExpenses >= 0 ? "Positive" : "Deficit", detail: `${num(payments.total)} completed payment records in this period.` },
        { title: "Audit risk", value: `${num(audit.risk_events)} events`, detail: "Risk events are inferred from failed/error audit actions." },
      ],
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Error fetching tenant analytics:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
