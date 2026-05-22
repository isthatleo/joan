"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, type AppRole } from "@/stores/auth";
import {
  Bell, Shield, Palette, Lock, Globe, Server, Key, FileCheck,
  Building2, Mail, Phone, MapPin, AlertCircle, CheckCircle2,
  Save, Eye, EyeOff, Search, Upload, Download, Trash2, ChevronRight, Plus,
  Settings, Zap, Sparkles, ShieldCheck, FileText, Database, Activity,
  MessageSquare, CreditCard, Languages, Clock, Sun, Moon, Monitor,
  Smartphone, Link2, Eye as EyeIcon, Copy, X, Check, AlertTriangle,
  ExternalLink, Edit3, RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";

/* ============ Types ============ */
type SectionId =
  | "profile" | "appearance" | "notifications" | "security" | "privacy"
  | "language" | "communication" | "devices"
  | "hospital" | "branding" | "contact" | "modules"
  | "billing" | "compliance" | "integrations" | "audit" | "communication-channels"
  | "preferences" | "workflow" | "danger-zone" | "api-management";

interface SectionDef {
  id: SectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  group: "Account" | "Hospital" | "System";
  roles?: AppRole[];
}

interface TenantSettings {
  hospital: {
    name: string;
    displayName: string;
    shortName: string;
    slug: string;
    registrationNumber: string;
    licenseNumber: string;
    description: string;
  };
  branding: {
    primaryColor: string;
    logoUrl: string;
    faviconUrl: string;
    accentColor: string;
    lightLogoUrl: string;
  };
  contact: {
    email: string;
    phone: string;
    website: string;
    address: string;
    city: string;
    country: string;
    postalCode: string;
  };
  communication: {
    emailProvider: string;
    smsProvider: string;
    notificationPreferences: {
      emailEnabled: boolean;
      smsEnabled: boolean;
      pushEnabled: boolean;
      inAppEnabled: boolean;
    };
  };
  modules: Record<string, boolean>;
  preferences: {
    timezone: string;
    language: string;
    currency: string;
    dateFormat: string;
    timeFormat: string;
    weekStartDay: string;
    theme?: string;
    compactMode?: boolean;
    autoSync?: boolean;
    notificationSound?: boolean;
  };
  ui: {
    theme: string;
    compactMode: boolean;
    sidebarCollapsed: boolean;
    primaryTheme: string;
  };
  compliance: {
    hipaaMode: boolean;
    gdprMode: boolean;
    encryptionAtRest: boolean;
    auditLoggingEnabled: boolean;
    dataRetentionDays: number;
  };
  billing: {
    taxRate: number;
    currency: string;
    invoicePrefix: string;
    paymentMethods: string[];
    autoChargeInsurance: boolean;
  };
  security?: {
    passwordExpirationEnabled?: boolean;
    passwordExpirationDays?: number;
    mfaRequired?: boolean;
    ipWhitelistEnabled?: boolean;
    sessionTimeout?: number;
    twoFactorEnabled?: boolean;
    passwordReuseLimit?: number;
  };
  workflow?: {
    automationEnabled?: boolean;
    appointmentReminders?: boolean;
    prescriptionAlerts?: boolean;
    patientNotifications?: boolean;
    staffNotifications?: boolean;
    billingAutomation?: boolean;
    reportGeneration?: boolean;
    dataBackupEnabled?: boolean;
    backupFrequency?: string;
  };
  integrations?: Record<string, any>;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string;
    plan: string;
  };
}

const SECTIONS: SectionDef[] = [
  // Hospital
  { id: "hospital", label: "Hospital Profile", icon: Building2, description: "Name, registration, and identity", group: "Hospital" },
  { id: "branding", label: "Branding", icon: Palette, description: "Colors, logos, and visual identity", group: "Hospital" },
  { id: "contact", label: "Contact Info", icon: Phone, description: "Address, email, phone, website", group: "Hospital" },
  { id: "modules", label: "Active Modules", icon: Zap, description: "Enable/disable hospital features", group: "Hospital" },
  { id: "preferences", label: "Preferences", icon: Settings, description: "Language, timezone, currency, format", group: "Hospital" },
  { id: "communication-channels", label: "Communication Channels", icon: MessageSquare, description: "SMS, Email, Notifications", group: "Hospital" },
  { id: "billing", label: "Billing & Invoicing", icon: CreditCard, description: "Payment, tax, and invoice settings", group: "Hospital" },
  
  // System
  { id: "security", label: "Security", icon: Lock, description: "Password expiration, MFA, sessions", group: "System" },
  { id: "integrations", label: "Integrations", icon: Link2, description: "API keys, Twilio, Resend, Webhooks", group: "System" },
  { id: "api-management", label: "API Management", icon: Key, description: "API keys, webhooks, integrations", group: "System" },
  { id: "workflow", label: "Workflows & Automation", icon: Zap, description: "Automation, backups, reports", group: "System" },
  { id: "compliance", label: "Compliance & Security", icon: Shield, description: "HIPAA, GDPR, encryption", group: "System" },
  { id: "system", label: "System Monitor", icon: Server, description: "System health, metrics, and alerts", group: "System" },
  { id: "audit", label: "Audit Logs", icon: Activity, description: "System activity and changes", group: "System" },
  { id: "appearance", label: "UI Customization", icon: Palette, description: "Theme and interface preferences", group: "System" },
  { id: "danger-zone", label: "Danger Zone", icon: AlertTriangle, description: "Advanced destructive operations", group: "System" },
];

/* ============ Main Page ============ */
export default function HospitalSettingsPage() {
  const { user } = useAuthStore();
  const role = (user?.role || "patient") as AppRole;
  const { theme, setTheme } = useTheme();

  const [tenantId, setTenantId] = useState<string>("");
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<SectionId>("hospital");

  // Only hospital_admin and super_admin can access
  useEffect(() => {
    if (role !== "hospital_admin" && role !== "super_admin") {
      window.location.href = "/";
      return;
    }

    // Get tenant ID from user context
    if (user?.hospitalId) {
      setTenantId(user.hospitalId);
    }
  }, [role, user]);

  // Fetch settings
  useEffect(() => {
    if (!tenantId) return;

    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/hospital/settings?tenantId=${tenantId}`
        );
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        } else {
          toast.error("Failed to load hospital settings");
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
        toast.error("Error loading settings");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [tenantId]);

  const handleSave = useCallback(async () => {
    if (!tenantId || !settings) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/hospital/settings?tenantId=${tenantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        toast.success("Settings saved successfully");
        setDirty(false);

        // Sync changes across the application
        if (typeof window !== 'undefined') {
          const { batchUpdateHospitalSettings } = await import('@/lib/hospital-settings-sync');
          batchUpdateHospitalSettings(tenantId, {
            name: settings.hospital.name,
            logoUrl: settings.branding.logoUrl,
            primaryColor: settings.branding.primaryColor,
            accentColor: settings.branding.accentColor,
            modules: settings.modules,
          });
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Error saving settings");
    } finally {
      setSaving(false);
    }
  }, [tenantId, settings]);

  const visible = useMemo(() => SECTIONS, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return visible;
    const q = search.toLowerCase();
    return visible.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
    );
  }, [visible, search]);

  const grouped = useMemo(() => {
    const g: Record<string, SectionDef[]> = {};
    filtered.forEach((s) => {
      (g[s.group] ||= []).push(s);
    });
    return g;
  }, [filtered]);

  const activeDef = visible.find((s) => s.id === active) || visible[0];

  if (loading || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-3 w-3 animate-pulse rounded-full bg-orange-500" />
          <p className="text-sm text-muted-foreground">Loading hospital settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero */}
      <div className="relative border-b border-border bg-card overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative px-6 py-7 lg:px-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
              <Building2 className="size-3.5 text-orange-500" />
              <span>Hospital Administration</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Hospital Settings & Configuration
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Manage your hospital profile, branding, integrations, compliance, and system preferences. Changes sync across all dashboards.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {dirty && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-500/20">
                <AlertCircle className="size-3.5" /> Unsaved changes
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors"
            >
              <Save className="size-4" />
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 lg:px-10 py-6 grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <aside className="col-span-12 lg:col-span-3 xl:col-span-3">
          <div className="lg:sticky lg:top-4 space-y-4">
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search settings��"
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              />
            </div>

            {Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground px-2 mb-2">
                  {group}
                </p>
                <nav className="space-y-1">
                  {items.map((s) => {
                    const Icon = s.icon;
                    const isActive = active === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setActive(s.id)}
                        className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                          isActive
                            ? "bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200/60 dark:border-orange-500/20 shadow-sm"
                            : "text-foreground hover:bg-muted/60 border border-transparent"
                        }`}
                      >
                        <span
                          className={`size-8 grid place-items-center rounded-lg ${
                            isActive
                              ? "bg-orange-500 text-white"
                              : "bg-muted text-muted-foreground group-hover:bg-background"
                          }`}
                        >
                          <Icon className="size-4" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold truncate">
                            {s.label}
                          </span>
                          <span className="block text-[11px] text-muted-foreground truncate">
                            {s.description}
                          </span>
                        </span>
                        <ChevronRight
                          className={`size-4 shrink-0 ${
                            isActive
                              ? "text-orange-500"
                              : "text-transparent group-hover:text-muted-foreground"
                          }`}
                        />
                      </button>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
        </aside>

        {/* Content */}
        <main className="col-span-12 lg:col-span-9 xl:col-span-9">
          <SectionShell def={activeDef}>
            <SectionContent
              id={activeDef.id}
              settings={settings}
              onSettingsChange={(updates) => {
                setSettings((prev) =>
                  prev ? { ...prev, ...updates } : prev
                );
                setDirty(true);
              }}
              theme={theme}
              setTheme={setTheme}
            />
          </SectionShell>
        </main>
      </div>
    </div>
  );
}

