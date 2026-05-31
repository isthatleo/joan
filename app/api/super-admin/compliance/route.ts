import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-billing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function rowsOf<T = any>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  return ((result as any)?.rows || []) as T[];
}

function num(value: unknown) {
  return Number(value || 0);
}

function scoreFromDeductions(...deductions: number[]) {
  return Math.max(0, Math.min(100, Math.round(100 - deductions.reduce((sum, value) => sum + value, 0))));
}

export async function GET(request: NextRequest) {
  const guard = await requireSuperAdmin(request);
  if (!guard.ok) return guard.response;

  try {
    const [summaryResult, tenantResult, securityResult, activityResult, feedbackResult] = await Promise.all([
      db.execute(sql`
        SELECT
          (SELECT COUNT(*) FROM tenants WHERE deleted_at IS NULL) AS total_tenants,
          (SELECT COUNT(*) FROM tenants WHERE deleted_at IS NULL AND is_active = true) AS active_tenants,
          (SELECT COUNT(*) FROM tenants WHERE deleted_at IS NULL AND is_active = false) AS inactive_tenants,
          (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND is_active = true) AS active_users,
          (SELECT COUNT(*) FROM audit_logs) AS audit_events,
          (SELECT COUNT(*) FROM activity_logs WHERE deleted_at IS NULL) AS activity_events,
          (SELECT COUNT(*) FROM activity_logs WHERE deleted_at IS NULL AND lower(coalesce(status, 'success')) <> 'success') AS failed_activity_events,
          (SELECT COUNT(*) FROM security_events WHERE deleted_at IS NULL AND coalesce(is_resolved, false) = false) AS open_security_events,
          (SELECT COUNT(*) FROM security_events WHERE deleted_at IS NULL AND coalesce(is_resolved, false) = false AND lower(coalesce(severity, 'medium')) IN ('high', 'critical')) AS critical_security_events,
          (SELECT COUNT(*) FROM system_alerts WHERE deleted_at IS NULL AND coalesce(is_resolved, false) = false) AS open_system_alerts,
          (SELECT COUNT(*) FROM feedbacks WHERE deleted_at IS NULL AND scope = 'platform' AND status NOT IN ('resolved', 'closed')) AS open_platform_feedback,
          (SELECT COUNT(*) FROM integrations WHERE deleted_at IS NULL AND coalesce(is_active, false) = true) AS active_integrations
      `),
      db.execute(sql`
        SELECT
          t.id,
          t.name,
          t.slug,
          t.is_active,
          t.plan,
          COUNT(DISTINCT u.id) AS users_count,
          COUNT(DISTINCT se.id) FILTER (WHERE coalesce(se.is_resolved, false) = false) AS open_security_events,
          COUNT(DISTINCT se.id) FILTER (WHERE coalesce(se.is_resolved, false) = false AND lower(coalesce(se.severity, 'medium')) IN ('high', 'critical')) AS critical_security_events,
          COUNT(DISTINCT sa.id) FILTER (WHERE coalesce(sa.is_resolved, false) = false) AS open_alerts,
          COUNT(DISTINCT al.id) FILTER (WHERE lower(coalesce(al.status, 'success')) <> 'success') AS failed_activity,
          MAX(al.timestamp) AS last_activity_at
        FROM tenants t
        LEFT JOIN users u ON u.tenant_id = t.id AND u.deleted_at IS NULL
        LEFT JOIN security_events se ON se.tenant_id = t.id AND se.deleted_at IS NULL
        LEFT JOIN system_alerts sa ON sa.tenant_id = t.id AND sa.deleted_at IS NULL
        LEFT JOIN activity_logs al ON al.tenant_id = t.id AND al.deleted_at IS NULL AND al.timestamp >= now() - interval '30 days'
        WHERE t.deleted_at IS NULL
        GROUP BY t.id, t.name, t.slug, t.is_active, t.plan
        ORDER BY critical_security_events DESC, open_security_events DESC, failed_activity DESC, t.name ASC
        LIMIT 50
      `),
      db.execute(sql`
        SELECT
          se.id,
          se.event_type,
          se.severity,
          se.description,
          se.ip_address,
          se.is_resolved,
          se.created_at,
          t.name AS tenant_name,
          t.slug AS tenant_slug,
          u.full_name AS user_name,
          u.email AS user_email
        FROM security_events se
        LEFT JOIN tenants t ON t.id = se.tenant_id
        LEFT JOIN users u ON u.id = se.user_id
        WHERE se.deleted_at IS NULL
        ORDER BY se.created_at DESC
        LIMIT 15
      `),
      db.execute(sql`
        SELECT
          al.id,
          al.action,
          al.resource,
          al.status,
          al.description,
          al.ip_address,
          al.timestamp,
          t.name AS tenant_name,
          t.slug AS tenant_slug,
          u.full_name AS user_name,
          u.email AS user_email
        FROM activity_logs al
        LEFT JOIN tenants t ON t.id = al.tenant_id
        LEFT JOIN users u ON u.id = al.user_id
        WHERE al.deleted_at IS NULL
        ORDER BY al.timestamp DESC
        LIMIT 20
      `),
      db.execute(sql`
        SELECT
          f.id,
          f.title,
          f.type,
          f.priority,
          f.status,
          f.created_at,
          f.user_name,
          f.user_email,
          t.name AS tenant_name,
          t.slug AS tenant_slug
        FROM feedbacks f
        LEFT JOIN tenants t ON t.id = f.tenant_id
        WHERE f.deleted_at IS NULL
          AND f.scope = 'platform'
        ORDER BY f.created_at DESC
        LIMIT 12
      `),
    ]);

    const summary = rowsOf(summaryResult)[0] || {};
    const totalTenants = num(summary.total_tenants);
    const inactiveTenants = num(summary.inactive_tenants);
    const criticalSecurity = num(summary.critical_security_events);
    const openSecurity = num(summary.open_security_events);
    const failedActivity = num(summary.failed_activity_events);
    const openAlerts = num(summary.open_system_alerts);
    const auditEvents = num(summary.audit_events) + num(summary.activity_events);

    const hipaa = scoreFromDeductions(criticalSecurity * 8, openSecurity * 2, failedActivity * 0.1);
    const gdpr = scoreFromDeductions(inactiveTenants * 2, num(summary.open_platform_feedback), openAlerts * 1.5);
    const auditReadiness = auditEvents > 0 ? scoreFromDeductions(failedActivity * 0.15, criticalSecurity * 5) : 55;
    const security = scoreFromDeductions(criticalSecurity * 10, openSecurity * 3, openAlerts * 2);
    const overall = Math.round((hipaa + gdpr + auditReadiness + security) / 4);

    const checks = [
      {
        id: "audit-coverage",
        category: "Audit Coverage",
        requirement: "Every tenant action must be traceable from platform and tenant audit sources.",
        status: auditEvents > 0 ? "compliant" : "warning",
        severity: auditEvents > 0 ? "low" : "high",
        score: auditReadiness,
        details: `${auditEvents.toLocaleString()} audit/activity events available across the platform.`,
      },
      {
        id: "security-events",
        category: "Security Monitoring",
        requirement: "Critical security events must be visible and unresolved events must be tracked.",
        status: criticalSecurity > 0 ? "non_compliant" : openSecurity > 0 ? "warning" : "compliant",
        severity: criticalSecurity > 0 ? "high" : openSecurity > 0 ? "medium" : "low",
        score: security,
        details: `${openSecurity.toLocaleString()} open security events, ${criticalSecurity.toLocaleString()} critical/high.`,
      },
      {
        id: "tenant-access",
        category: "Tenant Access",
        requirement: "Inactive and archived tenants must not be accessible to users.",
        status: inactiveTenants > 0 ? "warning" : "compliant",
        severity: inactiveTenants > 0 ? "medium" : "low",
        score: totalTenants ? scoreFromDeductions(inactiveTenants * 3) : 100,
        details: `${inactiveTenants.toLocaleString()} inactive tenants out of ${totalTenants.toLocaleString()} total.`,
      },
      {
        id: "incident-feedback",
        category: "Incident Feedback",
        requirement: "Platform feedback and operational incidents must be triaged.",
        status: num(summary.open_platform_feedback) > 0 ? "warning" : "compliant",
        severity: num(summary.open_platform_feedback) > 5 ? "high" : "medium",
        score: scoreFromDeductions(num(summary.open_platform_feedback) * 3),
        details: `${num(summary.open_platform_feedback).toLocaleString()} unresolved platform feedback items.`,
      },
    ];

    const tenants = rowsOf(tenantResult).map((tenant: any) => {
      const riskScore = Math.min(
        100,
        num(tenant.critical_security_events) * 25 +
          num(tenant.open_security_events) * 8 +
          num(tenant.failed_activity) * 2 +
          num(tenant.open_alerts) * 5 +
          (!tenant.is_active ? 10 : 0)
      );
      return {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        isActive: tenant.is_active,
        usersCount: num(tenant.users_count),
        openSecurityEvents: num(tenant.open_security_events),
        criticalSecurityEvents: num(tenant.critical_security_events),
        openAlerts: num(tenant.open_alerts),
        failedActivity: num(tenant.failed_activity),
        lastActivityAt: tenant.last_activity_at,
        riskScore,
        riskLevel: riskScore >= 60 ? "high" : riskScore >= 25 ? "medium" : "low",
      };
    });

    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        status: { overall, hipaa, gdpr, auditReadiness, security },
        summary: {
          totalTenants,
          activeTenants: num(summary.active_tenants),
          inactiveTenants,
          activeUsers: num(summary.active_users),
          auditEvents,
          failedActivity,
          openSecurityEvents: openSecurity,
          criticalSecurityEvents: criticalSecurity,
          openSystemAlerts: openAlerts,
          openPlatformFeedback: num(summary.open_platform_feedback),
          activeIntegrations: num(summary.active_integrations),
        },
        checks,
        tenantMatrix: tenants,
        highRiskTenants: tenants.filter((tenant) => tenant.riskLevel !== "low").slice(0, 10),
        recentSecurityEvents: rowsOf(securityResult),
        recentActivity: rowsOf(activityResult),
        platformFeedback: rowsOf(feedbackResult),
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("[super-admin/compliance] failed:", error);
    return NextResponse.json({ error: "Failed to load compliance data" }, { status: 500 });
  }
}
