"use client";

import { useEffect, useMemo, useState } from "react";
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

const orange = "#F97316";

type SettingsShape = {
  branding: { primaryColor: string; logoUrl: string; hospitalName: string; favicon: string; };
  notifications: { emailEnabled: boolean; smsEnabled: boolean; pushEnabled: boolean; slackEnabled: boolean; };
  modules: { appointments: boolean; pharmacy: boolean; lab: boolean; billing: boolean; inpatient: boolean; emergency: boolean; telemedicine: boolean; };
  preferences: { timezone: string; language: string; currency: string; dateFormat: string; };
  communications: { emailProvider: string; smsProvider: string; webhookUrl: string; };
  security: { twoFactorRequired: boolean; sessionTimeout: number; ipWhitelistEnabled: boolean; };
  integrations: { [key: string]: { enabled: boolean; apiKey: string; }; };
};

const DEFAULT_SETTINGS = {
  branding: { primaryColor: "#F97316", logoUrl: "", hospitalName: "", favicon: "" },
  notifications: { emailEnabled: true, smsEnabled: false, pushEnabled: true, slackEnabled: false },
  modules: { appointments: true, pharmacy: true, lab: true, billing: true, inpatient: true, emergency: false, telemedicine: false },
  preferences: { timezone: "UTC", language: "en", currency: "USD", dateFormat: "YYYY-MM-DD" },
  communications: { emailProvider: "resend", smsProvider: "twilio", webhookUrl: "" },
  security: { twoFactorRequired: false, sessionTimeout: 60, ipWhitelistEnabled: false },
  integrations: {},
};

