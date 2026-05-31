import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { getTenantAccess, tenantAccessResponse } from "@/lib/api/tenant-access";
import { db } from "@/lib/db";
import {
  activityLogs,
  appointments,
  auditLogs,
  departments,
  invoices,
  patients,
  payments,
  provisioningRuns,
  tenants,
  users,
  visits,
} from "@/lib/db/schema";

function toNumber(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const access = await getTenantAccess(request, slug);
    if (!access.ok) return tenantAccessResponse(access);

    const tenant = access.tenant;
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const [
      admin,
      usersList,
      userStats,
      usageStats,
      billingStats,
      recentInvoices,
      deptStats,
      recentActivity,
      recentAudit,
      provisioningHistory,
    ] = await Promise.all([
      tenant.adminUserId
        ? db.query.users.findFirst({
            where: eq(users.id, tenant.adminUserId),
            columns: { id: true, email: true, fullName: true, avatar: true, isActive: true },
          })
        : Promise.resolve(null),
      db
        .select({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          avatar: users.avatar,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.tenantId, tenant.id))
        .orderBy(desc(users.createdAt))
        .limit(20),
      db
        .select({
          total: sql<number>`count(*)`,
          active: sql<number>`count(case when ${users.isActive} = true then 1 end)`,
        })
        .from(users)
        .where(eq(users.tenantId, tenant.id)),
      db.$queryRaw`
        select
          (select count(*) from patients where tenant_id = ${tenant.id})::int as "totalPatients",
          (select count(*) from appointments where tenant_id = ${tenant.id})::int as "totalAppointments",
          (select count(*) from appointments where tenant_id = ${tenant.id} and scheduled_at >= current_date and scheduled_at < current_date + interval '1 day')::int as "todayAppointments",
          (select count(*) from visits where tenant_id = ${tenant.id})::int as "totalVisits",
          (select count(*) from departments where tenant_id = ${tenant.id})::int as departments,
          (select count(*) from activity_logs where tenant_id = ${tenant.id} and timestamp >= now() - interval '30 days')::int as "activity30d"
      `,
      db
        .select({
          totalBilled: sql<number>`coalesce(sum(cast(nullif(${invoices.totalAmount}, '') as numeric)), 0)`,
          totalPaid: sql<number>`coalesce(sum(case when lower(coalesce(${invoices.status}, '')) in ('paid', 'succeeded', 'success', 'completed', 'settled') then cast(nullif(${invoices.totalAmount}, '') as numeric) else 0 end), 0)`,
          pendingAmount: sql<number>`coalesce(sum(case when lower(coalesce(${invoices.status}, '')) not in ('paid', 'succeeded', 'success', 'completed', 'settled', 'void', 'cancelled', 'canceled') then cast(nullif(${invoices.totalAmount}, '') as numeric) else 0 end), 0)`,
          total: sql<number>`count(*)`,
          paid: sql<number>`count(case when lower(coalesce(${invoices.status}, '')) in ('paid', 'succeeded', 'success', 'completed', 'settled') then 1 end)`,
          pending: sql<number>`count(case when lower(coalesce(${invoices.status}, '')) in ('pending', 'open', 'draft') then 1 end)`,
          overdue: sql<number>`count(case when ${invoices.dueDate} < current_date and lower(coalesce(${invoices.status}, '')) not in ('paid', 'succeeded', 'success', 'completed', 'settled', 'void', 'cancelled', 'canceled') then 1 end)`,
        })
        .from(invoices)
        .where(eq(invoices.tenantId, tenant.id)),
      db
        .select({
          id: invoices.id,
          status: invoices.status,
          totalAmount: invoices.totalAmount,
          createdAt: invoices.createdAt,
          updatedAt: invoices.updatedAt,
        })
        .from(invoices)
        .where(eq(invoices.tenantId, tenant.id))
        .orderBy(desc(invoices.createdAt))
        .limit(8),
      db
        .select({
          id: departments.id,
          name: departments.name,
          staffCount: sql<number>`(select count(*) from users where users.tenant_id = ${tenant.id} and lower(coalesce(users.role, '')) != 'patient')`,
        })
        .from(departments)
        .where(eq(departments.tenantId, tenant.id))
        .orderBy(departments.name)
        .limit(12),
      db
        .select({
          id: activityLogs.id,
          action: activityLogs.action,
          description: activityLogs.description,
          status: activityLogs.status,
          timestamp: activityLogs.timestamp,
        })
        .from(activityLogs)
        .where(eq(activityLogs.tenantId, tenant.id))
        .orderBy(desc(activityLogs.timestamp))
        .limit(8),
      db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          entity: auditLogs.entity,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .where(eq(auditLogs.tenantId, tenant.id))
        .orderBy(desc(auditLogs.createdAt))
        .limit(8),
      db
        .select({
          id: provisioningRuns.id,
          status: provisioningRuns.status,
          stage: provisioningRuns.stage,
          errorMessage: provisioningRuns.errorMessage,
          startedAt: provisioningRuns.startedAt,
          completedAt: provisioningRuns.completedAt,
        })
        .from(provisioningRuns)
        .where(eq(provisioningRuns.tenantId, tenant.id))
        .orderBy(desc(provisioningRuns.startedAt))
        .limit(5),
    ]);

    const paymentStats = await db
      .select({
        total: sql<number>`coalesce(sum(cast(nullif(${payments.amount}, '') as numeric)), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(payments)
      .where(and(eq(payments.tenantId, tenant.id), sql`lower(coalesce(${payments.status}, '')) in ('paid', 'succeeded', 'success', 'completed', 'settled')`));

    const usage = usageStats[0] || {};
    const billing = billingStats[0] || {};
    const paidByPayments = toNumber(paymentStats[0]?.count) ? toNumber(paymentStats[0]?.total) : toNumber(billing.totalPaid);

    return NextResponse.json({
      success: true,
      tenant,
      admin,
      users: {
        count: toNumber(userStats[0]?.total),
        list: usersList,
        active: toNumber(userStats[0]?.active),
      },
      billing: {
        metrics: {
          totalBilled: toNumber(billing.totalBilled).toFixed(2),
          totalPaid: paidByPayments.toFixed(2),
          pendingAmount: toNumber(billing.pendingAmount).toFixed(2),
          paymentCount: toNumber(paymentStats[0]?.count),
        },
        invoiceStats: {
          total: toNumber(billing.total),
          paid: toNumber(billing.paid),
          pending: toNumber(billing.pending),
          overdue: toNumber(billing.overdue),
        },
        invoices: recentInvoices,
      },
      usage: {
        totalPatients: toNumber((usage as any).totalPatients),
        totalAppointments: toNumber((usage as any).totalAppointments),
        todayAppointments: toNumber((usage as any).todayAppointments),
        totalVisits: toNumber((usage as any).totalVisits),
        departments: toNumber((usage as any).departments),
        activity30d: toNumber((usage as any).activity30d),
      },
      departments: deptStats.map((department) => ({
        ...department,
        staffCount: toNumber(department.staffCount),
      })),
      recentActivity,
      recentAudit,
      provisioningHistory,
      lifecycle: {
        isDeleted: !!tenant.deletedAt,
        deletedAt: tenant.deletedAt,
        scheduledPurgeAt: tenant.scheduledPurgeAt,
        daysUntilPurge: tenant.scheduledPurgeAt
          ? Math.max(0, Math.ceil((new Date(tenant.scheduledPurgeAt).getTime() - Date.now()) / 86400000))
          : null,
      },
    });
  } catch (error) {
    console.error("Error fetching tenant details:", error);
    return NextResponse.json({ error: "Failed to fetch tenant details" }, { status: 500 });
  }
}
