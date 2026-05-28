import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, notifications } from "@/lib/db/schema";
import { getTenantAccess, tenantAccessResponse } from "@/lib/api/tenant-access";
import { getTenantSecuritySettings } from "@/lib/tenant-security";
import { getTenantComplianceSettings, normalizeTenantComplianceSettings, upsertTenantComplianceSettings } from "@/lib/tenant-compliance";

type Finding = {
  id: string;
  status: "pass" | "review" | "fail";
  control: string;
  detail: string;
  framework: "HIPAA" | "GDPR" | "WHO" | "Operations";
};

function buildFindings(compliance: ReturnType<typeof normalizeTenantComplianceSettings>, security: Awaited<ReturnType<typeof getTenantSecuritySettings>>) {
  const findings: Finding[] = [];

  findings.push({
    id: "hipaa-audit",
    status: compliance.auditLoggingEnabled && security.auditAllAccess ? "pass" : "fail",
    control: "Audit logging",
    detail: compliance.auditLoggingEnabled && security.auditAllAccess ? "Audit logging is enabled for tenant activity." : "Audit logging is not fully enabled for tenant activity.",
    framework: "HIPAA",
  });
  findings.push({
    id: "hipaa-encryption",
    status: compliance.encryptionAtRest && compliance.encryptionInTransit && security.encryptDataAtRest && security.encryptDataInTransit ? "pass" : "fail",
    control: "Encryption safeguards",
    detail: compliance.encryptionAtRest && compliance.encryptionInTransit ? "Encryption controls are enabled at rest and in transit." : "Encryption controls require review.",
    framework: "HIPAA",
  });
  findings.push({
    id: "hipaa-minimum-necessary",
    status: compliance.minimumNecessaryAccess && compliance.phiAccessControls ? "pass" : "review",
    control: "Minimum necessary access",
    detail: compliance.minimumNecessaryAccess ? "Minimum-necessary policy is enabled." : "Minimum-necessary access policy is disabled.",
    framework: "HIPAA",
  });
  findings.push({
    id: "gdpr-rights",
    status: compliance.dataSubjectRights && compliance.dataPortability ? "pass" : "review",
    control: "Data subject rights",
    detail: compliance.dataSubjectRights ? "Access/rectification/portability controls are enabled." : "Data subject rights workflow is incomplete.",
    framework: "GDPR",
  });
  findings.push({
    id: "gdpr-consent",
    status: compliance.consentManagement ? "pass" : "review",
    control: "Consent management",
    detail: compliance.consentManagement ? "Consent management tracking is enabled." : "Consent management should be enabled for regulated processing.",
    framework: "GDPR",
  });
  findings.push({
    id: "who-safety",
    status: compliance.whoGuidelineMode && compliance.whoClinicalSafetyChecklist ? "pass" : "review",
    control: "WHO digital-health safety alignment",
    detail: compliance.whoClinicalSafetyChecklist ? "Clinical safety checklist and WHO-aligned guidance mode are enabled." : "WHO-aligned safety checklist is disabled.",
    framework: "WHO",
  });
  findings.push({
    id: "ops-training",
    status: compliance.trainingTracking && compliance.annualHipaaTraining && compliance.securityAwarenessTraining ? "pass" : "review",
    control: "Staff training controls",
    detail: compliance.trainingTracking ? "Training tracking is enabled." : "Training completion tracking is disabled.",
    framework: "Operations",
  });

  return findings;
}

function computeScore(findings: Finding[]) {
  const weights = { pass: 1, review: 0.5, fail: 0 };
  const total = findings.reduce((sum, item) => sum + weights[item.status], 0);
  return Math.round((total / findings.length) * 100);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await getTenantAccess(request, slug);
  if (!access.ok || !access.tenant) return tenantAccessResponse(access);
  if (!access.canEditSettings) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || "");

  const [compliance, security] = await Promise.all([
    getTenantComplianceSettings(access.tenant.id),
    getTenantSecuritySettings(access.tenant.id),
  ]);

  if (action === "run-check") {
    const findings = buildFindings(compliance, security);
    const score = computeScore(findings);
    const next = normalizeTenantComplianceSettings({
      ...compliance,
      lastComplianceReviewAt: new Date().toISOString(),
      lastComplianceScore: score,
    });
    await upsertTenantComplianceSettings(access.tenant.id, next);
    await db.insert(auditLogs).values({
      tenantId: access.tenant.id,
      userId: access.user?.id || null,
      action: "tenant.compliance_check_run",
      entity: "compliance",
      entityId: access.tenant.id,
      metadata: { score, findings },
    });
    return NextResponse.json({
      ok: findings.every((item) => item.status !== "fail"),
      score,
      findings,
      settings: next,
      guidance: {
        hipaa: "HIPAA Security/Privacy Rule alignment requires administrative, technical, and physical safeguards plus operational review.",
        who: "WHO guidance is implemented here as safety and governance controls, not legal certification.",
      },
    });
  }

  if (action === "export-report") {
    const findings = buildFindings(compliance, security);
    const score = computeScore(findings);
    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
    const recentEvents = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.tenantId, access.tenant.id), gte(auditLogs.createdAt, since), eq(auditLogs.entity, "compliance")))
      .orderBy(desc(auditLogs.createdAt));
    return NextResponse.json({
      tenant: { id: access.tenant.id, slug: access.tenant.slug, name: access.tenant.name },
      exportedAt: new Date().toISOString(),
      score,
      settings: compliance,
      security,
      findings,
      recentEvents,
    });
  }

  if (action === "schedule-review") {
    const nextDate = String(body?.date || new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString());
    const next = normalizeTenantComplianceSettings({
      ...compliance,
      nextComplianceReviewAt: nextDate,
    });
    await upsertTenantComplianceSettings(access.tenant.id, next);
    await db.insert(auditLogs).values({
      tenantId: access.tenant.id,
      userId: access.user?.id || null,
      action: "tenant.compliance_review_scheduled",
      entity: "compliance",
      entityId: access.tenant.id,
      metadata: { nextComplianceReviewAt: nextDate },
    });
    return NextResponse.json({ ok: true, nextComplianceReviewAt: nextDate, settings: next });
  }

  if (action === "preview-breach") {
    const lastSecurityEvents = await db
      .select()
      .from(notifications)
      .where(eq(notifications.tenantId, access.tenant.id))
      .orderBy(desc(notifications.createdAt))
      .limit(10);
    return NextResponse.json({
      ok: true,
      breachWorkflowEnabled: compliance.breachNotificationSystem && security.dataBreachAlerts,
      contacts: {
        primary: security.incidentPrimaryContact || "Not configured",
        emergencyPhone: security.incidentEmergencyPhone || "Not configured",
      },
      recentSecurityNotifications: lastSecurityEvents.map((row) => ({
        id: row.id,
        title: row.title,
        message: row.message,
        createdAt: row.createdAt,
      })),
    });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