/* ============ Section Shell ============ */
function SectionShell({
  def,
  children,
}: {
  def: SectionDef;
  children: React.ReactNode;
}) {
  const Icon = def.icon;
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-border bg-gradient-to-r from-card to-muted/30 flex items-center gap-4">
        <div className="size-12 grid place-items-center rounded-xl bg-orange-500 text-white shadow-sm">
          <Icon className="size-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground">{def.label}</h2>
          <p className="text-sm text-muted-foreground">{def.description}</p>
        </div>
        <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border">
          {def.group}
        </span>
      </div>
      <div className="p-6 space-y-6">{children}</div>
    </div>
  );
}

/* ============ Section Router ============ */
function SectionContent({
  id,
  settings,
  onSettingsChange,
  theme,
  setTheme,
}: {
  id: SectionId;
  settings: TenantSettings;
  onSettingsChange: (updates: Partial<TenantSettings>) => void;
  theme?: string;
  setTheme: (t: string) => void;
}) {
  switch (id) {
    case "hospital":
      return <HospitalProfileSection settings={settings} onSettingsChange={onSettingsChange} />;
    case "branding":
      return <BrandingSection settings={settings} onSettingsChange={onSettingsChange} />;
    case "contact":
      return <ContactInfoSection settings={settings} onSettingsChange={onSettingsChange} />;
    case "modules":
      return <ModulesSection settings={settings} onSettingsChange={onSettingsChange} />;
    case "preferences":
      return <PreferencesSection settings={settings} onSettingsChange={onSettingsChange} />;
    case "communication-channels":
      return <CommunicationChannelsSection settings={settings} onSettingsChange={onSettingsChange} />;
    case "billing":
      return <BillingSection settings={settings} onSettingsChange={onSettingsChange} />;
    case "security":
      return <SecuritySection settings={settings} onSettingsChange={onSettingsChange} />;
    case "integrations":
      return <IntegrationsSection tenantId={settings.tenant?.id} />;
    case "api-management":
      return <APIManagementSection tenantId={settings.tenant?.id} />;
    case "workflow":
      return <WorkflowSection settings={settings} onSettingsChange={onSettingsChange} />;
    case "compliance":
      return <ComplianceSection settings={settings} onSettingsChange={onSettingsChange} />;
    case "audit":
      return <AuditSection />;
    case "appearance":
      return <AppearanceSection theme={theme} setTheme={setTheme} />;
    case "danger-zone":
      return <DangerZoneSection tenantId={settings.tenant?.id} />;
    case "system":
      return <SystemMonitorSection />;
    default:
      return null;
  }
}

