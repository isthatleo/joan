import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenantSettings, tenants, auditLogs } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireTenantAdmin } from "@/lib/tenant-staff";

const DEFAULTS = {
  branding: { primaryColor: "#F97316", logoUrl: "", faviconUrl: "", accentColor: "#EA580C", lightLogoUrl: "" },
  hospital: { name: "", displayName: "", shortName: "", slug: "", registrationNumber: "", licenseNumber: "", description: "" },
  contact: { email: "", phone: "", website: "", address: "", city: "", country: "", postalCode: "" },
  notifications: {
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: true,
    inAppEnabled: true,
    slackEnabled: false,
    soundEnabled: true,
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "06:00",
    allowCriticalDuringQuietHours: true,
    systemAlerts: true,
    emergencyEvents: true,
    appointmentReminders: true,
    labResults: true,
    billingUpdates: true,
    productUpdates: false,
  },
  communication: { emailProvider: "resend", smsProvider: "twilio", defaultChannel: "in_app", fallbackChannel: "email", allowedChannels: ["in_app", "email", "sms", "push", "whatsapp", "voice"], notificationPreferences: { emailEnabled: true, smsEnabled: false, pushEnabled: false, inAppEnabled: true } },
  modules: { appointments: true, pharmacy: true, lab: true, billing: true, guardians: true, patientPortal: true, messaging: true, reports: true, analytics: true, queue: true, vitals: true, carePlans: true, feedback: true, inventory: true, qualityControl: true, emergency: false, telemedicine: false, insurance: true, inpatient: true },
  preferences: {
    timezone: "UTC",
    language: "en",
    currency: "USD",
    timeFormat: "12h",
    dateFormat: "YYYY-MM-DD",
    weekStartDay: "Monday",
    numberFormat: "us",
    compactMode: false,
    highContrast: false,
    autoSaveForms: true,
    showTooltips: true,
    keyboardShortcuts: true,
  },
  ui: { theme: "system", compactMode: false, sidebarCollapsed: false, primaryTheme: "orange" },
  security: {
    twoFactorRequired: false,
    twoFactorEnabled: false,
    mfaRequired: false,
    sessionTimeout: 60,
    passwordExpirationEnabled: false,
    passwordExpirationDays: 90,
    loginAttemptLimitsEnabled: true,
    maxFailedLoginAttempts: 5,
    ipWhitelistEnabled: false,
    ipWhitelist: [],
    passwordMinLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialCharacters: true,
    roleBasedAccessControl: true,
    auditAllAccess: true,
    encryptDataAtRest: true,
    encryptDataInTransit: true,
    automatedBackups: true,
    backupEncryption: true,
    dbKeyRotationDays: 30,
    apiKeyRotationDays: 90,
    fileKeyRotationDays: 30,
    intrusionDetection: true,
    failedLoginAlerts: true,
    dataBreachAlerts: true,
    complianceMonitoring: true,
    incidentResponsePlanActive: true,
    incidentResponseLastReviewedAt: "",
    incidentPrimaryContact: "",
    incidentEmergencyPhone: "",
    automatedVulnerabilityScanning: true,
    thirdPartySecurityReviews: true,
    lastPenetrationTestAt: "",
    lastPenetrationTestStatus: "passed",
    nextSecurityAuditAt: "",
    nextSecurityAuditStatus: "scheduled",
    generatedSecurityKeys: [],
    passwordReuseLimit: 5,
  },
  workflow: {
    automationEnabled: true,
    appointmentReminders: true,
    patientNotifications: true,
    staffNotifications: true,
    prescriptionAlerts: true,
    billingAutomation: false,
    reportGeneration: false,
    dataBackupEnabled: true,
    backupFrequency: "daily",
    autoConfirmAppointments: true,
    reminderNotifications: true,
    noShowAlerts: true,
    followUpScheduling: false,
    autoResultNotifications: true,
    criticalValueAlerts: true,
    resultReviewQueue: false,
    autoArchiveOldResults: true,
    autoGenerateInvoices: true,
    paymentReminders: true,
    insuranceClaimAutomation: false,
    overdueAccountAlerts: true,
    autoWriteOffSmallBalances: false,
    monthlyBillingCycle: true,
    autoEscalationAlerts: true,
    emergencyTeamNotification: true,
    ambulanceDispatchIntegration: false,
    familyNotificationSystem: true,
    emergencyLogGeneration: true,
    postIncidentFollowUp: false,
    customWorkflows: [],
  },
  compliance: {
    hipaaMode: true,
    gdprMode: false,
    whoGuidelineMode: true,
    minimumNecessaryAccess: true,
    auditLoggingEnabled: true,
    encryptionAtRest: true,
    encryptionInTransit: true,
    phiAccessControls: true,
    breachNotificationSystem: true,
    dataSubjectRights: true,
    consentManagement: true,
    dataPortability: true,
    privacyByDesign: true,
    trainingTracking: true,
    annualHipaaTraining: true,
    gdprAwarenessTraining: true,
    securityAwarenessTraining: true,
    automatedTrainingReminders: true,
    certificationManagement: false,
    businessAssociateAgreementTracking: true,
    incidentResponsePlanActive: true,
    crossBorderTransferReview: false,
    whoClinicalSafetyChecklist: true,
    interoperabilityStandardsCheck: true,
    patientRecordsRetentionYears: 7,
    auditLogsRetentionYears: 7,
    billingRecordsRetentionYears: 7,
    consentRecordsRetentionYears: 7,
    nextComplianceReviewAt: "",
    lastComplianceReviewAt: "",
    lastComplianceScore: 0,
  },
  billing: { taxRate: 0, currency: "USD", invoicePrefix: "INV-", paymentMethods: ["cash", "card"], autoChargeInsurance: false },
  audit: { retentionDays: 365, logAuthentication: true, logClinicalActions: true, logFinancialActions: true, logConfigurationChanges: true },
  system: { maintenanceMode: false, maintenanceMessage: "", autoUpdates: false, telemetryEnabled: true, healthAlertsEnabled: true },
  apiManagement: { ipAllowlistEnabled: false, webhookRetryEnabled: true, webhookRetryCount: 3 },
  dangerZone: { archiveGraceDays: 30 },
};