const TIMEZONES = ["UTC", "Africa/Nairobi", "Africa/Lagos", "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "Asia/Dubai", "Asia/Singapore"];
const LANGUAGES = [{ v: "en", l: "English" }, { v: "fr", l: "French" }, { v: "es", l: "Spanish" }, { v: "sw", l: "Swahili" }, { v: "ar", l: "Arabic" }];
const CURRENCIES = ["USD", "EUR", "GBP", "KES", "NGN", "ZAR", "AED"];
const DATE_FORMATS = ["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"];
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

  // Danger zone
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Integrations
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);

  // Communications
  const [commSettings, setCommSettings] = useState<any>({});
  const [commLoading, setCommLoading] = useState(false);

  // Security
  const [securitySettings, setSecuritySettings] = useState<any>({});
  const [securityLoading, setSecurityLoading] = useState(false);

  // System
  const [systemStats, setSystemStats] = useState<any>({});
  const [systemLoading, setSystemLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [tRes, sRes] = await Promise.all([
          fetch(`/api/tenants/${slug}`),
          fetch(`/api/tenants/${slug}/settings`),
        ]);
        if (tRes.ok) setTenant(await tRes.json());
        if (sRes.ok) {
          const s = await sRes.json();
          setSettings(s);
          setOriginal(JSON.parse(JSON.stringify(s)));
        }
      } catch (e) {
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  useEffect(() => {
    if (tab !== "audit") return;
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
                  <button key={t.key} onClick={() => setTab(t.key)}
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
                        <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted text-sm">
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
                      <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold">
                        <Eye className="size-4" /> Preview Changes
                      </button>
                      <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm">
                        <Download className="size-4" /> Export Branding Kit
                      </button>
                    </div>
                  </div>
                </Card>
            )}

            {tab === "modules" && (
                <Card
                    title="Active Modules"
                    desc="Toggle which modules appear in the hospital sidebar"
                    onReset={() => setSettings({ ...settings, modules: { ...DEFAULT_SETTINGS.modules } })}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(settings.modules).map(([k, v]) => (
                        <Toggle key={k} label={cap(k)} desc={moduleHint(k)} value={v} onChange={x => update(`modules.${k}`, x)} />
                    ))}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-foreground">Channels</h4>
                        <Toggle label="Email" desc="Appointment reminders, alerts, daily digests" value={settings.notifications.emailEnabled} onChange={x => update("notifications.emailEnabled", x)} />
                        <Toggle label="SMS" desc="Critical alerts via text message" value={settings.notifications.smsEnabled} onChange={x => update("notifications.smsEnabled", x)} />
                        <Toggle label="Push" desc="In-app and mobile push notifications" value={settings.notifications.pushEnabled} onChange={x => update("notifications.pushEnabled", x)} />
                        <Toggle label="Slack" desc="Team notifications via Slack workspace" value={settings.notifications.slackEnabled} onChange={x => update("notifications.slackEnabled", x)} />
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-foreground">Quiet Hours</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Start</label>
                            <input type="time" defaultValue="22:00" className="mt-1 w-full h-9 px-2 rounded-lg border border-border bg-background text-sm" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">End</label>
                            <input type="time" defaultValue="07:00" className="mt-1 w-full h-9 px-2 rounded-lg border border-border bg-background text-sm" />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">Notifications will be silenced during these hours</p>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" className="accent-orange-500" />
                          <span className="text-sm">Allow critical alerts during quiet hours</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3">Notification Categories</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-3">
                          <Toggle label="System alerts" desc="Maintenance and uptime notifications" value={true} onChange={() => {}} />
                          <Toggle label="Emergency events" desc="Critical clinical alerts" value={true} onChange={() => {}} />
                          <Toggle label="Appointment reminders" desc="Upcoming appointments and changes" value={true} onChange={() => {}} />
                        </div>
                        <div className="space-y-3">
                          <Toggle label="Lab results" desc="New test results available" value={true} onChange={() => {}} />
                          <Toggle label="Billing updates" desc="Invoice and payment notifications" value={true} onChange={() => {}} />
                          <Toggle label="Product updates" desc="New features and tips" value={false} onChange={() => {}} />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold">
                        <Bell className="size-4" /> Test Notifications
                      </button>
                      <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm">
                        <Download className="size-4" /> Export Settings
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
                      <div>
                        <label className="text-sm font-medium">Number Format</label>
                        <select className="mt-1.5 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm">
                          <option>1,234.56 (US)</option>
                          <option>1 234,56 (EU)</option>
                          <option>1.234,56 (DE)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3">Display Preferences</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-3">
                          <Toggle label="24-hour time" desc="Use 24-hour clock format" value={true} onChange={() => {}} />
                          <Toggle label="Compact mode" desc="Reduce spacing and padding" value={false} onChange={() => {}} />
                          <Toggle label="High contrast" desc="Improve readability" value={false} onChange={() => {}} />
                        </div>
                        <div className="space-y-3">
                          <Toggle label="Auto-save forms" desc="Save drafts automatically" value={true} onChange={() => {}} />
                          <Toggle label="Show tooltips" desc="Display help text on hover" value={true} onChange={() => {}} />
                          <Toggle label="Keyboard shortcuts" desc="Enable hotkeys" value={true} onChange={() => {}} />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold">
                        <Globe className="size-4" /> Apply to All Users
                      </button>
                      <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm">
                        <Download className="size-4" /> Export Settings
                      </button>
                    </div>
                  </div>
                </Card>
            )}

            {tab === "workflows" && (
                <Card
                    title="Workflow Automation"
                    desc="Configure automated processes and business rules"
                    onReset={() => {}}
                >
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-foreground">Appointment Workflows</h4>
                        <Toggle label="Auto-confirm appointments" desc="Automatically confirm bookings within business hours" value={true} onChange={() => {}} />
                        <Toggle label="Reminder notifications" desc="Send automated reminders before appointments" value={true} onChange={() => {}} />
                        <Toggle label="No-show alerts" desc="Notify staff when patients don't show up" value={true} onChange={() => {}} />
                        <Toggle label="Follow-up scheduling" desc="Automatically schedule follow-up appointments" value={false} onChange={() => {}} />
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-foreground">Lab Workflows</h4>
                        <Toggle label="Auto-result notifications" desc="Notify patients when lab results are ready" value={true} onChange={() => {}} />
                        <Toggle label="Critical value alerts" desc="Immediate alerts for critical lab values" value={true} onChange={() => {}} />
                        <Toggle label="Result review queue" desc="Route results through physician review queue" value={false} onChange={() => {}} />
                        <Toggle label="Auto-archive old results" desc="Automatically archive results older than 1 year" value={true} onChange={() => {}} />
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3">Billing Workflows</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-3">
                          <Toggle label="Auto-generate invoices" desc="Create invoices automatically after visits" value={true} onChange={() => {}} />
                          <Toggle label="Payment reminders" desc="Send automated payment reminders" value={true} onChange={() => {}} />
                          <Toggle label="Insurance claim automation" desc="Auto-submit claims to insurance providers" value={false} onChange={() => {}} />
                        </div>
                        <div className="space-y-3">
                          <Toggle label="Overdue account alerts" desc="Notify staff of overdue accounts" value={true} onChange={() => {}} />
                          <Toggle label="Auto-write-off small balances" desc="Automatically write off balances under $10" value={false} onChange={() => {}} />
                          <Toggle label="Monthly billing cycle" desc="Generate monthly statements for patients" value={true} onChange={() => {}} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3">Emergency Protocols</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-3">
                          <Toggle label="Auto-escalation alerts" desc="Escalate critical cases to senior staff" value={true} onChange={() => {}} />
                          <Toggle label="Emergency team notification" desc="Notify emergency response team" value={true} onChange={() => {}} />
                          <Toggle label="Ambulance dispatch integration" desc="Auto-dispatch ambulances for critical cases" value={false} onChange={() => {}} />
                        </div>
                        <div className="space-y-3">
                          <Toggle label="Family notification system" desc="Auto-notify family members in emergencies" value={true} onChange={() => {}} />
                          <Toggle label="Emergency log generation" desc="Automatically create incident reports" value={true} onChange={() => {}} />
                          <Toggle label="Post-incident follow-up" desc="Schedule automatic follow-up care" value={false} onChange={() => {}} />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold">
                        <GitBranch className="size-4" /> Create Custom Workflow
                      </button>
                      <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm">
                        <Download className="size-4" /> Export Workflows
                      </button>
                    </div>
                  </div>
                </Card>
            )}

            {tab === "compliance" && (
                <Card
                    title="Compliance & Regulatory"
                    desc="HIPAA, GDPR, and other regulatory compliance settings"
                    onReset={() => {}}
                >
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-foreground">HIPAA Compliance</h4>
                        <Toggle label="Audit logging enabled" desc="Log all access to patient data" value={true} onChange={() => {}} />
                        <Toggle label="Data encryption at rest" desc="Encrypt patient data in database" value={true} onChange={() => {}} />
                        <Toggle label="PHI access controls" desc="Restrict access to protected health information" value={true} onChange={() => {}} />
                        <Toggle label="Breach notification system" desc="Auto-notify authorities of data breaches" value={true} onChange={() => {}} />
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-foreground">GDPR Compliance</h4>
                        <Toggle label="Data subject rights" desc="Support right to access, rectify, and delete data" value={true} onChange={() => {}} />
                        <Toggle label="Consent management" desc="Track and manage patient consents" value={true} onChange={() => {}} />
                        <Toggle label="Data portability" desc="Allow patients to export their data" value={true} onChange={() => {}} />
                        <Toggle label="Privacy by design" desc="Implement privacy controls by default" value={true} onChange={() => {}} />
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3">Data Retention Policies</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium">Patient Records (years)</label>
                          <input type="number" defaultValue="7" min="1" max="20"
                                 className="mt-1.5 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Audit Logs (years)</label>
                          <input type="number" defaultValue="7" min="1" max="20"
                                 className="mt-1.5 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Billing Records (years)</label>
                          <input type="number" defaultValue="7" min="1" max="20"
                                 className="mt-1.5 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3">Security Assessments</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg border border-border">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium">Last Security Audit</p>
                            <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                          Passed
                        </span>
                          </div>
                          <p className="text-xs text-muted-foreground">Completed on Dec 15, 2024</p>
                          <button className="text-xs font-semibold text-orange-600 hover:underline mt-2">
                            View Report
                          </button>
                        </div>
                        <div className="p-4 rounded-lg border border-border">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium">Next Audit Due</p>
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                          Scheduled
                        </span>
                          </div>
                          <p className="text-xs text-muted-foreground">Due on Jun 15, 2025</p>
                          <button className="text-xs font-semibold text-orange-600 hover:underline mt-2">
                            Schedule Now
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3">Compliance Training</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-3">
                          <Toggle label="Annual HIPAA training" desc="Require annual HIPAA compliance training" value={true} onChange={() => {}} />
                          <Toggle label="GDPR awareness training" desc="Require GDPR compliance training" value={true} onChange={() => {}} />
                          <Toggle label="Security awareness training" desc="Require cybersecurity training" value={true} onChange={() => {}} />
                        </div>
                        <div className="space-y-3">
                          <Toggle label="Training completion tracking" desc="Track and report training completion" value={true} onChange={() => {}} />
                          <Toggle label="Automated reminders" desc="Send reminders for overdue training" value={true} onChange={() => {}} />
                          <Toggle label="Certification management" desc="Track professional certifications" value={false} onChange={() => {}} />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold">
                        <FileCheck className="size-4" /> Run Compliance Check
                      </button>
                      <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm">
                        <Download className="size-4" /> Export Compliance Report
                      </button>
                    </div>
                  </div>
                </Card>
            )}

            {tab === "billing" && (
                <Card
                    title="Billing & Financial Settings"
                    desc="Configure payment processing, insurance, and financial policies"
                    onReset={() => {}}
                >
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-foreground">Payment Methods</h4>
                        <Toggle label="Credit card payments" desc="Accept credit/debit card payments" value={true} onChange={() => {}} />
                        <Toggle label="Bank transfers" desc="Accept ACH/bank transfer payments" value={true} onChange={() => {}} />
                        <Toggle label="Cash payments" desc="Accept cash payments at reception" value={true} onChange={() => {}} />
                        <Toggle label="Insurance payments" desc="Process insurance claims and payments" value={true} onChange={() => {}} />
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-foreground">Billing Preferences</h4>
                        <Toggle label="Auto-generate invoice numbers" desc="Automatically assign unique invoice numbers" value={true} onChange={() => {}} />
                        <Toggle label="Tax calculations" desc="Automatically calculate and apply taxes" value={true} onChange={() => {}} />
                        <Toggle label="Discount codes" desc="Support promotional discount codes" value={false} onChange={() => {}} />
                        <Toggle label="Payment plans" desc="Allow patients to set up payment plans" value={true} onChange={() => {}} />
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3">Insurance Integration</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-3">
                          <Toggle label="Real-time eligibility checking" desc="Check insurance eligibility before services" value={true} onChange={() => {}} />
                          <Toggle label="Automated claims submission" desc="Auto-submit claims to insurance providers" value={true} onChange={() => {}} />
                          <Toggle label="EOB processing" desc="Process Explanation of Benefits automatically" value={true} onChange={() => {}} />
                        </div>
                        <div className="space-y-3">
                          <Toggle label="Patient responsibility estimation" desc="Estimate patient payment responsibility" value={true} onChange={() => {}} />
                          <Toggle label="Secondary insurance billing" desc="Bill secondary insurance automatically" value={true} onChange={() => {}} />
                          <Toggle label="Claim status tracking" desc="Track and update claim statuses" value={true} onChange={() => {}} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3">Financial Policies</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium">Late Payment Fee (%)</label>
                          <input type="number" defaultValue="1.5" min="0" max="10" step="0.1"
                                 className="mt-1.5 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Grace Period (days)</label>
                          <input type="number" defaultValue="15" min="0" max="90"
                                 className="mt-1.5 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Statement Frequency</label>
                          <select className="mt-1.5 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm">
                            <option>Monthly</option>
                            <option>Bi-weekly</option>
                            <option>Weekly</option>
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
                            <span className="text-lg font-bold text-emerald-600">$127,450</span>
                          </div>
                          <p className="text-xs text-muted-foreground">+12% from last month</p>
                        </div>
                        <div className="p-4 rounded-lg border border-border">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium">Outstanding Balance</p>
                            <span className="text-lg font-bold text-orange-600">$23,180</span>
                          </div>
                          <p className="text-xs text-muted-foreground">5.2% of total billed</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold">
                        <CreditCard className="size-4" /> Configure Payment Gateway
                      </button>
                      <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm">
                        <Download className="size-4" /> Export Financial Report
                      </button>
                    </div>
                  </div>
                </Card>
            )}

            {tab === "audit" && (
                <Card title="Audit Log" desc="Provisioning history and configuration changes">
                  <div className="flex flex-wrap gap-2 mb-4 items-center">
                    <input
                        type="text"
                        placeholder="Search action, stage, error…"
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
                            Page {auditPage} of {auditTotalPages} · {auditTotal} event{auditTotal === 1 ? "" : "s"}
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
                </Card>
            )}

            {tab === "danger" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50/50 dark:bg-red-500/5 p-5">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="size-5 text-red-600 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-red-700 dark:text-red-400">Archive this tenant</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          This soft-deletes the tenant: it becomes inactive, hidden from default views, and inaccessible to its users. Data is preserved for <strong>30 days</strong>, after which a super-admin may permanently purge it. This action is reversible during the grace period.
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
                      <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold">
                        <RefreshCw className="size-4" /> Test All Integrations
                      </button>
                      <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm">
                        <Download className="size-4" /> Export Configuration
                      </button>
                      <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm">
                        <Plus className="size-4" /> Add Custom Integration
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
                        <Toggle label="Password expiration" desc="Require password changes every 90 days" value={false} onChange={() => {}} />
                        <Toggle label="Login attempt limits" desc="Lock accounts after 5 failed attempts" value={true} onChange={() => {}} />
                      </div>

                      <div>
                        <label className="text-sm font-medium">Password Requirements</label>
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked className="accent-orange-500" />
                            <span className="text-sm">Minimum 8 characters</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked className="accent-orange-500" />
                            <span className="text-sm">Require uppercase letters</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked className="accent-orange-500" />
                            <span className="text-sm">Require lowercase letters</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked className="accent-orange-500" />
                            <span className="text-sm">Require numbers</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked className="accent-orange-500" />
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
                                      className="mt-1.5 w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono" />
                            <p className="text-xs text-muted-foreground mt-1">One IP address or CIDR range per line</p>
                          </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Toggle label="Role-based access control" desc="Enforce granular permissions by role" value={true} onChange={() => {}} />
                        <Toggle label="Audit all access" desc="Log every data access and modification" value={true} onChange={() => {}} />
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
                        <Toggle label="Encrypt data at rest" desc="AES-256 encryption for stored data" value={true} onChange={() => {}} />
                        <Toggle label="Encrypt data in transit" desc="TLS 1.3 for all connections" value={true} onChange={() => {}} />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Toggle label="Automatic backups" desc="Daily encrypted backups" value={true} onChange={() => {}} />
                        <Toggle label="Backup encryption" desc="Encrypt backup files" value={true} onChange={() => {}} />
                      </div>

                      <div>
                        <label className="text-sm font-medium">Encryption Key Rotation</label>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Database Keys</label>
                            <select className="mt-1 w-full h-8 px-2 rounded border border-border bg-background text-xs">
                              <option>30 days</option>
                              <option>90 days</option>
                              <option>180 days</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">API Keys</label>
                            <select className="mt-1 w-full h-8 px-2 rounded border border-border bg-background text-xs">
                              <option>Never</option>
                              <option>90 days</option>
                              <option>180 days</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">File Encryption</label>
                            <select className="mt-1 w-full h-8 px-2 rounded border border-border bg-background text-xs">
                              <option>30 days</option>
                              <option>90 days</option>
                              <option>180 days</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Security Monitoring */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-foreground">Security Monitoring</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Toggle label="Intrusion detection" desc="Monitor for suspicious activity" value={true} onChange={() => {}} />
                        <Toggle label="Failed login alerts" desc="Notify admins of failed attempts" value={true} onChange={() => {}} />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Toggle label="Data breach alerts" desc="Immediate notification of breaches" value={true} onChange={() => {}} />
                        <Toggle label="Compliance monitoring" desc="Continuous HIPAA/GDPR checks" value={true} onChange={() => {}} />
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
                            <p className="text-xs text-muted-foreground">Last reviewed: Dec 15, 2024</p>
                            <button className="text-xs font-semibold text-orange-600 hover:underline mt-2">
                              View Plan
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">Primary Contact</label>
                              <input type="email" placeholder="security@hospital.com"
                                     className="mt-1 w-full h-8 px-2 rounded border border-border bg-background text-xs" />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">Emergency Phone</label>
                              <input type="tel" placeholder="+1-555-0123"
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
                          Passed
                        </span>
                          </div>
                          <p className="text-xs text-muted-foreground">Completed on Oct 15, 2024</p>
                          <button className="text-xs font-semibold text-orange-600 hover:underline mt-2">
                            View Report
                          </button>
                        </div>
                        <div className="p-4 rounded-lg border border-border">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium">Next Security Audit</p>
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                          Scheduled
                        </span>
                          </div>
                          <p className="text-xs text-muted-foreground">Due on Apr 15, 2025</p>
                          <button className="text-xs font-semibold text-orange-600 hover:underline mt-2">
                            Schedule Now
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Toggle label="Automated vulnerability scanning" desc="Weekly security scans" value={true} onChange={() => {}} />
                        <Toggle label="Third-party security reviews" desc="Annual external assessments" value={true} onChange={() => {}} />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold">
                        <Shield className="size-4" /> Run Security Audit
                      </button>
                      <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm">
                        <Download className="size-4" /> Export Security Report
                      </button>
                      <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm">
                        <Key className="size-4" /> Generate Security Keys
                      </button>
                    </div>
                  </div>
                </Card>
            )}
          </div>
        </div>
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
            <button className="text-sm text-muted-foreground hover:text-foreground">
              <Edit className="size-4" />
            </button>
        )}
      </div>
  );
}

