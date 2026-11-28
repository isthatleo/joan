import "server-only";
import { desc, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  activityLogs,
  appointments,
  feedbacks,
  integrations,
  invoices,
  labResults,
  patients,
  prescriptions,
  queues,
  securityEvents,
  tenants,
  userSessions,
  users,
  visits,
} from "@/lib/db/schema";
import type {
  PlatformCopilotContext,
  PlatformCopilotFact,
  PlatformCopilotFactCategory,
  PlatformCopilotOverview,
  PlatformCopilotSourceRef,
} from "./types";

const RECENT_ID_LIMIT = 3;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

function toInt(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

function compact(value: string, max: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function createFact({
  category,
  label,
  detail,
  sourceRef,
}: {
  category: PlatformCopilotFactCategory;
  label: string;
  detail: string;
  sourceRef: PlatformCopilotSourceRef;
}): PlatformCopilotFact {
  return {
    id: `${sourceRef.table}:${sourceRef.id}:${sourceRef.field || ""}`,
    category,
    label: compact(label, 80),
    detail: compact(detail, 280),
    sourceRef,
  };
}

function recordIdFact(
  table: string,
  label: string,
  id: string
): PlatformCopilotFact {
  return createFact({
    category: "clinical_metadata",
    label,
    detail: "Opaque record identifier only. No patient details, note text, or clinical values are included.",
    sourceRef: { table, id, field: "id", label },
  });
}

/**
 * Builds an allowlisted platform-operations snapshot. This layer intentionally
 * never selects patient names, note text, clinical values, IP addresses, user
 * agents, emails, audit descriptions, secrets, or file paths.
 */
export async function buildPlatformCopilotContext(): Promise<PlatformCopilotContext> {
  const generatedAt = new Date().toISOString();
  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);
  const twentyFourHoursAgo = new Date(Date.now() - TWENTY_FOUR_HOURS_MS);

  const [
    [tenantStats],
    [userStats],
    [sessionStats],
    [activityStats],
    [securityStats],
    [feedbackStats],
    [billingStats],
    [integrationStats],
    planRows,
    [patientStats],
    [appointmentStats],
    [visitStats],
    [queueStats],
    [labStats],
    [prescriptionStats],
    recentIds,
  ] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`count(case when ${tenants.isActive} = true then 1 end)`,
        recent: sql<number>`count(case when ${tenants.createdAt} >= ${sevenDaysAgo} then 1 end)`,
      })
      .from(tenants)
      .where(isNull(tenants.deletedAt)),
    db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`count(case when ${users.isActive} = true then 1 end)`,
        recent: sql<number>`count(case when ${users.createdAt} >= ${sevenDaysAgo} then 1 end)`,
      })
      .from(users)
      .where(isNull(users.deletedAt)),
    db
      .select({
        active: sql<number>`count(case when ${userSessions.isActive} = true then 1 end)`,
        recent: sql<number>`count(case when ${userSessions.lastActivityAt} >= ${twentyFourHoursAgo} then 1 end)`,
      })
      .from(userSessions)
      .where(isNull(userSessions.deletedAt)),
    db
      .select({
        events: sql<number>`count(*)`,
        failures: sql<number>`count(case when coalesce(${activityLogs.status}, 'success') != 'success' then 1 end)`,
      })
      .from(activityLogs)
      .where(sql`${activityLogs.timestamp} >= ${twentyFourHoursAgo}`),
    db
      .select({
        total: sql<number>`count(*)`,
        unresolved: sql<number>`count(case when ${securityEvents.isResolved} = false then 1 end)`,
        highSeverity: sql<number>`count(case when lower(coalesce(${securityEvents.severity}, '')) in ('high', 'critical') then 1 end)`,
      })
      .from(securityEvents)
      .where(isNull(securityEvents.deletedAt)),
    db
      .select({
        open: sql<number>`count(case when lower(${feedbacks.status}) in ('open', 'pending', 'in_progress') then 1 end)`,
        urgent: sql<number>`count(case when lower(${feedbacks.priority}) in ('high', 'urgent') and lower(${feedbacks.status}) not in ('resolved', 'closed') then 1 end)`,
      })
      .from(feedbacks)
      .where(isNull(feedbacks.deletedAt)),
    db
      .select({
        total: sql<number>`count(*)`,
        open: sql<number>`count(case when lower(coalesce(${invoices.status}, '')) not in ('paid', 'succeeded', 'success', 'completed', 'settled', 'void', 'cancelled', 'canceled') then 1 end)`,
        overdue: sql<number>`count(case when ${invoices.dueDate} < current_date and lower(coalesce(${invoices.status}, '')) not in ('paid', 'succeeded', 'success', 'completed', 'settled', 'void', 'cancelled', 'canceled') then 1 end)`,
      })
      .from(invoices)
      .where(isNull(invoices.deletedAt)),
    db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`count(case when ${integrations.isActive} = true then 1 end)`,
      })
      .from(integrations)
      .where(isNull(integrations.deletedAt)),
    db
      .select({ plan: tenants.plan, total: sql<number>`count(*)` })
      .from(tenants)
      .where(isNull(tenants.deletedAt))
      .groupBy(tenants.plan)
      .limit(8),
    db
      .select({
        total: sql<number>`count(*)`,
        recent: sql<number>`count(case when ${patients.createdAt} >= ${sevenDaysAgo} then 1 end)`,
      })
      .from(patients)
      .where(isNull(patients.deletedAt)),
    db
      .select({
        total: sql<number>`count(*)`,
        recent: sql<number>`count(case when ${appointments.createdAt} >= ${sevenDaysAgo} then 1 end)`,
      })
      .from(appointments)
      .where(isNull(appointments.deletedAt)),
    db
      .select({
        total: sql<number>`count(*)`,
        recent: sql<number>`count(case when ${visits.createdAt} >= ${sevenDaysAgo} then 1 end)`,
      })
      .from(visits)
      .where(isNull(visits.deletedAt)),
    db
      .select({
        total: sql<number>`count(*)`,
        recent: sql<number>`count(case when ${queues.createdAt} >= ${sevenDaysAgo} then 1 end)`,
      })
      .from(queues)
      .where(isNull(queues.deletedAt)),
    db
      .select({
        total: sql<number>`count(*)`,
        recent: sql<number>`count(case when ${labResults.createdAt} >= ${sevenDaysAgo} then 1 end)`,
      })
      .from(labResults)
      .where(isNull(labResults.deletedAt)),
    db
      .select({
        total: sql<number>`count(*)`,
        recent: sql<number>`count(case when ${prescriptions.createdAt} >= ${sevenDaysAgo} then 1 end)`,
      })
      .from(prescriptions)
      .where(isNull(prescriptions.deletedAt)),
    Promise.all([
      db
        .select({ id: patients.id })
        .from(patients)
        .where(isNull(patients.deletedAt))
        .orderBy(desc(patients.createdAt))
        .limit(RECENT_ID_LIMIT),
      db
        .select({ id: appointments.id })
        .from(appointments)
        .where(isNull(appointments.deletedAt))
        .orderBy(desc(appointments.createdAt))
        .limit(RECENT_ID_LIMIT),
      db
        .select({ id: visits.id })
        .from(visits)
        .where(isNull(visits.deletedAt))
        .orderBy(desc(visits.createdAt))
        .limit(RECENT_ID_LIMIT),
      db
        .select({ id: labResults.id })
        .from(labResults)
        .where(isNull(labResults.deletedAt))
        .orderBy(desc(labResults.createdAt))
        .limit(RECENT_ID_LIMIT),
      db
        .select({ id: prescriptions.id })
        .from(prescriptions)
        .where(isNull(prescriptions.deletedAt))
        .orderBy(desc(prescriptions.createdAt))
        .limit(RECENT_ID_LIMIT),
    ]),
  ]);

  const facts: PlatformCopilotFact[] = [];

  facts.push(
    createFact({
      category: "platform_overview",
      label: "Tenant portfolio",
      detail: `${toInt(tenantStats?.active)} active of ${toInt(tenantStats?.total)} tenants; ${toInt(tenantStats?.recent)} created in the last 7 days.`,
      sourceRef: { table: "tenants", id: "portfolio-summary", field: "status", label: "Tenant portfolio" },
    }),
    createFact({
      category: "platform_overview",
      label: "User footprint",
      detail: `${toInt(userStats?.active)} active of ${toInt(userStats?.total)} users; ${toInt(userStats?.recent)} created in the last 7 days.`,
      sourceRef: { table: "users", id: "user-summary", field: "is_active", label: "User footprint" },
    }),
    createFact({
      category: "system_health",
      label: "Active sessions",
      detail: `${toInt(sessionStats?.active)} active sessions; ${toInt(sessionStats?.recent)} with activity in the last 24 hours.`,
      sourceRef: { table: "user_sessions", id: "session-summary", field: "is_active", label: "Active sessions" },
    }),
    createFact({
      category: "system_health",
      label: "Platform activity",
      detail: `${toInt(activityStats?.events)} logged events and ${toInt(activityStats?.failures)} unsuccessful events in the last 24 hours. No audit descriptions or metadata are included.`,
      sourceRef: { table: "activity_logs", id: "activity-summary", field: "status", label: "Platform activity" },
    }),
    createFact({
      category: "system_health",
      label: "Integrations",
      detail: `${toInt(integrationStats?.active)} active of ${toInt(integrationStats?.total)} configured integrations.`,
      sourceRef: { table: "integrations", id: "integration-summary", field: "is_active", label: "Integrations" },
    }),
    createFact({
      category: "billing",
      label: "Invoice status",
      detail: `${toInt(billingStats?.open)} open invoices and ${toInt(billingStats?.overdue)} overdue invoices. No amounts, names, or line items are included.`,
      sourceRef: { table: "invoices", id: "invoice-summary", field: "status", label: "Invoice status" },
    }),
    createFact({
      category: "security",
      label: "Security event counts",
      detail: `${toInt(securityStats?.unresolved)} unresolved events and ${toInt(securityStats?.highSeverity)} high or critical severity events. No descriptions, IPs, or user agents are included.`,
      sourceRef: { table: "security_events", id: "security-summary", field: "severity", label: "Security event counts" },
    }),
    createFact({
      category: "feedback",
      label: "Feedback queue",
      detail: `${toInt(feedbackStats?.open)} open items and ${toInt(feedbackStats?.urgent)} urgent items. No titles, bodies, emails, or names are included.`,
      sourceRef: { table: "feedbacks", id: "feedback-summary", field: "status", label: "Feedback queue" },
    })
  );

  for (const row of planRows) {
    facts.push(
      createFact({
        category: "tenants",
        label: "Tenant plan distribution",
        detail: `${compact(String(row.plan || "unspecified"), 40)}: ${toInt(row.total)} tenants.`,
        sourceRef: {
          table: "tenants",
          id: `plan:${compact(String(row.plan || "unspecified"), 40)}`,
          field: "plan",
          label: "Plan distribution",
        },
      })
    );
  }

  const clinicalGroups: Array<{
    label: string;
    table: string;
    stats: { total: unknown; recent: unknown } | undefined;
  }> = [
    { label: "Patient records", table: "patients", stats: patientStats },
    { label: "Appointments", table: "appointments", stats: appointmentStats },
    { label: "Visits", table: "visits", stats: visitStats },
    { label: "Queue entries", table: "queues", stats: queueStats },
    { label: "Lab result records", table: "lab_results", stats: labStats },
    { label: "Prescriptions", table: "prescriptions", stats: prescriptionStats },
  ];

  for (const group of clinicalGroups) {
    facts.push(
      createFact({
        category: "clinical_metadata",
        label: group.label,
        detail: `${toInt(group.stats?.total)} total records; ${toInt(group.stats?.recent)} created in the last 7 days. Counts and trends only.`,
        sourceRef: {
          table: group.table,
          id: "metadata-summary",
          field: "created_at",
          label: `${group.label} metadata`,
        },
      })
    );
  }

  const recordGroups: Array<{ label: string; table: string; rows: Array<{ id: string }> }> = [
    { label: "Patient record identifier", table: "patients", rows: recentIds[0] },
    { label: "Appointment record identifier", table: "appointments", rows: recentIds[1] },
    { label: "Visit record identifier", table: "visits", rows: recentIds[2] },
    { label: "Lab result record identifier", table: "lab_results", rows: recentIds[3] },
    { label: "Prescription record identifier", table: "prescriptions", rows: recentIds[4] },
  ];

  for (const group of recordGroups) {
    for (const row of group.rows) {
      facts.push(recordIdFact(group.table, group.label, row.id));
    }
  }

  const counts: PlatformCopilotOverview = {
    activeTenants: toInt(tenantStats?.active),
    totalUsers: toInt(userStats?.total),
    openInvoices: toInt(billingStats?.open),
    clinicalRecords: toInt(patientStats?.total),
  };

  return { facts: facts.slice(0, 48), counts, generatedAt };
}
