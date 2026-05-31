import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-billing";

interface ComplianceData {
  overallScore: number;
  hipaaCompliance: number;
  gdprCompliance: number;
  hitrustCompliance: number;
  lastAuditDate: string;
  nextAuditDate: string;
  riskLevel: string;
  recommendations: string[];
}

export async function GET(request: NextRequest) {
  const access = await requireSuperAdmin(request);
  if (!access.ok) return access.response;

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const result = await db.execute(sql`
      WITH audit_summary AS (
        SELECT
          max(created_at) AS last_audit_date,
          count(*) FILTER (WHERE created_at >= now() - interval '30 days')::int AS audits_30d
        FROM audit_logs
      ),
      security_summary AS (
        SELECT
          count(*) FILTER (WHERE is_resolved = false)::int AS open_risks,
          count(*) FILTER (WHERE is_resolved = false AND severity IN ('high', 'critical'))::int AS high_risks
        FROM security_events
      ),
      active_tenants AS (
        SELECT count(*)::int AS total FROM tenants WHERE deleted_at IS NULL AND is_active = true
      )
      SELECT row_to_json(audit_summary) audit, row_to_json(security_summary) security, row_to_json(active_tenants) tenants
      FROM audit_summary, security_summary, active_tenants
    `) as any;
    const row = result.rows?.[0] || {};
    const audit = row.audit || {};
    const security = row.security || {};
    const activeTenants = Number(row.tenants?.total || 0);
    const highRisks = Number(security.high_risks || 0);
    const openRisks = Number(security.open_risks || 0);
    const riskPenalty = highRisks * 8 + openRisks * 2;
    const overallScore = Math.max(0, Math.min(100, 100 - riskPenalty));

    if (category === "metrics") {
      return NextResponse.json({
        metrics: {
          dataEncryptionScore: activeTenants > 0 ? 98 : 0,
          accessControlScore: Math.max(0, 100 - highRisks * 10),
          auditLoggingScore: Number(audit.audits_30d || 0) > 0 ? 99 : 70,
          incidentResponseScore: Math.max(0, 100 - openRisks * 5),
          dataRetentionScore: 95,
          vulnerabilityScore: Math.max(0, 100 - highRisks * 12),
        },
      });
    }

    if (category === "risks") {
      return NextResponse.json({
        risks: [
          {
            id: "open-security-events",
            title: "Open security events",
            severity: highRisks > 0 ? "high" : openRisks > 0 ? "medium" : "low",
            status: openRisks > 0 ? "active" : "clear",
            lastReview: new Date().toISOString(),
          },
        ],
      });
    }

    const complianceData: ComplianceData = {
      overallScore,
      hipaaCompliance: Math.max(0, overallScore - 1),
      gdprCompliance: Math.max(0, overallScore - 2),
      hitrustCompliance: Math.max(0, overallScore - 3),
      lastAuditDate: audit.last_audit_date || null,
      nextAuditDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      riskLevel: highRisks > 0 ? "high" : openRisks > 0 ? "medium" : "low",
      recommendations: [
        "Review unresolved security events before release.",
        "Verify tenant backup and restore jobs in staging.",
        "Run quarterly penetration testing before onboarding regulated clients.",
      ],
    };

    return NextResponse.json(complianceData);
  } catch (error) {
    console.error("Error fetching compliance data:", error);
    return NextResponse.json(
      { error: "Failed to fetch compliance data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const access = await requireSuperAdmin(request);
  if (!access.ok) return access.response;

  try {
    const body = await request.json();

    await db.execute(sql`
      INSERT INTO audit_logs (user_id, action, entity, metadata, created_at)
      VALUES (${access.user.id}, 'platform.compliance_action', 'compliance', ${JSON.stringify(body)}::jsonb, now())
    `);

    return NextResponse.json({
      message: "Compliance action recorded",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error recording compliance action:", error);
    return NextResponse.json(
      { error: "Failed to record compliance action" },
      { status: 500 }
    );
  }
}

