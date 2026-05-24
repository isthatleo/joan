"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  Globe,
  Loader2,
  Lock,
  MessageSquare,
  Monitor,
  Save,
  Settings,
  Shield,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/components/theme/ThemeProvider";
import { applyUserPreferences } from "@/lib/user-preferences";
import { defaultUserSettings, mergeUserSettings, type UserSettingsShape } from "@/lib/user-settings";

const orange = "#F97316";

const timezones = [
  "UTC",
  "Africa/Kampala",
  "Africa/Nairobi",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Singapore",
];

const languages = [
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
  { value: "sw", label: "Swahili" },
  { value: "ar", label: "Arabic" },
];

const tabs = [
  { id: "appearance", label: "Appearance", icon: Monitor },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "security", label: "Security", icon: Lock },
  { id: "communication", label: "Communication", icon: MessageSquare },
  { id: "workflow", label: "Workflow", icon: Settings },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function UserSettingsWorkspace({
  heading = "User Settings",
  subtitle = "Control your personal workspace preferences, communication rules, privacy, and security defaults.",
  scopeLabel = "Personal Account",
  landingPageOptions = [
    { value: "dashboard", label: "Dashboard" },
    { value: "messages", label: "Messages" },
    { value: "reports", label: "Reports" },
    { value: "tasks", label: "Tasks" },
    { value: "calendar", label: "Calendar" },
  ],
}: {
  heading?: string;
  subtitle?: string;
  scopeLabel?: string;
  landingPageOptions?: Array<{ value: string; label: string }>;
}) {
  const params = useParams();
  const slug = params?.slug as string;
  const { setTheme } = useTheme();
  const [settings, setSettings] = useState<UserSettingsShape>(defaultUserSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("appearance");
  const [initialSettings, setInitialSettings] = useState<UserSettingsShape>(defaultUserSettings);
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [requestingDesktopPermission, setRequestingDesktopPermission] = useState(false);

  useEffect(() => {
    void fetchSettings();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setDesktopPermission("unsupported");
      return;
    }
    setDesktopPermission(Notification.permission);
  }, []);

  async function fetchSettings() {
    setLoading(true);
    try {
      const response = await fetch(`/api/users/settings`);
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to load user settings");
      const merged = mergeUserSettings(payload);
      setSettings(merged);
      setInitialSettings(merged);
      setTheme(merged.appearance.theme as "light" | "dark" | "system");
      applyUserPreferences(merged);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load user settings");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const response = await fetch(`/api/users/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to save settings");
      const merged = mergeUserSettings(payload?.settings || settings);
      setSettings(merged);
      setInitialSettings(merged);
      setTheme(merged.appearance.theme as "light" | "dark" | "system");
      applyUserPreferences(merged);
      toast.success("User settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save user settings");
    } finally {
      setSaving(false);
    }
  }

  function resetCurrentState() {
    setSettings(initialSettings);
    setTheme(initialSettings.appearance.theme as "light" | "dark" | "system");
    applyUserPreferences(initialSettings);
    toast.success("Unsaved changes cleared");
  }

  useEffect(() => {
    applyUserPreferences(settings);
  }, [settings]);

  async function enableDesktopNotifications() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Browser notifications are not supported on this device.");
      return;
    }

    setRequestingDesktopPermission(true);
    try {
      const permission = await Notification.requestPermission();
      setDesktopPermission(permission);

      if (permission === "granted") {
        updateSection("notifications", { desktop: true });
        toast.success("Browser notifications enabled.");
        return;
      }

      if (permission === "denied") {
        updateSection("notifications", { desktop: false });
        toast.error("Browser notifications were blocked.");
        return;
      }

      toast.error("Browser notification permission was dismissed.");
    } finally {
      setRequestingDesktopPermission(false);
    }
  }

  function updateSection<T extends keyof UserSettingsShape>(
    section: T,
    patch: Partial<UserSettingsShape[T]>
  ) {
    setSettings((current) => ({
      ...current,
      [section]: {
        ...current[section],
        ...patch,
      },
    }));
  }

  function updateMessageSettings(patch: Partial<UserSettingsShape["communication"]["messageSettings"]>) {
    setSettings((current) => ({
      ...current,
      communication: {
        ...current.communication,
        messageSettings: {
          ...current.communication.messageSettings,
          ...patch,
        },
      },
    }));
  }

  function updateWorkingHours(
    patch: Partial<UserSettingsShape["communication"]["messageSettings"]["workingHours"]>
  ) {
    setSettings((current) => ({
      ...current,
      communication: {
        ...current.communication,
        messageSettings: {
          ...current.communication.messageSettings,
          workingHours: {
            ...current.communication.messageSettings.workingHours,
            ...patch,
          },
        },
      },
    }));
  }

  const dirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(initialSettings),
    [settings, initialSettings]
  );

  const summaryCards = useMemo(
    () => [
      { label: "Theme", value: settings.appearance.theme },
      { label: "Timezone", value: settings.appearance.timezone },
      { label: "Session Timeout", value: `${settings.security.sessionTimeout} min` },
      { label: "Messages From", value: settings.communication.messageSettings.allowMessagesFrom },
      { label: "Landing Page", value: settings.workflow.defaultLandingPage },
      { label: "Export Format", value: settings.workflow.preferredExportFormat },
    ],
    [settings]
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{scopeLabel}</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">{heading}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetCurrentState}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
          >
            Reset
          </button>
          <button
            onClick={saveSettings}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: orange }}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save Settings
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
            <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                      active
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          {activeTab === "appearance" && (
            <div className="space-y-6">
              <SectionIntro
                title="Appearance & Locale"
                description="Control how the workspace looks, reads, and behaves on your device."
              />
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <SelectField
                  label="Theme"
                  value={settings.appearance.theme}
                  onChange={(value) => {
                    updateSection("appearance", { theme: value });
                    setTheme(value);
                  }}
                  options={[
                    { value: "light", label: "Light" },
                    { value: "dark", label: "Dark" },
                    { value: "system", label: "System" },
                  ]}
                />
                <SelectField
                  label="Language"
                  value={settings.appearance.language}
                  onChange={(value) => updateSection("appearance", { language: value })}
                  options={languages}
                />
                <SelectField
                  label="Timezone"
                  value={settings.appearance.timezone}
                  onChange={(value) => updateSection("appearance", { timezone: value })}
                  options={timezones.map((timezone) => ({ value: timezone, label: timezone }))}
                />
                <SelectField
                  label="Workspace Density"
                  value={settings.appearance.density}
                  onChange={(value) => updateSection("appearance", { density: value })}
                  options={[
                    { value: "compact", label: "Compact" },
                    { value: "comfortable", label: "Comfortable" },
                    { value: "spacious", label: "Spacious" },
                  ]}
                />
                <SelectField
                  label="Calendar Week Starts"
                  value={settings.appearance.calendarStart}
                  onChange={(value) => updateSection("appearance", { calendarStart: value })}
                  options={[
                    { value: "monday", label: "Monday" },
                    { value: "sunday", label: "Sunday" },
                  ]}
                />
                <SelectField
                  label="Font Scale"
                  value={settings.appearance.fontScale}
                  onChange={(value) => updateSection("appearance", { fontScale: value })}
                  options={[
                    { value: "small", label: "Small" },
                    { value: "default", label: "Default" },
                    { value: "large", label: "Large" },
                  ]}
                />
              </div>
              <ToggleRow
                title="Reduce motion"
                description="Prefer minimal transitions and subtle movement throughout the interface."
                checked={settings.appearance.reduceMotion}
                onChange={(value) => updateSection("appearance", { reduceMotion: value })}
              />
              <ToggleRow
                title="High contrast mode"
                description="Increase contrast for text and controls to improve readability."
                checked={settings.appearance.highContrast}
                onChange={(value) => updateSection("appearance", { highContrast: value })}
              />
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-4">
              <SectionIntro
                title="Notifications"
                description="Choose which alerts are worth your attention across accounting, messaging, and security activity."
              />
              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium text-foreground">Browser notification permission</p>
                    <p className="text-sm text-muted-foreground">
                      Current status:{" "}
                      <span className="font-medium text-foreground">
                        {desktopPermission === "unsupported" ? "Unsupported" : desktopPermission}
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={enableDesktopNotifications}
                    disabled={requestingDesktopPermission || desktopPermission === "granted"}
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
                  >
                    {requestingDesktopPermission ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}
                    Enable Browser Alerts
                  </button>
                </div>
              </div>
              <ToggleRow title="Email notifications" description="Receive direct email updates for important activity." checked={settings.notifications.email} onChange={(value) => updateSection("notifications", { email: value })} />
              <ToggleRow title="Push notifications" description="Show browser or in-app prompts for live events." checked={settings.notifications.push} onChange={(value) => updateSection("notifications", { push: value })} />
              <ToggleRow title="SMS notifications" description="Send urgent alerts to your mobile number." checked={settings.notifications.sms} onChange={(value) => updateSection("notifications", { sms: value })} />
              <ToggleRow title="Desktop notifications" description="Allow browser-level alerts for time-sensitive events." checked={settings.notifications.desktop} onChange={(value) => updateSection("notifications", { desktop: value })} />
              <ToggleRow title="Daily digests" description="Bundle routine activity into a summary instead of individual alerts." checked={settings.notifications.digests} onChange={(value) => updateSection("notifications", { digests: value })} />
              <SelectField
                label="Digest frequency"
                value={settings.notifications.digestFrequency}
                onChange={(value) => updateSection("notifications", { digestFrequency: value })}
                options={[
                  { value: "daily", label: "Daily" },
                  { value: "weekly", label: "Weekly" },
                  { value: "monthly", label: "Monthly" },
                ]}
              />
              <ToggleRow title="Report ready alerts" description="Notify you when generated or scheduled reports are available." checked={settings.notifications.reportReady} onChange={(value) => updateSection("notifications", { reportReady: value })} />
              <ToggleRow title="Billing alerts" description="Surface invoice, collection, and payment exceptions." checked={settings.notifications.billingAlerts} onChange={(value) => updateSection("notifications", { billingAlerts: value })} />
              <ToggleRow title="Security alerts" description="Warn on logins, new devices, and other account security events." checked={settings.notifications.securityAlerts} onChange={(value) => updateSection("notifications", { securityAlerts: value })} />
              <ToggleRow title="Scheduled report failures" description="Notify you when a scheduled report run or delivery fails." checked={settings.notifications.scheduleFailures} onChange={(value) => updateSection("notifications", { scheduleFailures: value })} />
              <ToggleRow title="Product updates" description="Receive non-critical release notes and feature announcements." checked={settings.notifications.marketing} onChange={(value) => updateSection("notifications", { marketing: value })} />
            </div>
          )}

          {activeTab === "privacy" && (
            <div className="space-y-4">
              <SectionIntro
                title="Privacy & Visibility"
                description="Control how much presence, analytics, and profile visibility the platform exposes."
              />
              <SelectField
                label="Profile visibility"
                value={settings.privacy.profileVisibility}
                onChange={(value) => updateSection("privacy", { profileVisibility: value })}
                options={[
                  { value: "private", label: "Private" },
                  { value: "team", label: "Team only" },
                  { value: "organization", label: "Organization" },
                ]}
              />
              <ToggleRow title="Usage analytics" description="Allow product usage metrics that improve reliability and UX decisions." checked={settings.privacy.analytics} onChange={(value) => updateSection("privacy", { analytics: value })} />
              <ToggleRow title="Data sharing" description="Allow approved internal data-sharing workflows across connected modules." checked={settings.privacy.dataSharing} onChange={(value) => updateSection("privacy", { dataSharing: value })} />
              <ToggleRow title="Read receipts" description="Show when you have seen messages in internal conversations." checked={settings.privacy.readReceipts} onChange={(value) => updateSection("privacy", { readReceipts: value })} />
              <ToggleRow title="Activity status" description="Show your presence and availability to other authorized users." checked={settings.privacy.activityStatus} onChange={(value) => updateSection("privacy", { activityStatus: value })} />
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-6">
              <SectionIntro
                title="Security Controls"
                description="Manage session discipline, alerts, and account hardening preferences for your login."
              />
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <SelectField
                  label="Session timeout"
                  value={String(settings.security.sessionTimeout)}
                  onChange={(value) => updateSection("security", { sessionTimeout: Number(value) })}
                  options={[
                    { value: "15", label: "15 minutes" },
                    { value: "30", label: "30 minutes" },
                    { value: "60", label: "60 minutes" },
                    { value: "120", label: "120 minutes" },
                  ]}
                />
              </div>
              <ToggleRow title="Two-factor authentication preference" description="Store your preference for using MFA when enabled by the organization." checked={settings.security.twoFactorEnabled} onChange={(value) => updateSection("security", { twoFactorEnabled: value })} />
              <ToggleRow title="Login alerts" description="Notify you when your account signs in on a new browser or device." checked={settings.security.loginAlerts} onChange={(value) => updateSection("security", { loginAlerts: value })} />
              <ToggleRow title="Trusted devices" description="Reduce repeated prompts on recognized devices where policy allows." checked={settings.security.deviceTrust} onChange={(value) => updateSection("security", { deviceTrust: value })} />
              <ToggleRow title="Passwordless sign-in preference" description="Prefer passwordless authentication when the organization supports it." checked={settings.security.passwordlessSignin} onChange={(value) => updateSection("security", { passwordlessSignin: value })} />
              <ToggleRow title="Biometric prompt" description="Prompt for device biometrics when available on supported clients." checked={settings.security.biometricPrompt} onChange={(value) => updateSection("security", { biometricPrompt: value })} />
            </div>
          )}

          {activeTab === "communication" && (
            <div className="space-y-6">
              <SectionIntro
                title="Communication Defaults"
                description="Define how internal messaging works for you, including auto-replies, signatures, and working hours."
              />
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <SelectField
                  label="Allow messages from"
                  value={settings.communication.messageSettings.allowMessagesFrom}
                  onChange={(value) => updateMessageSettings({ allowMessagesFrom: value })}
                  options={[
                    { value: "care-team", label: "Care team" },
                    { value: "department", label: "Department only" },
                    { value: "organization", label: "Entire organization" },
                  ]}
                />
                <SelectField
                  label="Default channel"
                  value={settings.communication.messageSettings.defaultChannel}
                  onChange={(value) => updateMessageSettings({ defaultChannel: value })}
                  options={[
                    { value: "inbox", label: "Inbox" },
                    { value: "email", label: "Email" },
                    { value: "push", label: "Push alerts" },
                  ]}
                />
              </div>
              <TextAreaField
                label="Auto-reply"
                value={settings.communication.messageSettings.autoReply}
                onChange={(value) => updateMessageSettings({ autoReply: value })}
                placeholder="Optional away or routing message."
              />
              <TextAreaField
                label="Message signature"
                value={settings.communication.messageSettings.signature}
                onChange={(value) => updateMessageSettings({ signature: value })}
                placeholder="Signature appended to internal report shares or routed messages."
              />
              <ToggleRow
                title="Working hours"
                description="Respect your communication window when suggesting or routing non-urgent activity."
                checked={settings.communication.messageSettings.workingHours.enabled}
                onChange={(value) => updateWorkingHours({ enabled: value })}
              />
              {settings.communication.messageSettings.workingHours.enabled && (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <InputField
                    label="Start"
                    type="time"
                    value={settings.communication.messageSettings.workingHours.start}
                    onChange={(value) => updateWorkingHours({ start: value })}
                  />
                  <InputField
                    label="End"
                    type="time"
                    value={settings.communication.messageSettings.workingHours.end}
                    onChange={(value) => updateWorkingHours({ end: value })}
                  />
                  <SelectField
                    label="Working hours timezone"
                    value={settings.communication.messageSettings.workingHours.timezone}
                    onChange={(value) => updateWorkingHours({ timezone: value })}
                    options={timezones.map((timezone) => ({ value: timezone, label: timezone }))}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === "workflow" && (
            <div className="space-y-6">
              <SectionIntro
                title="Workflow Defaults"
                description="Tune how fast the app moves for you across reporting, destructive actions, and exports."
              />
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <SelectField
                  label="Default landing page"
                  value={settings.workflow.defaultLandingPage}
                  onChange={(value) => updateSection("workflow", { defaultLandingPage: value })}
                  options={landingPageOptions}
                />
                <SelectField
                  label="Preferred export format"
                  value={settings.workflow.preferredExportFormat}
                  onChange={(value) => updateSection("workflow", { preferredExportFormat: value })}
                  options={[
                    { value: "pdf", label: "PDF" },
                    { value: "csv", label: "CSV" },
                    { value: "html", label: "HTML" },
                  ]}
                />
              </div>
              <ToggleRow title="Quick actions" description="Show high-priority shortcuts on supported dashboard surfaces." checked={settings.workflow.quickActions} onChange={(value) => updateSection("workflow", { quickActions: value })} />
              <ToggleRow title="Confirm destructive actions" description="Require confirmation for deletes, archives, and risky irreversible actions." checked={settings.workflow.confirmDestructive} onChange={(value) => updateSection("workflow", { confirmDestructive: value })} />
              <ToggleRow title="Auto-save drafts" description="Persist report notes, message drafts, and form drafts automatically." checked={settings.workflow.autoSaveDrafts} onChange={(value) => updateSection("workflow", { autoSaveDrafts: value })} />
              <ToggleRow title="Compact tables" description="Tighten row spacing in list-heavy modules such as reports, billing, and inbox views." checked={settings.workflow.compactTables} onChange={(value) => updateSection("workflow", { compactTables: value })} />
            </div>
          )}
        </section>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 size-4 text-orange-600" />
          <p>
            These settings apply to your personal workspace experience inside {slug || "this tenant"} and do not modify hospital-wide administration, branding, or module configuration.
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionIntro({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card/60 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <label className="relative inline-flex cursor-pointer items-center self-start sm:self-center">
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
        <div className="h-6 w-11 rounded-full bg-muted transition peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-200/50 peer-checked:bg-orange-500 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-background after:transition-all peer-checked:after:translate-x-full" />
      </label>
    </div>
  );
}

function FieldShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <FieldShell label={label}>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-200/50"
      />
    </FieldShell>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <FieldShell label={label}>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-200/50"
      />
    </FieldShell>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <FieldShell label={label}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-200/50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
