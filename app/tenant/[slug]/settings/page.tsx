"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Building2, Palette, Bell, Globe, Layers, ShieldAlert,
  Loader2, Save, Trash2, AlertTriangle, History, CheckCircle2, XCircle, Clock,
  Mail, Phone, MapPin, Zap, Key, Shield, Database, BarChart3, Users,
  Eye, EyeOff, Copy, Plus, Minus, Check, X, AlertCircle, Activity,
  Smartphone, MessageSquare, Lock, Server, CreditCard, FileCheck, Settings,
  Wifi, WifiOff, Download, Upload, RefreshCw, GitBranch, Edit,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { CurrencySelect } from "@/components/forms/CurrencySelect";
import { DEFAULT_TENANT_MODULES, normalizeTenantModules } from "@/lib/tenant-modules";
import { batchUpdateHospitalSettings } from "@/lib/hospital-settings-sync";
import { applyTenantPreferences } from "@/lib/tenant-preferences";

const orange = "#F97316";

type SettingsShape = {
  branding: { primaryColor: string; logoUrl: string; hospitalName: string; favicon: string; };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    inAppEnabled: boolean;
    slackEnabled: boolean;
    soundEnabled: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    allowCriticalDuringQuietHours: boolean;
    systemAlerts: boolean;
    emergencyEvents: boolean;
    appointmentReminders: boolean;
    labResults: boolean;
    billingUpdates: boolean;
    productUpdates: boolean;
  };
  modules: Record<string, boolean>;
  preferences: {
    timezone: string;
    language: string;
    currency: string;
    dateFormat: string;
    timeFormat: string;
    weekStartDay: string;
    numberFormat: string;
    compactMode: boolean;
    highContrast: boolean;
    autoSaveForms: boolean;
    showTooltips: boolean;
    keyboardShortcuts: boolean;
  };
  communications: { emailProvider: string; smsProvider: string; webhookUrl: string; };
  workflow: {
    automationEnabled: boolean;
    appointmentReminders: boolean;
    patientNotifications: boolean;
    staffNotifications: boolean;
    prescriptionAlerts: boolean;
    billingAutomation: boolean;
    reportGeneration: boolean;
    dataBackupEnabled: boolean;
    backupFrequency: string;
    autoConfirmAppointments: boolean;
    reminderNotifications: boolean;
    noShowAlerts: boolean;
    followUpScheduling: boolean;
    autoResultNotifications: boolean;
    criticalValueAlerts: boolean;
    resultReviewQueue: boolean;
    autoArchiveOldResults: boolean;
    autoGenerateInvoices: boolean;
    paymentReminders: boolean;
    insuranceClaimAutomation: boolean;
    overdueAccountAlerts: boolean;
    autoWriteOffSmallBalances: boolean;
    monthlyBillingCycle: boolean;
    autoEscalationAlerts: boolean;
    emergencyTeamNotification: boolean;
    ambulanceDispatchIntegration: boolean;
    familyNotificationSystem: boolean;
    emergencyLogGeneration: boolean;
    postIncidentFollowUp: boolean;
    customWorkflows: Array<{ id: string; name: string; status: "draft" | "active" | "disabled"; createdAt: string }>;
  };
  compliance: {
    hipaaMode: boolean;
    gdprMode: boolean;
    whoGuidelineMode: boolean;
    minimumNecessaryAccess: boolean;
    auditLoggingEnabled: boolean;
    encryptionAtRest: boolean;
    encryptionInTransit: boolean;
    phiAccessControls: boolean;
    breachNotificationSystem: boolean;
    dataSubjectRights: boolean;
    consentManagement: boolean;
    dataPortability: boolean;
    privacyByDesign: boolean;
    trainingTracking: boolean;
    annualHipaaTraining: boolean;
    gdprAwarenessTraining: boolean;
    securityAwarenessTraining: boolean;
    automatedTrainingReminders: boolean;
    certificationManagement: boolean;
    businessAssociateAgreementTracking: boolean;
    incidentResponsePlanActive: boolean;
    crossBorderTransferReview: boolean;
    whoClinicalSafetyChecklist: boolean;
    interoperabilityStandardsCheck: boolean;
    patientRecordsRetentionYears: number;
    auditLogsRetentionYears: number;
    billingRecordsRetentionYears: number;
    consentRecordsRetentionYears: number;
    nextComplianceReviewAt: string;
    lastComplianceReviewAt: string;
    lastComplianceScore: number;
  };
  security: {
    twoFactorRequired: boolean;
    sessionTimeout: number;
    ipWhitelistEnabled: boolean;
    ipWhitelist: string[];
    passwordExpirationEnabled: boolean;
    passwordExpirationDays: number;
    loginAttemptLimitsEnabled: boolean;
    maxFailedLoginAttempts: number;
    passwordMinLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialCharacters: boolean;
    roleBasedAccessControl: boolean;
    auditAllAccess: boolean;
    encryptDataAtRest: boolean;
    encryptDataInTransit: boolean;
    automatedBackups: boolean;
    backupEncryption: boolean;
    dbKeyRotationDays: number;
    apiKeyRotationDays: number;
    fileKeyRotationDays: number;
    intrusionDetection: boolean;
    failedLoginAlerts: boolean;
    dataBreachAlerts: boolean;
    complianceMonitoring: boolean;
    incidentResponsePlanActive: boolean;
    incidentResponseLastReviewedAt: string;
    incidentPrimaryContact: string;
    incidentEmergencyPhone: string;
    automatedVulnerabilityScanning: boolean;
    thirdPartySecurityReviews: boolean;
    lastPenetrationTestAt: string;
    lastPenetrationTestStatus: string;
    nextSecurityAuditAt: string;
    nextSecurityAuditStatus: string;
    generatedSecurityKeys: Array<{ id: string; label: string; createdAt: string; maskedValue: string }>;
  };
  billing: {
    paymentMethods: {
      creditCard: boolean;
      bankTransfer: boolean;
      cash: boolean;
      insurance: boolean;
    };
    billingPreferences: {
      autoInvoiceNumbers: boolean;
      taxCalculations: boolean;
      discountCodes: boolean;
      paymentPlans: boolean;
    };
    insuranceIntegration: {
      realTimeEligibility: boolean;
      autoClaimsSubmission: boolean;
      eobProcessing: boolean;
      patientResponsibility: boolean;
      secondaryBilling: boolean;
      claimTracking: boolean;
    };
    financialPolicies: {
      lateFeePercent: number;
      gracePeriodDays: number;
      statementFrequency: string;
    };
  };
  audit: {
    retentionDays: number;
    logAuthentication: boolean;
    logClinicalActions: boolean;
    logFinancialActions: boolean;
    logConfigurationChanges: boolean;
    exportFormat: string;
    anomalyDetection: boolean;
    immutableSnapshots: boolean;
  };
  system: {
    maintenanceMode: boolean;
    maintenanceMessage: string;
    autoUpdates: boolean;
    telemetryEnabled: boolean;
    healthAlertsEnabled: boolean;
    cpuThreshold: number;
    memoryThreshold: number;
    diskThreshold: number;
    alertEmail: string;
    alertWebhook: string;
  };
  dangerZone: {
    archiveGraceDays: number;
  };
  integrations: { [key: string]: { enabled: boolean; apiKey: string; }; };
};

const DEFAULT_SETTINGS: SettingsShape = {
  branding: { primaryColor: "#F97316", logoUrl: "", hospitalName: "", favicon: "" },
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
  modules: { ...DEFAULT_TENANT_MODULES },
  preferences: {
    timezone: "UTC",
    language: "en",
    currency: "USD",
    dateFormat: "YYYY-MM-DD",
    timeFormat: "12h",
    weekStartDay: "Monday",
    numberFormat: "us",
    compactMode: false,
    highContrast: false,
    autoSaveForms: true,
    showTooltips: true,
    keyboardShortcuts: true,
  },
  communications: { emailProvider: "resend", smsProvider: "twilio", webhookUrl: "" },
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
  security: {
    twoFactorRequired: false,
    sessionTimeout: 60,
    ipWhitelistEnabled: false,
    ipWhitelist: [],
    passwordExpirationEnabled: false,
    passwordExpirationDays: 90,
    loginAttemptLimitsEnabled: true,
    maxFailedLoginAttempts: 5,
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
  },
  billing: {
    paymentMethods: { creditCard: true, bankTransfer: true, cash: true, insurance: true },
    billingPreferences: { autoInvoiceNumbers: true, taxCalculations: true, discountCodes: false, paymentPlans: true },
    insuranceIntegration: { realTimeEligibility: true, autoClaimsSubmission: true, eobProcessing: true, patientResponsibility: true, secondaryBilling: true, claimTracking: true },
    financialPolicies: { lateFeePercent: 1.5, gracePeriodDays: 15, statementFrequency: "monthly" },
  },
  audit: {
    retentionDays: 365,
    logAuthentication: true,
    logClinicalActions: true,
    logFinancialActions: true,
    logConfigurationChanges: true,
    exportFormat: "json",
    anomalyDetection: true,
    immutableSnapshots: true,
  },
  system: {
    maintenanceMode: false,
    maintenanceMessage: "",
    autoUpdates: false,
    telemetryEnabled: true,
    healthAlertsEnabled: true,
    cpuThreshold: 80,
    memoryThreshold: 85,
    diskThreshold: 90,
    alertEmail: "",
    alertWebhook: "",
  },
  dangerZone: {
    archiveGraceDays: 30,
  },
  integrations: {},
};

const TIMEZONES = ["UTC", "Africa/Nairobi", "Africa/Lagos", "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "Asia/Dubai", "Asia/Singapore"];
const LANGUAGES = [{ v: "en", l: "English" }, { v: "fr", l: "French" }, { v: "es", l: "Spanish" }, { v: "sw", l: "Swahili" }, { v: "ar", l: "Arabic" }];
const CURRENCIES = ["USD", "EUR", "GBP", "KES", "NGN", "ZAR", "AED"];
const DATE_FORMATS = ["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"];
const EMAIL_PROVIDER_IDS = new Set(["resend", "sendgrid", "mailgun"]);
const SMS_PROVIDER_IDS = new Set(["twilio"]);
const EMAIL_PROVIDERS = ["resend", "sendgrid", "ses", "mailgun"];
const SMS_PROVIDERS = ["twilio", "nexmo", "aws-sns"];

const TABS = [
  { key: "general", label: "General", icon: Building2 },
  { key: "branding", label: "Branding", icon: Palette },
  { key: "modules", label: "Modules", icon: Layers },
  { key: "communications", label: "Communications", icon: MessageSquare },
  { key: "integrations", label: "Integrations", icon: Zap },
  { key: "security", label: "Security", icon: Shield },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "preferences", label: "Preferences", icon: Globe },
  { key: "workflows", label: "Workflows", icon: GitBranch },
  { key: "compliance", label: "Compliance", icon: FileCheck },
  { key: "billing", label: "Billing", icon: CreditCard },
  { key: "system", label: "System", icon: Server },
  { key: "audit", label: "Audit Log", icon: History },
  { key: "danger", label: "Danger Zone", icon: ShieldAlert },
] as const;

type TabKey = typeof TABS[number]["key"];

type SettingsActionDialog = {
  title: string;
  description?: string;
  details?: string[];
  variant?: "default" | "security-audit" | "security-report" | "security-key" | "notification-test" | "notification-export" | "preference-apply" | "preference-export" | "workflow-simulate" | "compliance-check" | "compliance-export";
  payload?: Record<string, any> | null;
} | null;

type TenantIntegrationSummary = {
  id: string;
  provider: string;
  isActive: boolean;
  status: string;
  accountName?: string | null;
  accountId?: string | null;
  lastTestedAt?: string | null;
  testError?: string | null;
  apiKeyMasked?: string;
  apiSecretMasked?: string;
  config?: Record<string, any>;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type WebhookItem = {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  status: "active" | "inactive" | "error";
  lastTestedAt?: string | null;
  lastDeliveredAt?: string | null;
  lastError?: string | null;
  lastStatusCode?: number | null;
  updatedAt?: string | null;
  secretMasked?: string;
};

type ApiKeyItem = {
  id: string;
  name: string;
  prefix: string;
  maskedSecret: string;
  status: "active" | "revoked";
  scopes: string[];
  environment: "production" | "staging" | "development";
  createdAt: string;
  updatedAt?: string | null;
  lastUsedAt?: string | null;
  lastRotatedAt?: string | null;
  revokedAt?: string | null;
};

type CommunicationsContextValue = {
  slug: string;
  settings: SettingsShape;
  integrations: TenantIntegrationSummary[];
  refreshIntegrations: () => Promise<void>;
  setCommunicationPreference: (next: Partial<SettingsShape["communications"]>) => Promise<void>;
};

const CommunicationsContext = createContext<CommunicationsContextValue | null>(null);

type IntegrationLogItem = {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  actor: string;
  createdAt?: string | null;
  metadata?: Record<string, any>;
};

type IntegrationOverview = {
  connectedServices: number;
  activeWebhooks: number;
  activeApiKeys: number;
  eventsThisMonth: number;
};

type NotificationOverview = {
  sentLast24h: number;
  unreadCount: number;
  criticalLast7d: number;
  activityLast30d: number;
  recentEvents: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    createdAt?: string | null;
    read?: boolean;
    metadata?: Record<string, any>;
  }>;
};

type PreferenceOverview = {
  totalUsers: number;
  languageOverrides: number;
  inheritingLanguage?: number;
  affectedUsers?: number;
  sampleOverrides?: Array<{ id: string; fullName?: string | null; email?: string | null }>;
};

type WorkflowOverview = {
  enabledAutomations: number;
  disabledAutomations: number;
  customWorkflows: number;
  backupFrequency: string;
};

type ComplianceOverview = {
  staffCount: number;
  recentComplianceEvents: number;
};

type BillingOverview = {
  revenue: { total: number; billed: number; outstanding: number; outstandingPercentage: number; collectionRate?: number; invoiceCount?: number };
  paymentMethods: Array<{ method: string; count: number; total: number }>;
  insuranceBreakdown: { insurance: number; selfPay: number; total?: number };
  processors: Record<string, any>;
  summary?: { paymentCount?: number; paymentMethodsCount?: number; totalBilled?: number; paidBilled?: number; outstandingBalance?: number };
};