function AuditRow({ event }: { event: any }) {
  const date = new Date(event.createdAt);
  const isValidDate = !isNaN(date.getTime()); // Check if the date is valid
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
    appointments: "Manage hospital appointments and schedules",
    pharmacy: "Handle pharmacy operations and medication orders",
    lab: "Manage laboratory tests and results",
    billing: "Process patient billing and insurance claims",
    inpatient: "Manage inpatient admissions and stays",
    emergency: "Handle emergency department operations",
    telemedicine: "Provide remote patient consultations",
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
  const [enabled, setEnabled] = useState(false);
  const [config, setConfig] = useState<{ [key: string]: any }>({});
  const [isPreferred, setIsPreferred] = useState(false);

  const updateConfig = (key: string, value: any) => {
    setConfig({ ...config, [key]: value });
  };

  const testIntegration = async () => {
    // Implement test logic based on provider and config
    toast.success(`Test successful for ${name}`);
  };

  return (
      <div className={`p-4 rounded-lg border border-border transition-all ${enabled ? "bg-muted/30" : "bg-background"} hover:bg-muted`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`size-8 rounded-full flex items-center justify-center text-white relative`}
                 style={{ backgroundColor: `${color}-500` }}>
              <Icon className="size-4" />
              {isPreferred && (
                  <div className="absolute -top-1 -right-1 size-3 rounded-full bg-emerald-500 border border-white flex items-center justify-center">
                    <Check className="size-1.5 text-white" />
                  </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium">{name}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          </div>
          <Toggle
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
                            placeholder={field.placeholder}
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
                          placeholder={field.placeholder}
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
                  />
                  <label htmlFor={`preferred-${provider}`} className="text-xs font-medium text-muted-foreground cursor-pointer">
                    Set as preferred provider
                  </label>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                    onClick={testIntegration}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold"
                >
                  <Zap className="size-4" /> {testAction}
                </button>
                <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm">
                  <Save className="size-4" /> Save Configuration
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
