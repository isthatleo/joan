"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { UserSettingsWorkspace } from "@/components/settings/UserSettingsWorkspace";
import { PageHeader } from "@/components/ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  Bell,
  Building2,
  Database,
  Download,
  Globe,
  Key,
  Loader2,
  Monitor,
  Palette,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  Shield,
  UserCog,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SectionId =
  | "general"
  | "branding"
  | "tenantDefaults"
  | "security"
  | "notifications"
  | "modules"
  | "integrations"
  | "maintenance"
  | "profile";

interface PlatformSettings {
  general: Record<string, any>;
  branding: Record<string, any>;
  tenantDefaults: Record<string, any>;
  security: Record<string, any>;
  notifications: Record<string, any>;
  modules: Record<string, boolean>;
  integrations: Record<string, any>;
  maintenance: Record<string, any>;
  sync: { version: number; lastSyncedAt: string | null };
}

const sections: Array<{ id: SectionId; label: string; description: string; icon: any; group: string }> = [
  { id: "general", label: "General", description: "Platform identity and defaults", icon: Globe, group: "Platform" },
  { id: "branding", label: "Branding", description: "System logo, colors, login copy", icon: Palette, group: "Platform" },
  { id: "tenantDefaults", label: "Tenant Defaults", description: "Provisioning and tenant behavior", icon: Building2, group: "Tenants" },
  { id: "modules", label: "Modules", description: "Global module availability", icon: Zap, group: "Tenants" },
  { id: "security", label: "Security", description: "2FA, sessions, API keys, audit retention", icon: Shield, group: "Controls" },
  { id: "notifications", label: "Notifications", description: "Platform delivery defaults", icon: Bell, group: "Controls" },
  { id: "integrations", label: "Integrations", description: "API limits and webhooks", icon: Key, group: "Controls" },
  { id: "maintenance", label: "Maintenance", description: "System access and maintenance windows", icon: Monitor, group: "System" },
  { id: "profile", label: "Super Admin Profile", description: "Personal workspace preferences", icon: UserCog, group: "Account" },
];

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function SuperAdminSettings() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [initialSettings, setInitialSettings] = useState<PlatformSettings | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = useMemo(
    () => Boolean(settings && initialSettings && JSON.stringify(settings) !== JSON.stringify(initialSettings)),
    [settings, initialSettings]
  );

  async function fetchSettings() {
    setLoading(true);
    try {
      setError(null);
      const response = await fetch("/api/platform/settings", {
        cache: "no-store",
        credentials: "include",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to load platform settings");
      setSettings(payload.settings);
      setInitialSettings(payload.settings);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Failed to load platform settings";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchSettings();
  }, []);

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    try {
      const response = await fetch("/api/platform/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ settings }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to save platform settings");
      setSettings(payload.settings);
      setInitialSettings(payload.settings);
      toast.success("Platform settings saved and synced");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Failed to save platform settings");
    } finally {
      setSaving(false);
    }
  }

  async function resetDefaults() {
    setSaving(true);
    try {
      const response = await fetch("/api/platform/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "reset-defaults" }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to reset defaults");
      setSettings(payload.settings);
      setInitialSettings(payload.settings);
      toast.success("Platform defaults restored");
    } catch (resetError) {
      toast.error(resetError instanceof Error ? resetError.message : "Failed to reset defaults");
    } finally {
      setSaving(false);
    }
  }

  function updateSection(section: keyof PlatformSettings, patch: Record<string, any>) {
    setSettings((current) => {
      if (!current) return current;
      return {
        ...current,
        [section]: {
          ...(current[section] as Record<string, any>),
          ...patch,
        },
      };
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading platform settings...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="space-y-6">
        <PageHeader title="Platform Settings" subtitle="Configure platform-wide settings for every tenant and dashboard" />
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error || "Unable to load platform settings."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const active = sections.find((section) => section.id === activeSection) || sections[0];

  return (
    <div className="space-y-6">
      <PageHeader title="Platform Settings" subtitle="System-wide settings synced across all tenant dashboards and platform surfaces" />

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Badge variant="outline">Sync v{settings.sync?.version || 1}</Badge>
        <Button variant="outline" onClick={() => fetchSettings()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Reload
        </Button>
        <Button variant="outline" onClick={() => downloadJson(`platform-settings-${new Date().toISOString().slice(0, 10)}.json`, settings)}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
        <Button variant="outline" onClick={resetDefaults} disabled={saving}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset Defaults
        </Button>
        <Button onClick={saveSettings} disabled={saving || !dirty}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {dirty && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>You have unsaved platform changes. Save to publish the next sync version across dashboards.</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings Sections
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {Array.from(new Set(sections.map((section) => section.group))).map((group) => (
              <div key={group} className="space-y-2">
                <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</p>
                {sections.filter((section) => section.group === group).map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        "w-full rounded-xl border px-3 py-3 text-left transition hover:bg-muted/50",
                        activeSection === section.id ? "border-primary bg-primary/5" : "border-transparent"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{section.label}</p>
                          <p className="text-xs text-muted-foreground">{section.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {activeSection !== "profile" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <active.icon className="h-5 w-5" />
                  {active.label}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{active.description}</p>
              </CardHeader>
              <CardContent>
                <SectionRenderer settings={settings} activeSection={activeSection} updateSection={updateSection} />
              </CardContent>
            </Card>
          )}

          {activeSection === "profile" && (
            <UserSettingsWorkspace
              heading="Super Admin Profile Settings"
              subtitle="Manage your personal super-admin workspace preferences without changing platform-wide controls."
              scopeLabel="Super Admin Account"
              landingPageOptions={[
                { value: "super-admin", label: "Super Admin Dashboard" },
                { value: "tenants", label: "Tenants" },
                { value: "billing", label: "Billing" },
                { value: "global-analytics", label: "Global Analytics" },
                { value: "messages", label: "Messages" },
                { value: "system-health", label: "System Health" },
              ]}
            />
          )}

          <Card>
            <CardHeader><CardTitle>Sync State</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <InfoTile label="Settings Version" value={`v${settings.sync?.version || 1}`} />
              <InfoTile label="Last Synced" value={settings.sync?.lastSyncedAt ? new Date(settings.sync.lastSyncedAt).toLocaleString() : "Not synced yet"} />
              <InfoTile label="Scope" value="All dashboards and tenants" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SectionRenderer({
  settings,
  activeSection,
  updateSection,
}: {
  settings: PlatformSettings;
  activeSection: Exclude<SectionId, "profile">;
  updateSection: (section: keyof PlatformSettings, patch: Record<string, any>) => void;
}) {
  switch (activeSection) {
    case "general":
      return (
        <Grid>
          <TextField label="Platform Name" value={settings.general.platformName} onChange={(value) => updateSection("general", { platformName: value })} />
          <TextField label="Support Email" value={settings.general.supportEmail} onChange={(value) => updateSection("general", { supportEmail: value })} />
          <TextField label="Operations Email" value={settings.general.operationsEmail} onChange={(value) => updateSection("general", { operationsEmail: value })} />
          <TextField label="Public Website" value={settings.general.publicWebsite} onChange={(value) => updateSection("general", { publicWebsite: value })} />
          <TextField label="Timezone" value={settings.general.timezone} onChange={(value) => updateSection("general", { timezone: value })} />
          <TextField label="Release Channel" value={settings.general.releaseChannel} onChange={(value) => updateSection("general", { releaseChannel: value })} />
          <TextArea label="Platform Description" value={settings.general.platformDescription} onChange={(value) => updateSection("general", { platformDescription: value })} />
        </Grid>
      );
    case "branding":
      return (
        <div className="space-y-6">
          <Grid>
            <TextField label="Logo URL" value={settings.branding.logoUrl} onChange={(value) => updateSection("branding", { logoUrl: value })} />
            <TextField label="Favicon URL" value={settings.branding.faviconUrl} onChange={(value) => updateSection("branding", { faviconUrl: value })} />
            <ColorField label="Primary Color" value={settings.branding.primaryColor} onChange={(value) => updateSection("branding", { primaryColor: value })} />
            <ColorField label="Accent Color" value={settings.branding.accentColor} onChange={(value) => updateSection("branding", { accentColor: value })} />
            <TextArea label="Login Message" value={settings.branding.loginMessage} onChange={(value) => updateSection("branding", { loginMessage: value })} />
          </Grid>
          <div className="overflow-hidden rounded-xl border">
            <div className="p-6 text-white" style={{ background: `linear-gradient(135deg, ${settings.branding.primaryColor}, ${settings.branding.accentColor})` }}>
              <p className="text-xs uppercase tracking-[0.2em] text-white/80">Platform Preview</p>
              <h3 className="mt-2 text-2xl font-bold">{settings.general.platformName}</h3>
              <p className="mt-1 text-sm text-white/85">{settings.branding.loginMessage}</p>
            </div>
          </div>
        </div>
      );
    case "tenantDefaults":
      return (
        <Grid>
          <TextField label="Default Plan" value={settings.tenantDefaults.defaultPlan} onChange={(value) => updateSection("tenantDefaults", { defaultPlan: value })} />
          <NumberField label="Trial Days" value={settings.tenantDefaults.trialDays} onChange={(value) => updateSection("tenantDefaults", { trialDays: value })} />
          <NumberField label="Grace Period Days" value={settings.tenantDefaults.gracePeriodDays} onChange={(value) => updateSection("tenantDefaults", { gracePeriodDays: value })} />
          <ToggleRow title="Require tenant admin 2FA" description="Apply 2FA requirement to tenant admins by default." checked={Boolean(settings.tenantDefaults.requireTenant2fa)} onChange={(value) => updateSection("tenantDefaults", { requireTenant2fa: value })} />
          <ToggleRow title="Auto-provision modules" description="Enable selected platform modules during tenant provisioning." checked={Boolean(settings.tenantDefaults.autoProvisionModules)} onChange={(value) => updateSection("tenantDefaults", { autoProvisionModules: value })} />
          <ToggleRow title="Allow tenant branding" description="Let hospitals customize their logo, colors, and favicon." checked={Boolean(settings.tenantDefaults.allowTenantBranding)} onChange={(value) => updateSection("tenantDefaults", { allowTenantBranding: value })} />
        </Grid>
      );
    case "security":
      return (
        <Grid>
          <ToggleRow title="Require super-admin 2FA" description="Require stronger authentication for every super admin." checked={Boolean(settings.security.requireSuperAdmin2fa)} onChange={(value) => updateSection("security", { requireSuperAdmin2fa: value })} />
          <ToggleRow title="Require tenant-admin 2FA" description="Force all hospital admins to use 2FA." checked={Boolean(settings.security.requireTenantAdmin2fa)} onChange={(value) => updateSection("security", { requireTenantAdmin2fa: value })} />
          <ToggleRow title="Block inactive tenant access" description="Archived tenants cannot load login or dashboard routes." checked={Boolean(settings.security.blockInactiveTenantAccess)} onChange={(value) => updateSection("security", { blockInactiveTenantAccess: value })} />
          <ToggleRow title="Allow API keys" description="Permit platform and tenant API key workflows." checked={Boolean(settings.security.allowApiKeys)} onChange={(value) => updateSection("security", { allowApiKeys: value })} />
          <NumberField label="Session Timeout Minutes" value={settings.security.sessionTimeoutMinutes} onChange={(value) => updateSection("security", { sessionTimeoutMinutes: value })} />
          <NumberField label="Password Minimum Length" value={settings.security.passwordMinLength} onChange={(value) => updateSection("security", { passwordMinLength: value })} />
          <NumberField label="Audit Retention Days" value={settings.security.auditLogRetentionDays} onChange={(value) => updateSection("security", { auditLogRetentionDays: value })} />
          <TextArea label="IP Whitelist" value={(settings.security.ipWhitelist || []).join("\n")} onChange={(value) => updateSection("security", { ipWhitelist: value.split(/\s+/).filter(Boolean) })} />
        </Grid>
      );
    case "notifications":
      return (
        <Grid>
          {Object.entries(settings.notifications).map(([key, value]) => (
            <ToggleRow key={key} title={labelize(key)} description={`Enable or disable ${labelize(key).toLowerCase()} globally.`} checked={Boolean(value)} onChange={(checked) => updateSection("notifications", { [key]: checked })} />
          ))}
        </Grid>
      );
    case "modules":
      return (
        <Grid>
          {Object.entries(settings.modules).map(([key, value]) => (
            <ToggleRow key={key} title={labelize(key)} description={`Make ${labelize(key).toLowerCase()} available across tenant dashboards.`} checked={Boolean(value)} onChange={(checked) => updateSection("modules", { [key]: checked })} />
          ))}
        </Grid>
      );
    case "integrations":
      return (
        <Grid>
          <ToggleRow title="Rate limiting" description="Protect platform APIs from abusive traffic." checked={Boolean(settings.integrations.rateLimitEnabled)} onChange={(value) => updateSection("integrations", { rateLimitEnabled: value })} />
          <ToggleRow title="Public API" description="Enable platform public API access." checked={Boolean(settings.integrations.publicApiEnabled)} onChange={(value) => updateSection("integrations", { publicApiEnabled: value })} />
          <ToggleRow title="Webhooks" description="Send platform events to the configured webhook endpoint." checked={Boolean(settings.integrations.webhookEnabled)} onChange={(value) => updateSection("integrations", { webhookEnabled: value })} />
          <NumberField label="Rate Limit Requests" value={settings.integrations.rateLimitRequests} onChange={(value) => updateSection("integrations", { rateLimitRequests: value })} />
          <NumberField label="Rate Limit Window Seconds" value={settings.integrations.rateLimitWindowSeconds} onChange={(value) => updateSection("integrations", { rateLimitWindowSeconds: value })} />
          <TextField label="Webhook URL" value={settings.integrations.webhookUrl} onChange={(value) => updateSection("integrations", { webhookUrl: value })} />
        </Grid>
      );
    case "maintenance":
      return (
        <Grid>
          <ToggleRow title="Maintenance mode" description="Restrict platform access while maintenance is active." checked={Boolean(settings.maintenance.enabled)} onChange={(value) => updateSection("maintenance", { enabled: value })} />
          <ToggleRow title="Allow super-admin access" description="Let super admins access the system during maintenance." checked={Boolean(settings.maintenance.allowSuperAdmins)} onChange={(value) => updateSection("maintenance", { allowSuperAdmins: value })} />
          <TextField label="Scheduled Start" value={settings.maintenance.scheduledStart} onChange={(value) => updateSection("maintenance", { scheduledStart: value })} />
          <TextField label="Scheduled End" value={settings.maintenance.scheduledEnd} onChange={(value) => updateSection("maintenance", { scheduledEnd: value })} />
          <TextArea label="Maintenance Message" value={settings.maintenance.message} onChange={(value) => updateSection("maintenance", { message: value })} />
        </Grid>
      );
    default:
      return null;
  }
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{children}</div>;
}

function labelize(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <Input value={value || ""} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <Input type="number" value={Number(value || 0)} onChange={(event) => onChange(Number(event.target.value || 0))} />
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div className="flex gap-2">
        <Input type="color" value={value || "#f97316"} onChange={(event) => onChange(event.target.value)} className="h-10 w-16 p-1" />
        <Input value={value || ""} onChange={(event) => onChange(event.target.value)} />
      </div>
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2 lg:col-span-2">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <textarea
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-28 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

function ToggleRow({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors", checked ? "bg-primary" : "bg-muted")}
        aria-pressed={checked}
      >
        <span className={cn("inline-block h-4 w-4 rounded-full bg-background transition-transform", checked ? "translate-x-6" : "translate-x-1")} />
      </button>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}