const SETTINGS_KEYS = ["hospital", "branding", "contact", "notifications", "communication", "modules", "preferences", "ui", "security", "workflow", "compliance", "billing", "audit", "system", "apiManagement", "dangerZone"] as const;

async function getTenantBySlug(slug: string) {
  return db.query.tenants.findFirst({ where: eq(tenants.slug, slug) });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const rows = await db.select().from(tenantSettings).where(eq(tenantSettings.tenantId, tenant.id));
    const out: any = structuredClone(DEFAULTS);
    for (const r of rows) out[r.key] = { ...(out[r.key] || {}), ...(r.value as any) };
    out.hospital = {
      ...out.hospital,
      name: tenant.name,
      displayName: tenant.name,
      slug: tenant.slug,
    };
    out.contact = {
      ...out.contact,
      email: tenant.contactEmail || out.contact.email,
      phone: tenant.contactPhone || out.contact.phone,
      address: tenant.address || out.contact.address,
      city: tenant.city || out.contact.city,
      country: tenant.country || out.contact.country,
    };
    out.communications = { ...out.communication };
    out.branding = {
      ...out.branding,
      logoUrl: tenant.logoUrl || out.branding.logoUrl,
      hospitalName: tenant.name,
      favicon: out.branding.faviconUrl || out.branding.favicon || "",
    };
    out.tenant = { id: tenant.id, name: tenant.name, slug: tenant.slug, logoUrl: tenant.logoUrl || "", plan: tenant.plan };
    return NextResponse.json(out);
  } catch (e: any) {
    console.error("[tenant settings GET]", e);
    return NextResponse.json({ error: e.message || "Failed to fetch settings" }, { status: 500 });
  }
}

const putSchema = z.record(z.string(), z.any());

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const admin = await requireTenantAdmin(request.headers, tenant.id);
    if (!admin.ok) return NextResponse.json({ error: admin.error || "Forbidden" }, { status: admin.status || 403 });

    const body = putSchema.parse(await request.json());
    if (body.communications && !body.communication) {
      body.communication = body.communications;
    }
    const changedKeys: string[] = [];
    const requestedHospitalName =
      typeof body.branding?.hospitalName === "string" && body.branding.hospitalName.trim()
        ? body.branding.hospitalName.trim()
        : typeof body.hospital?.name === "string" && body.hospital.name.trim()
          ? body.hospital.name.trim()
          : tenant.name;

    if (body.hospital?.name || body.hospital?.slug || body.branding?.hospitalName || body.contact || body.preferences?.timezone || body.branding?.logoUrl) {
      await db.update(tenants).set({
        name: requestedHospitalName,
        slug: body.hospital?.slug ?? tenant.slug,
        logoUrl: body.branding?.logoUrl ?? tenant.logoUrl,
        contactEmail: body.contact?.email ?? tenant.contactEmail,
        contactPhone: body.contact?.phone ?? tenant.contactPhone,
        address: body.contact?.address ?? tenant.address,
        city: body.contact?.city ?? tenant.city,
        country: body.contact?.country ?? tenant.country,
        timezone: body.preferences?.timezone ?? tenant.timezone,
        updatedAt: new Date(),
      }).where(eq(tenants.id, tenant.id));
    }

    for (const key of SETTINGS_KEYS) {
      if (!(key in body)) continue;
      const value = body[key];
      const existing = await db.select().from(tenantSettings)
        .where(and(eq(tenantSettings.tenantId, tenant.id), eq(tenantSettings.key, key)));
      if (existing.length > 0) {
        await db.update(tenantSettings)
          .set({ value, updatedAt: new Date() })
          .where(eq(tenantSettings.id, existing[0].id));
      } else {
        await db.insert(tenantSettings).values({ tenantId: tenant.id, key, value });
      }
      changedKeys.push(key);
    }

    // Audit
    if (changedKeys.length > 0) {
      await db.insert(auditLogs).values({
        tenantId: tenant.id,
        userId: admin.user?.id || null,
        action: "tenant.settings_updated",
        entity: "tenant",
        entityId: tenant.id,
        metadata: { keys: changedKeys, changes: body },
      });
    }

    return NextResponse.json({ message: "Settings updated", changedKeys });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid settings", details: e.errors }, { status: 400 });
    }
    console.error("[tenant settings PUT]", e);
    return NextResponse.json({ error: e.message || "Failed to update settings" }, { status: 500 });
  }
}
