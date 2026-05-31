import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  activityLogs,
  appointments,
  auditLogs,
  feedbacks,
  integrations,
  patients,
  roles,
  securityEvents,
  tenants,
  userRoles,
  userSessions,
  users,
} from "@/lib/db/schema";

function toNumber(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function percentChange(current: number, previous: number) {
  if (!previous) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
}

function selectPlatformRevenue(stats: any) {
  const paymentCount = toNumber(stats?.paymentCount);
  return {
    total: paymentCount ? toNumber(stats?.paymentTotal) : toNumber(stats?.invoiceTotal),
    today: paymentCount ? toNumber(stats?.paymentToday) : toNumber(stats?.invoiceToday),
    yesterday: paymentCount ? toNumber(stats?.paymentYesterday) : toNumber(stats?.invoiceYesterday),
    thisMonth: paymentCount ? toNumber(stats?.paymentThisMonth) : toNumber(stats?.invoiceThisMonth),
    previousMonth: paymentCount ? toNumber(stats?.paymentPreviousMonth) : toNumber(stats?.invoicePreviousMonth),
    transactionCount: paymentCount || toNumber(stats?.paidInvoiceCount),
    source: paymentCount ? "payments" : "paid_invoices",
  };
}

async function requireSuperAdmin(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.email && !session?.user?.id) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const appUser = await db.query.users.findFirst({
    where: session.user.email ? eq(users.email, session.user.email) : eq(users.id, session.user.id),
    columns: { id: true, role: true, isActive: true },
  });

  if (!appUser?.isActive) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const assignedRoles = await db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, appUser.id))
    .catch(() => []);

  const roleNames = new Set([appUser.role, ...assignedRoles.map((role) => role.name)].map((role) => String(role || "").toLowerCase()));
  if (!roleNames.has("super_admin")) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true as const, userId: appUser.id };
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireSuperAdmin(request);
    if (!access.ok) return access.response;

    const startedAt = Date.now();
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(dayStart);
    tomorrowStart.setDate(dayStart.getDate() + 1);
    const yesterdayStart = new Date(dayStart);
    yesterdayStart.setDate(dayStart.getDate() - 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last24Hours = new Date(now);
    last24Hours.setDate(now.getDate() - 1);
    const last30Days = new Date(now);
    last30Days.setDate(now.getDate() - 30);

    const [
      tenantStats,
      patientStats,
      userStats,
      appointmentStats,
      activityStats,
      sessionStats,
      securityStats,
      feedbackStats,
      integrationStats,
      roleStats,
    ] = await Promise.all([
      db
        .select({
          total: sql<number>`count(*)`,
          active: sql<number>`count(case when ${tenants.isActive} = true then 1 end)`,
          inactive: sql<number>`count(case when ${tenants.isActive} = false then 1 end)`,
          newThisMonth: sql<number>`count(case when ${tenants.createdAt} >= ${monthStart} then 1 end)`,
          newPreviousMonth: sql<number>`count(case when ${tenants.createdAt} >= ${previousMonthStart} and ${tenants.createdAt} < ${monthStart} then 1 end)`,
        })
        .from(tenants),
      db
        .select({
          total: sql<number>`count(*)`,
          newThisMonth: sql<number>`count(case when ${patients.createdAt} >= ${monthStart} then 1 end)`,
          newPreviousMonth: sql<number>`count(case when ${patients.createdAt} >= ${previousMonthStart} and ${patients.createdAt} < ${monthStart} then 1 end)`,
        })
        .from(patients),
      db
        .select({
          total: sql<number>`count(*)`,
          active: sql<number>`count(case when ${users.isActive} = true then 1 end)`,
        })
        .from(users),
      db
        .select({
          today: sql<number>`count(case when ${appointments.scheduledAt} >= ${dayStart} and ${appointments.scheduledAt} < ${tomorrowStart} then 1 end)`,
          yesterday: sql<number>`count(case when ${appointments.scheduledAt} >= ${yesterdayStart} and ${appointments.scheduledAt} < ${dayStart} then 1 end)`,
          completedToday: sql<number>`count(case when ${appointments.scheduledAt} >= ${dayStart} and ${appointments.scheduledAt} < ${tomorrowStart} and ${appointments.status} = 'completed' then 1 end)`,
        })
        .from(appointments),
      db
        .select({
          events24h: sql<number>`count(case when ${activityLogs.timestamp} >= ${last24Hours} then 1 end)`,
          activeUsers24h: sql<number>`count(distinct case when ${activityLogs.timestamp} >= ${last24Hours} then ${activityLogs.userId} end)`,
          failures24h: sql<number>`count(case when ${activityLogs.timestamp} >= ${last24Hours} and coalesce(${activityLogs.status}, 'success') != 'success' then 1 end)`,
        })
        .from(activityLogs),
      db
        .select({
          activeSessions: sql<number>`count(distinct ${userSessions.userId})`,
          activeSessions24h: sql<number>`count(distinct case when ${userSessions.lastActivityAt} >= ${last24Hours} then ${userSessions.userId} end)`,
        })
        .from(userSessions)
        .where(and(
          eq(userSessions.isActive, true),
          sql`${userSessions.expiresAt} > ${now}`,
          sql`${userSessions.logoutAt} is null`
        )),
      db
        .select({
          total: sql<number>`count(*)`,
          unresolved: sql<number>`count(case when ${securityEvents.isResolved} = false then 1 end)`,
          critical: sql<number>`count(case when lower(coalesce(${securityEvents.severity}, '')) in ('critical', 'high') and ${securityEvents.isResolved} = false then 1 end)`,
        })
        .from(securityEvents),
      db
        .select({
          open: sql<number>`count(case when lower(${feedbacks.status}) in ('open', 'pending', 'in_progress') then 1 end)`,
          urgent: sql<number>`count(case when lower(${feedbacks.priority}) in ('urgent', 'high') and lower(${feedbacks.status}) not in ('resolved', 'closed') then 1 end)`,
        })
        .from(feedbacks),
      db
        .select({
          total: sql<number>`count(*)`,
          active: sql<number>`count(case when ${integrations.isActive} = true then 1 end)`,
          errors: sql<number>`count(case when lower(coalesce(${integrations.status}, '')) = 'error' then 1 end)`,
        })
        .from(integrations),
      db.select({ total: sql<number>`count(*)` }).from(roles),
    ]);

    const [platformRevenueStats] = await db.$queryRaw`
      WITH platform_invoice_source AS (
        SELECT id, tenant_id, status, due_date, created_at, CAST(NULLIF(total_amount, '') AS NUMERIC) AS amount
        FROM invoices
        WHERE patient_id IS NULL
          AND deleted_at IS NULL
          AND lower(coalesce(status, '')) NOT IN ('void', 'cancelled', 'canceled')
        UNION ALL
        SELECT id, tenant_id, status, due_at::date AS due_date, created_at, total AS amount
        FROM platform_invoices
        WHERE deleted_at IS NULL
          AND lower(coalesce(status, '')) NOT IN ('void', 'cancelled', 'canceled')
      ),
      platform_payments AS (
        SELECT p.id, p.created_at, p.status, CAST(NULLIF(p.amount, '') AS NUMERIC) AS amount
        FROM payments p
        INNER JOIN platform_invoice_source i ON i.id = p.invoice_id
        WHERE p.deleted_at IS NULL
          AND lower(coalesce(p.status, '')) IN ('paid', 'succeeded', 'success', 'completed', 'settled')
      )
      SELECT
        (SELECT count(*) FROM platform_payments)::int AS "paymentCount",
        (SELECT coalesce(sum(amount), 0) FROM platform_payments)::numeric AS "paymentTotal",
        (SELECT coalesce(sum(case when created_at >= ${dayStart} then amount else 0 end), 0) FROM platform_payments)::numeric AS "paymentToday",
        (SELECT coalesce(sum(case when created_at >= ${yesterdayStart} and created_at < ${dayStart} then amount else 0 end), 0) FROM platform_payments)::numeric AS "paymentYesterday",
        (SELECT coalesce(sum(case when created_at >= ${monthStart} then amount else 0 end), 0) FROM platform_payments)::numeric AS "paymentThisMonth",
        (SELECT coalesce(sum(case when created_at >= ${previousMonthStart} and created_at < ${monthStart} then amount else 0 end), 0) FROM platform_payments)::numeric AS "paymentPreviousMonth",
        (SELECT count(*) FROM platform_invoice_source WHERE lower(coalesce(status, '')) IN ('paid', 'succeeded', 'success', 'completed', 'settled'))::int AS "paidInvoiceCount",
        (SELECT coalesce(sum(amount), 0) FROM platform_invoice_source WHERE lower(coalesce(status, '')) IN ('paid', 'succeeded', 'success', 'completed', 'settled'))::numeric AS "invoiceTotal",
        (SELECT coalesce(sum(case when created_at >= ${dayStart} then amount else 0 end), 0) FROM platform_invoice_source WHERE lower(coalesce(status, '')) IN ('paid', 'succeeded', 'success', 'completed', 'settled'))::numeric AS "invoiceToday",
        (SELECT coalesce(sum(case when created_at >= ${yesterdayStart} and created_at < ${dayStart} then amount else 0 end), 0) FROM platform_invoice_source WHERE lower(coalesce(status, '')) IN ('paid', 'succeeded', 'success', 'completed', 'settled'))::numeric AS "invoiceYesterday",
        (SELECT coalesce(sum(case when created_at >= ${monthStart} then amount else 0 end), 0) FROM platform_invoice_source WHERE lower(coalesce(status, '')) IN ('paid', 'succeeded', 'success', 'completed', 'settled'))::numeric AS "invoiceThisMonth",
        (SELECT coalesce(sum(case when created_at >= ${previousMonthStart} and created_at < ${monthStart} then amount else 0 end), 0) FROM platform_invoice_source WHERE lower(coalesce(status, '')) IN ('paid', 'succeeded', 'success', 'completed', 'settled'))::numeric AS "invoicePreviousMonth",
        (SELECT count(*) FROM platform_invoice_source WHERE lower(coalesce(status, '')) NOT IN ('paid', 'succeeded', 'success', 'completed', 'settled', 'void', 'cancelled', 'canceled'))::int AS "openInvoices",
        (SELECT count(*) FROM platform_invoice_source WHERE due_date < current_date AND lower(coalesce(status, '')) NOT IN ('paid', 'succeeded', 'success', 'completed', 'settled', 'void', 'cancelled', 'canceled'))::int AS "overdueInvoices"
    `;
    const platformRevenue = selectPlatformRevenue(platformRevenueStats);

    const topHospitals = await db.$queryRaw`
      SELECT
        t.id,
        t.name,
        t.slug,
        t.plan,
        t.is_active AS "isActive",
        COALESCE(p.patient_count, 0)::int AS "patientCount",
        COALESCE(u.staff_count, 0)::int AS "staffCount",
        COALESCE(i.revenue, 0)::numeric AS revenue
      FROM tenants t
      LEFT JOIN (
        SELECT tenant_id, COUNT(*) AS patient_count
        FROM patients
        GROUP BY tenant_id
      ) p ON p.tenant_id = t.id
      LEFT JOIN (
        SELECT tenant_id, COUNT(*) AS staff_count
        FROM users
        GROUP BY tenant_id
      ) u ON u.tenant_id = t.id
      LEFT JOIN (
        SELECT tenant_id, COALESCE(SUM(revenue), 0) AS revenue
        FROM (
          SELECT tenant_id, COALESCE(SUM(CAST(NULLIF(total_amount, '') AS NUMERIC)), 0) AS revenue
          FROM invoices
          WHERE patient_id IS NULL
            AND deleted_at IS NULL
            AND lower(coalesce(status, '')) IN ('paid', 'succeeded', 'success', 'completed', 'settled')
          GROUP BY tenant_id
          UNION ALL
          SELECT tenant_id, COALESCE(SUM(total), 0) AS revenue
          FROM platform_invoices
          WHERE deleted_at IS NULL
            AND lower(coalesce(status, '')) IN ('paid', 'succeeded', 'success', 'completed', 'settled')
          GROUP BY tenant_id
        ) revenue_source
        GROUP BY tenant_id
      ) i ON i.tenant_id = t.id
      ORDER BY COALESCE(i.revenue, 0) DESC, t.created_at DESC
      LIMIT 6
    `;

    const planDistribution = await db
      .select({
        plan: tenants.plan,
        count: sql<number>`count(*)`,
        active: sql<number>`count(case when ${tenants.isActive} = true then 1 end)`,
      })
      .from(tenants)
      .groupBy(tenants.plan);

    const recentAudit = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entity: auditLogs.entity,
        entityId: auditLogs.entityId,
        createdAt: auditLogs.createdAt,
        userName: users.fullName,
        userEmail: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(8);

    const recentActivity = await db
      .select({
        id: activityLogs.id,
        action: activityLogs.action,
        resource: activityLogs.resource,
        description: activityLogs.description,
        status: activityLogs.status,
        timestamp: activityLogs.timestamp,
        userName: users.fullName,
        userEmail: users.email,
      })
      .from(activityLogs)
      .leftJoin(users, eq(users.id, activityLogs.userId))
      .where(gte(activityLogs.timestamp, last30Days))
      .orderBy(desc(activityLogs.timestamp))
      .limit(8);

    const memory = process.memoryUsage();
    const memoryUsage = memory.heapTotal ? Math.round((memory.heapUsed / memory.heapTotal) * 100) : 0;
    const memoryUsedMb = Number((memory.heapUsed / 1024 / 1024).toFixed(1));
    const memoryTotalMb = Number((memory.heapTotal / 1024 / 1024).toFixed(1));
    const apiLatency = Date.now() - startedAt;
    const uptimeSeconds = Math.floor(process.uptime());
    const uptimeLabel = formatUptime(uptimeSeconds);
    const failureRate = toNumber(activityStats[0]?.events24h)
      ? Number(((toNumber(activityStats[0]?.failures24h) / toNumber(activityStats[0]?.events24h)) * 100).toFixed(2))
      : 0;
    const databaseHealth = Math.max(0, Math.min(100, 100 - toNumber(securityStats[0]?.critical) * 10 - toNumber(integrationStats[0]?.errors) * 5));
    const activeSessionUsers = toNumber(sessionStats[0]?.activeSessions);
    const activeSessionUsers24h = toNumber(sessionStats[0]?.activeSessions24h);
    const activeActivityUsers24h = toNumber(activityStats[0]?.activeUsers24h);
    const activeAccountUsers = toNumber(userStats[0]?.active);
    const activeUsersDisplay = activeSessionUsers24h || activeSessionUsers || activeActivityUsers24h || activeAccountUsers;

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      metrics: {
        hospitals: {
          total: toNumber(tenantStats[0]?.total),
          active: toNumber(tenantStats[0]?.active),
          inactive: toNumber(tenantStats[0]?.inactive),
          trend: percentChange(toNumber(tenantStats[0]?.newThisMonth), toNumber(tenantStats[0]?.newPreviousMonth)),
        },
        patients: {
          total: toNumber(patientStats[0]?.total),
          trend: percentChange(toNumber(patientStats[0]?.newThisMonth), toNumber(patientStats[0]?.newPreviousMonth)),
        },
        users: {
          total: toNumber(userStats[0]?.total),
          active: activeAccountUsers,
          active24h: activeUsersDisplay,
          activeSessions: activeSessionUsers,
          activeFromActivity24h: activeActivityUsers24h,
        },
        revenue: {
          total: platformRevenue.total,
          today: platformRevenue.today,
          thisMonth: platformRevenue.thisMonth,
          trend: percentChange(platformRevenue.thisMonth, platformRevenue.previousMonth),
          transactionCount: platformRevenue.transactionCount,
          source: platformRevenue.source,
        },
        appointments: {
          today: toNumber(appointmentStats[0]?.today),
          completedToday: toNumber(appointmentStats[0]?.completedToday),
          trend: percentChange(toNumber(appointmentStats[0]?.today), toNumber(appointmentStats[0]?.yesterday)),
        },
        invoices: {
          open: toNumber(platformRevenueStats?.openInvoices),
          overdue: toNumber(platformRevenueStats?.overdueInvoices),
        },
        risk: {
          unresolvedSecurityEvents: toNumber(securityStats[0]?.unresolved),
          criticalSecurityEvents: toNumber(securityStats[0]?.critical),
          openFeedback: toNumber(feedbackStats[0]?.open),
          urgentFeedback: toNumber(feedbackStats[0]?.urgent),
          integrationErrors: toNumber(integrationStats[0]?.errors),
        },
        platform: {
          uptime: uptimeSeconds,
          uptimeLabel,
          apiLatency,
          memoryUsage,
          memoryUsedMb,
          memoryTotalMb,
          databaseHealth,
          failureRate,
          eventVolume24h: toNumber(activityStats[0]?.events24h),
          integrationsActive: toNumber(integrationStats[0]?.active),
          integrationsTotal: toNumber(integrationStats[0]?.total),
          rolesTotal: toNumber(roleStats[0]?.total),
        },
      },
      topHospitals: (topHospitals as any[]).map((tenant) => ({
        ...tenant,
        patientCount: toNumber(tenant.patientCount),
        staffCount: toNumber(tenant.staffCount),
        revenue: toNumber(tenant.revenue),
      })),
      planDistribution: planDistribution.map((plan) => ({
        plan: plan.plan || "Unassigned",
        count: toNumber(plan.count),
        active: toNumber(plan.active),
      })),
      recentActivity: recentActivity.map((item) => ({
        id: item.id,
        action: item.description || item.action,
        actor: item.userName || item.userEmail || "System",
        resource: item.resource || "platform",
        status: item.status || "success",
        timestamp: item.timestamp ? new Date(item.timestamp).toISOString() : new Date().toISOString(),
      })),
      recentAudit: recentAudit.map((item) => ({
        id: item.id,
        action: item.action || "audit.event",
        entity: item.entity || "system",
        entityId: item.entityId,
        actor: item.userName || item.userEmail || "System",
        timestamp: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
      })),
      systemHealth: [
        { name: "API Gateway", status: apiLatency > 250 ? "degraded" : "operational", value: `${apiLatency}ms`, score: Math.max(0, 100 - apiLatency / 5) },
        { name: "Database", status: databaseHealth < 90 ? "attention" : "operational", value: `${databaseHealth}%`, score: databaseHealth },
        { name: "Memory", status: memoryUsage > 85 ? "degraded" : "operational", value: `${memoryUsage}%`, score: Math.max(0, 100 - memoryUsage) },
        { name: "Integrations", status: toNumber(integrationStats[0]?.errors) ? "attention" : "operational", value: `${toNumber(integrationStats[0]?.active)}/${toNumber(integrationStats[0]?.total)} active`, score: toNumber(integrationStats[0]?.total) ? (toNumber(integrationStats[0]?.active) / toNumber(integrationStats[0]?.total)) * 100 : 100 },
      ],
    });
  } catch (error) {
    console.error("[super-admin dashboard]", error);
    return NextResponse.json({ error: "Failed to load super admin dashboard" }, { status: 500 });
  }
}