export default function TenantSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [tab, setTab] = useState<TabKey>("general");
  const [tenant, setTenant] = useState<any>(null);
  const [settings, setSettings] = useState<SettingsShape | null>(null);
  const [original, setOriginal] = useState<SettingsShape | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Audit
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditKind, setAuditKind] = useState<"all" | "provisioning" | "audit">("all");
  const [auditStatus, setAuditStatus] = useState<string>("");
  const [auditQuery, setAuditQuery] = useState("");
  const [auditSettingsLoading, setAuditSettingsLoading] = useState(false);
  const [auditOverview, setAuditOverview] = useState({ recentAuditEvents: 0, recentProvisioningEvents: 0 });

  // Danger zone
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [dangerLoading, setDangerLoading] = useState(false);
  const [dangerState, setDangerState] = useState<any>(null);

  // Integrations
  const [integrations, setIntegrations] = useState<TenantIntegrationSummary[]>([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [customIntegrations, setCustomIntegrations] = useState<any[]>([]);

  // Communications
  const [commSettings, setCommSettings] = useState<any>({});
  const [commLoading, setCommLoading] = useState(false);

  // Security
  const [securitySettings, setSecuritySettings] = useState<any>({});
  const [securityLoading, setSecurityLoading] = useState(false);

  // Notifications
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationOverview, setNotificationOverview] = useState<NotificationOverview>({
    sentLast24h: 0,
    unreadCount: 0,
    criticalLast7d: 0,
    activityLast30d: 0,
    recentEvents: [],
  });
  const [notificationChannelsReady, setNotificationChannelsReady] = useState<Record<string, boolean>>({
    email: false,
    sms: false,
    slack: false,
    push: true,
    inApp: true,
  });
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [preferenceOverview, setPreferenceOverview] = useState<PreferenceOverview>({
    totalUsers: 0,
    languageOverrides: 0,
    inheritingLanguage: 0,
  });
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [workflowOverview, setWorkflowOverview] = useState<WorkflowOverview>({
    enabledAutomations: 0,
    disabledAutomations: 0,
    customWorkflows: 0,
    backupFrequency: "daily",
  });
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [complianceOverview, setComplianceOverview] = useState<ComplianceOverview>({
    staffCount: 0,
    recentComplianceEvents: 0,
  });

  // System
  const [systemStats, setSystemStats] = useState<any>({});
  const [systemLoading, setSystemLoading] = useState(false);
  const [systemAlertsList, setSystemAlertsList] = useState<any[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingOverview, setBillingOverview] = useState<BillingOverview>({
    revenue: { total: 0, billed: 0, outstanding: 0, outstandingPercentage: 0, collectionRate: 0, invoiceCount: 0 },
    paymentMethods: [],
    insuranceBreakdown: { insurance: 0, selfPay: 0, total: 0 },
    processors: {},
    summary: { paymentCount: 0, paymentMethodsCount: 0, totalBilled: 0, paidBilled: 0, outstandingBalance: 0 },
  });
  const [showBrandPreview, setShowBrandPreview] = useState(false);
  const [actionDialog, setActionDialog] = useState<SettingsActionDialog>(null);
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [integrationLogs, setIntegrationLogs] = useState<IntegrationLogItem[]>([]);
  const [integrationOverview, setIntegrationOverview] = useState<IntegrationOverview>({
    connectedServices: 0,
    activeWebhooks: 0,
    activeApiKeys: 0,
    eventsThisMonth: 0,
  });

  const goToTab = useCallback((nextTab: TabKey) => {
    setTab(nextTab);
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [tRes, sRes] = await Promise.all([
          fetch(`/api/tenants/${slug}`),
          fetch(`/api/tenants/${slug}/settings`),
        ]);
        if (tRes.ok) setTenant(await tRes.json());
        
        let fetchedSettings: SettingsShape = DEFAULT_SETTINGS;
        if (sRes.ok) {
          const s = await sRes.json();
          fetchedSettings = {
            ...DEFAULT_SETTINGS,
            ...s,
            branding: { ...DEFAULT_SETTINGS.branding, ...(s?.branding || {}) },
            notifications: { ...DEFAULT_SETTINGS.notifications, ...(s?.notifications || {}) },
            preferences: { ...DEFAULT_SETTINGS.preferences, ...(s?.preferences || {}) },
            communications: { ...DEFAULT_SETTINGS.communications, ...(s?.communications || s?.communication || {}) },
            workflow: { ...DEFAULT_SETTINGS.workflow, ...(s?.workflow || {}) },
            compliance: { ...DEFAULT_SETTINGS.compliance, ...(s?.compliance || {}) },
            security: { ...DEFAULT_SETTINGS.security, ...(s?.security || {}) },
            billing: { ...DEFAULT_SETTINGS.billing, ...(s?.billing || {}) },
            audit: { ...DEFAULT_SETTINGS.audit, ...(s?.audit || {}) },
            system: { ...DEFAULT_SETTINGS.system, ...(s?.system || {}) },
            dangerZone: { ...DEFAULT_SETTINGS.dangerZone, ...(s?.dangerZone || {}) },
            integrations: { ...DEFAULT_SETTINGS.integrations, ...(s?.integrations || {}) },
            modules: normalizeTenantModules(s?.modules),
          };
          try {
            sessionStorage.setItem("active_tenant_preferences", JSON.stringify(fetchedSettings.preferences));
          } catch {}
          applyTenantPreferences(fetchedSettings.preferences as any);
        } else {
          toast.error("Failed to load settings, using default values.");
        }
        setSettings(fetchedSettings);
        setOriginal(JSON.parse(JSON.stringify(fetchedSettings)));

      } catch (e) {
        toast.error("Failed to load settings");
        setSettings(DEFAULT_SETTINGS); // Ensure settings are set even on full failure
        setOriginal(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)));
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);
  const refreshIntegrations = useCallback(async () => {
    if (!slug) return;
    setIntegrationsLoading(true);
    try {
      const response = await fetch(`/api/tenant/${slug}/communications/actions`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to load integrations");
      setIntegrations(Array.isArray(data.integrations) ? data.integrations : []);
      setCustomIntegrations(Array.isArray(data.customIntegrations) ? data.customIntegrations : []);
      setCommSettings(data.communication || {});
      if (data.communication) {
        setSettings((current) => current ? {
          ...current,
          communications: {
            ...current.communications,
            emailProvider: data.communication.emailProvider || current.communications.emailProvider,
            smsProvider: data.communication.smsProvider || current.communications.smsProvider,
            webhookUrl: data.communication.webhookUrl || current.communications.webhookUrl,
          },
        } : current);
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to load communication integrations");
    } finally {
      setIntegrationsLoading(false);
    }
  }, [slug]);

  const setCommunicationPreference = useCallback(async (next: Partial<SettingsShape["communications"]>) => {
    setSettings((current) => current ? { ...current, communications: { ...current.communications, ...next } } : current);
    try {
      const response = await fetch(`/api/tenants/${slug}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ communication: next }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Failed to update communication preferences");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update communication preferences");
    }
  }, [slug]);

  const refreshIntegrationConsole = useCallback(async () => {
    if (!slug) return;
    setIntegrationsLoading(true);
    try {
      const response = await fetch(`/api/tenant/${slug}/integrations/logs?limit=100`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to load integration data");
      setWebhooks(Array.isArray(data.webhooks) ? data.webhooks : []);
      setApiKeys(Array.isArray(data.apiKeys) ? data.apiKeys : []);
      setIntegrationLogs(Array.isArray(data.logs) ? data.logs : []);
      setIntegrationOverview(data.overview || {
        connectedServices: Array.isArray(data.activeIntegrations) ? data.activeIntegrations.length : 0,
        activeWebhooks: Array.isArray(data.webhooks) ? data.webhooks.filter((item: any) => item.isActive).length : 0,
        activeApiKeys: Array.isArray(data.apiKeys) ? data.apiKeys.filter((item: any) => item.status === "active").length : 0,
        eventsThisMonth: Array.isArray(data.logs) ? data.logs.length : 0,
      });
    } catch (error: any) {
      toast.error(error?.message || "Failed to load integration console");
    } finally {
      setIntegrationsLoading(false);
    }
  }, [slug]);

  const refreshNotifications = useCallback(async () => {
    if (!slug) return;
    setNotificationsLoading(true);
    try {
      const response = await fetch(`/api/tenant/${slug}/notifications/settings`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Failed to load notification settings");

      if (data?.settings) {
        setSettings((current) => current ? {
          ...current,
          notifications: { ...DEFAULT_SETTINGS.notifications, ...(data.settings || {}) },
        } : current);
      }
      setNotificationOverview(data?.overview || {
        sentLast24h: 0,
        unreadCount: 0,
        criticalLast7d: 0,
        activityLast30d: 0,
        recentEvents: [],
      });
      setNotificationChannelsReady(data?.channelAvailability || {
        email: false,
        sms: false,
        slack: false,
        push: true,
        inApp: true,
      });
    } catch (error: any) {
      toast.error(error?.message || "Failed to load notification settings");
    } finally {
      setNotificationsLoading(false);
    }
  }, [slug]);

  const refreshPreferences = useCallback(async () => {
    if (!slug) return;
    setPreferencesLoading(true);
    try {
      const response = await fetch(`/api/tenant/${slug}/preferences`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Failed to load tenant preferences");
      if (data?.preferences) {
        const nextPreferences = { ...DEFAULT_SETTINGS.preferences, ...(data.preferences || {}) };
        applyTenantPreferences(nextPreferences as any);
        try {
          sessionStorage.setItem("active_tenant_preferences", JSON.stringify(nextPreferences));
        } catch {}
        setSettings((current) => current ? {
          ...current,
          preferences: nextPreferences,
        } : current);
      }
      setPreferenceOverview(data?.overview || { totalUsers: 0, languageOverrides: 0, inheritingLanguage: 0 });
    } catch (error: any) {
      toast.error(error?.message || "Failed to load tenant preferences");
    } finally {
      setPreferencesLoading(false);
    }
  }, [slug]);

  const refreshWorkflow = useCallback(async () => {
    if (!slug) return;
    setWorkflowLoading(true);
    try {
      const response = await fetch(`/api/tenant/${slug}/workflow`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Failed to load workflow settings");
      if (data?.settings) {
        setSettings((current) => current ? {
          ...current,
          workflow: { ...DEFAULT_SETTINGS.workflow, ...(data.settings || {}) },
        } : current);
      }
      setWorkflowOverview(data?.overview || {
        enabledAutomations: 0,
        disabledAutomations: 0,
        customWorkflows: 0,
        backupFrequency: "daily",
      });
    } catch (error: any) {
      toast.error(error?.message || "Failed to load workflow settings");
    } finally {
      setWorkflowLoading(false);
    }
  }, [slug]);

  const refreshCompliance = useCallback(async () => {
    if (!slug) return;
    setComplianceLoading(true);
    try {
      const response = await fetch(`/api/tenant/${slug}/compliance/settings`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Failed to load compliance settings");
      if (data?.settings) {
        setSettings((current) => current ? {
          ...current,
          compliance: { ...DEFAULT_SETTINGS.compliance, ...(data.settings || {}) },
        } : current);
      }
      setComplianceOverview(data?.overview || { staffCount: 0, recentComplianceEvents: 0 });
    } catch (error: any) {
      toast.error(error?.message || "Failed to load compliance settings");
    } finally {
      setComplianceLoading(false);
    }
  }, [slug]);

  const refreshBilling = useCallback(async () => {
    if (!slug) return;
    setBillingLoading(true);
    try {
      const [summaryRes, configRes] = await Promise.all([
        fetch(`/api/tenant/${slug}/billing`, { credentials: "include", cache: "no-store" }),
        fetch(`/api/tenant/${slug}/billing/config`, { credentials: "include", cache: "no-store" }),
      ]);
      const summary = await summaryRes.json().catch(() => ({}));
      const config = await configRes.json().catch(() => ({}));
      if (!summaryRes.ok) throw new Error(summary?.error || "Failed to load billing summary");
      if (!configRes.ok) throw new Error(config?.error || "Failed to load billing configuration");
        setBillingOverview({
          revenue: summary.revenue || { total: 0, billed: 0, outstanding: 0, outstandingPercentage: 0, collectionRate: 0, invoiceCount: 0 },
          paymentMethods: Array.isArray(summary.paymentMethods) ? summary.paymentMethods : [],
          insuranceBreakdown: summary.insuranceBreakdown || { insurance: 0, selfPay: 0, total: 0 },
          processors: config.paymentProcessors || {},
          summary: summary.summary || { paymentCount: 0, paymentMethodsCount: 0, totalBilled: 0, paidBilled: 0, outstandingBalance: 0 },
        });
      if (config.settings) {
        setSettings((current) => current ? { ...current, billing: { ...DEFAULT_SETTINGS.billing, ...(config.settings || {}) } } : current);
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to load billing settings");
    } finally {
      setBillingLoading(false);
    }
  }, [slug]);

  const saveBillingSettings = useCallback(async () => {
    if (!settings?.billing) return;
    const response = await fetch(`/api/tenant/${slug}/billing/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(settings.billing),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || "Failed to save billing settings");
    setSettings((current) => current ? { ...current, billing: { ...DEFAULT_SETTINGS.billing, ...(data.settings || settings.billing) } } : current);
    setOriginal((current) => current ? { ...current, billing: { ...DEFAULT_SETTINGS.billing, ...(data.settings || settings.billing) } } : current);
    return data;
  }, [settings?.billing, slug]);

  const runBillingAction = useCallback(async (action: string) => {
    const response = await fetch(`/api/tenant/${slug}/billing/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || `Failed to ${action}`);
    return data;
  }, [slug]);

  const refreshSystemSection = useCallback(async () => {
    if (!slug) return;
    setSystemLoading(true);
    try {
      const [metricsRes, configRes, alertsRes] = await Promise.all([
        fetch(`/api/tenant/${slug}/system/metrics`, { credentials: "include", cache: "no-store" }),
        fetch(`/api/tenant/${slug}/system/config`, { credentials: "include", cache: "no-store" }),
        fetch(`/api/tenant/${slug}/system/alerts?resolved=false`, { credentials: "include", cache: "no-store" }),
      ]);
      const metrics = await metricsRes.json().catch(() => ({}));
      const config = await configRes.json().catch(() => ({}));
      const alerts = await alertsRes.json().catch(() => ({}));
      if (!metricsRes.ok) throw new Error(metrics?.error || "Failed to load system metrics");
      if (!configRes.ok) throw new Error(config?.error || "Failed to load system settings");
      if (!alertsRes.ok) throw new Error(alerts?.error || "Failed to load system alerts");
      setSystemStats({ ...(metrics || {}), settings: config.settings || DEFAULT_SETTINGS.system });
      setSystemAlertsList(Array.isArray(alerts.alerts) ? alerts.alerts : []);
      if (config.settings) {
        setSettings((current) => current ? { ...current, system: { ...DEFAULT_SETTINGS.system, ...(config.settings || {}) } } : current);
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to load system section");
    } finally {
      setSystemLoading(false);
    }
  }, [slug]);

  const saveSystemSettings = useCallback(async () => {
    if (!settings?.system) return;
    const response = await fetch(`/api/tenant/${slug}/system/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(settings.system),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || "Failed to save system settings");
    setSettings((current) => current ? { ...current, system: { ...DEFAULT_SETTINGS.system, ...(data.settings || settings.system) } } : current);
    setOriginal((current) => current ? { ...current, system: { ...DEFAULT_SETTINGS.system, ...(data.settings || settings.system) } } : current);
    return data;
  }, [settings?.system, slug]);

  const refreshAuditSettings = useCallback(async () => {
    if (!slug) return;
    setAuditSettingsLoading(true);
    try {
      const response = await fetch(`/api/tenant/${slug}/audit/settings`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Failed to load audit settings");
      if (data.settings) {
        setSettings((current) => current ? { ...current, audit: { ...DEFAULT_SETTINGS.audit, ...(data.settings || {}) } } : current);
      }
      setAuditOverview(data.overview || { recentAuditEvents: 0, recentProvisioningEvents: 0 });
    } catch (error: any) {
      toast.error(error?.message || "Failed to load audit settings");
    } finally {
      setAuditSettingsLoading(false);
    }
  }, [slug]);

  const saveAuditSettings = useCallback(async () => {
    if (!settings?.audit) return;
    const response = await fetch(`/api/tenant/${slug}/audit/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(settings.audit),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || "Failed to save audit settings");
    setSettings((current) => current ? { ...current, audit: { ...DEFAULT_SETTINGS.audit, ...(data.settings || settings.audit) } } : current);
    setOriginal((current) => current ? { ...current, audit: { ...DEFAULT_SETTINGS.audit, ...(data.settings || settings.audit) } } : current);
    return data;
  }, [settings?.audit, slug]);

  const runAuditAction = useCallback(async (action: string) => {
    const response = await fetch(`/api/tenant/${slug}/audit/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || `Failed to ${action}`);
    return data;
  }, [slug]);

  const refreshDangerZone = useCallback(async () => {
    if (!slug) return;
    setDangerLoading(true);
    try {
      const response = await fetch(`/api/tenant/${slug}/danger-zone`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Failed to load danger zone state");
      setDangerState(data);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load danger zone");
    } finally {
      setDangerLoading(false);
    }
  }, [slug]);

  const runDangerAction = useCallback(async (action: string) => {
    const response = await fetch(`/api/tenant/${slug}/danger-zone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || `Failed to ${action}`);
    return data;
  }, [slug]);

  useEffect(() => {
    if (tab !== "communications" && tab !== "integrations") return;
    void refreshIntegrations();
  }, [refreshIntegrations, tab]);

  useEffect(() => {
    if (tab !== "integrations") return;
    void refreshIntegrationConsole();
  }, [refreshIntegrationConsole, tab]);

  useEffect(() => {
    if (tab !== "notifications") return;
    void refreshNotifications();
  }, [refreshNotifications, tab]);

  useEffect(() => {
    if (tab !== "preferences") return;
    void refreshPreferences();
  }, [refreshPreferences, tab]);

  useEffect(() => {
    if (tab !== "workflows") return;
    void refreshWorkflow();
  }, [refreshWorkflow, tab]);

  useEffect(() => {
    if (tab !== "compliance") return;
    void refreshCompliance();
  }, [refreshCompliance, tab]);

  useEffect(() => {
    if (tab !== "billing") return;
    void refreshBilling();
  }, [refreshBilling, tab]);

  useEffect(() => {
    if (tab !== "system") return;
    void refreshSystemSection();
  }, [refreshSystemSection, tab]);

  useEffect(() => {
    if (tab !== "danger") return;
    void refreshDangerZone();
  }, [refreshDangerZone, tab]);

  useEffect(() => {
    if (tab !== "audit") return;
    void refreshAuditSettings();
    setEventsLoading(true);
    const qs = new URLSearchParams({
      page: String(auditPage),
      pageSize: "20",
      kind: auditKind,
      ...(auditStatus ? { status: auditStatus } : {}),
      ...(auditQuery ? { q: auditQuery } : {}),
    });
    fetch(`/api/tenants/${slug}/audit?${qs.toString()}`)
      .then(r => r.json())
      .then(d => {
        setEvents(d.events || []);
        setAuditTotalPages(d.pagination?.totalPages || 1);
        setAuditTotal(d.pagination?.total || 0);
      })
      .catch(() => toast.error("Failed to load audit log"))
      .finally(() => setEventsLoading(false));
  }, [tab, slug, auditPage, auditKind, auditStatus, auditQuery]);

  // Reset to page 1 when filters change
  useEffect(() => { setAuditPage(1); }, [auditKind, auditStatus, auditQuery]);

  const dirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(original), [settings, original]);

  const update = (path: string, value: any) => {
    if (!settings) return;
    const [section, key] = path.split(".");
    setSettings({ ...settings, [section]: { ...(settings as any)[section], [key]: value } });
  };

  const resetModuleStates = () => {
    if (!settings) return;
    const nextModules = Object.fromEntries(
      Object.keys(settings.modules).map((key) => [
        key,
        Object.prototype.hasOwnProperty.call(DEFAULT_TENANT_MODULES, key)
          ? DEFAULT_TENANT_MODULES[key]
          : false,
      ])
    );
    setSettings({ ...settings, modules: nextModules });
    toast.success("Module defaults restored");
  };

  const downloadJson = (filename: string, payload: unknown) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const openActionDialog = (title: string, description?: string, details?: string[]) => {
    setActionDialog({ title, description, details, variant: "default", payload: null });
  };

  const openSecurityDialog = (
    variant: "security-audit" | "security-report" | "security-key",
    title: string,
    description: string,
    payload: Record<string, any>,
    details?: string[]
  ) => {
    setActionDialog({ title, description, details, variant, payload });
  };

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  const runSecurityAction = useCallback(async (action: string, payload?: Record<string, any>) => {
    const response = await fetch(`/api/tenant/${slug}/security/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action, ...(payload || {}) }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || `Failed to ${action}`);
    return data;
  }, [slug]);

  const saveNotificationSettings = useCallback(async (nextSettings?: SettingsShape["notifications"]) => {
    const payload = nextSettings || settings?.notifications;
    if (!payload) return;
    const response = await fetch(`/api/tenant/${slug}/notifications/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ settings: payload }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || "Failed to save notification settings");
    setSettings((current) => current ? {
      ...current,
      notifications: { ...DEFAULT_SETTINGS.notifications, ...(data.settings || payload) },
    } : current);
    setOriginal((current) => current ? {
      ...current,
      notifications: { ...DEFAULT_SETTINGS.notifications, ...(data.settings || payload) },
    } : current);
    return data;
  }, [settings?.notifications, slug]);

  const runNotificationAction = useCallback(async (action: string, payload?: Record<string, any>) => {
    const response = await fetch(`/api/tenant/${slug}/notifications/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        action,
        settings: settings?.notifications,
        useDraftSettings: true,
        ...(payload || {}),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || `Failed to ${action} notifications`);
    return data;
  }, [settings?.notifications, slug]);

  const savePreferenceSettings = useCallback(async (nextPreferences?: SettingsShape["preferences"]) => {
    const payload = nextPreferences || settings?.preferences;
    if (!payload) return;
    const response = await fetch(`/api/tenant/${slug}/preferences`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ preferences: payload }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || "Failed to save tenant preferences");
    const next = { ...DEFAULT_SETTINGS.preferences, ...(data.preferences || payload) };
    setSettings((current) => current ? { ...current, preferences: next } : current);
    setOriginal((current) => current ? { ...current, preferences: next } : current);
    applyTenantPreferences(next as any);
    batchUpdateHospitalSettings(tenant?.id || slug, { preferences: next as any } as any);
    try {
      sessionStorage.setItem("active_tenant_preferences", JSON.stringify(next));
    } catch {}
    return data;
  }, [settings?.preferences, slug, tenant?.id]);

  const runPreferenceAction = useCallback(async (action: string) => {
    const response = await fetch(`/api/tenant/${slug}/preferences/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        action,
        preferences: settings?.preferences,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || `Failed to ${action} preferences`);
    return data;
  }, [settings?.preferences, slug]);

  const saveWorkflowSettings = useCallback(async (nextWorkflow?: SettingsShape["workflow"]) => {
    const payload = nextWorkflow || settings?.workflow;
    if (!payload) return;
    const response = await fetch(`/api/tenant/${slug}/workflow`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ settings: payload }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || "Failed to save workflow settings");
    const next = { ...DEFAULT_SETTINGS.workflow, ...(data.settings || payload) };
    setSettings((current) => current ? { ...current, workflow: next } : current);
    setOriginal((current) => current ? { ...current, workflow: next } : current);
    setWorkflowOverview(data?.overview || workflowOverview);
    return data;
  }, [settings?.workflow, slug, workflowOverview]);

  const runWorkflowAction = useCallback(async (action: string, payload?: Record<string, any>) => {
    const response = await fetch(`/api/tenant/${slug}/workflow/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action, ...(payload || {}) }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || `Failed to ${action} workflow`);
    return data;
  }, [slug]);

  const saveComplianceSettings = useCallback(async (nextCompliance?: SettingsShape["compliance"]) => {
    const payload = nextCompliance || settings?.compliance;
    if (!payload) return;
    const response = await fetch(`/api/tenant/${slug}/compliance/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ settings: payload }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || "Failed to save compliance settings");
    const next = { ...DEFAULT_SETTINGS.compliance, ...(data.settings || payload) };
    setSettings((current) => current ? { ...current, compliance: next } : current);
    setOriginal((current) => current ? { ...current, compliance: next } : current);
    return data;
  }, [settings?.compliance, slug]);

  const runComplianceAction = useCallback(async (action: string, payload?: Record<string, any>) => {
    const response = await fetch(`/api/tenant/${slug}/compliance/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action, ...(payload || {}) }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || `Failed to ${action} compliance`);
    return data;
  }, [slug]);

  const saveWebhook = useCallback(async (webhook?: WebhookItem) => {
    const name = window.prompt("Webhook name", webhook?.name || "Patient Events");
    if (!name) return;
    const url = window.prompt("Webhook URL", webhook?.url || "https://example.com/webhooks/patients");
    if (!url) return;
    const eventsInput = window.prompt("Comma-separated events", webhook?.events?.join(", ") || "patient.created,appointment.updated");
    if (eventsInput == null) return;
    const payload = {
      name: name.trim(),
      url: url.trim(),
      events: eventsInput.split(",").map((item) => item.trim()).filter(Boolean),
      isActive: webhook?.isActive ?? true,
    };
    const endpoint = webhook
      ? `/api/tenant/${slug}/integrations/webhooks/${webhook.id}`
      : `/api/tenant/${slug}/integrations/webhooks`;
    const method = webhook ? "PATCH" : "POST";
    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || "Failed to save webhook");
    await refreshIntegrationConsole();
    toast.success(webhook ? "Webhook updated" : "Webhook added");
  }, [refreshIntegrationConsole, slug]);

  const testWebhook = useCallback(async (webhook: WebhookItem) => {
    const response = await fetch(`/api/tenant/${slug}/integrations/webhooks/${webhook.id}/test`, {
      method: "POST",
      credentials: "include",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.message || data?.error || "Webhook test failed");
    await refreshIntegrationConsole();
    openActionDialog("Webhook Test Completed", `${webhook.name} responded successfully.`, [
      `Status code: ${data.statusCode}`,
      data.message || "Webhook received the test payload",
    ]);
    toast.success("Webhook tested");
  }, [refreshIntegrationConsole, slug]);

  const removeWebhook = useCallback(async (webhook: WebhookItem) => {
    const confirmed = window.confirm(`Remove webhook "${webhook.name}"?`);
    if (!confirmed) return;
    const response = await fetch(`/api/tenant/${slug}/integrations/webhooks/${webhook.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || "Failed to remove webhook");
    await refreshIntegrationConsole();
    toast.success("Webhook removed");
  }, [refreshIntegrationConsole, slug]);

  const generateApiKey = useCallback(async () => {
    const name = window.prompt("API key name", "Production API Key");
    if (!name) return;
    const environmentValue = window.prompt("Environment: production, staging, or development", "production");
    if (!environmentValue) return;
    const scopesInput = window.prompt("Comma-separated scopes", "read,write,webhooks");
    if (scopesInput == null) return;
    const response = await fetch(`/api/tenant/${slug}/integrations/api-keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: name.trim(),
        environment: environmentValue.trim().toLowerCase(),
        scopes: scopesInput.split(",").map((item) => item.trim()).filter(Boolean),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || "Failed to create API key");
    await refreshIntegrationConsole();
    if (data?.rawSecret) {
      await copyText(data.rawSecret, "API key");
    }
    openActionDialog("API Key Created", "Store this secret securely. It will be masked in subsequent views.", [
      `Name: ${data?.apiKey?.name || name}`,
      `Secret: ${data?.rawSecret || "Unavailable"}`,
    ]);
    toast.success("API key generated");
  }, [copyText, refreshIntegrationConsole, slug]);

  const revealApiKey = useCallback(async (apiKey: ApiKeyItem) => {
    const response = await fetch(`/api/tenant/${slug}/integrations/api-keys/${apiKey.id}/reveal`, {
      method: "POST",
      credentials: "include",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || "Failed to reveal API key");
    await copyText(data.secret, "API key");
    await refreshIntegrationConsole();
    openActionDialog("API Key Copied", "The active secret was copied to your clipboard.", [
      `Name: ${apiKey.name}`,
      `Secret: ${data.secret}`,
    ]);
  }, [copyText, refreshIntegrationConsole, slug]);

  const rotateApiKey = useCallback(async (apiKey: ApiKeyItem) => {
    const confirmed = window.confirm(`Rotate API key "${apiKey.name}"? Existing clients will need the new secret.`);
    if (!confirmed) return;
    const response = await fetch(`/api/tenant/${slug}/integrations/api-keys/${apiKey.id}/rotate`, {
      method: "POST",
      credentials: "include",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || "Failed to rotate API key");
    await refreshIntegrationConsole();
    if (data?.rawSecret) {
      await copyText(data.rawSecret, "Rotated API key");
    }
    openActionDialog("API Key Rotated", "The previous secret is no longer valid.", [
      `Name: ${apiKey.name}`,
      `New secret: ${data?.rawSecret || "Unavailable"}`,
    ]);
    toast.success("API key rotated");
  }, [copyText, refreshIntegrationConsole, slug]);

  const revokeApiKey = useCallback(async (apiKey: ApiKeyItem) => {
    const confirmed = window.confirm(`Revoke API key "${apiKey.name}"?`);
    if (!confirmed) return;
    const response = await fetch(`/api/tenant/${slug}/integrations/api-keys/${apiKey.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || "Failed to revoke API key");
    await refreshIntegrationConsole();
    toast.success("API key revoked");
  }, [refreshIntegrationConsole, slug]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tenants/${slug}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error(await res.text());
      batchUpdateHospitalSettings(tenant?.id || slug, {
        name: settings.branding.hospitalName,
        logoUrl: settings.branding.logoUrl || "",
        primaryColor: settings.branding.primaryColor,
        modules: settings.modules,
      });
      setOriginal(JSON.parse(JSON.stringify(settings)));
      toast.success("Settings saved");
    } catch (e: any) {
      toast.error(`Save failed: ${e?.message || "unknown"}`);
    } finally {
      setSaving(false);
    }
  };

  const archiveTenant = async () => {
    if (confirmText !== slug) {
      toast.error(`Type the tenant slug "${slug}" to confirm`);
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/tenants/${slug}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      toast.success(`Tenant archived. Hard purge available after ${format(new Date(data.scheduledPurgeAt), "PP")}`);
      setTimeout(() => router.push("/tenants"), 1200);
    } catch (e: any) {
      toast.error(`Archive failed: ${e?.message}`);
    } finally {
      setDeleting(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Tenant · {slug}</p>
          <h1 className="text-3xl font-bold mt-1 flex items-center gap-3">
            {settings.branding.logoUrl ? (
              <img src={settings.branding.logoUrl} alt="" className="size-9 rounded-lg object-cover border border-border" />
            ) : (
              <div className="size-9 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: settings.branding.primaryColor || orange }}>
                <Building2 className="size-5" />
              </div>
            )}
            {tenant?.name || slug}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Hospital workspace configuration</p>
        </div>
        {dirty && tab !== "audit" && tab !== "danger" && (
          <button onClick={save} disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: orange }}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save changes
          </button>
        )}
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        {/* Tabs */}
        <nav className="bg-card border border-border rounded-xl p-2 h-fit lg:sticky lg:top-4">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.key;
            const danger = t.key === "danger";
            return (
              <button key={t.key} onClick={() => goToTab(t.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? danger ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400" : "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400"
                    : "text-muted-foreground hover:bg-muted/50"
                }`}>
                <Icon className="size-4" />
                {t.label}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="space-y-4">
          {tab === "general" && tenant && (
            <Card title="Hospital Information" desc="Read-only core profile (edit via super-admin)">
              <Field label="Hospital name" value={tenant.name} />
              <Field label="Slug" value={tenant.slug} mono />
              <Field label="Plan" value={tenant.plan} />
              {tenant.contactEmail && <Field icon={Mail} label="Contact email" value={tenant.contactEmail} />}
              {tenant.contactPhone && <Field icon={Phone} label="Contact phone" value={tenant.contactPhone} />}
              {(tenant.address || tenant.city || tenant.country) && (
                <Field icon={MapPin} label="Address" value={[tenant.address, tenant.city, tenant.country].filter(Boolean).join(", ")} />
              )}
            </Card>
          )}

          {tab === "branding" && (
            <Card
              title="Branding"
              desc="Visual identity used across the workspace"
              onReset={() => setSettings({ ...settings, branding: { ...DEFAULT_SETTINGS.branding } })}
            >
              <div className="space-y-6">
                <div className="rounded-xl border border-amber-300 bg-amber-50/60 px-4 py-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                  This section implements enforceable controls and audit evidence aligned to HIPAA safeguards and WHO digital-health guidance. It does not, by itself, constitute legal certification. Legal review, policies, BAAs, staff training, and operational controls still matter.
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground">Last Score</p>
                    <p className="mt-1 text-2xl font-semibold">{settings.compliance.lastComplianceScore || 0}%</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground">Staff Records</p>
                    <p className="mt-1 text-2xl font-semibold">{complianceOverview.staffCount}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground">Recent Compliance Events</p>
                    <p className="mt-1 text-2xl font-semibold">{complianceOverview.recentComplianceEvents}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground">Next Review</p>
                    <p className="mt-1 text-sm font-semibold">{settings.compliance.nextComplianceReviewAt ? format(new Date(settings.compliance.nextComplianceReviewAt), "PP") : "Not scheduled"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Hospital Name</label>
                    <input type="text" value={settings.branding.hospitalName}
                      onChange={e => update("branding.hospitalName", e.target.value)}
                      placeholder="Enter hospital name"
                      className="mt-1.5 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
                    <p className="text-xs text-muted-foreground mt-1">Display name shown in sidebars and headers</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Favicon URL</label>
                    <input type="url" value={settings.branding.favicon}
                      onChange={e => update("branding.favicon", e.target.value)}
                      placeholder="https://..."
                      className="mt-1.5 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
                    <p className="text-xs text-muted-foreground mt-1">Browser tab icon (32x32 PNG)</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Primary Color</label>
                  <div className="flex items-center gap-3 mt-1.5">
                    <input type="color" value={settings.branding.primaryColor}
                      onChange={e => update("branding.primaryColor", e.target.value)}
                      className="h-10 w-16 rounded-lg border border-border cursor-pointer" />
                    <input type="text" value={settings.branding.primaryColor}
                      onChange={e => update("branding.primaryColor", e.target.value)}
                      className="flex-1 max-w-xs h-10 px-3 rounded-lg border border-border bg-background text-sm font-mono" />
                    <button
                      type="button"
                      onClick={() => copyText(settings.branding.primaryColor, "Primary color")}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted text-sm"
                    >
                      <Copy className="size-4" /> Copy Hex
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Used for buttons, links, and accent elements</p>
                </div>

                <div>
                  <label className="text-sm font-medium">Logo</label>
                  <div className="mt-1.5 space-y-3">
                    <input type="url" value={settings.branding.logoUrl}
                      onChange={e => update("branding.logoUrl", e.target.value)}
                      placeholder="https://... or upload file"
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
                    <div className="flex gap-2">
                      <input type="file" id="logo-upload" accept="image/*" className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          const formData = new FormData();
                          formData.append('file', file);
                          formData.append('type', 'logo');
                          
                          try {
                            const res = await fetch(`/api/tenants/${slug}/branding`, {
                              method: 'POST',
                              body: formData,
                            });
                            if (res.ok) {
                              const data = await res.json();
                              update("branding.logoUrl", data.url);
                              toast.success("Logo uploaded successfully");
                            } else {
                              toast.error("Failed to upload logo");
                            }
                          } catch (error) {
                            toast.error("Upload failed");
                          }
                        }} />
                      <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold"
                        onClick={() => document.getElementById('logo-upload')?.click()}>
                        <Upload className="size-4" /> Upload Logo
                      </button>
                      <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"
                        onClick={() => update("branding.logoUrl", "")}>
                        <RefreshCw className="size-4" /> Reset to Default
                      </button>
                    </div>
                  </div>
                  {settings.branding.logoUrl && (
                    <div className="mt-4 p-4 rounded-lg border border-border bg-muted/30">
                      <div className="flex items-center gap-4">
                        <img src={settings.branding.logoUrl} alt="logo preview" className="h-12 w-12 object-contain rounded-lg border border-border bg-white" />
                        <div>
                          <p className="text-sm font-medium">Logo Preview</p>
                          <p className="text-xs text-muted-foreground">SVG, PNG, or JPG • Max 2MB</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">Logo appears in sidebars, headers, and reports. Recommended: 256x256px, transparent background</p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBrandPreview(true);
                      toast.success("Brand preview opened");
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold"
                  >
                    <Eye className="size-4" /> Preview Changes
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/tenants/${slug}/branding-kit`, {
                          credentials: "include",
                          cache: "no-store",
                        });
                        if (!response.ok) {
                          const errorData = await response.json().catch(() => ({}));
                          throw new Error(errorData?.error || "Failed to export branding kit");
                        }
                        const blob = await response.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${slug}-branding-kit.json`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                        toast.success("Branding kit exported");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Failed to export branding kit");
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"
                  >
                    <Download className="size-4" /> Export Branding Kit
                  </button>
                </div>
                {showBrandPreview && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-xl border border-border bg-background shadow-2xl">
                      <div className="flex items-center justify-between border-b border-border px-6 py-4">
                        <div>
                          <h3 className="text-lg font-semibold">Brand Preview</h3>
                          <p className="text-sm text-muted-foreground">Preview how branding changes appear across the tenant workspace</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowBrandPreview(false)}
                          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
                        >
                          <X className="size-4" />
                          Close
                        </button>
                      </div>
                      <div className="overflow-hidden rounded-b-xl">
                        <div className="px-6 py-5 text-white" style={{ background: `linear-gradient(135deg, ${settings.branding.primaryColor}, ${settings.branding.primaryColor}cc)` }}>
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-xs uppercase tracking-[0.2em] text-white/75">Brand Preview</p>
                              <h3 className="text-2xl font-bold mt-1">{settings.branding.hospitalName || tenant?.name || slug}</h3>
                            </div>
                            {settings.branding.logoUrl ? (
                              <img src={settings.branding.logoUrl} alt="Logo preview" className="h-14 max-w-32 rounded-lg bg-white/10 p-2 object-contain" />
                            ) : null}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 bg-background p-6 md:grid-cols-3">
                          <div className="rounded-xl border border-border p-4">
                            <p className="mb-3 text-sm font-semibold">Primary Button</p>
                            <button className="rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: settings.branding.primaryColor }}>
                              Confirm Appointment
                            </button>
                          </div>
                          <div className="rounded-xl border border-border p-4">
                            <p className="mb-3 text-sm font-semibold">Sidebar Identity</p>
                            <div className="flex items-center gap-3">
                              {settings.branding.logoUrl ? (
                                <img src={settings.branding.logoUrl} alt="Sidebar preview" className="h-10 w-10 rounded-xl border border-border bg-white p-1 object-contain" />
                              ) : (
                                <div className="h-10 w-10 rounded-xl" style={{ backgroundColor: settings.branding.primaryColor }} />
                              )}
                              <div>
                                <p className="text-sm font-semibold">{settings.branding.hospitalName || tenant?.name || slug}</p>
                                <p className="text-xs text-muted-foreground">Healthcare OS</p>
                              </div>
                            </div>
                          </div>
                          <div className="rounded-xl border border-border p-4">
                            <p className="mb-3 text-sm font-semibold">Browser Tab</p>
                            <div className="flex items-center gap-2">
                              {settings.branding.favicon ? (
                                <img src={settings.branding.favicon} alt="Favicon preview" className="h-8 w-8 rounded border border-border bg-white p-1 object-contain" />
                              ) : (
                                <div className="h-8 w-8 rounded border border-border" style={{ backgroundColor: settings.branding.primaryColor }} />
                              )}
                              <span className="text-sm">{settings.branding.hospitalName || tenant?.name || slug}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {tab === "modules" && (
            <Card
              title="Active Modules"
              desc="Control which tenant modules stay visible in navigation and remain accessible in tenant dashboards"
              onReset={resetModuleStates}
            >
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs font-medium text-muted-foreground">Enabled Modules</p>
                    <p className="mt-2 text-2xl font-bold">
                      {Object.values(settings.modules).filter(Boolean).length}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs font-medium text-muted-foreground">Disabled Modules</p>
                    <p className="mt-2 text-2xl font-bold">
                      {Object.values(settings.modules).filter((value) => !value).length}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs font-medium text-muted-foreground">Default-Enabled</p>
                    <p className="mt-2 text-2xl font-bold">
                      {Object.values(DEFAULT_TENANT_MODULES).filter(Boolean).length}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!settings) return;
                      const nextModules = Object.fromEntries(Object.keys(settings.modules).map((key) => [key, true]));
                      setSettings({ ...settings, modules: nextModules });
                      toast.success("All modules enabled");
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
                  >
                    <CheckCircle2 className="size-4" />
                    Enable All
                  </button>
                  <button
                    type="button"
                    onClick={resetModuleStates}
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
                  >
                    <RefreshCw className="size-4" />
                    Restore Default States
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      downloadJson(`${slug}-modules.json`, settings.modules);
                      toast.success("Module settings exported");
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
                  >
                    <Download className="size-4" />
                    Export Modules
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {Object.entries(settings.modules).map(([k, v]) => (
                    <Toggle key={k} label={cap(k)} desc={moduleHint(k)} value={v} onChange={x => update(`modules.${k}`, x)} />
                  ))}
                </div>
              </div>
            </Card>
          )}

          {tab === "notifications" && (
            <Card
              title="Notification Channels"
              desc="Configure how and where notifications are sent"
              onReset={() => setSettings({ ...settings, notifications: { ...DEFAULT_SETTINGS.notifications } })}
            >
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground">Sent Last 24h</p>
                    <p className="mt-1 text-2xl font-semibold">{notificationOverview.sentLast24h}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground">Unread</p>
                    <p className="mt-1 text-2xl font-semibold">{notificationOverview.unreadCount}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground">Critical Last 7d</p>
                    <p className="mt-1 text-2xl font-semibold">{notificationOverview.criticalLast7d}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground">Policy Events 30d</p>
                    <p className="mt-1 text-2xl font-semibold">{notificationOverview.activityLast30d}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-foreground">Channels</h4>
                    <Toggle label="Email" desc="Appointment reminders, alerts, daily digests" value={settings.notifications.emailEnabled} onChange={x => update("notifications.emailEnabled", x)} />
                    <Toggle label="SMS" desc="Critical alerts via text message" value={settings.notifications.smsEnabled} onChange={x => update("notifications.smsEnabled", x)} />
                    <Toggle label="Push" desc="In-app and mobile push notifications" value={settings.notifications.pushEnabled} onChange={x => update("notifications.pushEnabled", x)} />
                    <Toggle label="In-app" desc="Notification center and live tenant banner alerts" value={settings.notifications.inAppEnabled} onChange={x => update("notifications.inAppEnabled", x)} />
                    <Toggle label="Slack" desc="Team notifications via Slack workspace" value={settings.notifications.slackEnabled} onChange={x => update("notifications.slackEnabled", x)} />
                    <Toggle label="Notification sounds" desc="Play alert sounds on supported tenant dashboards" value={settings.notifications.soundEnabled} onChange={x => update("notifications.soundEnabled", x)} />
                    <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                      <p>Email channel: {notificationChannelsReady.email ? "Configured" : "Not configured"}</p>
                      <p>SMS channel: {notificationChannelsReady.sms ? "Configured" : "Not configured"}</p>
                      <p>Slack channel: {notificationChannelsReady.slack ? "Configured" : "Not configured"}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-foreground">Quiet Hours</h4>
                    <Toggle label="Enable quiet hours" desc="Suppress non-critical outbound notifications during configured hours" value={settings.notifications.quietHoursEnabled} onChange={x => update("notifications.quietHoursEnabled", x)} />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Start</label>
                        <input type="time" value={settings.notifications.quietHoursStart} onChange={event => update("notifications.quietHoursStart", event.target.value)} className="mt-1 w-full h-9 px-2 rounded-lg border border-border bg-background text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">End</label>
                        <input type="time" value={settings.notifications.quietHoursEnd} onChange={event => update("notifications.quietHoursEnd", event.target.value)} className="mt-1 w-full h-9 px-2 rounded-lg border border-border bg-background text-sm" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Notifications will be silenced during these hours</p>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={settings.notifications.allowCriticalDuringQuietHours} onChange={event => update("notifications.allowCriticalDuringQuietHours", event.target.checked)} className="accent-orange-500" />
                      <span className="text-sm">Allow critical alerts during quiet hours</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Notification Categories</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-3">
                      <Toggle label="System alerts" desc="Maintenance and uptime notifications" value={settings.notifications.systemAlerts} onChange={x => update("notifications.systemAlerts", x)} />
                      <Toggle label="Emergency events" desc="Critical clinical alerts" value={settings.notifications.emergencyEvents} onChange={x => update("notifications.emergencyEvents", x)} />
                      <Toggle label="Appointment reminders" desc="Upcoming appointments and changes" value={settings.notifications.appointmentReminders} onChange={x => update("notifications.appointmentReminders", x)} />
                    </div>
                    <div className="space-y-3">
                      <Toggle label="Lab results" desc="New test results available" value={settings.notifications.labResults} onChange={x => update("notifications.labResults", x)} />
                      <Toggle label="Billing updates" desc="Invoice and payment notifications" value={settings.notifications.billingUpdates} onChange={x => update("notifications.billingUpdates", x)} />
                      <Toggle label="Product updates" desc="New features and tips" value={settings.notifications.productUpdates} onChange={x => update("notifications.productUpdates", x)} />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/10 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Recent Activity</h4>
                      <p className="text-xs text-muted-foreground">Latest tenant notification events and delivery records.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void refreshNotifications()}
                      className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs hover:bg-muted"
                    >
                      <RefreshCw className={`size-3.5 ${notificationsLoading ? "animate-spin" : ""}`} />
                      Refresh
                    </button>
                  </div>
                  <div className="mt-4 space-y-2">
                    {notificationOverview.recentEvents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No recent notification activity recorded for this tenant.</p>
                    ) : (
                      notificationOverview.recentEvents.slice(0, 6).map((event) => (
                        <div key={event.id} className="rounded-lg border border-border bg-background px-3 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium">{event.title}</p>
                              <p className="text-xs text-muted-foreground">{event.message}</p>
                            </div>
                            <div className="text-right text-xs text-muted-foreground">
                              <p>{event.createdAt ? format(new Date(event.createdAt), "PPp") : "Just now"}</p>
                              <p>{event.read ? "Read" : "Unread"}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await saveNotificationSettings();
                        const data = await runNotificationAction("test");
                        setActionDialog({
                          title: "Notification Test",
                          description: "Notification channels were tested against the active tenant notification policy.",
                          details: [
                            `Enabled channels: ${(data?.summary?.enabledChannels || []).join(", ") || "None"}`,
                            `Enabled categories: ${(data?.summary?.enabledCategories || []).join(", ") || "None"}`,
                            data?.quietHoursActive ? "Quiet hours are currently active." : "Quiet hours are currently inactive.",
                          ],
                          variant: "notification-test",
                          payload: data,
                        });
                        await refreshNotifications();
                        toast.success("Notification test completed");
                      } catch (error: any) {
                        toast.error(error?.message || "Notification test failed");
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold"
                  >
                    <Bell className="size-4" /> Test Notifications
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const data = await runNotificationAction("export");
                        downloadJson(`${slug}-notification-settings.json`, data);
                        setActionDialog({
                          title: "Notification Settings Exported",
                          description: "The tenant notification configuration was exported from the live settings store.",
                          details: [],
                          variant: "notification-export",
                          payload: data,
                        });
                        toast.success("Notification settings exported");
                      } catch (error: any) {
                        toast.error(error?.message || "Failed to export notification settings");
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"
                  >
                    <Download className="size-4" /> Export Settings
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await saveNotificationSettings();
                        await refreshNotifications();
                        toast.success("Notification settings saved");
                      } catch (error: any) {
                        toast.error(error?.message || "Failed to save notification settings");
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"
                  >
                    <Save className="size-4" /> Save Section
                  </button>
                </div>
              </div>
            </Card>
          )}

          {tab === "preferences" && (
            <Card
              title="Locale & Preferences"
              desc="Configure display formats, timezone, and regional settings"
              onReset={() => setSettings({ ...settings, preferences: { ...DEFAULT_SETTINGS.preferences } })}
            >
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground">Tenant Users</p>
                    <p className="mt-1 text-2xl font-semibold">{preferenceOverview.totalUsers}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground">Language Overrides</p>
                    <p className="mt-1 text-2xl font-semibold">{preferenceOverview.languageOverrides}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground">Inheriting Language</p>
                    <p className="mt-1 text-2xl font-semibold">{preferenceOverview.inheritingLanguage ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground">Tenant Currency</p>
                    <p className="mt-1 text-2xl font-semibold">{settings.preferences.currency}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select label="Timezone" value={settings.preferences.timezone} options={TIMEZONES.map(t => ({ v: t, l: t }))} onChange={x => update("preferences.timezone", x)} />
                  <Select label="Language" value={settings.preferences.language} options={LANGUAGES} onChange={x => update("preferences.language", x)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium">Currency</label>
                        <div className="mt-1.5">
                          <CurrencySelect value={settings.preferences.currency} onChange={x => update("preferences.currency", x)} />
                        </div>
                      </div>
                  <Select label="Date Format" value={settings.preferences.dateFormat} options={DATE_FORMATS.map(d => ({ v: d, l: d }))} onChange={x => update("preferences.dateFormat", x)} />
                  <Select
                    label="Number Format"
                    value={settings.preferences.numberFormat}
                    options={[
                      { v: "us", l: "1,234.56 (US)" },
                      { v: "eu", l: "1 234,56 (EU)" },
                      { v: "de", l: "1.234,56 (DE)" },
                    ]}
                    onChange={x => update("preferences.numberFormat", x)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Select
                    label="Time Format"
                    value={settings.preferences.timeFormat}
                    options={[
                      { v: "12h", l: "12-hour" },
                      { v: "24h", l: "24-hour" },
                    ]}
                    onChange={x => update("preferences.timeFormat", x)}
                  />
                  <Select
                    label="Week Starts"
                    value={settings.preferences.weekStartDay}
                    options={[
                      { v: "Monday", l: "Monday" },
                      { v: "Sunday", l: "Sunday" },
                    ]}
                    onChange={x => update("preferences.weekStartDay", x)}
                  />
                  <div className="rounded-xl border border-border bg-muted/10 px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground">Language Policy</p>
                    <p className="mt-1 text-sm text-foreground">Tenant language applies to all users except users who explicitly changed language in personal settings.</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Display Preferences</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-3">
                      <Toggle label="24-hour time" desc="Use 24-hour clock format" value={settings.preferences.timeFormat === "24h"} onChange={x => update("preferences.timeFormat", x ? "24h" : "12h")} />
                      <Toggle label="Compact mode" desc="Reduce spacing and padding" value={settings.preferences.compactMode} onChange={x => update("preferences.compactMode", x)} />
                      <Toggle label="High contrast" desc="Improve readability" value={settings.preferences.highContrast} onChange={x => update("preferences.highContrast", x)} />
                    </div>
                    <div className="space-y-3">
                      <Toggle label="Auto-save forms" desc="Save drafts automatically" value={settings.preferences.autoSaveForms} onChange={x => update("preferences.autoSaveForms", x)} />
                      <Toggle label="Show tooltips" desc="Display help text on hover" value={settings.preferences.showTooltips} onChange={x => update("preferences.showTooltips", x)} />
                      <Toggle label="Keyboard shortcuts" desc="Enable hotkeys" value={settings.preferences.keyboardShortcuts} onChange={x => update("preferences.keyboardShortcuts", x)} />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await savePreferenceSettings();
                        const data = await runPreferenceAction("apply");
                        setActionDialog({
                          title: "Tenant Preferences Applied",
                          description: "Tenant-wide locale and workspace defaults were applied to active sessions.",
                          details: [
                            `Timezone: ${data?.summary?.timezone || settings.preferences.timezone}`,
                            `Language: ${data?.summary?.language || settings.preferences.language}`,
                            `Affected users: ${data?.overview?.affectedUsers ?? 0}`,
                            `Language overrides preserved: ${data?.overview?.languageOverrides ?? 0}`,
                          ],
                          variant: "preference-apply",
                          payload: data,
                        });
                        await refreshPreferences();
                        toast.success("Preferences applied across the tenant");
                      } catch (error: any) {
                        toast.error(error?.message || "Failed to apply tenant preferences");
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold"
                  >
                    <Globe className="size-4" /> Apply to All Users
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const data = await runPreferenceAction("export");
                        downloadJson(`${slug}-preferences.json`, data);
                        setActionDialog({
                          title: "Tenant Preferences Exported",
                          description: "The active tenant preferences and override impact snapshot were exported.",
                          details: [],
                          variant: "preference-export",
                          payload: data,
                        });
                        toast.success("Preference settings exported");
                      } catch (error: any) {
                        toast.error(error?.message || "Failed to export preferences");
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"
                  >
                    <Download className="size-4" /> Export Settings
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await savePreferenceSettings();
                        await refreshPreferences();
                        toast.success("Preference settings saved");
                      } catch (error: any) {
                        toast.error(error?.message || "Failed to save preferences");
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"
                  >
                    <Save className="size-4" /> Save Section
                  </button>
                  <button
                    type="button"
                    onClick={() => void refreshPreferences()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"
                  >
                    <RefreshCw className={`size-4 ${preferencesLoading ? "animate-spin" : ""}`} /> Refresh
                  </button>
                </div>
              </div>
            </Card>
          )}

          {tab === "workflows" && (
            <Card
              title="Workflow Automation"
              desc="Configure automated processes and business rules"
              onReset={() => setSettings({ ...settings, workflow: { ...DEFAULT_SETTINGS.workflow } })}
            >
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground">Enabled Automations</p>
                    <p className="mt-1 text-2xl font-semibold">{workflowOverview.enabledAutomations}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground">Disabled Automations</p>
                    <p className="mt-1 text-2xl font-semibold">{workflowOverview.disabledAutomations}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground">Custom Workflows</p>
                    <p className="mt-1 text-2xl font-semibold">{workflowOverview.customWorkflows}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground">Backup Frequency</p>
                    <p className="mt-1 text-2xl font-semibold capitalize">{settings.workflow.backupFrequency}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Toggle label="Automation master switch" desc="Disable all non-manual tenant workflows at once." value={settings.workflow.automationEnabled} onChange={x => update("workflow.automationEnabled", x)} />
                  <Toggle label="Tenant patient notifications" desc="Allow automated patient-facing notifications from workflow engines." value={settings.workflow.patientNotifications} onChange={x => update("workflow.patientNotifications", x)} />
                  <Toggle label="Tenant staff notifications" desc="Allow automated staff operational notifications from workflow engines." value={settings.workflow.staffNotifications} onChange={x => update("workflow.staffNotifications", x)} />
                  <Toggle label="Prescription alerts" desc="Generate automated prescription alert workflows." value={settings.workflow.prescriptionAlerts} onChange={x => update("workflow.prescriptionAlerts", x)} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-foreground">Appointment Workflows</h4>
                    <Toggle label="Auto-confirm appointments" desc="Automatically confirm bookings within business hours" value={settings.workflow.autoConfirmAppointments} onChange={x => update("workflow.autoConfirmAppointments", x)} />
                    <Toggle label="Reminder notifications" desc="Send automated reminders before appointments" value={settings.workflow.reminderNotifications} onChange={x => update("workflow.reminderNotifications", x)} />
                    <Toggle label="No-show alerts" desc="Notify staff when patients don't show up" value={settings.workflow.noShowAlerts} onChange={x => update("workflow.noShowAlerts", x)} />
                    <Toggle label="Follow-up scheduling" desc="Automatically schedule follow-up appointments" value={settings.workflow.followUpScheduling} onChange={x => update("workflow.followUpScheduling", x)} />
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-foreground">Lab Workflows</h4>
                    <Toggle label="Auto-result notifications" desc="Notify patients when lab results are ready" value={settings.workflow.autoResultNotifications} onChange={x => update("workflow.autoResultNotifications", x)} />
                    <Toggle label="Critical value alerts" desc="Immediate alerts for critical lab values" value={settings.workflow.criticalValueAlerts} onChange={x => update("workflow.criticalValueAlerts", x)} />
                    <Toggle label="Result review queue" desc="Route results through physician review queue" value={settings.workflow.resultReviewQueue} onChange={x => update("workflow.resultReviewQueue", x)} />
                    <Toggle label="Auto-archive old results" desc="Automatically archive results older than 1 year" value={settings.workflow.autoArchiveOldResults} onChange={x => update("workflow.autoArchiveOldResults", x)} />
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Billing Workflows</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-3">
                      <Toggle label="Auto-generate invoices" desc="Create invoices automatically after visits" value={settings.workflow.autoGenerateInvoices} onChange={x => update("workflow.autoGenerateInvoices", x)} />
                      <Toggle label="Payment reminders" desc="Send automated payment reminders" value={settings.workflow.paymentReminders} onChange={x => update("workflow.paymentReminders", x)} />
                      <Toggle label="Insurance claim automation" desc="Auto-submit claims to insurance providers" value={settings.workflow.insuranceClaimAutomation} onChange={x => update("workflow.insuranceClaimAutomation", x)} />
                    </div>
                    <div className="space-y-3">
                      <Toggle label="Overdue account alerts" desc="Notify staff of overdue accounts" value={settings.workflow.overdueAccountAlerts} onChange={x => update("workflow.overdueAccountAlerts", x)} />
                      <Toggle label="Auto-write-off small balances" desc="Automatically write off balances under tenant threshold" value={settings.workflow.autoWriteOffSmallBalances} onChange={x => update("workflow.autoWriteOffSmallBalances", x)} />
                      <Toggle label="Monthly billing cycle" desc="Generate monthly statements for patients" value={settings.workflow.monthlyBillingCycle} onChange={x => update("workflow.monthlyBillingCycle", x)} />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Emergency Protocols</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-3">
                      <Toggle label="Auto-escalation alerts" desc="Escalate critical cases to senior staff" value={settings.workflow.autoEscalationAlerts} onChange={x => update("workflow.autoEscalationAlerts", x)} />
                      <Toggle label="Emergency team notification" desc="Notify emergency response team" value={settings.workflow.emergencyTeamNotification} onChange={x => update("workflow.emergencyTeamNotification", x)} />
                      <Toggle label="Ambulance dispatch integration" desc="Auto-dispatch ambulances for critical cases" value={settings.workflow.ambulanceDispatchIntegration} onChange={x => update("workflow.ambulanceDispatchIntegration", x)} />
                    </div>
                    <div className="space-y-3">
                      <Toggle label="Family notification system" desc="Auto-notify family members in emergencies" value={settings.workflow.familyNotificationSystem} onChange={x => update("workflow.familyNotificationSystem", x)} />
                      <Toggle label="Emergency log generation" desc="Automatically create incident reports" value={settings.workflow.emergencyLogGeneration} onChange={x => update("workflow.emergencyLogGeneration", x)} />
                      <Toggle label="Post-incident follow-up" desc="Schedule automatic follow-up care" value={settings.workflow.postIncidentFollowUp} onChange={x => update("workflow.postIncidentFollowUp", x)} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Toggle label="Report generation automation" desc="Allow scheduled accountant report jobs to execute automatically." value={settings.workflow.reportGeneration} onChange={x => update("workflow.reportGeneration", x)} />
                  <Toggle label="Billing automation" desc="Enable billing automation policies for automated invoice and account workflows." value={settings.workflow.billingAutomation} onChange={x => update("workflow.billingAutomation", x)} />
                  <Toggle label="Automated backups" desc="Allow scheduled tenant backup jobs to execute." value={settings.workflow.dataBackupEnabled} onChange={x => update("workflow.dataBackupEnabled", x)} />
                  <div>
                    <label className="text-sm font-medium">Backup Frequency</label>
                    <select
                      value={settings.workflow.backupFrequency}
                      onChange={(event) => update("workflow.backupFrequency", event.target.value)}
                      className="mt-1.5 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>

                {settings.workflow.customWorkflows.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3">Custom Workflow Library</h4>
                    <div className="space-y-2">
                      {settings.workflow.customWorkflows.map((item) => (
                        <div key={item.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-3 text-sm">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.createdAt ? format(new Date(item.createdAt), "PPp") : "Recently created"}</p>
                          </div>
                          <span className="rounded-full bg-muted px-2 py-1 text-xs capitalize">{item.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const workflowName = window.prompt("Enter a workflow name", "Custom Care Escalation");
                      if (!workflowName) return;
                      try {
                        const data = await runWorkflowAction("create-custom", { name: workflowName });
                        setSettings((current) => current ? { ...current, workflow: { ...DEFAULT_SETTINGS.workflow, ...(data.settings || current.workflow) } } : current);
                        await refreshWorkflow();
                        openActionDialog("Workflow Created", "The workflow blueprint has been added to this tenant's workflow library.", [
                          `Workflow: ${workflowName}`,
                          "Status: Draft",
                          "Saved to tenant workflow library.",
                        ]);
                        toast.success("Custom workflow created");
                      } catch (error: any) {
                        toast.error(error?.message || "Failed to create custom workflow");
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold"
                  >
                    <GitBranch className="size-4" /> Create Custom Workflow
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const data = await runWorkflowAction("export");
                        downloadJson(`${slug}-workflow-settings.json`, data);
                        openActionDialog("Workflow Settings Exported", "The live tenant workflow policy was exported.", [
                          `Enabled automations: ${workflowOverview.enabledAutomations}`,
                          `Custom workflows: ${workflowOverview.customWorkflows}`,
                          `Backup frequency: ${settings.workflow.backupFrequency}`,
                        ]);
                        toast.success("Workflow settings exported");
                      } catch (error: any) {
                        toast.error(error?.message || "Failed to export workflow settings");
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"
                  >
                    <Download className="size-4" /> Export Workflows
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await saveWorkflowSettings();
                        const data = await runWorkflowAction("simulate");
                        setActionDialog({
                          title: "Workflow Simulation",
                          description: "The current tenant workflow policy was evaluated against key automation paths.",
                          details: Object.values(data?.simulated || {}),
                          variant: "workflow-simulate",
                          payload: data,
                        });
                        await refreshWorkflow();
                        toast.success("Workflow simulation completed");
                      } catch (error: any) {
                        toast.error(error?.message || "Failed to simulate workflow behavior");
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"
                  >
                    <Activity className="size-4" /> Simulate Workflows
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await saveWorkflowSettings();
                        await refreshWorkflow();
                        toast.success("Workflow settings saved");
                      } catch (error: any) {
                        toast.error(error?.message || "Failed to save workflow settings");
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"
                  >
                    <Save className="size-4" /> Save Section
                  </button>
                  <button
                    type="button"
                    onClick={() => void refreshWorkflow()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"
                  >
                    <RefreshCw className={`size-4 ${workflowLoading ? "animate-spin" : ""}`} /> Refresh
                  </button>
                </div>
              </div>
            </Card>
          )}

          {tab === "compliance" && (
            <Card
              title="Compliance & Regulatory"
              desc="Regulatory safeguards, retention controls, and operational evidence aligned to healthcare privacy and safety programs"
              onReset={() => setSettings({ ...settings, compliance: { ...DEFAULT_SETTINGS.compliance } })}
            >
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-foreground">HIPAA & Security Safeguards</h4>
                    <Toggle label="HIPAA program mode" desc="Enable HIPAA-oriented safeguards, evidence, and policy checks." value={settings.compliance.hipaaMode} onChange={x => update("compliance.hipaaMode", x)} />
                    <Toggle label="Audit logging enabled" desc="Log access and control changes related to patient data." value={settings.compliance.auditLoggingEnabled} onChange={x => update("compliance.auditLoggingEnabled", x)} />
                    <Toggle label="Data encryption at rest" desc="Enforce encryption expectations for stored healthcare data." value={settings.compliance.encryptionAtRest} onChange={x => update("compliance.encryptionAtRest", x)} />
                    <Toggle label="Encryption in transit" desc="Require encrypted transport safeguards." value={settings.compliance.encryptionInTransit} onChange={x => update("compliance.encryptionInTransit", x)} />
                    <Toggle label="PHI access controls" desc="Restrict access to protected health information." value={settings.compliance.phiAccessControls} onChange={x => update("compliance.phiAccessControls", x)} />
                    <Toggle label="Minimum necessary access" desc="Apply minimum-necessary handling expectations." value={settings.compliance.minimumNecessaryAccess} onChange={x => update("compliance.minimumNecessaryAccess", x)} />
                    <Toggle label="Breach notification system" desc="Maintain breach response workflow and contact readiness." value={settings.compliance.breachNotificationSystem} onChange={x => update("compliance.breachNotificationSystem", x)} />
                    <Toggle label="Business associate agreement tracking" desc="Track third-party agreement readiness for regulated vendors." value={settings.compliance.businessAssociateAgreementTracking} onChange={x => update("compliance.businessAssociateAgreementTracking", x)} />
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-foreground">Privacy, WHO, and Cross-Border Controls</h4>
                    <Toggle label="GDPR program mode" desc="Enable GDPR-oriented data governance controls where applicable." value={settings.compliance.gdprMode} onChange={x => update("compliance.gdprMode", x)} />
                    <Toggle label="WHO guideline mode" desc="Use WHO-aligned digital-health safety and governance posture." value={settings.compliance.whoGuidelineMode} onChange={x => update("compliance.whoGuidelineMode", x)} />
                    <Toggle label="Data subject rights" desc="Support access, rectification, and related regulated data rights." value={settings.compliance.dataSubjectRights} onChange={x => update("compliance.dataSubjectRights", x)} />
                    <Toggle label="Consent management" desc="Track and manage patient consents." value={settings.compliance.consentManagement} onChange={x => update("compliance.consentManagement", x)} />
                    <Toggle label="Data portability" desc="Support regulated data export portability workflows." value={settings.compliance.dataPortability} onChange={x => update("compliance.dataPortability", x)} />
                    <Toggle label="Privacy by design" desc="Apply privacy-first defaults in tenant configuration." value={settings.compliance.privacyByDesign} onChange={x => update("compliance.privacyByDesign", x)} />
                    <Toggle label="Cross-border transfer review" desc="Require review before cross-border data handling changes." value={settings.compliance.crossBorderTransferReview} onChange={x => update("compliance.crossBorderTransferReview", x)} />
                    <Toggle label="WHO clinical safety checklist" desc="Maintain WHO-aligned clinical safety checklist controls." value={settings.compliance.whoClinicalSafetyChecklist} onChange={x => update("compliance.whoClinicalSafetyChecklist", x)} />
                    <Toggle label="Interoperability standards check" desc="Require standards-aware review for data exchange workflows." value={settings.compliance.interoperabilityStandardsCheck} onChange={x => update("compliance.interoperabilityStandardsCheck", x)} />
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Data Retention Policies</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm font-medium">Patient Records (years)</label>
                      <input type="number" value={settings.compliance.patientRecordsRetentionYears} min="1" max="20" onChange={event => update("compliance.patientRecordsRetentionYears", Number(event.target.value))}
                        className="mt-1.5 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Audit Logs (years)</label>
                      <input type="number" value={settings.compliance.auditLogsRetentionYears} min="1" max="20" onChange={event => update("compliance.auditLogsRetentionYears", Number(event.target.value))}
                        className="mt-1.5 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Billing Records (years)</label>
                      <input type="number" value={settings.compliance.billingRecordsRetentionYears} min="1" max="20" onChange={event => update("compliance.billingRecordsRetentionYears", Number(event.target.value))}
                        className="mt-1.5 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Consent Records (years)</label>
                      <input type="number" value={settings.compliance.consentRecordsRetentionYears} min="1" max="20" onChange={event => update("compliance.consentRecordsRetentionYears", Number(event.target.value))}
                        className="mt-1.5 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Compliance Reviews</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">Last Compliance Review</p>
                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                          {settings.compliance.lastComplianceScore >= 85 ? "Healthy" : settings.compliance.lastComplianceScore >= 60 ? "Review" : "Risk"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{settings.compliance.lastComplianceReviewAt ? `Completed on ${format(new Date(settings.compliance.lastComplianceReviewAt), "PP")}` : "No compliance review recorded yet"}</p>
                      <button type="button" onClick={async () => {
                        try {
                          const data = await runComplianceAction("export-report");
                          setActionDialog({
                            title: "Compliance Report Preview",
                            description: "Latest compliance evidence and findings snapshot.",
                            details: [],
                            variant: "compliance-export",
                            payload: data,
                          });
                        } catch (error: any) {
                          toast.error(error?.message || "Failed to preview compliance report");
                        }
                      }} className="text-xs font-semibold text-orange-600 hover:underline mt-2">
                        View Report
                      </button>
                    </div>
                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">Next Review Due</p>
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                          Scheduled
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{settings.compliance.nextComplianceReviewAt ? `Due on ${format(new Date(settings.compliance.nextComplianceReviewAt), "PP")}` : "No review scheduled"}</p>
                      <button type="button" onClick={async () => {
                        try {
                          const data = await runComplianceAction("schedule-review");
                          setSettings((current) => current ? {
                            ...current,
                            compliance: {
                              ...current.compliance,
                              nextComplianceReviewAt: data.nextComplianceReviewAt,
                            },
                          } : current);
                          toast.success("Compliance review scheduled");
                        } catch (error: any) {
                          toast.error(error?.message || "Failed to schedule compliance review");
                        }
                      }} className="text-xs font-semibold text-orange-600 hover:underline mt-2">
                        Schedule Now
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Compliance Training</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-3">
                      <Toggle label="Annual HIPAA training" desc="Require annual HIPAA compliance training" value={settings.compliance.annualHipaaTraining} onChange={x => update("compliance.annualHipaaTraining", x)} />
                      <Toggle label="GDPR awareness training" desc="Require GDPR compliance training" value={settings.compliance.gdprAwarenessTraining} onChange={x => update("compliance.gdprAwarenessTraining", x)} />
                      <Toggle label="Security awareness training" desc="Require cybersecurity training" value={settings.compliance.securityAwarenessTraining} onChange={x => update("compliance.securityAwarenessTraining", x)} />
                    </div>
                    <div className="space-y-3">
                      <Toggle label="Training completion tracking" desc="Track and report training completion" value={settings.compliance.trainingTracking} onChange={x => update("compliance.trainingTracking", x)} />
                      <Toggle label="Automated reminders" desc="Send reminders for overdue training" value={settings.compliance.automatedTrainingReminders} onChange={x => update("compliance.automatedTrainingReminders", x)} />
                      <Toggle label="Certification management" desc="Track professional certifications" value={settings.compliance.certificationManagement} onChange={x => update("compliance.certificationManagement", x)} />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await saveComplianceSettings();
                        const data = await runComplianceAction("run-check");
                        setSettings((current) => current ? {
                          ...current,
                          compliance: {
                            ...current.compliance,
                            lastComplianceReviewAt: data?.settings?.lastComplianceReviewAt || current.compliance.lastComplianceReviewAt,
                            lastComplianceScore: data?.score ?? current.compliance.lastComplianceScore,
                          },
                        } : current);
                        setActionDialog({
                          title: "Compliance Check Completed",
                          description: "The tenant compliance profile was evaluated against configured safeguards and policy controls.",
                          details: (data?.findings || []).map((item: any) => `${item.framework}: ${item.control} - ${item.detail}`),
                          variant: "compliance-check",
                          payload: data,
                        });
                        await refreshCompliance();
                        toast.success("Compliance check completed");
                      } catch (error: any) {
                        toast.error(error?.message || "Compliance check failed");
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold"
                  >
                    <FileCheck className="size-4" /> Run Compliance Check
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const data = await runComplianceAction("export-report");
                        downloadJson(`${slug}-compliance-report.json`, data);
                        setActionDialog({
                          title: "Compliance Report Exported",
                          description: "A tenant compliance evidence report was exported.",
                          details: [],
                          variant: "compliance-export",
                          payload: data,
                        });
                        toast.success("Compliance report exported");
                      } catch (error: any) {
                        toast.error(error?.message || "Failed to export compliance report");
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"
                  >
                    <Download className="size-4" /> Export Compliance Report
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await saveComplianceSettings();
                        const data = await runComplianceAction("preview-breach");
                        openActionDialog("Breach Workflow Preview", "Current breach and incident-notification readiness.", [
                          `Workflow enabled: ${data?.breachWorkflowEnabled ? "Yes" : "No"}`,
                          `Primary contact: ${data?.contacts?.primary || "Not configured"}`,
                          `Emergency phone: ${data?.contacts?.emergencyPhone || "Not configured"}`,
                        ]);
                      } catch (error: any) {
                        toast.error(error?.message || "Failed to preview breach workflow");
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"
                  >
                    <AlertTriangle className="size-4" /> Preview Breach Workflow
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await saveComplianceSettings();
                        await refreshCompliance();
                        toast.success("Compliance settings saved");
                      } catch (error: any) {
                        toast.error(error?.message || "Failed to save compliance settings");
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"
                  >
                    <Save className="size-4" /> Save Section
                  </button>
                  <button
                    type="button"
                    onClick={() => void refreshCompliance()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"
                  >
                    <RefreshCw className={`size-4 ${complianceLoading ? "animate-spin" : ""}`} /> Refresh
                  </button>
                </div>
              </div>
            </Card>
          )}

          {tab === "billing" && (
            <Card
              title="Billing & Financial Settings"
              desc="Configure payment processing, insurance, and financial policies"
              onReset={() => setSettings({ ...settings, billing: { ...DEFAULT_SETTINGS.billing } })}
            >
              <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg border border-border">
                      <p className="text-xs font-medium text-muted-foreground">Collected This Period</p>
                      <p className="mt-2 text-2xl font-bold">${Number(billingOverview.revenue.total || 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">Payments posted in the selected period</p>
                    </div>
                    <div className="p-4 rounded-lg border border-border">
                      <p className="text-xs font-medium text-muted-foreground">Outstanding Balance</p>
                      <p className="mt-2 text-2xl font-bold">${Number(billingOverview.revenue.outstanding || 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">{Number(billingOverview.revenue.outstandingPercentage || 0).toFixed(2)}% of billed amount</p>
                    </div>
                    <div className="p-4 rounded-lg border border-border">
                      <p className="text-xs font-medium text-muted-foreground">Collected / Billed</p>
                      <p className="mt-2 text-2xl font-bold">${Number(billingOverview.revenue.total || 0).toLocaleString()} / ${Number(billingOverview.revenue.billed || 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">{Number(billingOverview.revenue.collectionRate || 0).toFixed(2)}% collection rate</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg border border-border">
                      <p className="text-xs font-medium text-muted-foreground">Invoices Issued</p>
                      <p className="mt-2 text-2xl font-bold">{Number(billingOverview.revenue.invoiceCount || 0)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Live tenant invoice count</p>
                    </div>
                    <div className="p-4 rounded-lg border border-border">
                      <p className="text-xs font-medium text-muted-foreground">Payments Posted</p>
                      <p className="mt-2 text-2xl font-bold">{Number(billingOverview.summary?.paymentCount || 0)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Real payment records this period</p>
                    </div>
                    <div className="p-4 rounded-lg border border-border">
                      <p className="text-xs font-medium text-muted-foreground">Insurance vs Self Pay</p>
                      <p className="mt-2 text-2xl font-bold">${Number(billingOverview.insuranceBreakdown.insurance || 0).toLocaleString()} / ${Number(billingOverview.insuranceBreakdown.selfPay || 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">Claimed versus direct-pay revenue</p>
                    </div>
                  </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-foreground">Payment Methods</h4>
                    <Toggle label="Credit card payments" desc="Accept credit/debit card payments" value={settings.billing.paymentMethods.creditCard} onChange={x => update("billing.paymentMethods", { ...settings.billing.paymentMethods, creditCard: x })} />
                    <Toggle label="Bank transfers" desc="Accept ACH/bank transfer payments" value={settings.billing.paymentMethods.bankTransfer} onChange={x => update("billing.paymentMethods", { ...settings.billing.paymentMethods, bankTransfer: x })} />
                    <Toggle label="Cash payments" desc="Accept cash payments at reception" value={settings.billing.paymentMethods.cash} onChange={x => update("billing.paymentMethods", { ...settings.billing.paymentMethods, cash: x })} />
                    <Toggle label="Insurance payments" desc="Process insurance claims and payments" value={settings.billing.paymentMethods.insurance} onChange={x => update("billing.paymentMethods", { ...settings.billing.paymentMethods, insurance: x })} />
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-foreground">Billing Preferences</h4>
                    <Toggle label="Auto-generate invoice numbers" desc="Automatically assign unique invoice numbers" value={settings.billing.billingPreferences.autoInvoiceNumbers} onChange={x => update("billing.billingPreferences", { ...settings.billing.billingPreferences, autoInvoiceNumbers: x })} />
                    <Toggle label="Tax calculations" desc="Automatically calculate and apply taxes" value={settings.billing.billingPreferences.taxCalculations} onChange={x => update("billing.billingPreferences", { ...settings.billing.billingPreferences, taxCalculations: x })} />
                    <Toggle label="Discount codes" desc="Support promotional discount codes" value={settings.billing.billingPreferences.discountCodes} onChange={x => update("billing.billingPreferences", { ...settings.billing.billingPreferences, discountCodes: x })} />
                    <Toggle label="Payment plans" desc="Allow patients to set up payment plans" value={settings.billing.billingPreferences.paymentPlans} onChange={x => update("billing.billingPreferences", { ...settings.billing.billingPreferences, paymentPlans: x })} />
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Insurance Integration</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-3">
                      <Toggle label="Real-time eligibility checking" desc="Check insurance eligibility before services" value={settings.billing.insuranceIntegration.realTimeEligibility} onChange={x => update("billing.insuranceIntegration", { ...settings.billing.insuranceIntegration, realTimeEligibility: x })} />
                      <Toggle label="Automated claims submission" desc="Auto-submit claims to insurance providers" value={settings.billing.insuranceIntegration.autoClaimsSubmission} onChange={x => update("billing.insuranceIntegration", { ...settings.billing.insuranceIntegration, autoClaimsSubmission: x })} />
                      <Toggle label="EOB processing" desc="Process Explanation of Benefits automatically" value={settings.billing.insuranceIntegration.eobProcessing} onChange={x => update("billing.insuranceIntegration", { ...settings.billing.insuranceIntegration, eobProcessing: x })} />
                    </div>
                    <div className="space-y-3">
                      <Toggle label="Patient responsibility estimation" desc="Estimate patient payment responsibility" value={settings.billing.insuranceIntegration.patientResponsibility} onChange={x => update("billing.insuranceIntegration", { ...settings.billing.insuranceIntegration, patientResponsibility: x })} />
                      <Toggle label="Secondary insurance billing" desc="Bill secondary insurance automatically" value={settings.billing.insuranceIntegration.secondaryBilling} onChange={x => update("billing.insuranceIntegration", { ...settings.billing.insuranceIntegration, secondaryBilling: x })} />
                      <Toggle label="Claim status tracking" desc="Track and update claim statuses" value={settings.billing.insuranceIntegration.claimTracking} onChange={x => update("billing.insuranceIntegration", { ...settings.billing.insuranceIntegration, claimTracking: x })} />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Financial Policies</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium">Late Payment Fee (%)</label>
                      <input type="number" value={settings.billing.financialPolicies.lateFeePercent} min="0" max="10" step="0.1"
                        onChange={e => update("billing.financialPolicies", { ...settings.billing.financialPolicies, lateFeePercent: Number(e.target.value) })}
                        className="mt-1.5 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Grace Period (days)</label>
                      <input type="number" value={settings.billing.financialPolicies.gracePeriodDays} min="0" max="90"
                        onChange={e => update("billing.financialPolicies", { ...settings.billing.financialPolicies, gracePeriodDays: Number(e.target.value) })}
                        className="mt-1.5 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Statement Frequency</label>
                      <select value={settings.billing.financialPolicies.statementFrequency} onChange={e => update("billing.financialPolicies", { ...settings.billing.financialPolicies, statementFrequency: e.target.value })}
                        className="mt-1.5 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm">
                        <option value="monthly">Monthly</option>
                        <option value="bi-weekly">Bi-weekly</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Financial Reporting</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">Monthly Revenue</p>
                        <span className="text-lg font-bold text-emerald-600">${Number(billingOverview.revenue.total || 0).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Live tenant invoice collections for the selected period</p>
                    </div>
                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">Outstanding Balance</p>
                        <span className="text-lg font-bold text-orange-600">${Number(billingOverview.revenue.outstanding || 0).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{Number(billingOverview.revenue.outstandingPercentage || 0).toFixed(2)}% of total billed</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Connected Payment Processors</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(billingOverview.processors || {}).map(([name, processor]: any) => (
                      <div key={name} className="rounded-lg border border-border px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium capitalize">{name}</p>
                            <p className="text-xs text-muted-foreground">{processor?.configured ? "Configured" : "Not configured"}</p>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-xs ${processor?.enabled ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                            {processor?.enabled ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      goToTab("communications");
                      toast.success("Open the communications section to configure payment gateway credentials");
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold"
                  >
                    <CreditCard className="size-4" /> Configure Payment Gateway
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const data = await runBillingAction("validate-setup");
                        openActionDialog("Billing Validation", "Tenant billing configuration was validated against active processors and policy controls.", [
                          `Valid: ${data.valid ? "Yes" : "No"}`,
                          ...(data.findings?.length ? data.findings : ["No configuration gaps detected."]),
                        ]);
                        toast.success("Billing setup validated");
                      } catch (error: any) {
                        toast.error(error?.message || "Failed to validate billing setup");
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"
                  >
                    <CheckCircle2 className="size-4" /> Validate Billing Setup
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const data = await runBillingAction("export-report");
                        downloadJson(`${slug}-financial-summary.json`, data);
                        openActionDialog("Financial Report Exported", "Live billing configuration and period summary were exported.", [
                          `Collected: $${Number(data?.overview?.totalPaid || 0).toLocaleString()}`,
                          `Payments: ${Number(data?.overview?.paymentCount || 0)}`,
                          `Processors: ${Number(data?.overview?.connectedProcessors || 0)}`,
                        ]);
                        toast.success("Financial report exported");
                      } catch (error: any) {
                        toast.error(error?.message || "Failed to export financial report");
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"
                  >
                    <Download className="size-4" /> Export Financial Report
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await saveBillingSettings();
                        await refreshBilling();
                        toast.success("Billing settings saved");
                      } catch (error: any) {
                        toast.error(error?.message || "Failed to save billing settings");
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"
                  >
                    <Save className="size-4" /> Save Section
                  </button>
                  <button
                    type="button"
                    onClick={() => void refreshBilling()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"
                  >
                    <RefreshCw className={`size-4 ${billingLoading ? "animate-spin" : ""}`} /> Refresh
                  </button>
                </div>
              </div>
            </Card>
          )}

          {tab === "audit" && (
            <Card title="Audit Log" desc="Provisioning history, control evidence, and configuration changes" onReset={() => setSettings({ ...settings, audit: { ...DEFAULT_SETTINGS.audit } })}>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs font-medium text-muted-foreground">Recent Audit Events</p>
                    <p className="mt-2 text-2xl font-bold">{auditOverview.recentAuditEvents}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs font-medium text-muted-foreground">Provisioning Events</p>
                    <p className="mt-2 text-2xl font-bold">{auditOverview.recentProvisioningEvents}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs font-medium text-muted-foreground">Retention Days</p>
                    <p className="mt-2 text-2xl font-bold">{settings.audit.retentionDays}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs font-medium text-muted-foreground">Visible Events</p>
                    <p className="mt-2 text-2xl font-bold">{auditTotal}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Toggle label="Log authentication events" desc="Track sign-in and identity events." value={settings.audit.logAuthentication} onChange={x => update("audit.logAuthentication", x)} />
                    <Toggle label="Log clinical actions" desc="Track sensitive clinical actions." value={settings.audit.logClinicalActions} onChange={x => update("audit.logClinicalActions", x)} />
                    <Toggle label="Log financial actions" desc="Track invoice, payment, and claim actions." value={settings.audit.logFinancialActions} onChange={x => update("audit.logFinancialActions", x)} />
                    <Toggle label="Log configuration changes" desc="Track tenant control-plane changes." value={settings.audit.logConfigurationChanges} onChange={x => update("audit.logConfigurationChanges", x)} />
                  </div>
                  <div className="space-y-3">
                    <Toggle label="Anomaly detection" desc="Flag unusual audit behavior patterns." value={settings.audit.anomalyDetection} onChange={x => update("audit.anomalyDetection", x)} />
                    <Toggle label="Immutable snapshots" desc="Retain immutable exported audit evidence." value={settings.audit.immutableSnapshots} onChange={x => update("audit.immutableSnapshots", x)} />
                    <div>
                      <label className="text-sm font-medium">Retention Days</label>
                      <input type="number" value={settings.audit.retentionDays} min="30" max="3650" onChange={(e) => update("audit.retentionDays", Number(e.target.value))}
                        className="mt-1.5 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Default Export Format</label>
                      <select value={settings.audit.exportFormat} onChange={(e) => update("audit.exportFormat", e.target.value)}
                        className="mt-1.5 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm">
                        <option value="json">JSON</option>
                        <option value="csv">CSV</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  <button type="button" onClick={async () => {
                    try {
                      await saveAuditSettings();
                      await refreshAuditSettings();
                      toast.success("Audit settings saved");
                    } catch (error: any) {
                      toast.error(error?.message || "Failed to save audit settings");
                    }
                  }} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">
                    <Save className="size-4" /> Save Section
                  </button>
                  <button type="button" onClick={async () => {
                    try {
                      const data = await runAuditAction("integrity-check");
                      openActionDialog("Audit Integrity Check", "The audit stream was checked for obvious gaps.", [
                        `Status: ${data.ok ? "Healthy" : "Review needed"}`,
                        ...(data.findings?.length ? data.findings : ["No integrity issues detected."]),
                      ]);
                    } catch (error: any) {
                      toast.error(error?.message || "Failed to run audit integrity check");
                    }
                  }} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">
                    <Shield className="size-4" /> Run Integrity Check
                  </button>
                  <button type="button" onClick={async () => {
                    try {
                      const data = await runAuditAction("export");
                      downloadJson(`${slug}-audit-export.json`, data);
                      openActionDialog("Audit Export Ready", "Tenant audit evidence was exported.", [
                        `Audit events: ${Array.isArray(data.logs) ? data.logs.length : 0}`,
                        `Provisioning events: ${Array.isArray(data.provisioning) ? data.provisioning.length : 0}`,
                      ]);
                    } catch (error: any) {
                      toast.error(error?.message || "Failed to export audit log");
                    }
                  }} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">
                    <Download className="size-4" /> Export Audit Log
                  </button>
                  <button type="button" onClick={() => { void refreshAuditSettings(); setAuditPage(1); }} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">
                    <RefreshCw className={`size-4 ${auditSettingsLoading ? "animate-spin" : ""}`} /> Refresh
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mb-4 items-center">
                  <input
                    type="text"
                    placeholder="Search action, stage, error..."
                    value={auditQuery}
                    onChange={(e) => setAuditQuery(e.target.value)}
                    className="flex-1 min-w-[200px] h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  />
                  <select
                    value={auditKind}
                    onChange={(e) => setAuditKind(e.target.value as any)}
                    className="h-9 px-3 rounded-lg border border-border bg-background text-sm"
                  >
                    <option value="all">All events</option>
                    <option value="provisioning">Provisioning</option>
                    <option value="audit">Configuration</option>
                  </select>
                  <select
                    value={auditStatus}
                    onChange={(e) => setAuditStatus(e.target.value)}
                    disabled={auditKind === "audit"}
                    className="h-9 px-3 rounded-lg border border-border bg-background text-sm disabled:opacity-50"
                  >
                    <option value="">Any status</option>
                    <option value="running">Running</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                  </select>
                  {(auditQuery || auditStatus || auditKind !== "all") && (
                    <button
                      onClick={() => { setAuditQuery(""); setAuditStatus(""); setAuditKind("all"); }}
                      className="h-9 px-3 rounded-lg text-sm text-muted-foreground hover:text-foreground"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {eventsLoading ? (
                  <div className="py-10 text-center"><Loader2 className="size-5 animate-spin text-orange-500 mx-auto" /></div>
                ) : events.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No audit events match these filters.</p>
                ) : (
                  <>
                    <ul className="divide-y divide-border">
                      {events.map(ev => <AuditRow key={ev.id} event={ev} />)}
                    </ul>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        Page {auditPage} of {auditTotalPages} - {auditTotal} event{auditTotal === 1 ? "" : "s"}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                          disabled={auditPage <= 1}
                          className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setAuditPage(p => Math.min(auditTotalPages, p + 1))}
                          disabled={auditPage >= auditTotalPages}
                          className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>
          )}
          {tab === "danger" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs font-medium text-muted-foreground">Tenant Status</p>
                  <p className="mt-2 text-2xl font-bold">{dangerState?.tenant?.isActive ? "Active" : "Inactive"}</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs font-medium text-muted-foreground">Provisioning State</p>
                  <p className="mt-2 text-2xl font-bold capitalize">{dangerState?.tenant?.provisioningStatus || "unknown"}</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs font-medium text-muted-foreground">Restore Authority</p>
                  <p className="mt-2 text-2xl font-bold">{dangerState?.restoreAuthority === "super_admin" ? "Super Admin" : "Restricted"}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const data = await runDangerAction("export-snapshot");
                      downloadJson(`${slug}-tenant-snapshot.json`, data);
                      openActionDialog("Tenant Snapshot Exported", "A pre-archive tenant snapshot was exported.", [
                        `Audit events included: ${Array.isArray(data.recentAudit) ? data.recentAudit.length : 0}`,
                        `Tenant: ${data?.tenant?.name || slug}`,
                      ]);
                    } catch (error: any) {
                      toast.error(error?.message || "Failed to export tenant snapshot");
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
                >
                  <Download className="size-4" /> Export Tenant Snapshot
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await runDangerAction(dangerState?.tenant?.isActive ? "suspend" : "reactivate");
                      await refreshDangerZone();
                      toast.success(dangerState?.tenant?.isActive ? "Tenant suspended" : "Tenant reactivated");
                    } catch (error: any) {
                      toast.error(error?.message || "Failed to update tenant status");
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
                >
                  <ShieldAlert className="size-4" /> {dangerState?.tenant?.isActive ? "Suspend Tenant" : "Reactivate Tenant"}
                </button>
                <button
                  type="button"
                  onClick={() => void refreshDangerZone()}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
                >
                  <RefreshCw className={`size-4 ${dangerLoading ? "animate-spin" : ""}`} /> Refresh
                </button>
              </div>

              <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50/50 dark:bg-red-500/5 p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="size-5 text-red-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-700 dark:text-red-400">Archive this tenant</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      This soft-deletes the tenant: it becomes inactive, hidden from default views, and inaccessible to its users. Data is preserved for <strong>{dangerState?.settings?.archiveGraceDays || settings.dangerZone.archiveGraceDays} days</strong>, after which a super-admin may permanently purge it. This action is reversible during the grace period.
                    </p>
                    <ul className="text-xs text-muted-foreground mt-3 space-y-1 list-disc pl-5">
                      <li>All users for this tenant will lose access immediately</li>
                      <li>All data (patients, appointments, billing, etc.) is preserved for 30 days</li>
                      <li>After 30 days, hard purge becomes available and is irreversible</li>
                    </ul>

                    <div className="mt-5 space-y-2">
                      <label className="text-sm font-medium block">
                        Type the tenant slug <code className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 font-mono text-xs">{slug}</code> to confirm
                      </label>
                      <div className="flex gap-2">
                        <input type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)}
                          placeholder={slug}
                          className="flex-1 max-w-sm h-10 px-3 rounded-lg border border-border bg-background text-sm font-mono" />
                        <button onClick={archiveTenant} disabled={deleting || confirmText !== slug}
                          className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
                          {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                          Archive tenant
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

           {tab === "communications" && (
             <CommunicationsContext.Provider value={{ slug, settings: settings!, integrations, refreshIntegrations, setCommunicationPreference }}>
             <Card
               title="Communication Channels"
               desc="Configure email, SMS, and webhook integrations"
               onReset={() => setSettings({ ...settings, communications: { ...DEFAULT_SETTINGS.communications } })}
             >
               <div className="space-y-6">
                 {/* Email Providers */}
                 <div className="space-y-4">
                   <h4 className="text-sm font-semibold text-foreground">Email Providers</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <IntegrationCard
                       name="Resend"
                       desc="Transactional email delivery"
                       icon={Mail}
                       color="blue"
                       provider="resend"
                       configFields={[
                         { key: "apiKey", label: "API Key", type: "password", placeholder: "re_..." }
                       ]}
                       testAction="Test Email"
                     />

                     <IntegrationCard
                       name="SendGrid"
                       desc="Email marketing & transactional"
                       icon={Mail}
                       color="purple"
                       provider="sendgrid"
                       configFields={[
                         { key: "apiKey", label: "API Key", type: "password", placeholder: "SG...." }
                       ]}
                       testAction="Test Email"
                     />

                     <IntegrationCard
                       name="AWS SES"
                       desc="Amazon Simple Email Service"
                       icon={Mail}
                       color="orange"
                       provider="aws-ses"
                       configFields={[
                         { key: "accessKey", label: "Access Key", type: "password", placeholder: "AKIA..." },
                         { key: "secretKey", label: "Secret Key", type: "password", placeholder: "..." },
                         { key: "region", label: "Region", type: "select", options: ["us-east-1", "eu-west-1", "ap-southeast-1"] }
                       ]}
                       testAction="Test Email"
                     />

                     <IntegrationCard
                       name="Mailgun"
                       desc="Email delivery service"
                       icon={Mail}
                       color="green"
                       provider="mailgun"
                       configFields={[
                         { key: "apiKey", label: "API Key", type: "password", placeholder: "key-..." },
                         { key: "domain", label: "Domain", type: "text", placeholder: "mg.yourdomain.com" }
                       ]}
                       testAction="Test Email"
                     />
                   </div>
                 </div>

                 {/* SMS Integrations */}
                 <div className="space-y-4">
                   <h4 className="text-sm font-semibold text-foreground">SMS Service Providers</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <IntegrationCard
                       name="Twilio"
                       desc="SMS & voice communications"
                       icon={Smartphone}
                       color="red"
                       provider="twilio"
                       configFields={[
                         { key: "accountSid", label: "Account SID", type: "password", placeholder: "AC..." },
                         { key: "authToken", label: "Auth Token", type: "password", placeholder: "..." },
                         { key: "phoneNumber", label: "Phone Number", type: "text", placeholder: "+1234567890" }
                       ]}
                       testAction="Test SMS"
                     />

                     <IntegrationCard
                       name="Nexmo (Vonage)"
                       desc="SMS & communication APIs"
                       icon={Smartphone}
                       color="cyan"
                       provider="nexmo"
                       configFields={[
                         { key: "apiKey", label: "API Key", type: "password", placeholder: "..." },
                         { key: "apiSecret", label: "API Secret", type: "password", placeholder: "..." },
                         { key: "brandName", label: "Brand Name", type: "text", placeholder: "Your Hospital" }
                       ]}
                       testAction="Test SMS"
                     />

                     <IntegrationCard
                       name="AWS SNS"
                       desc="Simple Notification Service"
                       icon={Smartphone}
                       color="yellow"
                       provider="aws-sns"
                       configFields={[
                         { key: "accessKey", label: "Access Key", type: "password", placeholder: "AKIA..." },
                         { key: "secretKey", label: "Secret Key", type: "password", placeholder: "..." },
                         { key: "region", label: "Region", type: "select", options: ["us-east-1", "eu-west-1", "ap-southeast-1"] },
                         { key: "topicArn", label: "Topic ARN", type: "text", placeholder: "arn:aws:sns:..." }
                       ]}
                       testAction="Test SMS"
                     />

                     <IntegrationCard
                       name="MessageBird"
                       desc="SMS & communication platform"
                       icon={Smartphone}
                       color="indigo"
                       provider="messagebird"
                       configFields={[
                         { key: "apiKey", label: "API Key", type: "password", placeholder: "..." },
                         { key: "originator", label: "Originator", type: "text", placeholder: "Your Hospital" }
                       ]}
                       testAction="Test SMS"
                     />
                   </div>
                 </div>

                 {/* Payment Integrations */}
                 <div className="space-y-4">
                   <h4 className="text-sm font-semibold text-foreground">Payment Processors</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <IntegrationCard
                       name="Stripe"
                       desc="Payment processing & billing"
                       icon={CreditCard}
                       color="purple"
                       provider="stripe"
                       configFields={[
                         { key: "publishableKey", label: "Publishable Key", type: "password", placeholder: "pk_..." },
                         { key: "secretKey", label: "Secret Key", type: "password", placeholder: "sk_..." },
                         { key: "webhookSecret", label: "Webhook Secret", type: "password", placeholder: "whsec_..." }
                       ]}
                       testAction="Test Payment"
                     />

                     <IntegrationCard
                       name="PayPal"
                       desc="Online payment solutions"
                       icon={CreditCard}
                       color="blue"
                       provider="paypal"
                       configFields={[
                         { key: "clientId", label: "Client ID", type: "password", placeholder: "..." },
                         { key: "clientSecret", label: "Client Secret", type: "password", placeholder: "..." },
                         { key: "environment", label: "Environment", type: "select", options: ["sandbox", "live"] }
                       ]}
                       testAction="Test Payment"
                     />

                     <IntegrationCard
                       name="Square"
                       desc="Point of sale & payments"
                       icon={CreditCard}
                       color="emerald"
                       provider="square"
                       configFields={[
                         { key: "applicationId", label: "Application ID", type: "password", placeholder: "..." },
                         { key: "accessToken", label: "Access Token", type: "password", placeholder: "..." },
                         { key: "locationId", label: "Location ID", type: "text", placeholder: "..." }
                       ]}
                       testAction="Test Payment"
                     />

                     <IntegrationCard
                       name="Authorize.Net"
                       desc="Payment gateway services"
                       icon={CreditCard}
                       color="orange"
                       provider="authorize-net"
                       configFields={[
                         { key: "apiLoginId", label: "API Login ID", type: "password", placeholder: "..." },
                         { key: "transactionKey", label: "Transaction Key", type: "password", placeholder: "..." },
                         { key: "environment", label: "Environment", type: "select", options: ["sandbox", "production"] }
                       ]}
                       testAction="Test Payment"
                     />
                   </div>
                 </div>

                 {/* Storage & Cloud Integrations */}
                 <div className="space-y-4">
                   <h4 className="text-sm font-semibold text-foreground">Storage & Cloud Services</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <IntegrationCard
                       name="AWS S3"
                       desc="File storage and backups"
                       icon={Database}
                       color="orange"
                       provider="aws-s3"
                       configFields={[
                         { key: "accessKey", label: "Access Key", type: "password", placeholder: "AKIA..." },
                         { key: "secretKey", label: "Secret Key", type: "password", placeholder: "..." },
                         { key: "region", label: "Region", type: "select", options: ["us-east-1", "eu-west-1", "ap-southeast-1"] },
                         { key: "bucketName", label: "Bucket Name", type: "text", placeholder: "your-bucket-name" }
                       ]}
                       testAction="Test Connection"
                     />

                     <IntegrationCard
                       name="Google Cloud Storage"
                       desc="Cloud storage solutions"
                       icon={Database}
                       color="blue"
                       provider="gcs"
                       configFields={[
                         { key: "projectId", label: "Project ID", type: "text", placeholder: "your-project-id" },
                         { key: "serviceAccountKey", label: "Service Account Key", type: "textarea", placeholder: "JSON key..." },
                         { key: "bucketName", label: "Bucket Name", type: "text", placeholder: "your-bucket-name" }
                       ]}
                       testAction="Test Connection"
                     />

                     <IntegrationCard
                       name="Azure Blob Storage"
                       desc="Microsoft cloud storage"
                       icon={Database}
                       color="azure"
                       provider="azure-blob"
                       configFields={[
                         { key: "accountName", label: "Account Name", type: "text", placeholder: "youraccount" },
                         { key: "accountKey", label: "Account Key", type: "password", placeholder: "..." },
                         { key: "containerName", label: "Container Name", type: "text", placeholder: "your-container" }
                       ]}
                       testAction="Test Connection"
                     />

                     <IntegrationCard
                       name="Cloudinary"
                       desc="Media management & CDN"
                       icon={Database}
                       color="purple"
                       provider="cloudinary"
                       configFields={[
                         { key: "cloudName", label: "Cloud Name", type: "text", placeholder: "your-cloud-name" },
                         { key: "apiKey", label: "API Key", type: "password", placeholder: "..." },
                         { key: "apiSecret", label: "API Secret", type: "password", placeholder: "..." }
                       ]}
                       testAction="Test Upload"
                     />
                   </div>
                 </div>

                 {/* Analytics & Monitoring */}
                 <div className="space-y-4">
                   <h4 className="text-sm font-semibold text-foreground">Analytics & Monitoring</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <IntegrationCard
                       name="Google Analytics"
                       desc="Usage tracking and insights"
                       icon={BarChart3}
                       color="orange"
                       provider="google-analytics"
                       configFields={[
                         { key: "measurementId", label: "Measurement ID", type: "text", placeholder: "G-XXXXXXXXXX" },
                         { key: "apiSecret", label: "API Secret", type: "password", placeholder: "..." }
                       ]}
                       testAction="Test Tracking"
                     />

                     <IntegrationCard
                       name="Mixpanel"
                       desc="Product analytics platform"
                       icon={BarChart3}
                       color="blue"
                       provider="mixpanel"
                       configFields={[
                         { key: "projectToken", label: "Project Token", type: "password", placeholder: "..." },
                         { key: "apiSecret", label: "API Secret", type: "password", placeholder: "..." }
                       ]}
                       testAction="Test Tracking"
                     />

                     <IntegrationCard
                       name="Sentry"
                       desc="Error tracking & monitoring"
                       icon={BarChart3}
                       color="red"
                       provider="sentry"
                       configFields={[
                         { key: "dsn", label: "DSN", type: "text", placeholder: "https://..." },
                         { key: "environment", label: "Environment", type: "select", options: ["development", "staging", "production"] }
                       ]}
                       testAction="Test Error"
                     />

                     <IntegrationCard
                       name="DataDog"
                       desc="Infrastructure monitoring"
                       icon={BarChart3}
                       color="purple"
                       provider="datadog"
                       configFields={[
                         { key: "apiKey", label: "API Key", type: "password", placeholder: "..." },
                         { key: "appKey", label: "Application Key", type: "password", placeholder: "..." },
                         { key: "site", label: "Site", type: "select", options: ["us", "eu", "us3", "us5"] }
                       ]}
                       testAction="Test Metrics"
                     />
                   </div>
                 </div>

                 {/* Communication Tools */}
                 <div className="space-y-4">
                   <h4 className="text-sm font-semibold text-foreground">Communication & Collaboration</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <IntegrationCard
                       name="Slack"
                       desc="Team notifications & alerts"
                       icon={MessageSquare}
                       color="purple"
                       provider="slack"
                       configFields={[
                         { key: "botToken", label: "Bot Token", type: "password", placeholder: "xoxb-..." },
                         { key: "signingSecret", label: "Signing Secret", type: "password", placeholder: "..." },
                         { key: "defaultChannel", label: "Default Channel", type: "text", placeholder: "#alerts" }
                       ]}
                       testAction="Test Message"
                     />

                     <IntegrationCard
                       name="Microsoft Teams"
                       desc="Team collaboration platform"
                       icon={MessageSquare}
                       color="blue"
                       provider="teams"
                       configFields={[
                         { key: "webhookUrl", label: "Webhook URL", type: "text", placeholder: "https://..." },
                         { key: "appId", label: "App ID", type: "password", placeholder: "..." },
                         { key: "appSecret", label: "App Secret", type: "password", placeholder: "..." }
                       ]}
                       testAction="Test Message"
                     />

                     <IntegrationCard
                       name="Discord"
                       desc="Community & team communication"
                       icon={MessageSquare}
                       color="indigo"
                       provider="discord"
                       configFields={[
                         { key: "webhookUrl", label: "Webhook URL", type: "text", placeholder: "https://..." },
                         { key: "botToken", label: "Bot Token", type: "password", placeholder: "..." }
                       ]}
                       testAction="Test Message"
                     />

                     <IntegrationCard
                       name="Zoom"
                       desc="Video conferencing integration"
                       icon={MessageSquare}
                       color="blue"
                       provider="zoom"
                       configFields={[
                         { key: "clientId", label: "Client ID", type: "password", placeholder: "..." },
                         { key: "clientSecret", label: "Client Secret", type: "password", placeholder: "..." },
                         { key: "accountId", label: "Account ID", type: "text", placeholder: "..." }
                       ]}
                       testAction="Test Meeting"
                     />
                   </div>
                 </div>

                 <div className="flex gap-2 pt-4 border-t border-border">
                 <button
                     type="button"
                     onClick={async () => {
                       try {
                         const response = await fetch(`/api/tenant/${slug}/communications/actions`, {
                           method: "POST",
                           headers: { "Content-Type": "application/json" },
                           credentials: "include",
                           body: JSON.stringify({ action: "test-all" }),
                         });
                         const data = await response.json();
                         if (!response.ok) throw new Error(data?.error || "Failed to test integrations");
                         openActionDialog(
                           "Integration Test Completed",
                           "All active tenant integrations were checked for connectivity.",
                           (data.results || []).map((item: any) => `${item.provider}: ${item.ok ? "OK" : item.message}`)
                         );
                         await refreshIntegrations();
                         toast.success("All integrations tested");
                       } catch (error: any) {
                         toast.error(error?.message || "Failed to test integrations");
                       }
                     }}
                     className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold">
                     <RefreshCw className="size-4" /> Test All Integrations
                   </button>
                   <button
                     type="button"
                     onClick={async () => {
                       try {
                         const response = await fetch(`/api/tenant/${slug}/communications/actions`, {
                           method: "POST",
                           headers: { "Content-Type": "application/json" },
                           credentials: "include",
                           body: JSON.stringify({ action: "export-configuration" }),
                         });
                         const data = await response.json();
                         if (!response.ok) throw new Error(data?.error || "Failed to export configuration");
                         downloadJson(`${slug}-integration-configuration.json`, data);
                         toast.success("Integration configuration exported");
                       } catch (error: any) {
                         toast.error(error?.message || "Failed to export configuration");
                       }
                     }}
                     className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm">
                     <Download className="size-4" /> Export Configuration
                   </button>
                   <button
                     type="button"
                     onClick={async () => {
                       const name = window.prompt("Custom integration name", "Radiology PACS");
                       if (!name) return;
                       const endpoint = window.prompt("Endpoint URL", "https://api.hospital.example/pacs/webhook");
                       if (!endpoint) return;
                       try {
                         const response = await fetch(`/api/tenant/${slug}/communications/actions`, {
                           method: "POST",
                           headers: { "Content-Type": "application/json" },
                           credentials: "include",
                           body: JSON.stringify({ action: "add-custom", payload: { name, endpoint } }),
                         });
                         const data = await response.json();
                         if (!response.ok) throw new Error(data?.error || "Failed to add custom integration");
                         setCustomIntegrations((current) => [...current, data.integration]);
                         openActionDialog("Custom Integration Added", "The integration placeholder is ready for credentials.", [
                           `Integration: ${data.integration.name}`,
                           `Endpoint: ${data.integration.endpoint}`,
                         ]);
                         toast.success("Custom integration added");
                       } catch (error: any) {
                         toast.error(error?.message || "Failed to add custom integration");
                       }
                     }}
                     className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm">
                     <Plus className="size-4" /> Add Custom Integration
                   </button>
                 </div>
               </div>
             </Card>
             </CommunicationsContext.Provider>
           )}

           {tab === "integrations" && (
             <Card
               title="Third-Party Integrations"
               desc="Manage third-party service integrations and API connections"
               onReset={() => {}}
             >
               <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                   <div className="p-4 rounded-lg border border-border">
                     <div className="flex items-start justify-between mb-3">
                       <div>
                         <h4 className="text-sm font-semibold">Connected Services</h4>
                         <p className="text-xs text-muted-foreground mt-1">Configured tenant providers</p>
                       </div>
                       <span className="text-2xl font-bold text-orange-600">{integrationOverview.connectedServices}</span>
                     </div>
                     <button
                       type="button"
                       onClick={() => openActionDialog(
                         "Connected Services",
                         "Provider configurations currently stored for this tenant.",
                         integrations.map((item) => `${item.provider} - ${item.status}${item.isActive ? " - active" : " - disabled"}`)
                       )}
                       className="text-xs text-orange-600 hover:underline font-semibold"
                     >
                       View All
                     </button>
                   </div>

                   <div className="p-4 rounded-lg border border-border">
                     <div className="flex items-start justify-between mb-3">
                       <div>
                         <h4 className="text-sm font-semibold">Active Webhooks</h4>
                         <p className="text-xs text-muted-foreground mt-1">Live outbound event endpoints</p>
                       </div>
                       <span className="text-2xl font-bold text-emerald-600">{integrationOverview.activeWebhooks}</span>
                     </div>
                     <p className="text-xs text-muted-foreground mt-2">
                       {webhooks.filter((item) => item.status === "error").length} failing endpoint(s)
                     </p>
                   </div>

                   <div className="p-4 rounded-lg border border-border">
                     <div className="flex items-start justify-between mb-3">
                       <div>
                         <h4 className="text-sm font-semibold">Active API Keys</h4>
                         <p className="text-xs text-muted-foreground mt-1">Tenant programmatic access keys</p>
                       </div>
                       <span className="text-2xl font-bold text-blue-600">{integrationOverview.activeApiKeys}</span>
                     </div>
                     <p className="text-xs text-muted-foreground mt-2">
                       {apiKeys.filter((item) => item.status === "revoked").length} revoked key(s)
                     </p>
                   </div>

                   <div className="p-4 rounded-lg border border-border">
                     <div className="flex items-start justify-between mb-3">
                       <div>
                         <h4 className="text-sm font-semibold">Integration Events</h4>
                         <p className="text-xs text-muted-foreground mt-1">Audit-backed activity this month</p>
                       </div>
                       <span className="text-2xl font-bold text-purple-600">{integrationOverview.eventsThisMonth}</span>
                     </div>
                     <button
                       type="button"
                       onClick={() => void refreshIntegrationConsole()}
                       className="text-xs text-purple-600 hover:underline font-semibold"
                     >
                       Refresh
                     </button>
                   </div>
                 </div>

                 <div>
                   <div className="flex items-center justify-between mb-3 gap-3">
                     <h4 className="text-sm font-semibold text-foreground">Provider Registry</h4>
                     {integrationsLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                   </div>
                   <div className="space-y-3">
                     {integrations.length === 0 ? (
                       <div className="p-4 rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                         No provider integrations have been configured yet.
                       </div>
                     ) : (
                       integrations.map((integration) => (
                         <div key={integration.id} className="p-4 rounded-lg border border-border">
                           <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                             <div className="space-y-1">
                               <div className="flex items-center gap-2 flex-wrap">
                                 <p className="text-sm font-medium capitalize">{integration.provider.replace(/[-_]/g, " ")}</p>
                                 <span className={`text-[11px] px-2 py-1 rounded-full ${integration.status === "active" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : integration.status === "error" ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400" : "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400"}`}>
                                   {integration.status}
                                 </span>
                                 <span className={`text-[11px] px-2 py-1 rounded-full ${integration.isActive ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" : "bg-muted text-muted-foreground"}`}>
                                   {integration.isActive ? "Enabled" : "Disabled"}
                                 </span>
                               </div>
                               <p className="text-xs text-muted-foreground">
                                 {integration.accountName || integration.accountId || "No account profile returned"}
                               </p>
                               <p className="text-xs text-muted-foreground">
                                 Last tested {integration.lastTestedAt ? formatDistanceToNow(new Date(integration.lastTestedAt), { addSuffix: true }) : "never"}
                               </p>
                               {integration.testError && <p className="text-xs text-red-600">{integration.testError}</p>}
                             </div>
                             <div className="flex flex-wrap gap-2">
                               <button
                                 type="button"
                                 onClick={() => {
                                  goToTab("communications");
                                   toast.success("Configure provider credentials in the Communications tab");
                                 }}
                                 className="text-xs px-3 py-1.5 rounded border border-border hover:bg-muted"
                               >
                                 Edit
                               </button>
                               <button
                                 type="button"
                                 onClick={async () => {
                                   try {
                                     const response = await fetch(`/api/tenant/${slug}/integrations/${integration.id}/test`, {
                                       method: "POST",
                                       credentials: "include",
                                     });
                                     const data = await response.json().catch(() => ({}));
                                     if (!response.ok) throw new Error(data?.error || data?.message || "Failed to test integration");
                                     await refreshIntegrations();
                                     await refreshIntegrationConsole();
                                     toast.success(`${integration.provider} tested`);
                                   } catch (error: any) {
                                     toast.error(error?.message || "Failed to test integration");
                                   }
                                 }}
                                 className="text-xs px-3 py-1.5 rounded border border-border hover:bg-muted"
                               >
                                 Test
                               </button>
                               <button
                                 type="button"
                                 onClick={async () => {
                                   const confirmed = window.confirm(`Remove ${integration.provider} from this tenant?`);
                                   if (!confirmed) return;
                                   try {
                                     const response = await fetch(`/api/tenant/${slug}/integrations/${integration.id}`, {
                                       method: "DELETE",
                                       credentials: "include",
                                     });
                                     const data = await response.json().catch(() => ({}));
                                     if (!response.ok) throw new Error(data?.error || "Failed to remove integration");
                                     await refreshIntegrations();
                                     await refreshIntegrationConsole();
                                     toast.success("Integration removed");
                                   } catch (error: any) {
                                     toast.error(error?.message || "Failed to remove integration");
                                   }
                                 }}
                                 className="text-xs px-3 py-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50"
                               >
                                 Remove
                               </button>
                             </div>
                           </div>
                         </div>
                       ))
                     )}
                   </div>
                 </div>

                 <div>
                   <h4 className="text-sm font-semibold text-foreground mb-3">Webhooks</h4>
                   <div className="space-y-3">
                     {webhooks.length === 0 ? (
                       <div className="p-4 rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                         No tenant webhooks configured.
                       </div>
                     ) : (
                       webhooks.map((hook) => (
                         <div key={hook.id} className="p-4 rounded-lg border border-border">
                           <div className="flex items-center justify-between mb-2 gap-3">
                             <div>
                               <p className="text-sm font-medium">{hook.name}</p>
                               <p className="text-xs text-muted-foreground mt-1">{hook.events.join(", ") || "No events selected"}</p>
                             </div>
                             <span className={`text-xs px-2 py-1 rounded-full ${hook.status === "active" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : hook.status === "error" ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400" : "bg-muted text-muted-foreground"}`}>
                               {hook.status}
                             </span>
                           </div>
                           <p className="text-xs text-muted-foreground font-mono break-all">{hook.url}</p>
                           <p className="text-xs text-muted-foreground mt-2">
                             Last tested {hook.lastTestedAt ? formatDistanceToNow(new Date(hook.lastTestedAt), { addSuffix: true }) : "never"}
                             {hook.lastStatusCode ? ` - HTTP ${hook.lastStatusCode}` : ""}
                           </p>
                           {hook.lastError && <p className="text-xs text-red-600 mt-1">{hook.lastError}</p>}
                           <div className="flex gap-2 mt-3 flex-wrap">
                             <button type="button" onClick={async () => {
                               try {
                                 await saveWebhook(hook);
                               } catch (error: any) {
                                 toast.error(error?.message || "Failed to update webhook");
                               }
                             }} className="text-xs px-3 py-1.5 rounded border border-border hover:bg-muted">Edit</button>
                             <button type="button" onClick={async () => {
                               try {
                                 await testWebhook(hook);
                               } catch (error: any) {
                                 toast.error(error?.message || "Failed to test webhook");
                               }
                             }} className="text-xs px-3 py-1.5 rounded border border-border hover:bg-muted">Test</button>
                             <button type="button" onClick={async () => {
                               try {
                                 await removeWebhook(hook);
                               } catch (error: any) {
                                 toast.error(error?.message || "Failed to remove webhook");
                               }
                             }} className="text-xs px-3 py-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50">Remove</button>
                           </div>
                         </div>
                       ))
                     )}
                   </div>

                   <button
                     type="button"
                     onClick={async () => {
                       try {
                         await saveWebhook();
                       } catch (error: any) {
                         toast.error(error?.message || "Failed to add webhook");
                       }
                     }}
                     className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"
                   >
                     <Plus className="size-4" /> Add Webhook
                   </button>
                 </div>

                 <div>
                   <h4 className="text-sm font-semibold text-foreground mb-3">API Keys</h4>
                   <div className="space-y-3">
                     {apiKeys.length === 0 ? (
                       <div className="p-4 rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                         No tenant API keys have been created.
                       </div>
                     ) : (
                       apiKeys.map((apiKey) => (
                         <div key={apiKey.id} className="p-4 rounded-lg border border-border">
                           <div className="flex items-center justify-between mb-2 gap-3">
                             <div>
                               <p className="text-sm font-medium">{apiKey.name}</p>
                               <p className="text-xs text-muted-foreground mt-1">
                                 {apiKey.environment} - scopes: {apiKey.scopes.join(", ")}
                               </p>
                             </div>
                             <span className={`text-xs px-2 py-1 rounded-full ${apiKey.status === "active" ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"}`}>
                               {apiKey.status}
                             </span>
                           </div>
                           <p className="text-xs text-muted-foreground font-mono">{apiKey.maskedSecret}</p>
                           <p className="text-xs text-muted-foreground mt-1">
                             Created {formatDistanceToNow(new Date(apiKey.createdAt), { addSuffix: true })}
                             {apiKey.lastUsedAt ? ` - Last used ${formatDistanceToNow(new Date(apiKey.lastUsedAt), { addSuffix: true })}` : " - Last used: never"}
                           </p>
                           <div className="flex gap-2 mt-3 flex-wrap">
                             <button type="button" onClick={async () => {
                               try {
                                 await revealApiKey(apiKey);
                               } catch (error: any) {
                                 toast.error(error?.message || "Failed to copy API key");
                               }
                             }} className="text-xs px-3 py-1.5 rounded border border-border hover:bg-muted flex items-center gap-1">
                               <Copy className="size-3" /> Copy Key
                             </button>
                             <button type="button" onClick={async () => {
                               try {
                                 await rotateApiKey(apiKey);
                               } catch (error: any) {
                                 toast.error(error?.message || "Failed to rotate API key");
                               }
                             }} className="text-xs px-3 py-1.5 rounded border border-border hover:bg-muted">Rotate</button>
                             <button type="button" onClick={async () => {
                               try {
                                 await revokeApiKey(apiKey);
                               } catch (error: any) {
                                 toast.error(error?.message || "Failed to revoke API key");
                               }
                             }} className="text-xs px-3 py-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50">Revoke</button>
                           </div>
                         </div>
                       ))
                     )}
                   </div>

                   <button
                     type="button"
                     onClick={async () => {
                       try {
                         await generateApiKey();
                       } catch (error: any) {
                         toast.error(error?.message || "Failed to generate API key");
                       }
                     }}
                     className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"
                   >
                     <Plus className="size-4" /> Generate New Key
                   </button>
                 </div>

                 <div>
                   <h4 className="text-sm font-semibold text-foreground mb-3">Integration Logs</h4>
                   <div className="space-y-2 text-xs">
                     {integrationLogs.length === 0 ? (
                       <div className="p-3 rounded-lg border border-dashed border-border text-muted-foreground">
                         No tenant integration activity logged yet.
                       </div>
                     ) : (
                       integrationLogs.map((log) => (
                         <div key={log.id} className="p-3 rounded-lg border border-border flex items-center justify-between gap-3">
                           <div>
                             <p className="font-medium">{log.action.replace(/_/g, " ")}</p>
                             <p className="text-muted-foreground">
                               {log.actor}
                               {log.metadata?.name ? ` - ${log.metadata.name}` : ""}
                               {log.metadata?.provider ? ` - ${log.metadata.provider}` : ""}
                             </p>
                           </div>
                           <span className="text-muted-foreground whitespace-nowrap">
                             {log.createdAt ? formatDistanceToNow(new Date(log.createdAt), { addSuffix: true }) : "recently"}
                           </span>
                         </div>
                       ))
                     )}
                   </div>
                 </div>

                 <div className="flex gap-2">
                   <button
                     type="button"
                     onClick={() => {
                       goToTab("communications");
                       toast.success("Choose a provider in Communications and save its credentials");
                     }}
                     className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold"
                   >
                     <Plus className="size-4" /> Add Integration
                   </button>
                   <button
                     type="button"
                     onClick={() => {
                       downloadJson(`${slug}-integration-logs.json`, {
                         overview: integrationOverview,
                         services: integrations,
                         webhooks,
                         apiKeys,
                         logs: integrationLogs,
                         exportedAt: new Date().toISOString(),
                       });
                       toast.success("Integration logs exported");
                     }}
                     className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"
                   >
                     <Download className="size-4" /> Export Logs
                   </button>
                 </div>
               </div>
             </Card>
           )}

           
{tab === "system" && (
             <Card
               title="System Health & Monitoring"
               desc="Monitor system performance, resource usage, and platform statistics"
               onReset={() => setSettings({ ...settings, system: { ...DEFAULT_SETTINGS.system } })}
             >
               <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                   <div className="p-4 rounded-lg border border-border">
                     <div className="flex items-center justify-between mb-2">
                       <p className="text-xs font-medium text-muted-foreground">System Uptime</p>
                       <Activity className="size-4 text-emerald-600" />
                     </div>
                     <p className="text-2xl font-bold">{systemStats?.overview?.uptime || "0s"}</p>
                     <p className="text-xs text-muted-foreground mt-1">Current tenant uptime snapshot</p>
                   </div>

                   <div className="p-4 rounded-lg border border-border">
                     <div className="flex items-center justify-between mb-2">
                       <p className="text-xs font-medium text-muted-foreground">API Response Time</p>
                       <Zap className="size-4 text-blue-600" />
                     </div>
                     <p className="text-2xl font-bold">{systemStats?.overview?.apiResponseTime || 0}ms</p>
                     <p className="text-xs text-muted-foreground mt-1">Live API timing</p>
                   </div>

                   <div className="p-4 rounded-lg border border-border">
                     <div className="flex items-center justify-between mb-2">
                       <p className="text-xs font-medium text-muted-foreground">Active Users</p>
                       <Users className="size-4 text-orange-600" />
                     </div>
                     <p className="text-2xl font-bold">{systemStats?.overview?.activeUsers || 0}</p>
                     <p className="text-xs text-muted-foreground mt-1">Live tenant session count</p>
                   </div>

                   <div className="p-4 rounded-lg border border-border">
                     <div className="flex items-center justify-between mb-2">
                       <p className="text-xs font-medium text-muted-foreground">Database Size</p>
                       <Database className="size-4 text-purple-600" />
                     </div>
                     <p className="text-2xl font-bold">{systemStats?.overview?.databaseSize || "0 B"}</p>
                     <p className="text-xs text-muted-foreground mt-1">{systemStats?.resourceUsage?.database?.display || "0 B"}</p>
                   </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-3">
                     <Toggle label="Maintenance mode" desc="Restrict tenant access during maintenance windows." value={settings.system.maintenanceMode} onChange={x => update("system.maintenanceMode", x)} />
                     <Toggle label="Auto updates" desc="Apply tenant platform maintenance updates automatically." value={settings.system.autoUpdates} onChange={x => update("system.autoUpdates", x)} />
                     <Toggle label="Telemetry enabled" desc="Allow tenant operational telemetry collection." value={settings.system.telemetryEnabled} onChange={x => update("system.telemetryEnabled", x)} />
                     <Toggle label="Health alerts enabled" desc="Create system alerts when thresholds are crossed." value={settings.system.healthAlertsEnabled} onChange={x => update("system.healthAlertsEnabled", x)} />
                   </div>
                   <div className="space-y-3">
                     <div>
                       <label className="text-sm font-medium">Maintenance Message</label>
                       <input type="text" value={settings.system.maintenanceMessage} onChange={e => update("system.maintenanceMessage", e.target.value)}
                         className="mt-1.5 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
                     </div>
                     <div className="grid grid-cols-3 gap-3">
                       <div>
                         <label className="text-xs font-medium text-muted-foreground">CPU Threshold</label>
                         <input type="number" value={settings.system.cpuThreshold} min="1" max="100" onChange={e => update("system.cpuThreshold", Number(e.target.value))}
                           className="mt-1 w-full h-9 px-2 rounded-lg border border-border bg-background text-sm" />
                       </div>
                       <div>
                         <label className="text-xs font-medium text-muted-foreground">Memory Threshold</label>
                         <input type="number" value={settings.system.memoryThreshold} min="1" max="100" onChange={e => update("system.memoryThreshold", Number(e.target.value))}
                           className="mt-1 w-full h-9 px-2 rounded-lg border border-border bg-background text-sm" />
                       </div>
                       <div>
                         <label className="text-xs font-medium text-muted-foreground">Disk Threshold</label>
                         <input type="number" value={settings.system.diskThreshold} min="1" max="100" onChange={e => update("system.diskThreshold", Number(e.target.value))}
                           className="mt-1 w-full h-9 px-2 rounded-lg border border-border bg-background text-sm" />
                       </div>
                     </div>
                   </div>
                 </div>

                 <div>
                   <h4 className="text-sm font-semibold text-foreground mb-3">Service Status</h4>
                   <div className="space-y-2">
                     <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                       <div className="flex items-center gap-3">
                         <div className="size-3 rounded-full bg-emerald-500"></div>
                         <div>
                           <p className="text-sm font-medium">Database Server</p>
                           <p className="text-xs text-muted-foreground">{systemStats?.resourceUsage?.database?.display ? `Database size ${systemStats.resourceUsage.database.display}` : "No recent metric"}</p>
                         </div>
                       </div>
                       <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">Healthy</span>
                     </div>

                     <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                       <div className="flex items-center gap-3">
                         <div className="size-3 rounded-full bg-emerald-500"></div>
                         <div>
                           <p className="text-sm font-medium">API Servers</p>
                           <p className="text-xs text-muted-foreground">{systemStats?.overview?.apiResponseTime || 0}ms average response time</p>
                         </div>
                       </div>
                       <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">Healthy</span>
                     </div>

                     <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                       <div className="flex items-center gap-3">
                         <div className="size-3 rounded-full bg-emerald-500"></div>
                         <div>
                           <p className="text-sm font-medium">Storage Service</p>
                           <p className="text-xs text-muted-foreground">Disk threshold set to {settings.system.diskThreshold}%</p>
                         </div>
                       </div>
                       <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">Healthy</span>
                     </div>

                     <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                       <div className="flex items-center gap-3">
                         <div className="size-3 rounded-full bg-yellow-500"></div>
                         <div>
                           <p className="text-sm font-medium">Tenant Telemetry</p>
                           <p className="text-xs text-muted-foreground">{settings.system.telemetryEnabled ? "Telemetry is enabled" : "Telemetry is disabled"}</p>
                         </div>
                       </div>
                       <span className="text-xs px-2 py-1 rounded-full bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400">Warning</span>
                     </div>
                   </div>
                 </div>

                 <div>
                   <h4 className="text-sm font-semibold text-foreground mb-3">Resource Usage</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <div className="flex items-center justify-between mb-2">
                         <p className="text-sm font-medium">CPU Usage</p>
                       <span className="text-xs font-semibold text-emerald-600">{systemStats?.overview?.cpuUsage || 0}%</span>
                      </div>
                      <div className="w-full bg-border rounded-full h-2">
                         <div className="bg-emerald-500 h-2 rounded-full" style={{width: `${systemStats?.overview?.cpuUsage || 0}%`}}></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {systemStats?.resourceUsage?.cpu
                          ? `Load avg 1m ${Number(systemStats.resourceUsage.cpu.loadAverage?.[0] || 0).toFixed(2)} on ${systemStats.resourceUsage.cpu.cores} cores`
                          : "No live CPU sample"}
                      </p>
                     </div>

                     <div>
                       <div className="flex items-center justify-between mb-2">
                         <p className="text-sm font-medium">Memory Usage</p>
                       <span className="text-xs font-semibold text-emerald-600">{systemStats?.overview?.memoryUsage || 0}%</span>
                      </div>
                      <div className="w-full bg-border rounded-full h-2">
                         <div className="bg-emerald-500 h-2 rounded-full" style={{width: `${systemStats?.overview?.memoryUsage || 0}%`}}></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {systemStats?.resourceUsage?.memory?.display || "No live memory sample"}
                      </p>
                     </div>

                     <div>
                       <div className="flex items-center justify-between mb-2">
                         <p className="text-sm font-medium">Disk Usage</p>
                       <span className="text-xs font-semibold text-emerald-600">{systemStats?.overview?.diskUsage || 0}%</span>
                      </div>
                      <div className="w-full bg-border rounded-full h-2">
                         <div className="bg-emerald-500 h-2 rounded-full" style={{width: `${systemStats?.overview?.diskUsage || 0}%`}}></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {systemStats?.resourceUsage?.disk?.display || "No live disk sample"}
                      </p>
                     </div>

                     <div>
                       <div className="flex items-center justify-between mb-2">
                         <p className="text-sm font-medium">Network I/O</p>
                       <span className="text-xs font-semibold text-orange-600">{systemStats?.overview?.networkIo || 0}%</span>
                      </div>
                      <div className="w-full bg-border rounded-full h-2">
                         <div className="bg-orange-500 h-2 rounded-full" style={{width: `${systemStats?.overview?.networkIo || 0}%`}}></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {systemStats?.resourceUsage?.network?.display
                          ? `${systemStats.resourceUsage.network.display} (${systemStats.resourceUsage.network.source})`
                          : "No live network sample"}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                   <h4 className="text-sm font-semibold text-foreground mb-3">System Alerts</h4>
                   <div className="space-y-2">
                     {systemAlertsList.length === 0 ? (
                       <p className="text-sm text-muted-foreground">No active system alerts.</p>
                     ) : systemAlertsList.map((alert) => (
                       <div key={alert.id} className="p-3 rounded-lg border border-border">
                         <div className="flex items-start gap-2">
                           <AlertCircle className="size-4 text-orange-600 mt-0.5 shrink-0" />
                           <div className="flex-1">
                             <div className="flex items-center justify-between gap-3">
                               <p className="text-sm font-medium">{alert.title}</p>
                               <button
                                 type="button"
                                 onClick={async () => {
                                   try {
                                     await fetch(`/api/tenant/${slug}/system/alerts`, {
                                       method: "PUT",
                                       headers: { "Content-Type": "application/json" },
                                       credentials: "include",
                                       body: JSON.stringify({ alertId: alert.id, isResolved: true }),
                                     });
                                     await refreshSystemSection();
                                   } catch {
                                     toast.error("Failed to resolve system alert");
                                   }
                                 }}
                                 className="text-xs font-semibold text-orange-600 hover:underline"
                               >
                                 Resolve
                               </button>
                             </div>
                             <p className="text-xs text-muted-foreground mt-1">{alert.message || "No details provided."}</p>
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>

                 <div className="flex gap-2">
                   <button
                     type="button"
                     onClick={async () => {
                       try {
                         await refreshSystemSection();
                         toast.success("System status refreshed");
                       } catch {
                         toast.error("Failed to refresh system status");
                       }
                     }}
                     className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold"
                   >
                     <RefreshCw className={`size-4 ${systemLoading ? "animate-spin" : ""}`} /> Refresh Status
                   </button>
                   <button
                     type="button"
                     onClick={async () => {
                       try {
                         const response = await fetch(`/api/tenant/${slug}/system/export`, { credentials: "include", cache: "no-store" });
                         const data = await response.json();
                         if (!response.ok) throw new Error(data?.error || "Failed to export system report");
                         downloadJson(`${slug}-system-report.json`, data);
                         toast.success("System report exported");
                       } catch (error: any) {
                         toast.error(error?.message || "Failed to export system report");
                       }
                     }}
                     className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"
                   >
                     <Download className="size-4" /> Export Report
                   </button>
                   <button
                     type="button"
                     onClick={async () => {
                       try {
                         await saveSystemSettings();
                         await refreshSystemSection();
                         openActionDialog("Alert Configuration", "System alert thresholds and routing were saved for this tenant.", [
                           `CPU threshold: ${settings.system.cpuThreshold}%`,
                           `Memory threshold: ${settings.system.memoryThreshold}%`,
                           `Disk threshold: ${settings.system.diskThreshold}%`,
                         ]);
                       } catch (error: any) {
                         toast.error(error?.message || "Failed to save system settings");
                       }
                     }}
                     className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"
                   >
                     <Settings className="size-4" /> Save System Settings
                   </button>
                 </div>
               </div>
             </Card>
           )}

          {tab === "security" && (
            <Card
              title="Security Settings"
              desc="Configure authentication, access controls, and security policies"
              onReset={() => setSettings({ ...settings, security: { ...DEFAULT_SETTINGS.security } })}
            >
              <div className="space-y-6">
                {/* Authentication Settings */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground">Authentication</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Session Timeout (minutes)</label>
                      <input type="number" value={settings.security.sessionTimeout}
                        onChange={e => update("security.sessionTimeout", parseInt(e.target.value))}
                        min="15" max="480"
                        className="mt-1.5 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
                      <p className="text-xs text-muted-foreground mt-1">Automatically log out inactive users</p>
                    </div>
                    <div className="flex items-center justify-center">
                      <Toggle label="Require 2FA" desc="Enforce two-factor authentication for all users" value={settings.security.twoFactorRequired} onChange={x => update("security.twoFactorRequired", x)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Toggle label="Password expiration" desc="Require password changes every configured period" value={settings.security.passwordExpirationEnabled} onChange={x => update("security.passwordExpirationEnabled", x)} />
                    <Toggle label="Login attempt limits" desc="Lock accounts after repeated failed attempts" value={settings.security.loginAttemptLimitsEnabled} onChange={x => update("security.loginAttemptLimitsEnabled", x)} />
                  </div>

                  {settings.security.passwordExpirationEnabled && (
                    <div>
                      <label className="text-sm font-medium">Password Expiration (days)</label>
                      <input type="number" value={settings.security.passwordExpirationDays}
                        onChange={e => update("security.passwordExpirationDays", parseInt(e.target.value || "90", 10))}
                        min="30" max="365"
                        className="mt-1.5 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
                    </div>
                  )}

                  {settings.security.loginAttemptLimitsEnabled && (
                    <div>
                      <label className="text-sm font-medium">Maximum Failed Attempts</label>
                      <input type="number" value={settings.security.maxFailedLoginAttempts}
                        onChange={e => update("security.maxFailedLoginAttempts", parseInt(e.target.value || "5", 10))}
                        min="3" max="20"
                        className="mt-1.5 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium">Password Requirements</label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={settings.security.passwordMinLength >= 8} onChange={(e) => update("security.passwordMinLength", e.target.checked ? 8 : 6)} className="accent-orange-500" />
                        <span className="text-sm">Minimum 8 characters</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={settings.security.requireUppercase} onChange={(e) => update("security.requireUppercase", e.target.checked)} className="accent-orange-500" />
                        <span className="text-sm">Require uppercase letters</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={settings.security.requireLowercase} onChange={(e) => update("security.requireLowercase", e.target.checked)} className="accent-orange-500" />
                        <span className="text-sm">Require lowercase letters</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={settings.security.requireNumbers} onChange={(e) => update("security.requireNumbers", e.target.checked)} className="accent-orange-500" />
                        <span className="text-sm">Require numbers</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={settings.security.requireSpecialCharacters} onChange={(e) => update("security.requireSpecialCharacters", e.target.checked)} className="accent-orange-500" />
                        <span className="text-sm">Require special characters</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Access Control */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground">Access Control</h4>
                  <Toggle label="IP Whitelist" desc="Restrict access to specific IP addresses" value={settings.security.ipWhitelistEnabled} onChange={x => update("security.ipWhitelistEnabled", x)} />
                  {settings.security.ipWhitelistEnabled && (
                    <div>
                      <label className="text-sm font-medium">Allowed IPs</label>
                      <textarea rows={3} placeholder="192.168.1.0/24&#10;10.0.0.1&#10;203.0.113.5"
                        value={settings.security.ipWhitelist.join("\n")}
                        onChange={e => update("security.ipWhitelist", e.target.value.split("\n").map((item) => item.trim()).filter(Boolean))}
                        className="mt-1.5 w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono" />
                      <p className="text-xs text-muted-foreground mt-1">One IP address or CIDR range per line</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Toggle label="Role-based access control" desc="Enforce granular permissions by role" value={settings.security.roleBasedAccessControl} onChange={x => update("security.roleBasedAccessControl", x)} />
                    <Toggle label="Audit all access" desc="Log every data access and modification" value={settings.security.auditAllAccess} onChange={x => update("security.auditAllAccess", x)} />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Data Classification Levels</label>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg border border-border">
                        <p className="text-sm font-medium text-green-600">Public</p>
                        <p className="text-xs text-muted-foreground">Basic patient info</p>
                      </div>
                      <div className="p-3 rounded-lg border border-border">
                        <p className="text-sm font-medium text-yellow-600">Sensitive</p>
                        <p className="text-xs text-muted-foreground">Medical records</p>
                      </div>
                      <div className="p-3 rounded-lg border border-border">
                        <p className="text-sm font-medium text-red-600">Restricted</p>
                        <p className="text-xs text-muted-foreground">PHI & confidential</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Encryption & Data Protection */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground">Encryption & Data Protection</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Toggle label="Encrypt data at rest" desc="AES-256 encryption for stored data" value={settings.security.encryptDataAtRest} onChange={x => update("security.encryptDataAtRest", x)} />
                    <Toggle label="Encrypt data in transit" desc="TLS 1.3 for all connections" value={settings.security.encryptDataInTransit} onChange={x => update("security.encryptDataInTransit", x)} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Toggle label="Automated backups" desc="Daily encrypted backups" value={settings.security.automatedBackups} onChange={x => update("security.automatedBackups", x)} />
                    <Toggle label="Backup encryption" desc="Encrypt backup files" value={settings.security.backupEncryption} onChange={x => update("security.backupEncryption", x)} />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Encryption Key Rotation</label>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Database Keys</label>
                        <select value={`${settings.security.dbKeyRotationDays}`} onChange={e => update("security.dbKeyRotationDays", parseInt(e.target.value, 10))} className="mt-1 w-full h-8 px-2 rounded border border-border bg-background text-xs">
                          <option value="30">30 days</option>
                          <option value="90">90 days</option>
                          <option value="180">180 days</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">API Keys</label>
                        <select value={`${settings.security.apiKeyRotationDays}`} onChange={e => update("security.apiKeyRotationDays", parseInt(e.target.value, 10))} className="mt-1 w-full h-8 px-2 rounded border border-border bg-background text-xs">
                          <option value="0">Never</option>
                          <option value="90">90 days</option>
                          <option value="180">180 days</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">File Encryption</label>
                        <select value={`${settings.security.fileKeyRotationDays}`} onChange={e => update("security.fileKeyRotationDays", parseInt(e.target.value, 10))} className="mt-1 w-full h-8 px-2 rounded border border-border bg-background text-xs">
                          <option value="30">30 days</option>
                          <option value="90">90 days</option>
                          <option value="180">180 days</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security Monitoring */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground">Security Monitoring</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Toggle label="Intrusion detection" desc="Monitor for suspicious activity" value={settings.security.intrusionDetection} onChange={x => update("security.intrusionDetection", x)} />
                    <Toggle label="Failed login alerts" desc="Notify admins of failed attempts" value={settings.security.failedLoginAlerts} onChange={x => update("security.failedLoginAlerts", x)} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Toggle label="Data breach alerts" desc="Immediate notification of breaches" value={settings.security.dataBreachAlerts} onChange={x => update("security.dataBreachAlerts", x)} />
                    <Toggle label="Compliance monitoring" desc="Continuous HIPAA/GDPR checks" value={settings.security.complianceMonitoring} onChange={x => update("security.complianceMonitoring", x)} />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Security Incident Response</label>
                    <div className="mt-2 space-y-3">
                      <div className="p-3 rounded-lg border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium">Incident Response Plan</p>
                          <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                            Active
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">Last reviewed: {settings.security.incidentResponseLastReviewedAt || "Not recorded"}</p>
                        <button type="button" onClick={() => openActionDialog("Incident Response Plan", "Current incident response workflow", [
                          "1. Identify and classify the incident.",
                          "2. Notify security lead and hospital admin.",
                          "3. Contain impact and preserve audit evidence.",
                          "4. Communicate resolution and post-incident actions.",
                        ])} className="text-xs font-semibold text-orange-600 hover:underline mt-2">
                          View Plan
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Primary Contact</label>
                          <input type="email" placeholder="security@hospital.com" value={settings.security.incidentPrimaryContact}
                            onChange={e => update("security.incidentPrimaryContact", e.target.value)}
                            className="mt-1 w-full h-8 px-2 rounded border border-border bg-background text-xs" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Emergency Phone</label>
                          <input type="tel" placeholder="+1-555-0123" value={settings.security.incidentEmergencyPhone}
                            onChange={e => update("security.incidentEmergencyPhone", e.target.value)}
                            className="mt-1 w-full h-8 px-2 rounded border border-border bg-background text-xs" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security Testing */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground">Security Testing & Assessment</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">Last Penetration Test</p>
                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                          {settings.security.lastPenetrationTestStatus || "Passed"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">Completed on {settings.security.lastPenetrationTestAt || "Oct 15, 2024"}</p>
                      <button type="button" onClick={() => openActionDialog("Penetration Test Report", "Most recent external security review summary", [
                        "Overall outcome: Passed",
                        "Critical findings: 0",
                        "Medium findings: 2 remediated",
                        "Next retest window: 90 days",
                      ])} className="text-xs font-semibold text-orange-600 hover:underline mt-2">
                        View Report
                      </button>
                    </div>
                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">Next Security Audit</p>
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                          {settings.security.nextSecurityAuditStatus || "Scheduled"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">Due on {settings.security.nextSecurityAuditAt || "Apr 15, 2025"}</p>
                      <button type="button" onClick={async () => {
                        try {
                          const data = await runSecurityAction("schedule-audit");
                          setSettings((current) => current ? {
                            ...current,
                            security: {
                              ...current.security,
                              nextSecurityAuditAt: data.nextSecurityAuditAt,
                              nextSecurityAuditStatus: "scheduled",
                            },
                          } : current);
                          openActionDialog("Security Audit Scheduled", "The next security audit has been queued.", [
                            `Planned window: ${data.nextSecurityAuditAt}`,
                            "Owner: Security operations",
                          ]);
                        } catch (error: any) {
                          toast.error(error?.message || "Failed to schedule security audit");
                        }
                      }} className="text-xs font-semibold text-orange-600 hover:underline mt-2">
                        Schedule Now
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Toggle label="Automated vulnerability scanning" desc="Weekly security scans" value={settings.security.automatedVulnerabilityScanning} onChange={x => update("security.automatedVulnerabilityScanning", x)} />
                    <Toggle label="Third-party security reviews" desc="Annual external assessments" value={settings.security.thirdPartySecurityReviews} onChange={x => update("security.thirdPartySecurityReviews", x)} />
                  </div>

                  {settings.security.generatedSecurityKeys.length > 0 && (
                    <div>
                      <h5 className="text-sm font-semibold text-foreground mb-3">Generated Security Keys</h5>
                      <div className="space-y-2">
                        {settings.security.generatedSecurityKeys.map((item) => (
                          <div key={item.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs">
                            <div>
                              <p className="font-medium">{item.label}</p>
                              <p className="text-muted-foreground">{item.createdAt}</p>
                            </div>
                            <span className="font-mono text-muted-foreground">{item.maskedValue}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const data = await runSecurityAction("run-audit");
                        openSecurityDialog(
                          "security-audit",
                          "Security Audit Completed",
                          "A tenant security audit was executed against the active policy and enforcement controls.",
                          data,
                          data.findings || []
                        );
                        toast.success("Security audit completed");
                      } catch (error: any) {
                        toast.error(error?.message || "Security audit failed");
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold"
                  >
                    <Shield className="size-4" /> Run Security Audit
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const data = await runSecurityAction("export-report");
                        downloadJson(`${slug}-security-report.json`, data);
                        openSecurityDialog(
                          "security-report",
                          "Security Report Ready",
                          "The latest tenant security report was generated and exported.",
                          data,
                          [
                            `Tenant: ${data?.tenant?.name || slug}`,
                            `Events captured: ${Array.isArray(data?.securityEvents) ? data.securityEvents.length : 0}`,
                            `2FA required: ${data?.settings?.twoFactorRequired ? "Yes" : "No"}`,
                            `IP allowlist: ${data?.settings?.ipWhitelistEnabled ? "Enabled" : "Disabled"}`,
                          ]
                        );
                        toast.success("Security report exported");
                      } catch (error: any) {
                        toast.error(error?.message || "Failed to export security report");
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"
                  >
                    <Download className="size-4" /> Export Security Report
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const data = await runSecurityAction("generate-keys", { label: "Security rotation key" });
                        openSecurityDialog(
                          "security-key",
                          "Security Keys Generated",
                          "A new security rotation key has been generated for this tenant.",
                          data,
                          [
                            "Store this key in your secret manager before rotation.",
                            "Only administrators with secret access should handle the raw value.",
                          ]
                        );
                        setSettings((current) => current ? {
                          ...current,
                          security: {
                            ...current.security,
                            generatedSecurityKeys: [data.key, ...(current.security.generatedSecurityKeys || [])].slice(0, 10),
                          },
                        } : current);
                      } catch (error: any) {
                        toast.error(error?.message || "Failed to generate security key");
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"
                  >
                    <Key className="size-4" /> Generate Security Keys
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
      {actionDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold">{actionDialog.title}</h3>
                {actionDialog.description ? <p className="text-sm text-muted-foreground">{actionDialog.description}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => setActionDialog(null)}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
              >
                <X className="size-4" />
                Close
              </button>
            </div>
            <div className="space-y-3 px-6 py-5">
              {actionDialog.variant === "security-audit" && actionDialog.payload ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground">Posture</p>
                      <p className="mt-1 text-sm font-semibold capitalize">{String(actionDialog.payload.posture || "review")}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground">2FA Enforcement</p>
                      <p className="mt-1 text-sm font-semibold">{actionDialog.payload?.settings?.twoFactorRequired ? "Required" : "Optional"}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground">IP Allowlist</p>
                      <p className="mt-1 text-sm font-semibold">{actionDialog.payload?.settings?.ipWhitelistEnabled ? "Enabled" : "Disabled"}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-background px-4 py-3">
                    <p className="text-sm font-semibold">Findings</p>
                    <div className="mt-3 space-y-2">
                      {(actionDialog.details || []).map((detail, index) => (
                        <div key={`${detail}-${index}`} className="rounded-md border border-border px-3 py-2 text-sm">
                          {detail}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {actionDialog.variant === "security-report" && actionDialog.payload ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground">Tenant</p>
                      <p className="mt-1 text-sm font-semibold">{actionDialog.payload?.tenant?.name || "Unknown"}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground">Exported</p>
                      <p className="mt-1 text-sm font-semibold">{actionDialog.payload?.exportedAt ? format(new Date(actionDialog.payload.exportedAt), "PPp") : "Just now"}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-background px-4 py-3">
                    <p className="text-sm font-semibold">Operational Summary</p>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="rounded-md border border-border px-3 py-2 text-sm">Security events: {Array.isArray(actionDialog.payload.securityEvents) ? actionDialog.payload.securityEvents.length : 0}</div>
                      <div className="rounded-md border border-border px-3 py-2 text-sm">Generated keys: {Array.isArray(actionDialog.payload.settings?.generatedSecurityKeys) ? actionDialog.payload.settings.generatedSecurityKeys.length : 0}</div>
                      <div className="rounded-md border border-border px-3 py-2 text-sm">Session timeout: {actionDialog.payload.settings?.sessionTimeout || 60} minutes</div>
                      <div className="rounded-md border border-border px-3 py-2 text-sm">Password expiry: {actionDialog.payload.settings?.passwordExpirationEnabled ? `${actionDialog.payload.settings.passwordExpirationDays} days` : "Disabled"}</div>
                    </div>
                  </div>
                </div>
              ) : null}

              {actionDialog.variant === "security-key" && actionDialog.payload ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Handle As Secret</p>
                    <p className="mt-1 font-mono text-sm break-all text-foreground">{String(actionDialog.payload.rawKey || "")}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => copyText(String(actionDialog.payload?.rawKey || ""), "Security key")}
                      className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
                    >
                      <Copy className="size-4" />
                      Copy Key
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground">Label</p>
                      <p className="mt-1 text-sm font-semibold">{actionDialog.payload?.key?.label || "Security rotation key"}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground">Created</p>
                      <p className="mt-1 text-sm font-semibold">{actionDialog.payload?.key?.createdAt ? format(new Date(actionDialog.payload.key.createdAt), "PPp") : "Just now"}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {actionDialog.variant === "notification-test" && actionDialog.payload ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground">Quiet Hours</p>
                      <p className="mt-1 text-sm font-semibold">{actionDialog.payload?.quietHoursActive ? "Active" : "Inactive"}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground">Enabled Channels</p>
                      <p className="mt-1 text-sm font-semibold">{Array.isArray(actionDialog.payload?.summary?.enabledChannels) ? actionDialog.payload.summary.enabledChannels.length : 0}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground">Enabled Categories</p>
                      <p className="mt-1 text-sm font-semibold">{Array.isArray(actionDialog.payload?.summary?.enabledCategories) ? actionDialog.payload.summary.enabledCategories.length : 0}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-background px-4 py-3">
                    <p className="text-sm font-semibold">Channel Results</p>
                    <div className="mt-3 space-y-2">
                      {(actionDialog.payload?.channels || []).map((item: any, index: number) => (
                        <div key={`${item.channel}-${index}`} className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
                          <div>
                            <p className="font-medium uppercase tracking-wide">{String(item.channel).replace("_", " ")}</p>
                            <p className="text-xs text-muted-foreground">{item.detail}</p>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            item.status === "sent" ? "bg-emerald-500/10 text-emerald-600" :
                            item.status === "suppressed" ? "bg-amber-500/10 text-amber-700" :
                            item.status === "failed" ? "bg-red-500/10 text-red-600" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-background px-4 py-3">
                    <p className="text-sm font-semibold">Preview Payload</p>
                    <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs">{JSON.stringify(actionDialog.payload?.preview || {}, null, 2)}</pre>
                  </div>
                </div>
              ) : null}

              {actionDialog.variant === "notification-export" && actionDialog.payload ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground">Tenant</p>
                      <p className="mt-1 text-sm font-semibold">{actionDialog.payload?.tenant?.name || slug}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground">Exported</p>
                      <p className="mt-1 text-sm font-semibold">{actionDialog.payload?.exportedAt ? format(new Date(actionDialog.payload.exportedAt), "PPp") : "Just now"}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-background px-4 py-3">
                    <p className="text-sm font-semibold">Snapshot</p>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="rounded-md border border-border px-3 py-2 text-sm">Email: {actionDialog.payload?.settings?.emailEnabled ? "Enabled" : "Disabled"}</div>
                      <div className="rounded-md border border-border px-3 py-2 text-sm">SMS: {actionDialog.payload?.settings?.smsEnabled ? "Enabled" : "Disabled"}</div>
                      <div className="rounded-md border border-border px-3 py-2 text-sm">Push: {actionDialog.payload?.settings?.pushEnabled ? "Enabled" : "Disabled"}</div>
                      <div className="rounded-md border border-border px-3 py-2 text-sm">In-app: {actionDialog.payload?.settings?.inAppEnabled ? "Enabled" : "Disabled"}</div>
                      <div className="rounded-md border border-border px-3 py-2 text-sm">Recent events: {actionDialog.payload?.overview?.sentLast24h ?? 0} in 24h</div>
                      <div className="rounded-md border border-border px-3 py-2 text-sm">Unread: {actionDialog.payload?.overview?.unreadCount ?? 0}</div>
                    </div>
                  </div>
                </div>
              ) : null}

              {actionDialog.variant === "preference-apply" && actionDialog.payload ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground">Timezone</p>
                      <p className="mt-1 text-sm font-semibold">{actionDialog.payload?.summary?.timezone || "UTC"}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground">Language</p>
                      <p className="mt-1 text-sm font-semibold">{actionDialog.payload?.summary?.language || "en"}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground">Affected Users</p>
                      <p className="mt-1 text-sm font-semibold">{actionDialog.payload?.overview?.affectedUsers ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground">Language Overrides</p>
                      <p className="mt-1 text-sm font-semibold">{actionDialog.payload?.overview?.languageOverrides ?? 0}</p>
                    </div>
                  </div>
                  {Array.isArray(actionDialog.payload?.overview?.sampleOverrides) && actionDialog.payload.overview.sampleOverrides.length > 0 ? (
                    <div className="rounded-lg border border-border bg-background px-4 py-3">
                      <p className="text-sm font-semibold">Users Preserving Personal Language</p>
                      <div className="mt-3 space-y-2">
                        {actionDialog.payload.overview.sampleOverrides.map((item: any) => (
                          <div key={item.id} className="rounded-md border border-border px-3 py-2 text-sm">
                            <p className="font-medium">{item.fullName || item.email || item.id}</p>
                            <p className="text-xs text-muted-foreground">{item.email || "No email recorded"}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {actionDialog.variant === "preference-export" && actionDialog.payload ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground">Tenant</p>
                      <p className="mt-1 text-sm font-semibold">{actionDialog.payload?.tenant?.name || slug}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground">Exported</p>
                      <p className="mt-1 text-sm font-semibold">{actionDialog.payload?.exportedAt ? format(new Date(actionDialog.payload.exportedAt), "PPp") : "Just now"}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-background px-4 py-3">
                    <p className="text-sm font-semibold">Preference Snapshot</p>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="rounded-md border border-border px-3 py-2 text-sm">Timezone: {actionDialog.payload?.preferences?.timezone}</div>
                      <div className="rounded-md border border-border px-3 py-2 text-sm">Language: {actionDialog.payload?.preferences?.language}</div>
                      <div className="rounded-md border border-border px-3 py-2 text-sm">Currency: {actionDialog.payload?.preferences?.currency}</div>
                      <div className="rounded-md border border-border px-3 py-2 text-sm">Date format: {actionDialog.payload?.preferences?.dateFormat}</div>
                      <div className="rounded-md border border-border px-3 py-2 text-sm">Language overrides: {actionDialog.payload?.overview?.languageOverrides ?? 0}</div>
                      <div className="rounded-md border border-border px-3 py-2 text-sm">Users in tenant: {actionDialog.payload?.overview?.totalUsers ?? 0}</div>
                    </div>
                  </div>
                </div>
              ) : null}

              {actionDialog.variant === "workflow-simulate" && actionDialog.payload ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground">Appointment</p>
                      <p className="mt-1 text-sm font-semibold">{actionDialog.payload?.summary?.appointmentAutomation?.reminderNotifications ? "Active" : "Suppressed"}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground">Lab</p>
                      <p className="mt-1 text-sm font-semibold">{actionDialog.payload?.summary?.labAutomation?.criticalValueAlerts ? "Active" : "Suppressed"}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground">Billing</p>
                      <p className="mt-1 text-sm font-semibold">{actionDialog.payload?.summary?.billingAutomation?.autoGenerateInvoices ? "Active" : "Suppressed"}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground">Emergency</p>
                      <p className="mt-1 text-sm font-semibold">{actionDialog.payload?.summary?.emergencyAutomation?.autoEscalationAlerts ? "Active" : "Suppressed"}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-background px-4 py-3">
                    <p className="text-sm font-semibold">Simulation Result</p>
                    <div className="mt-3 space-y-2">
                      {Object.values(actionDialog.payload?.simulated || {}).map((detail: any, index: number) => (
                        <div key={index} className="rounded-md border border-border px-3 py-2 text-sm">{String(detail)}</div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {actionDialog.variant === "compliance-check" && actionDialog.payload ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground">Compliance Score</p>
                      <p className="mt-1 text-sm font-semibold">{actionDialog.payload?.score ?? 0}%</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground">HIPAA Program</p>
                      <p className="mt-1 text-sm font-semibold">{actionDialog.payload?.settings?.hipaaMode ? "Enabled" : "Disabled"}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground">WHO Guidance Mode</p>
                      <p className="mt-1 text-sm font-semibold">{actionDialog.payload?.settings?.whoGuidelineMode ? "Enabled" : "Disabled"}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-background px-4 py-3">
                    <p className="text-sm font-semibold">Control Findings</p>
                    <div className="mt-3 space-y-2">
                      {(actionDialog.payload?.findings || []).map((item: any) => (
                        <div key={item.id} className="rounded-md border border-border px-3 py-2 text-sm">
                          <p className="font-medium">{item.framework}: {item.control}</p>
                          <p className="text-xs text-muted-foreground">{item.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {actionDialog.variant === "compliance-export" && actionDialog.payload ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground">Tenant</p>
                      <p className="mt-1 text-sm font-semibold">{actionDialog.payload?.tenant?.name || slug}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground">Exported</p>
                      <p className="mt-1 text-sm font-semibold">{actionDialog.payload?.exportedAt ? format(new Date(actionDialog.payload.exportedAt), "PPp") : "Just now"}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-background px-4 py-3">
                    <p className="text-sm font-semibold">Snapshot</p>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="rounded-md border border-border px-3 py-2 text-sm">Score: {actionDialog.payload?.score ?? 0}%</div>
                      <div className="rounded-md border border-border px-3 py-2 text-sm">Events: {Array.isArray(actionDialog.payload?.recentEvents) ? actionDialog.payload.recentEvents.length : 0}</div>
                      <div className="rounded-md border border-border px-3 py-2 text-sm">HIPAA mode: {actionDialog.payload?.settings?.hipaaMode ? "Enabled" : "Disabled"}</div>
                      <div className="rounded-md border border-border px-3 py-2 text-sm">WHO mode: {actionDialog.payload?.settings?.whoGuidelineMode ? "Enabled" : "Disabled"}</div>
                    </div>
                  </div>
                </div>
              ) : null}

              {actionDialog.variant === "default" || !actionDialog.variant ? (
                <>
                  {(actionDialog.details || []).map((detail, index) => (
                    <div key={`${detail}-${index}`} className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-foreground">
                      {detail}
                    </div>
                  ))}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ title, desc, children, onReset }: { title: string; desc?: string; children: React.ReactNode; onReset?: () => void; }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {desc && <p className="text-sm text-muted-foreground mt-1">{desc}</p>}
        </div>
        {onReset && (
          <button onClick={onReset} className="text-sm font-semibold text-orange-600 hover:underline">
            Reset to Default
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, icon: Icon, mono }: { label: string; value: any; icon?: React.ElementType; mono?: boolean; }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        {Icon && <div className="size-8 rounded-lg flex items-center justify-center bg-muted"><Icon className="size-4" /></div>}
        <div className="text-sm">
          <p className="font-medium">{label}</p>
          <p className="text-muted-foreground text-xs">{value}</p>
        </div>
      </div>
      {mono ? (
        <p className="text-sm font-mono text-right">{value}</p>
      ) : (
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(String(value ?? ""));
              toast.success(`${label} copied`);
            } catch {
              toast.error(`Failed to copy ${label.toLowerCase()}`);
            }
          }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          <Edit className="size-4" />
        </button>
      )}
    </div>
  );
}

function AuditRow({ event }: { event: any }) {
  const date = new Date(event.createdAt);
  const isValidDate = !isNaN(date.getTime());
  return (
    <li className="py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-lg flex items-center justify-center bg-muted">
          <History className="size-4" />
        </div>
        <div className="text-sm">
          <p className="font-medium">{event.action}</p>
          <p className="text-muted-foreground text-xs">
            {isValidDate
              ? `${format(date, "PPP p")} · ${formatDistanceToNow(date, { addSuffix: true })}`
              : "Invalid Date"}
          </p>
        </div>
      </div>
      <div className="text-sm">
        {event.success ? (
          <span className="text-emerald-600 font-semibold">Succeeded</span>
        ) : (
          <span className="text-red-600 font-semibold">Failed</span>
        )}
      </div>
    </li>
  );
}

function cap(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function moduleHint(key: string) {
  const hints: { [key: string]: string } = {
    appointments: "Booking, rescheduling, and check-in workflows across the tenant",
    pharmacy: "Pharmacist workspaces, dispensing, and prescription fulfillment",
    lab: "Lab dashboards, orders, and result processing",
    billing: "Accountant billing, invoices, and payment collection",
    guardians: "Parent and guardian portals for linked child accounts",
    patientPortal: "Patient dashboard, records, appointments, and billing access",
    messaging: "Internal messaging and communication threads",
    reports: "Operational and printable reporting workspaces",
    analytics: "Analytical dashboards and KPI reporting",
    queue: "Reception, doctor, and nurse queue management surfaces",
    vitals: "Nurse vitals capture and monitoring flows",
    carePlans: "Nursing care plans and task tracking",
    feedback: "Tenant feedback submission and review entry points",
    inventory: "Inventory management for lab and pharmacy stock",
    qualityControl: "Laboratory quality control workflows",
    insurance: "Insurance claims and coverage-specific billing features",
    inpatient: "Beds, ward management, and inpatient operations",
    emergency: "Emergency response and front desk emergency tools",
    telemedicine: "Remote visit and video consultation capabilities",
  };
  return hints[key as keyof typeof hints] || "No description available";
}

function IntegrationCard({ name, desc, icon: Icon, color, provider, configFields, testAction }: {
  name: string;
  desc: string;
  icon: React.ElementType;
  color: string;
  provider: string;
  configFields: { key: string; label: string; type: string; placeholder?: string; options?: string[]; }[];
  testAction: string;
}) {
  const ctx = useContext(CommunicationsContext);
  if (!ctx) {
    throw new Error("IntegrationCard must be used inside CommunicationsContext");
  }

  const { slug, settings, integrations, refreshIntegrations, setCommunicationPreference } = ctx;
  const existing = integrations.find((item) => item.provider === provider) || null;
  const preferredBySettings = EMAIL_PROVIDER_IDS.has(provider)
    ? settings.communications.emailProvider === provider
    : SMS_PROVIDER_IDS.has(provider)
      ? settings.communications.smsProvider === provider
      : false;

  const [enabled, setEnabled] = useState(Boolean(existing?.isActive));
  const [config, setConfig] = useState<{ [key: string]: any }>({});
  const [isPreferred, setIsPreferred] = useState(preferredBySettings);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setEnabled(Boolean(existing?.isActive));
    setIsPreferred(preferredBySettings);
    const nextConfig: Record<string, any> = {};
    for (const field of configFields) {
      const currentValue = existing?.config?.[field.key];
      if (field.type !== "password" && typeof currentValue === "string") {
        nextConfig[field.key] = currentValue;
      } else if (field.type !== "password" && typeof currentValue === "number") {
        nextConfig[field.key] = String(currentValue);
      } else {
        nextConfig[field.key] = "";
      }
    }
    setConfig(nextConfig);
  }, [configFields, existing, preferredBySettings]);

  const updateConfig = (key: string, value: any) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const maskedPlaceholderFor = (fieldKey: string, fallback?: string) => {
    const value = existing?.config?.[fieldKey];
    if (typeof value === "string" && value.trim()) return value;
    if (/api.?key/i.test(fieldKey) && existing?.apiKeyMasked) return existing.apiKeyMasked;
    if (/(secret|token|password|auth)/i.test(fieldKey) && existing?.apiSecretMasked) return existing.apiSecretMasked;
    return fallback || "";
  };

  const buildPayload = () => {
    const fields: Record<string, string> = {};
    for (const field of configFields) {
      const rawValue = config[field.key];
      if (rawValue === undefined || rawValue === null || rawValue === "") continue;
      fields[field.key] = String(rawValue).trim();
    }
    return fields;
  };

  const applyPreferredProvider = async () => {
    if (EMAIL_PROVIDER_IDS.has(provider)) {
      await setCommunicationPreference({ emailProvider: provider });
    } else if (SMS_PROVIDER_IDS.has(provider)) {
      await setCommunicationPreference({ smsProvider: provider });
    }
  };

  const saveIntegrationConfig = async () => {
    setSavingConfig(true);
    try {
      const response = await fetch(`/api/tenant/${slug}/integrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          provider,
          fields: buildPayload(),
          isActive: enabled,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to save configuration");
      if (enabled && isPreferred) {
        await applyPreferredProvider();
      }
      await refreshIntegrations();
      toast.success(`${name} configuration saved`);
    } catch (error: any) {
      toast.error(error?.message || `Failed to save ${name} configuration`);
    } finally {
      setSavingConfig(false);
    }
  };

  const testIntegration = async () => {
    setTesting(true);
    try {
      let integrationId = existing?.id;
      if (!integrationId) {
        const saveResponse = await fetch(`/api/tenant/${slug}/integrations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            provider,
            fields: buildPayload(),
            isActive: enabled,
          }),
        });
        const saveData = await saveResponse.json();
        if (!saveResponse.ok) throw new Error(saveData?.error || "Save configuration before testing");
        integrationId = saveData?.integration?.id;
      }
      const response = await fetch(`/api/tenant/${slug}/integrations/${integrationId}/test`, {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || data?.message || "Integration test failed");
      await refreshIntegrations();
      toast.success(data?.message || `${name} test passed`);
    } catch (error: any) {
      toast.error(error?.message || `${name} test failed`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className={`p-4 rounded-lg border border-border transition-all ${enabled ? "bg-muted/30" : "bg-background"} hover:bg-muted`}>
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-8 rounded-full flex items-center justify-center text-white relative shrink-0 bg-orange-500">
            <Icon className="size-4" />
            {isPreferred && (
              <div className="absolute -top-1 -right-1 size-3 rounded-full bg-emerald-500 border border-white flex items-center justify-center">
                <Check className="size-1.5 text-white" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{name}</p>
            <p className="text-xs text-muted-foreground">{desc}</p>
            {existing?.status && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Status: <span className="font-medium">{existing.status}</span>
                {existing.lastTestedAt ? ` • Last tested ${new Date(existing.lastTestedAt).toLocaleString()}` : ""}
              </p>
            )}
          </div>
        </div>
        <Toggle
          label="Enable integration"
          value={enabled}
          onChange={setEnabled}
          className="transition-all"
        />
      </div>
      {enabled && (
        <div className="space-y-4">
          {configFields.map(field => {
            if (field.type === "select") {
              return (
                <div key={field.key}>
                  <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
                  <select
                    value={config[field.key] || ""}
                    onChange={e => updateConfig(field.key, e.target.value)}
                    className="mt-1 w-full h-9 px-2 rounded border border-border bg-background text-xs"
                  >
                    <option value="">Select {field.label}</option>
                    {field.options?.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              );
            }

            if (field.type === "textarea") {
              return (
                <div key={field.key}>
                  <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
                  <textarea
                    value={config[field.key] || ""}
                    onChange={e => updateConfig(field.key, e.target.value)}
                    placeholder={maskedPlaceholderFor(field.key, field.placeholder)}
                    rows={3}
                    className="mt-1 w-full px-2 py-1 rounded border border-border bg-background text-xs font-mono"
                  />
                </div>
              );
            }

            return (
              <div key={field.key}>
                <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
                <input
                  type={field.type}
                  value={config[field.key] || ""}
                  onChange={e => updateConfig(field.key, e.target.value)}
                  placeholder={field.type === "password" ? maskedPlaceholderFor(field.key, field.placeholder) : (field.placeholder || "")}
                  className="mt-1 w-full h-9 px-2 rounded border border-border bg-background text-xs"
                />
              </div>
            );
          })}

          <div className="pt-2 border-t border-border">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={isPreferred}
                onChange={(e) => setIsPreferred(e.target.checked)}
                className="accent-emerald-500"
                id={`preferred-${provider}`}
                disabled={!EMAIL_PROVIDER_IDS.has(provider) && !SMS_PROVIDER_IDS.has(provider)}
              />
              <label htmlFor={`preferred-${provider}`} className="text-xs font-medium text-muted-foreground cursor-pointer">
                {EMAIL_PROVIDER_IDS.has(provider) || SMS_PROVIDER_IDS.has(provider)
                  ? "Set as preferred provider"
                  : "Preferred routing is only available for providers already wired into live tenant delivery"}
              </label>
            </div>
            {existing?.testError && (
              <p className="text-xs text-red-600">Last test error: {existing.testError}</p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={testIntegration}
              disabled={testing || savingConfig}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold disabled:opacity-60"
            >
              {testing ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />} {testAction}
            </button>
            <button
              type="button"
              onClick={saveIntegrationConfig}
              disabled={savingConfig || testing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm disabled:opacity-60"
            >
              {savingConfig ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save Configuration
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
function Toggle({ label, desc, value, onChange, className }: { label: string; desc?: string; value: boolean; onChange: (value: boolean) => void; className?: string; }) {
  return (
    <div className={`flex items-start justify-between gap-4 p-4 rounded-lg border border-border ${className}`}>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-1">{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          value ? "bg-orange-500" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            value ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: { v: string; l: string; }[]; onChange: (value: string) => void; }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="mt-1.5 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm">
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}