/* ============ UI Components ============ */
function Card({
  title,
  description,
  action,
  children,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden">
      {(title || description || action) && (
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
          <div>
            {title && (
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {description}
              </p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-foreground mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 ${
        props.className || ""
      }`}
    />
  );
}

function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return (
    <textarea
      {...props}
      className={`w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 resize-none ${
        props.className || ""
      }`}
    />
  );
}

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 ${
        props.className || ""
      }`}
    />
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? "bg-orange-500" : "bg-muted"
      }`}
      aria-pressed={checked}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function Row({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon?: any;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <span className="size-9 grid place-items-center rounded-lg bg-muted text-foreground shrink-0">
            <Icon className="size-4" />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {title}
          </p>
          {hint && (
            <p className="text-xs text-muted-foreground truncate">{hint}</p>
          )}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/* ============ Hospital Sections ============ */
function HospitalProfileSection({
  settings,
  onSettingsChange,
}: {
  settings: TenantSettings;
  onSettingsChange: (updates: Partial<TenantSettings>) => void;
}) {
  return (
    <>
      <Card title="Hospital Identity" description="Basic hospital information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Hospital Name">
            <TextInput
              value={settings.hospital.name}
              onChange={(e) =>
                onSettingsChange({
                  hospital: { ...settings.hospital, name: e.target.value },
                })
              }
              placeholder="Full hospital name"
            />
          </Field>
          <Field label="Display Name">
            <TextInput
              value={settings.hospital.displayName}
              onChange={(e) =>
                onSettingsChange({
                  hospital: {
                    ...settings.hospital,
                    displayName: e.target.value,
                  },
                })
              }
              placeholder="How it appears to users"
            />
          </Field>
          <Field label="Short Name">
            <TextInput
              value={settings.hospital.shortName}
              onChange={(e) =>
                onSettingsChange({
                  hospital: { ...settings.hospital, shortName: e.target.value },
                })
              }
              placeholder="Abbreviation (e.g., JJH)"
              maxLength="5"
            />
          </Field>
          <Field label="Slug" hint="URL-friendly identifier">
            <TextInput
              value={settings.hospital.slug}
              onChange={(e) =>
                onSettingsChange({
                  hospital: { ...settings.hospital, slug: e.target.value },
                })
              }
              placeholder="hospital-slug"
            />
          </Field>
        </div>
      </Card>

      <Card title="Registration Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Registration Number" hint="Official registration/license number">
            <TextInput
              value={settings.hospital.registrationNumber}
              onChange={(e) =>
                onSettingsChange({
                  hospital: {
                    ...settings.hospital,
                    registrationNumber: e.target.value,
                  },
                })
              }
              placeholder="e.g., HOSP/2024/001"
            />
          </Field>
          <Field label="License Number">
            <TextInput
              value={settings.hospital.licenseNumber}
              onChange={(e) =>
                onSettingsChange({
                  hospital: {
                    ...settings.hospital,
                    licenseNumber: e.target.value,
                  },
                })
              }
              placeholder="Hospital operating license"
            />
          </Field>
        </div>
      </Card>

      <Card title="Description">
        <Field label="Hospital Description" hint="Brief overview of your hospital (for public profile)">
          <TextArea
            value={settings.hospital.description}
            onChange={(e) =>
              onSettingsChange({
                hospital: {
                  ...settings.hospital,
                  description: e.target.value,
                },
              })
            }
            placeholder="Tell us about your hospital..."
            rows={3}
          />
        </Field>
      </Card>
    </>
  );
}

function BrandingSection({
  settings,
  onSettingsChange,
}: {
  settings: TenantSettings;
  onSettingsChange: (updates: Partial<TenantSettings>) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File, type: "logo" | "favicon") => {
    if (!settings.tenant?.id) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tenantId", settings.tenant.id);
      formData.append("type", type);

      const res = await fetch("/api/upload/hospital-logo", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`${type === "logo" ? "Logo" : "Favicon"} uploaded successfully`);

        // Update settings with new URL
        if (type === "logo") {
          onSettingsChange({
            branding: { ...settings.branding, logoUrl: data.url },
          });
        } else {
          onSettingsChange({
            branding: { ...settings.branding, faviconUrl: data.url },
          });
        }
      } else {
        const error = await res.json();
        toast.error(error.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0], "logo");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file, "logo");
    }
  };

  return (
    <>
      <Card title="Hospital Logo" description="Upload SVG, PNG, or JPG">
        <div className="flex flex-col gap-4">
          {settings.branding.logoUrl && (
            <div className="relative w-full max-w-[200px] h-[100px] rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden">
              <img
                src={settings.branding.logoUrl}
                alt="Hospital logo"
                className="max-w-full max-h-full object-contain"
              />
              <button
                onClick={() =>
                  onSettingsChange({
                    branding: { ...settings.branding, logoUrl: "" },
                  })
                }
                className="absolute top-2 right-2 p-1 rounded bg-black/50 hover:bg-black/70 text-white"
              >
                <X className="size-3" />
              </button>
            </div>
          )}
          <div
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition ${
              dragOver
                ? "border-orange-500 bg-orange-50/20"
                : "border-border hover:border-orange-500/50 hover:bg-orange-50/20"
            } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="size-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              {uploading ? "Uploading..." : "Click to upload logo or drag and drop"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PNG, JPG, SVG up to 5MB
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Field label="Logo URL" hint="Paste direct URL to logo image">
            <TextInput
              value={settings.branding.logoUrl}
              onChange={(e) =>
                onSettingsChange({
                  branding: { ...settings.branding, logoUrl: e.target.value },
                })
              }
              placeholder="https://..."
            />
          </Field>
        </div>
      </Card>

      <Card title="Color Scheme" description="Define your hospital's brand colors">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Primary Color">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings.branding.primaryColor}
                onChange={(e) =>
                  onSettingsChange({
                    branding: {
                      ...settings.branding,
                      primaryColor: e.target.value,
                    },
                  })
                }
                className="size-10 rounded-lg border border-border bg-background cursor-pointer"
              />
              <TextInput
                value={settings.branding.primaryColor}
                onChange={(e) =>
                  onSettingsChange({
                    branding: {
                      ...settings.branding,
                      primaryColor: e.target.value,
                    },
                  })
                }
              />
            </div>
          </Field>
          <Field label="Accent Color">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings.branding.accentColor}
                onChange={(e) =>
                  onSettingsChange({
                    branding: {
                      ...settings.branding,
                      accentColor: e.target.value,
                    },
                  })
                }
                className="size-10 rounded-lg border border-border bg-background cursor-pointer"
              />
              <TextInput
                value={settings.branding.accentColor}
                onChange={(e) =>
                  onSettingsChange({
                    branding: {
                      ...settings.branding,
                      accentColor: e.target.value,
                    },
                  })
                }
              />
            </div>
          </Field>
        </div>
      </Card>

      <Card title="Additional Resources">
        <Field label="Light Mode Logo URL" hint="Optional: Different logo for light theme">
          <TextInput
            value={settings.branding.lightLogoUrl}
            onChange={(e) =>
              onSettingsChange({
                branding: { ...settings.branding, lightLogoUrl: e.target.value },
              })
            }
            placeholder="https://..."
          />
        </Field>
        <Field label="Favicon URL" hint="16x16 or 32x32 ICO/PNG">
          <TextInput
            value={settings.branding.faviconUrl}
            onChange={(e) =>
              onSettingsChange({
                branding: { ...settings.branding, faviconUrl: e.target.value },
              })
            }
            placeholder="https://..."
          />
        </Field>
      </Card>
    </>
  );
}

function ContactInfoSection({
  settings,
  onSettingsChange,
}: {
  settings: TenantSettings;
  onSettingsChange: (updates: Partial<TenantSettings>) => void;
}) {
  return (
    <Card title="Contact Information" description="How patients and staff can reach you">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Email">
          <TextInput
            type="email"
            value={settings.contact.email}
            onChange={(e) =>
              onSettingsChange({
                contact: { ...settings.contact, email: e.target.value },
              })
            }
            placeholder="contact@hospital.com"
          />
        </Field>
        <Field label="Phone">
          <TextInput
            value={settings.contact.phone}
            onChange={(e) =>
              onSettingsChange({
                contact: { ...settings.contact, phone: e.target.value },
              })
            }
            placeholder="+254 XXX XXX XXX"
          />
        </Field>
        <Field label="Website">
          <TextInput
            value={settings.contact.website}
            onChange={(e) =>
              onSettingsChange({
                contact: { ...settings.contact, website: e.target.value },
              })
            }
            placeholder="https://www.hospital.com"
          />
        </Field>
      </div>

      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-semibold mb-3 text-foreground">
          Physical Address
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Street Address">
            <TextInput
              value={settings.contact.address}
              onChange={(e) =>
                onSettingsChange({
                  contact: { ...settings.contact, address: e.target.value },
                })
              }
              placeholder="123 Hospital Road"
            />
          </Field>
          <Field label="City">
            <TextInput
              value={settings.contact.city}
              onChange={(e) =>
                onSettingsChange({
                  contact: { ...settings.contact, city: e.target.value },
                })
              }
              placeholder="Nairobi"
            />
          </Field>
          <Field label="Country">
            <TextInput
              value={settings.contact.country}
              onChange={(e) =>
                onSettingsChange({
                  contact: { ...settings.contact, country: e.target.value },
                })
              }
              placeholder="Kenya"
            />
          </Field>
          <Field label="Postal Code">
            <TextInput
              value={settings.contact.postalCode}
              onChange={(e) =>
                onSettingsChange({
                  contact: {
                    ...settings.contact,
                    postalCode: e.target.value,
                  },
                })
              }
              placeholder="00100"
            />
          </Field>
        </div>
      </div>
    </Card>
  );
}

function ModulesSection({
  settings,
  onSettingsChange,
}: {
  settings: TenantSettings;
  onSettingsChange: (updates: Partial<TenantSettings>) => void;
}) {
  const { user } = useAuthStore();
  const modules = [
    { key: "appointments", label: "Appointments", icon: "📅" },
    { key: "pharmacy", label: "Pharmacy", icon: "💊" },
    { key: "lab", label: "Lab Services", icon: "🔬" },
    { key: "billing", label: "Billing & Invoicing", icon: "💰" },
    { key: "inpatient", label: "Inpatient Management", icon: "🛏️" },
    { key: "emergency", label: "Emergency Department", icon: "🚑" },
    { key: "telemedicine", label: "Telemedicine", icon: "📹" },
    { key: "insurance", label: "Insurance Claims", icon: "📋" },
  ];

  return (
    <Card
      title="Active Modules"
      description="Enable or disable hospital features"
      action={<RestoreDefaultsButton section="modules" tenantId={user?.hospitalId} />}
    >
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {modules.map((mod) => (
          <label
            key={mod.key}
            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={settings.modules[mod.key] || false}
              onChange={(e) =>
                onSettingsChange({
                  modules: {
                    ...settings.modules,
                    [mod.key]: e.target.checked,
                  },
                })
              }
              className="accent-orange-500 cursor-pointer"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium">{mod.label}</p>
            </div>
          </label>
        ))}
      </div>
    </Card>
  );
}

function CommunicationChannelsSection({
  settings,
  onSettingsChange,
}: {
  settings: TenantSettings;
  onSettingsChange: (updates: Partial<TenantSettings>) => void;
}) {
  const { user } = useAuthStore();

  return (
    <>
      <Card
        title="Communication Providers"
        description="Configure email and SMS providers"
        action={<RestoreDefaultsButton section="communication" tenantId={user?.hospitalId} />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Email Provider">
            <SelectInput
              value={settings.communication.emailProvider}
              onChange={(e) =>
                onSettingsChange({
                  communication: {
                    ...settings.communication,
                    emailProvider: e.target.value,
                  },
                })
              }
            >
              <option value="resend">Resend</option>
              <option value="sendgrid">SendGrid</option>
              <option value="mailgun">Mailgun</option>
            </SelectInput>
          </Field>
          <Field label="SMS Provider">
            <SelectInput
              value={settings.communication.smsProvider}
              onChange={(e) =>
                onSettingsChange({
                  communication: {
                    ...settings.communication,
                    smsProvider: e.target.value,
                  },
                })
              }
            >
              <option value="twilio">Twilio</option>
              <option value="aws_sns">AWS SNS</option>
            </SelectInput>
          </Field>
        </div>
      </Card>

      <Card
        title="Notification Preferences"
        description="Enable notification channels"
      >
        <Row
          icon={Mail}
          title="Email Notifications"
          hint="Send important updates via email"
        >
          <Toggle
            checked={settings.communication.notificationPreferences.emailEnabled}
            onChange={(v) =>
              onSettingsChange({
                communication: {
                  ...settings.communication,
                  notificationPreferences: {
                    ...settings.communication.notificationPreferences,
                    emailEnabled: v,
                  },
                },
              })
            }
          />
        </Row>
        <Row
          icon={Smartphone}
          title="SMS Notifications"
          hint="Send critical alerts via SMS"
        >
          <Toggle
            checked={settings.communication.notificationPreferences.smsEnabled}
            onChange={(v) =>
              onSettingsChange({
                communication: {
                  ...settings.communication,
                  notificationPreferences: {
                    ...settings.communication.notificationPreferences,
                    smsEnabled: v,
                  },
                },
              })
            }
          />
        </Row>
        <Row
          icon={Bell}
          title="Push Notifications"
          hint="Send push notifications to devices"
        >
          <Toggle
            checked={settings.communication.notificationPreferences.pushEnabled}
            onChange={(v) =>
              onSettingsChange({
                communication: {
                  ...settings.communication,
                  notificationPreferences: {
                    ...settings.communication.notificationPreferences,
                    pushEnabled: v,
                  },
                },
              })
            }
          />
        </Row>
        <Row
          icon={Bell}
          title="In-App Notifications"
          hint="Show notifications within the application"
        >
          <Toggle
            checked={
              settings.communication.notificationPreferences.inAppEnabled
            }
            onChange={(v) =>
              onSettingsChange({
                communication: {
                  ...settings.communication,
                  notificationPreferences: {
                    ...settings.communication.notificationPreferences,
                    inAppEnabled: v,
                  },
                },
              })
            }
          />
        </Row>
      </Card>
    </>
  );
}

function BillingSection({
  settings,
  onSettingsChange,
}: {
  settings: TenantSettings;
  onSettingsChange: (updates: Partial<TenantSettings>) => void;
}) {
  return (
    <>
      <Card title="Invoice Settings">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Invoice Prefix">
            <TextInput
              value={settings.billing.invoicePrefix}
              onChange={(e) =>
                onSettingsChange({
                  billing: {
                    ...settings.billing,
                    invoicePrefix: e.target.value,
                  },
                })
              }
              placeholder="INV-"
            />
          </Field>
          <Field label="Currency">
            <SelectInput
              value={settings.billing.currency}
              onChange={(e) =>
                onSettingsChange({
                  billing: { ...settings.billing, currency: e.target.value },
                })
              }
            >
              <option value="KES">KES (Kenyan Shilling)</option>
              <option value="USD">USD (US Dollar)</option>
              <option value="EUR">EUR (Euro)</option>
              <option value="GBP">GBP (British Pound)</option>
            </SelectInput>
          </Field>
          <Field label="Tax Rate (%)">
            <TextInput
              type="number"
              value={settings.billing.taxRate}
              onChange={(e) =>
                onSettingsChange({
                  billing: {
                    ...settings.billing,
                    taxRate: parseFloat(e.target.value) || 0,
                  },
                })
              }
              step="0.1"
              min="0"
              max="100"
            />
          </Field>
        </div>
      </Card>

      <Card title="Payment Methods">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {["cash", "card", "bank_transfer", "mpesa", "insurance"].map((method) => (
            <label
              key={method}
              className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={settings.billing.paymentMethods.includes(method)}
                onChange={(e) =>
                  onSettingsChange({
                    billing: {
                      ...settings.billing,
                      paymentMethods: e.target.checked
                        ? [...settings.billing.paymentMethods, method]
                        : settings.billing.paymentMethods.filter(
                            (m) => m !== method
                          ),
                    },
                  })
                }
                className="accent-orange-500"
              />
              <span className="text-sm font-medium capitalize">
                {method.replace("_", " ")}
              </span>
            </label>
          ))}
        </div>
      </Card>

      <Card title="Automation">
        <Row
          icon={Zap}
          title="Auto-charge Insurance"
          hint="Automatically charge insurance for eligible invoices"
        >
          <Toggle
            checked={settings.billing.autoChargeInsurance}
            onChange={(v) =>
              onSettingsChange({
                billing: { ...settings.billing, autoChargeInsurance: v },
              })
            }
          />
        </Row>
      </Card>
    </>
  );
}

function IntegrationsSection({ tenantId }: { tenantId?: string }) {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!tenantId) return;

    const fetchIntegrations = async () => {
      try {
        const res = await fetch(
          `/api/hospital/integrations?tenantId=${tenantId}`
        );
        if (res.ok) {
          const data = await res.json();
          setIntegrations(data);
        }
      } catch (error) {
        console.error("Error fetching integrations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchIntegrations();
  }, [tenantId]);

  const handleConnect = async () => {
    if (!tenantId || !selectedProvider) return;

    setConnecting(true);
    try {
      const res = await fetch(`/api/hospital/integrations?tenantId=${tenantId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          ...formData,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Integration connected successfully");

        // Refresh integrations list
        const refreshRes = await fetch(`/api/hospital/integrations?tenantId=${tenantId}`);
        if (refreshRes.ok) {
          const refreshedData = await refreshRes.json();
          setIntegrations(refreshedData);
        }

        // Reset modal
        setShowAddModal(false);
        setSelectedProvider("");
        setFormData({});
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to connect integration");
      }
    } catch (error) {
      console.error("Error connecting integration:", error);
      toast.error("Failed to connect integration");
    } finally {
      setConnecting(false);
    }
  };

  const handleTestConnection = async (integrationId: string) => {
    try {
      const res = await fetch(
        `/api/hospital/integrations?tenantId=${tenantId}&integrationId=${integrationId}`,
        { method: "PATCH" }
      );

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message);

        // Refresh integrations list
        const refreshRes = await fetch(`/api/hospital/integrations?tenantId=${tenantId}`);
        if (refreshRes.ok) {
          const refreshedData = await refreshRes.json();
          setIntegrations(refreshedData);
        }
      } else {
        const error = await res.json();
        toast.error(error.error || "Test failed");
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      toast.error("Test failed");
    }
  };

  const handleDeleteIntegration = async (integrationId: string) => {
    if (!confirm("Are you sure you want to delete this integration?")) return;

    try {
      const res = await fetch(
        `/api/hospital/integrations?tenantId=${tenantId}&integrationId=${integrationId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        toast.success("Integration deleted successfully");
        setIntegrations(integrations.filter(int => int.id !== integrationId));
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete integration");
      }
    } catch (error) {
      console.error("Error deleting integration:", error);
      toast.error("Failed to delete integration");
    }
  };

  const providers = [
    {
      name: "twilio",
      label: "Twilio",
      icon: "📱",
      description: "SMS, Voice, and WhatsApp messaging",
      fields: [
        { key: "accountSid", label: "Account SID", type: "password" },
        { key: "apiSecret", label: "Auth Token", type: "password" },
        { key: "accountName", label: "Account Name", type: "text" },
        { key: "phoneNumber", label: "Phone Number", type: "text" },
      ],
    },
    {
      name: "resend",
      label: "Resend",
      icon: "📧",
      description: "Transactional email service",
      fields: [
        { key: "apiKey", label: "API Key", type: "password" },
        { key: "accountName", label: "Account Name", type: "text" },
      ],
    },
    {
      name: "sendgrid",
      label: "SendGrid",
      icon: "📧",
      description: "Email marketing and transactional email",
      fields: [
        { key: "apiKey", label: "API Key", type: "password" },
        { key: "accountName", label: "Account Name", type: "text" },
      ],
    },
    {
      name: "stripe",
      label: "Stripe",
      icon: "💳",
      description: "Payment processing",
      fields: [
        { key: "apiKey", label: "Publishable Key", type: "password" },
        { key: "apiSecret", label: "Secret Key", type: "password" },
        { key: "accountName", label: "Account Name", type: "text" },
      ],
    },
    {
      name: "aws_s3",
      label: "AWS S3",
      icon: "☁️",
      description: "Cloud file storage",
      fields: [
        { key: "accessKeyId", label: "Access Key ID", type: "password" },
        { key: "apiSecret", label: "Secret Access Key", type: "password" },
        { key: "accountName", label: "Bucket Name", type: "text" },
      ],
    },
  ];

  const selectedProviderData = providers.find(p => p.name === selectedProvider);

  return (
    <>
      <Card
        title="Connected Integrations"
        description="Manage third-party service integrations"
        action={
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold"
          >
            <Plus className="size-3" /> Add
          </button>
        }
      >
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading integrations...</p>
        ) : integrations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No integrations configured yet.</p>
        ) : (
          <div className="space-y-3">
            {integrations.map((int) => (
              <div
                key={int.id}
                className="p-4 rounded-lg border border-border flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-semibold capitalize">
                    {int.provider}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {int.accountName || "No account name"}
                  </p>
                  {int.lastTestedAt && (
                    <p className="text-xs text-muted-foreground">
                      Last tested: {new Date(int.lastTestedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                      int.status === "active"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : int.status === "error"
                        ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {int.status.toUpperCase()}
                  </span>
                  <button
                    onClick={() => handleTestConnection(int.id)}
                    className="p-1.5 rounded hover:bg-muted"
                    title="Test connection"
                  >
                    <Zap className="size-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteIntegration(int.id)}
                    className="p-1.5 rounded hover:bg-red-50 text-red-600"
                    title="Delete integration"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showAddModal && (
        <Card title="Add Integration" description="Select a service to integrate">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {providers.map((provider) => (
              <button
                key={provider.name}
                onClick={() => {
                  setSelectedProvider(provider.name);
                  setFormData({});
                }}
                className={`p-4 rounded-lg border text-left transition-all ${
                  selectedProvider === provider.name
                    ? "border-orange-500 bg-orange-50/50 dark:bg-orange-500/10"
                    : "border-border hover:border-orange-300"
                }`}
              >
                <div className="text-2xl mb-2">{provider.icon}</div>
                <p className="text-sm font-semibold">{provider.label}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {provider.description}
                </p>
              </button>
            ))}
          </div>

          {selectedProviderData && (
            <div className="mt-4 p-4 rounded-lg border border-border bg-background">
              <h4 className="text-sm font-semibold mb-3">
                Configure {selectedProviderData.label}
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                Enter your {selectedProviderData.label} API credentials
              </p>
              <div className="space-y-3">
                {selectedProviderData.fields.map((field) => (
                  <Field key={field.key} label={field.label}>
                    <TextInput
                      type={field.type}
                      value={formData[field.key] || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, [field.key]: e.target.value })
                      }
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                    />
                  </Field>
                ))}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setSelectedProvider("");
                      setFormData({});
                    }}
                    className="flex-1 px-3 py-2 rounded-lg border border-border hover:bg-muted text-sm font-semibold"
                    disabled={connecting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConnect}
                    disabled={connecting || !Object.values(formData).some(v => v.trim())}
                    className="flex-1 px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold"
                  >
                    {connecting ? "Connecting..." : "Connect"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
    </>
  );
}

function ComplianceSection({
  settings,
  onSettingsChange,
}: {
  settings: TenantSettings;
  onSettingsChange: (updates: Partial<TenantSettings>) => void;
}) {
  return (
    <>
      <Card title="Regulatory Compliance" description="Configure compliance standards">
        <Row
          icon={ShieldCheck}
          title="HIPAA Mode"
          hint="Enforce HIPAA-grade security controls"
        >
          <Toggle
            checked={settings.compliance.hipaaMode}
            onChange={(v) =>
              onSettingsChange({
                compliance: { ...settings.compliance, hipaaMode: v },
              })
            }
          />
        </Row>
        <Row
          icon={Globe}
          title="GDPR Mode"
          hint="Apply EU data subject rights and regulations"
        >
          <Toggle
            checked={settings.compliance.gdprMode}
            onChange={(v) =>
              onSettingsChange({
                compliance: { ...settings.compliance, gdprMode: v },
              })
            }
          />
        </Row>
      </Card>

      <Card title="Security & Data Protection">
        <Row
          icon={Lock}
          title="Encryption at Rest"
          hint="AES-256 encryption for all PHI data"
        >
          <Toggle
            checked={settings.compliance.encryptionAtRest}
            onChange={(v) =>
              onSettingsChange({
                compliance: { ...settings.compliance, encryptionAtRest: v },
              })
            }
          />
        </Row>
        <Row
          icon={FileText}
          title="Audit Logging"
          hint="Record all privileged actions and data access"
        >
          <Toggle
            checked={settings.compliance.auditLoggingEnabled}
            onChange={(v) =>
              onSettingsChange({
                compliance: {
                  ...settings.compliance,
                  auditLoggingEnabled: v,
                },
              })
            }
          />
        </Row>

        <div className="border-t border-border pt-4 mt-4">
          <Field label="Data Retention (Days)" hint="How long to retain patient data before purging">
            <TextInput
              type="number"
              value={settings.compliance.dataRetentionDays}
              onChange={(e) =>
                onSettingsChange({
                  compliance: {
                    ...settings.compliance,
                    dataRetentionDays: parseInt(e.target.value) || 2555,
                  },
                })
              }
              min="365"
              step="365"
            />
          </Field>
        </div>
      </Card>
    </>
  );
}

function AuditSection() {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [tenantId, setTenantId] = useState<string>("");
  const [userRole, setUserRole] = useState<AppRole>("patient");
  const { user } = useAuthStore();

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedActionType, setSelectedActionType] = useState<string>("all");
  const [selectedActor, setSelectedActor] = useState<string>("all");
  const [selectedTenant, setSelectedTenant] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (user?.hospitalId) {
      setTenantId(user.hospitalId);
    }
    const role = (user?.role || "patient") as AppRole;
    setUserRole(role);
  }, [user]);

  useEffect(() => {
    if (!tenantId && userRole !== "super_admin") return;

    const fetchAuditLogs = async () => {
      try {
        setLoading(true);
        // Super admin sees all logs, hospital admin sees only their tenant
        let url = `/api/hospital/audit?limit=500&role=${userRole}`;
        if (userRole === "hospital_admin") {
          url += `&tenantId=${tenantId}`;
        }
        
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setAuditLogs(data.logs || []);
        } else {
          toast.error("Failed to load audit logs");
        }
      } catch (error) {
        console.error("Error fetching audit logs:", error);
        toast.error("Error loading audit logs");
      } finally {
        setLoading(false);
      }
    };

    fetchAuditLogs();
  }, [tenantId, userRole]);

  // Apply filters
  useEffect(() => {
    let filtered = [...auditLogs];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.action.toLowerCase().includes(query) ||
          log.actor.toLowerCase().includes(query) ||
          log.entity?.toLowerCase().includes(query)
      );
    }

    // Action type filter
    if (selectedActionType !== "all") {
      filtered = filtered.filter((log) => getAuditActionCategory(log.action) === selectedActionType);
    }

    // Actor filter
    if (selectedActor !== "all") {
      filtered = filtered.filter((log) => log.actor === selectedActor);
    }

    // Tenant filter (only for super admin)
    if (userRole === "super_admin" && selectedTenant !== "all") {
      filtered = filtered.filter((log) => log.tenantId === selectedTenant);
    }

    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter(
        (log) => new Date(log.timestamp) >= new Date(dateRange.start)
      );
    }
    if (dateRange.end) {
      filtered = filtered.filter(
        (log) => new Date(log.timestamp) <= new Date(dateRange.end + "T23:59:59")
      );
    }

    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setFilteredLogs(filtered);
    setCurrentPage(1);
  }, [auditLogs, searchQuery, selectedActionType, selectedActor, selectedTenant, dateRange, userRole]);

  const uniqueActors = useMemo(() => {
    return [...new Set(auditLogs.map((log) => log.actor))].sort();
  }, [auditLogs]);

  const uniqueTenants = useMemo(() => {
    if (userRole !== "super_admin") return [];
    return [...new Set(auditLogs.map((log) => ({ id: log.tenantId, name: log.tenantName })))];
  }, [auditLogs, userRole]);

  const actionCategories = useMemo(() => {
    const categories = new Set<string>();
    auditLogs.forEach((log) => {
      categories.add(getAuditActionCategory(log.action));
    });
    return Array.from(categories).sort();
  }, [auditLogs]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const headers = userRole === "super_admin" 
        ? ["Timestamp", "Tenant", "Action", "Entity", "Actor", "Type", "Details"]
        : ["Timestamp", "Action", "Entity", "Actor", "Type", "Details"];
      
      const rows = filteredLogs.map((log) => {
        const baseRow = [
          new Date(log.timestamp).toLocaleString(),
          log.action.replace(/_/g, " "),
          log.entity || "—",
          log.actor,
          log.type.toUpperCase(),
          log.metadata ? JSON.stringify(log.metadata) : "—",
        ];
        if (userRole === "super_admin") {
          baseRow.splice(1, 0, log.tenantName);
        }
        return baseRow;
      });

      const csv = [
        headers.join(","),
        ...rows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Audit logs exported successfully");
    } catch (error) {
      console.error("Error exporting logs:", error);
      toast.error("Failed to export audit logs");
    } finally {
      setExporting(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      let url = `/api/hospital/audit?limit=500&role=${userRole}`;
      if (userRole === "hospital_admin") {
        url += `&tenantId=${tenantId}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
        toast.success("Audit logs refreshed");
      }
    } catch (error) {
      console.error("Error refreshing logs:", error);
      toast.error("Failed to refresh logs");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Total Events
          </p>
          <p className="text-2xl font-bold text-foreground">{filteredLogs.length}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {auditLogs.length} total available
          </p>
        </div>

        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Action Types
          </p>
          <p className="text-2xl font-bold text-foreground">{actionCategories.length}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {actionCategories.join(", ") || "None"}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            {userRole === "super_admin" ? "Hospitals" : "Active Users"}
          </p>
          <p className="text-2xl font-bold text-foreground">
            {userRole === "super_admin" ? uniqueTenants.length : uniqueActors.length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {userRole === "super_admin" ? "Different tenants" : "Different users/systems"}
          </p>
        </div>
      </div>

      {/* Header with controls */}
      <Card
        title="Audit Logs"
        description={userRole === "super_admin" ? "System-wide activity across all hospitals" : "This hospital's activity and change history"}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 transition"
              title="Refresh logs"
            >
              <RotateCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handleExportCSV}
              disabled={exporting || filteredLogs.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition"
            >
              <Download className="size-3.5" />
              Export
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold text-xs transition ${
                showFilters
                  ? "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30"
                  : "border-border text-foreground hover:bg-muted"
              }`}
            >
              <Settings className="size-3.5" />
              {showFilters ? "Hide" : "Show"} Filters
            </button>
          </div>
        }
      >
        {/* Filters */}
        {showFilters && (
          <div className="mb-6 p-4 rounded-lg bg-muted/30 border border-border space-y-4">
            <div className={`grid gap-4 ${userRole === "super_admin" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-5" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"}`}>
              <Field label="Search">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <TextInput
                    placeholder="Search actions, actors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </Field>

              <Field label="Action Type">
                <SelectInput
                  value={selectedActionType}
                  onChange={(e) => setSelectedActionType(e.target.value)}
                >
                  <option value="all">All Types</option>
                  {actionCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              <Field label="Actor">
                <SelectInput
                  value={selectedActor}
                  onChange={(e) => setSelectedActor(e.target.value)}
                >
                  <option value="all">All Users</option>
                  {uniqueActors.map((actor) => (
                    <option key={actor} value={actor}>
                      {actor}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              {userRole === "super_admin" && (
                <Field label="Hospital">
                  <SelectInput
                    value={selectedTenant}
                    onChange={(e) => setSelectedTenant(e.target.value)}
                  >
                    <option value="all">All Hospitals</option>
                    {uniqueTenants.map((tenant: any) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
              )}

              <Field label="Date Range">
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                  />
                  <span className="text-muted-foreground">—</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                  />
                </div>
              </Field>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground">
                Showing {paginatedLogs.length} of {filteredLogs.length} records
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedActionType("all");
                  setSelectedActor("all");
                  setSelectedTenant("all");
                  setDateRange({
                    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                    end: new Date().toISOString().split("T")[0],
                  });
                }}
                className="ml-auto text-xs text-orange-600 hover:text-orange-700 font-medium transition"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-3 w-3 animate-pulse rounded-full bg-orange-500 mb-2" />
            <p className="text-sm text-muted-foreground">Loading audit logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="size-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No audit logs found</p>
            <p className="text-xs text-muted-foreground">
              {searchQuery || selectedActionType !== "all" ? "Try adjusting your filters" : "Activity will appear here"}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Timestamp</th>
                    {userRole === "super_admin" && (
                      <th className="px-4 py-3 text-left font-semibold text-foreground">Hospital</th>
                    )}
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Action</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Entity</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Actor</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-muted/40 transition"
                    >
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      {userRole === "super_admin" && (
                        <td className="px-4 py-3 text-foreground font-medium">
                          {log.tenantName}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs font-medium">
                            {getAuditActionIcon(log.action)}
                            {log.action.replace(/_/g, " ")}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {log.entity || "—"}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        <div className="flex items-center gap-2">
                          <div className="size-2 rounded-full bg-orange-500" />
                          <span className="truncate">{log.actor}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            log.type === "warning"
                              ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
                              : log.type === "error"
                              ? "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400"
                              : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          }`}
                        >
                          {getAuditTypeIcon(log.type)}
                          {log.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                          <Check className="size-3" />
                          Success
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages} ({filteredLogs.length} total records)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition ${
                            currentPage === pageNum
                              ? "bg-orange-500 text-white"
                              : "border border-border hover:bg-muted"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </>
  );
}

function getAuditActionCategory(action: string): string {
  if (action.includes("create") || action.includes("add")) return "create";
  if (action.includes("update") || action.includes("edit") || action.includes("modify")) return "update";
  if (action.includes("delete") || action.includes("remove")) return "delete";
  if (action.includes("login") || action.includes("logout")) return "auth";
  if (action.includes("export") || action.includes("download")) return "export";
  if (action.includes("escalate") || action.includes("resolve")) return "escalation";
  return "other";
}

function getAuditActionIcon(action: string): React.ReactNode {
  switch (getAuditActionCategory(action)) {
    case "create":
      return <Plus className="size-3" />;
    case "update":
      return <Edit3 className="size-3" />;
    case "delete":
      return <Trash2 className="size-3" />;
    case "auth":
      return <Lock className="size-3" />;
    case "export":
      return <Download className="size-3" />;
    case "escalation":
      return <AlertCircle className="size-3" />;
    default:
      return <Activity className="size-3" />;
  }
}

function getAuditTypeIcon(type: string): React.ReactNode {
  switch (type) {
    case "warning":
      return <AlertCircle className="size-3" />;
    case "error":
      return <AlertTriangle className="size-3" />;
    default:
      return <Check className="size-3" />;
  }
}

function AppearanceSection({
  theme,
  setTheme,
}: {
  theme?: string;
  setTheme: (t: string) => void;
}) {
  const themes = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Monitor },
  ];

  return (
    <Card title="Dashboard Theme" description="Choose how the interface looks">
      <div className="grid grid-cols-3 gap-3">
        {themes.map((t) => {
          const Icon = t.icon;
          const active = theme === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                active
                  ? "border-orange-500 bg-orange-500/5 ring-2 ring-orange-500/20"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <Icon
                className={`size-5 mb-2 ${
                  active ? "text-orange-500" : "text-muted-foreground"
                }`}
              />
              <p className="text-sm font-semibold">{t.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t.id === "system" ? "Match OS preference" : `${t.label} mode`}
              </p>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function DangerZoneSection({ tenantId }: { tenantId?: string }) {
  const { user } = useAuthStore();
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [archiving, setArchiving] = useState(false);
  const [dangerZoneInfo, setDangerZoneInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;

    const fetchDangerZoneInfo = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/hospital/danger-zone?tenantId=${tenantId}`
        );
        if (res.ok) {
          const data = await res.json();
          setDangerZoneInfo(data);
        }
      } catch (error) {
        console.error("Error fetching danger zone info:", error);
        toast.error("Failed to load danger zone information");
      } finally {
        setLoading(false);
      }
    };

    fetchDangerZoneInfo();
  }, [tenantId]);

  const handleArchiveTenant = async () => {
    if (!tenantId || !dangerZoneInfo) return;

    if (confirmText !== dangerZoneInfo.tenantName) {
      toast.error(
        `Please type "${dangerZoneInfo.tenantName}" to confirm archiving`
      );
      return;
    }

    setArchiving(true);
    try {
      const res = await fetch(`/api/hospital/danger-zone?tenantId=${tenantId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete-tenant",
          confirmationCode: "", // Will be generated if needed
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(
          `Hospital archived successfully. Data will be preserved for 30 days.`
        );

        // Redirect to tenant management page after a delay
        setTimeout(() => {
          router.push("/tenants");
        }, 1500);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to archive hospital");
      }
    } catch (error) {
      console.error("Error archiving hospital:", error);
      toast.error("Failed to archive hospital");
    } finally {
      setArchiving(false);
    }
  };

  if (loading) {
    return (
      <Card title="Danger Zone" description="Advanced destructive operations">
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">
            Loading danger zone information...
          </p>
        </div>
      </Card>
    );
  }

  if (!dangerZoneInfo) {
    return (
      <Card title="Danger Zone" description="Advanced destructive operations">
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">
            Unable to load danger zone information
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card
        title="Archive Hospital"
        description="Soft-delete this tenant and its data"
      >
        <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50/50 dark:bg-red-500/5 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-red-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2">
                Archive this hospital
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                This soft-deletes the hospital: it becomes inactive, hidden from
                default views, and inaccessible to its users. Data is preserved
                for <strong>30 days</strong>, after which a super-admin may
                permanently purge it. This action is reversible during the grace
                period.
              </p>

              <div className="bg-white dark:bg-background rounded-lg p-3 mb-4 border border-border">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Hospital Name</p>
                    <p className="font-semibold text-foreground">
                      {dangerZoneInfo.tenantName}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Patients</p>
                    <p className="font-semibold text-foreground">
                      {dangerZoneInfo.patientCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Staff Members</p>
                    <p className="font-semibold text-foreground">
                      {dangerZoneInfo.staffCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Plan</p>
                    <p className="font-semibold text-foreground capitalize">
                      {dangerZoneInfo.plan}
                    </p>
                  </div>
                </div>
              </div>

              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-5 mb-4">
                <li>All users for this hospital will lose access immediately</li>
                <li>
                  All data (patients, appointments, billing, etc.) is preserved
                  for 30 days
                </li>
                <li>
                  After 30 days, hard purge becomes available and is irreversible
                </li>
              </ul>

              <div className="space-y-3">
                <label className="text-sm font-medium block text-foreground">
                  Type the hospital name{" "}
                  <code className="px-2 py-1 rounded bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 font-mono text-xs">
                    {dangerZoneInfo.tenantName}
                  </code>{" "}
                  to confirm
                </label>
                <div className="flex gap-2">
                  <TextInput
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={dangerZoneInfo.tenantName}
                    className="flex-1 max-w-sm"
                  />
                  <button
                    onClick={handleArchiveTenant}
                    disabled={
                      archiving ||
                      confirmText !== dangerZoneInfo.tenantName
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {archiving ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Archiving...
                      </>
                    ) : (
                      <>
                        <Trash2 className="size-4" />
                        Archive Hospital
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card
        title="Hard Purge"
        description="Permanently delete archived data (super-admin only)"
      >
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-muted-foreground">
            After the 30-day grace period, a super-admin can permanently purge
            all data associated with this hospital. This action is{" "}
            <strong>irreversible</strong>.
          </p>
        </div>
      </Card>
    </>
  );
}

function RestoreDefaultsButton({ section, tenantId }: { section: string; tenantId?: string }) {
  const [restoring, setRestoring] = useState(false);

  const handleRestore = async () => {
    if (!tenantId) return;
    if (!confirm("Reset this section to default values?")) return;

    setRestoring(true);
    try {
      const res = await fetch(`/api/hospital/restore-defaults?tenantId=${tenantId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section }),
      });

      if (res.ok) {
        toast.success(`${section} settings restored to defaults`);
        window.location.reload();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to restore defaults");
      }
    } catch (error) {
      console.error("Error restoring defaults:", error);
      toast.error("Failed to restore defaults");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <button
      onClick={handleRestore}
      disabled={restoring}
      className="text-xs px-2 py-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50"
    >
      {restoring ? "Restoring..." : "Restore defaults"}
    </button>
  );
}

function PreferencesSection({
  settings,
  onSettingsChange,
}: {
  settings: TenantSettings;
  onSettingsChange: (updates: Partial<TenantSettings>) => void;
}) {
  const { user } = useAuthStore();

  return (
    <>
      <Card title="Regional Settings" description="Language, timezone, and formatting">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Timezone">
            <SelectInput
              value={settings.preferences.timezone}
              onChange={(e) =>
                onSettingsChange({
                  preferences: {
                    ...settings.preferences,
                    timezone: e.target.value,
                  },
                })
              }
            >
              <option value="UTC">UTC</option>
              <option value="Africa/Nairobi">Africa/Nairobi</option>
              <option value="Africa/Lagos">Africa/Lagos</option>
              <option value="Europe/London">Europe/London</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Asia/Dubai">Asia/Dubai</option>
            </SelectInput>
          </Field>
          <Field label="Language">
            <SelectInput
              value={settings.preferences.language}
              onChange={(e) =>
                onSettingsChange({
                  preferences: {
                    ...settings.preferences,
                    language: e.target.value,
                  },
                })
              }
            >
              <option value="en">English</option>
              <option value="sw">Swahili</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
            </SelectInput>
          </Field>
          <Field label="Currency">
            <SelectInput
              value={settings.preferences.currency}
              onChange={(e) =>
                onSettingsChange({
                  preferences: {
                    ...settings.preferences,
                    currency: e.target.value,
                  },
                })
              }
            >
              <option value="USD">USD</option>
              <option value="KES">KES</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </SelectInput>
          </Field>
          <Field label="Date Format">
            <SelectInput
              value={settings.preferences.dateFormat}
              onChange={(e) =>
                onSettingsChange({
                  preferences: {
                    ...settings.preferences,
                    dateFormat: e.target.value,
                  },
                })
              }
            >
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            </SelectInput>
          </Field>
        </div>
      </Card>

      <Card title="UI Preferences" description="Interface behavior">
        <Row
          title="Compact Mode"
          hint="Reduce spacing for a denser interface"
        >
          <Toggle
            checked={settings.preferences.compactMode || false}
            onChange={(v) =>
              onSettingsChange({
                preferences: { ...settings.preferences, compactMode: v },
              })
            }
          />
        </Row>
        <Row
          title="Auto Sync"
          hint="Automatically sync data in real-time"
        >
          <Toggle
            checked={settings.preferences.autoSync || false}
            onChange={(v) =>
              onSettingsChange({
                preferences: { ...settings.preferences, autoSync: v },
              })
            }
          />
        </Row>
        <Row
          title="Notification Sound"
          hint="Play sound for important notifications"
        >
          <Toggle
            checked={settings.preferences.notificationSound || false}
            onChange={(v) =>
              onSettingsChange({
                preferences: {
                  ...settings.preferences,
                  notificationSound: v,
                },
              })
            }
          />
        </Row>
      </Card>
    </>
  );
}

function SecuritySection({
  settings,
  onSettingsChange,
}: {
  settings: TenantSettings;
  onSettingsChange: (updates: Partial<TenantSettings>) => void;
}) {
  return (
    <>
      <Card title="Password Policies">
        <Row
          icon={Lock}
          title="Password Expiration"
          hint="Require users to change passwords"
        >
          <Toggle
            checked={settings.security?.passwordExpirationEnabled || false}
            onChange={(v) =>
              onSettingsChange({
                security: {
                  ...settings.security,
                  passwordExpirationEnabled: v,
                },
              })
            }
          />
        </Row>

        {settings.security?.passwordExpirationEnabled && (
          <div className="border-t border-border pt-4 mt-4">
            <Field label="Days Until Expiration" hint="How many days before password expires">
              <TextInput
                type="number"
                value={settings.security?.passwordExpirationDays || 90}
                onChange={(e) =>
                  onSettingsChange({
                    security: {
                      ...settings.security,
                      passwordExpirationDays: parseInt(e.target.value) || 90,
                    },
                  })
                }
                min="1"
                max="365"
              />
            </Field>
          </div>
        )}
      </Card>

      <Card title="Authentication">
        <Row
          icon={ShieldCheck}
          title="Multi-Factor Authentication"
          hint="Require additional verification for sensitive actions"
        >
          <Toggle
            checked={settings.security?.mfaRequired || false}
            onChange={(v) =>
              onSettingsChange({
                security: { ...settings.security, mfaRequired: v },
              })
            }
          />
        </Row>

        <div className="border-t border-border pt-4 mt-4">
          <Field label="Session Timeout (minutes)" hint="Automatically log out after inactivity">
            <TextInput
              type="number"
              value={settings.security?.sessionTimeout || 60}
              onChange={(e) =>
                onSettingsChange({
                  security: {
                    ...settings.security,
                    sessionTimeout: parseInt(e.target.value) || 60,
                  },
                })
              }
              min="5"
              max="1440"
            />
          </Field>
        </div>
      </Card>

      <Card title="IP Security">
        <Row
          icon={Globe}
          title="IP Whitelist"
          hint="Only allow access from specific IP addresses"
        >
          <Toggle
            checked={settings.security?.ipWhitelistEnabled || false}
            onChange={(v) =>
              onSettingsChange({
                security: { ...settings.security, ipWhitelistEnabled: v },
              })
            }
          />
        </Row>
      </Card>
    </>
  );
}

function WorkflowSection({
  settings,
  onSettingsChange,
}: {
  settings: TenantSettings;
  onSettingsChange: (updates: Partial<TenantSettings>) => void;
}) {
  return (
    <>
      <Card title="Automation Features">
        <Row
          icon={Zap}
          title="Automation Enabled"
          hint="Enable automated workflows and triggers"
        >
          <Toggle
            checked={settings.workflow?.automationEnabled || false}
            onChange={(v) =>
              onSettingsChange({
                workflow: { ...settings.workflow, automationEnabled: v },
              })
            }
          />
        </Row>
        <Row
          title="Appointment Reminders"
          hint="Auto-send reminders to patients"
        >
          <Toggle
            checked={settings.workflow?.appointmentReminders || false}
            onChange={(v) =>
              onSettingsChange({
                workflow: {
                  ...settings.workflow,
                  appointmentReminders: v,
                },
              })
            }
          />
        </Row>
        <Row
          title="Prescription Alerts"
          hint="Notify on new prescriptions"
        >
          <Toggle
            checked={settings.workflow?.prescriptionAlerts || false}
            onChange={(v) =>
              onSettingsChange({
                workflow: {
                  ...settings.workflow,
                  prescriptionAlerts: v,
                },
              })
            }
          />
        </Row>
      </Card>

      <Card title="Notifications">
        <Row
          title="Patient Notifications"
          hint="Send updates to patients automatically"
        >
          <Toggle
            checked={settings.workflow?.patientNotifications || false}
            onChange={(v) =>
              onSettingsChange({
                workflow: {
                  ...settings.workflow,
                  patientNotifications: v,
                },
              })
            }
          />
        </Row>
        <Row
          title="Staff Notifications"
          hint="Alert staff members about important events"
        >
          <Toggle
            checked={settings.workflow?.staffNotifications || false}
            onChange={(v) =>
              onSettingsChange({
                workflow: {
                  ...settings.workflow,
                  staffNotifications: v,
                },
              })
            }
          />
        </Row>
      </Card>

      <Card title="Advanced Features">
        <Row
          title="Billing Automation"
          hint="Auto-generate invoices on appointment completion"
        >
          <Toggle
            checked={settings.workflow?.billingAutomation || false}
            onChange={(v) =>
              onSettingsChange({
                workflow: {
                  ...settings.workflow,
                  billingAutomation: v,
                },
              })
            }
          />
        </Row>
        <Row
          title="Report Generation"
          hint="Auto-generate reports on schedule"
        >
          <Toggle
            checked={settings.workflow?.reportGeneration || false}
            onChange={(v) =>
              onSettingsChange({
                workflow: {
                  ...settings.workflow,
                  reportGeneration: v,
                },
              })
            }
          />
        </Row>
        <Row
          title="Data Backup"
          hint="Automatically backup hospital data"
        >
          <Toggle
            checked={settings.workflow?.dataBackupEnabled || false}
            onChange={(v) =>
              onSettingsChange({
                workflow: {
                  ...settings.workflow,
                  dataBackupEnabled: v,
                },
              })
            }
          />
        </Row>

        {settings.workflow?.dataBackupEnabled && (
          <div className="border-t border-border pt-4 mt-4">
            <Field label="Backup Frequency" hint="How often to backup data">
              <SelectInput
                value={settings.workflow?.backupFrequency || "daily"}
                onChange={(e) =>
                  onSettingsChange({
                    workflow: {
                      ...settings.workflow,
                      backupFrequency: e.target.value,
                    },
                  })
                }
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </SelectInput>
            </Field>
          </div>
        )}
      </Card>
    </>
  );
}

function APIManagementSection({ tenantId }: { tenantId?: string }) {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createModalMode, setCreateModalMode] = useState<"create" | "show">("create");
  const [newKeyData, setNewKeyData] = useState<any>(null);

  useEffect(() => {
    if (!tenantId) return;

    const fetchKeys = async () => {
      try {
        const res = await fetch(`/api/hospital/api-keys?tenantId=${tenantId}`);
        if (res.ok) {
          const data = await res.json();
          setApiKeys(data);
        }
      } catch (error) {
        console.error("Error fetching API keys:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchKeys();
  }, [tenantId]);

  const handleCreateKey = async () => {
    if (!keyName.trim()) {
      toast.error("Please enter a key name");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch(`/api/hospital/api-keys?tenantId=${tenantId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName }),
      });

      if (res.ok) {
        const data = await res.json();
        setNewKeyData(data);
        setCreateModalMode("show");
        toast.success("API key created successfully");

        // Refresh keys list
        const refreshRes = await fetch(`/api/hospital/api-keys?tenantId=${tenantId}`);
        if (refreshRes.ok) {
          setApiKeys(await refreshRes.json());
        }
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create API key");
      }
    } catch (error) {
      console.error("Error creating API key:", error);
      toast.error("Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to delete this API key?")) return;

    try {
      const res = await fetch(
        `/api/hospital/api-keys?tenantId=${tenantId}&keyId=${keyId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        toast.success("API key deleted successfully");
        setApiKeys(apiKeys.filter((k) => k.id !== keyId));
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete API key");
      }
    } catch (error) {
      console.error("Error deleting API key:", error);
      toast.error("Failed to delete API key");
    }
  };

  return (
    <>
      <Card
        title="API Keys"
        description="Manage API authentication keys"
        action={
          <button
            onClick={() => {
              setCreateModalMode("create");
              setKeyName("");
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold"
          >
            <Plus className="size-3" /> Create Key
          </button>
        }
      >
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading API keys...</p>
        ) : apiKeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No API keys created yet. Create one to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="p-4 rounded-lg border border-border flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-semibold">{key.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {key.prefix}...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created: {new Date(key.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteKey(key.id)}
                  className="p-1.5 rounded hover:bg-red-50 text-red-600"
                  title="Delete API key"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showCreateModal && (
        <Card
          title={
            createModalMode === "create"
              ? "Create API Key"
              : "API Key Created"
          }
        >
          {createModalMode === "create" ? (
            <div className="space-y-4">
              <Field label="Key Name" hint="A descriptive name for this key">
                <TextInput
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="My API Key"
                />
              </Field>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-3 py-2 rounded-lg border border-border hover:bg-muted text-sm font-semibold"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateKey}
                  disabled={creating || !keyName.trim()}
                  className="flex-1 px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 p-4">
                <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                  Make sure to copy and store your API key in a safe place. You
                  won't be able to see it again.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-border bg-background">
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  API Key
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-mono text-sm font-semibold px-3 py-2 rounded-lg bg-muted truncate">
                    {newKeyData?.key}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(newKeyData?.key);
                      toast.success("API key copied to clipboard");
                    }}
                    className="p-2 rounded hover:bg-muted"
                  >
                    <Copy className="size-4" />
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </Card>
      )}
    </>
  );
}

function SystemMonitorSection() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/system/metrics`);
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        } else {
          toast.error("Failed to load system metrics");
        }
      } catch (error) {
        console.error("Error fetching system metrics:", error);
        toast.error("Error loading system metrics");
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <Card title="System Monitor" description="Real-time system health metrics">
        <div className="flex items-center justify-center py-12">
          <div className="h-3 w-3 animate-pulse rounded-full bg-orange-500 mr-2" />
          <p className="text-sm text-muted-foreground">Loading system metrics...</p>
        </div>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card title="System Monitor" description="Real-time system health metrics">
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">Unable to load metrics data</p>
        </div>
      </Card>
    );
  }

  return (
    <Card title="System Monitor" description="Real-time system health metrics">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            CPU Usage
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-green-500"
                style={{ width: `${metrics.cpuUsage}%` }}
               />
            </div>
            <span className="text-sm font-medium text-foreground">
              {metrics.cpuUsage}%
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Memory Usage
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${metrics.memoryUsage}%` }}
               />
            </div>
            <span className="text-sm font-medium text-foreground">
              {metrics.memoryUsage}%
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Disk Usage
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-red-500"
                style={{ width: `${metrics.diskUsage}%` }}
               />
            </div>
            <span className="text-sm font-medium text-foreground">
              {metrics.diskUsage}%
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Uptime
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${metrics.uptime}%` }}
               />
            </div>
            <span className="text-sm font-medium text-foreground">
              {metrics.uptime}%
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors"
        >
          <RotateCw className="size-4" />
          Refresh Metrics
        </button>
      </div>
    </Card>
  );
}
