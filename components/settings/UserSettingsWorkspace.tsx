"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
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
  Upload,
  Volume2,
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

const soundOptions = [
  { value: "classic", label: "Classic ring" },
  { value: "pulse", label: "Pulse" },
  { value: "chime", label: "Chime" },
  { value: "digital", label: "Digital" },
  { value: "soft", label: "Soft clinic" },
  { value: "urgent", label: "Urgent" },
  { value: "bell", label: "Bell" },
  { value: "pop", label: "Pop" },
  { value: "spark", label: "Spark" },
  { value: "tone", label: "Clean tone" },
  { value: "custom", label: "Uploaded audio" },
  { value: "silent", label: "Silent" },
];

const tabs = [
  { id: "appearance", label: "Appearance", icon: Monitor },
  { id: "notifications", label: "Notifications & Sound", icon: Bell },
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
  const notificationUploadRef = useRef<HTMLInputElement>(null);
  const ringtoneUploadRef = useRef<HTMLInputElement>(null);

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

  function updateSection(section: keyof UserSettingsShape, patch: any) {
    setSettings((current) => ({
      ...current,
      [section]: {
        ...current[section],
        ...patch,
      },
    }));
  }

  function updateMessageSettings(patch: any) {
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

  function updateSoundSettings(patch: Partial<UserSettingsShape["notifications"]>) {
    setSettings((current) => ({
      ...current,
      notifications: {
        ...current.notifications,
        ...patch,
      },
      communication: {
        ...current.communication,
        messageSettings: {
          ...current.communication.messageSettings,
          ...(patch.ringtone ? { ringtone: patch.ringtone } : {}),
          ...(typeof patch.ringtoneVolume === "number" ? { ringtoneVolume: patch.ringtoneVolume } : {}),
        },
      },
    }));
  }

  function previewNotificationSound() {
    playSoundPreview(settings.notifications.notificationSound, settings.notifications.notificationVolume, settings.notifications.customNotificationSoundDataUrl);
  }

  function previewRingtone() {
    playSoundPreview(settings.notifications.ringtone, settings.notifications.ringtoneVolume, settings.notifications.customRingtoneDataUrl);
  }

  async function handleAudioUpload(file: File | undefined, kind: "notification" | "ringtone") {
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      toast.error("Select an audio file.");
      return;
    }
    if (file.size > 1_500_000) {
      toast.error("Audio file is too large. Use a file under 1.5 MB.");
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    if (kind === "notification") {
      updateSoundSettings({ notificationSound: "custom", customNotificationSoundName: file.name, customNotificationSoundDataUrl: dataUrl });
      toast.success("Custom notification sound loaded. Save settings to persist it.");
      return;
    }
    updateSoundSettings({ ringtone: "custom", customRingtoneName: file.name, customRingtoneDataUrl: dataUrl });
    toast.success("Custom ringtone loaded. Save settings to persist it.");
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
      { label: "Ringtone", value: settings.notifications.ringtone === "custom" ? settings.notifications.customRingtoneName || "Custom" : settings.notifications.ringtone },
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
                    setTheme(value as any);
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
                  onChange={(value) => updateSection("appearance", { language: value, languageSource: "user" as any })}
                  options={languages}
                />
                <SelectField
                  label="Timezone"
                  value={settings.appearance.timezone}
                  onChange={(value) => updateSection("appearance", { timezone: value })}
                  options={timezones.map((timezone) => ({ value: timezone, label: timezone }))}
                />
                <SelectField
                  label="Time Format"
                  value={settings.appearance.timeFormat}
                  onChange={(value) => updateSection("appearance", { timeFormat: value })}
                  options={[
                    { value: "12h", label: "12-hour format" },
                    { value: "24h", label: "24-hour format" },
                  ]}
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
                title="Notifications & Sound"
                description="Choose alert channels, notification tones, incoming-call ringtones, and custom audio for this user account."
              />
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <SoundCard
                  title="Notification sound"
                  description="Played for new messages and realtime in-app alerts."
                  sound={settings.notifications.notificationSound}
                  volume={settings.notifications.notificationVolume}
                  customName={settings.notifications.customNotificationSoundName}
                  onSoundChange={(value) => updateSoundSettings({ notificationSound: value as any })}
                  onVolumeChange={(value) => updateSoundSettings({ notificationVolume: value })}
                  onPreview={previewNotificationSound}
                  onUploadClick={() => notificationUploadRef.current?.click()}
                />
                <SoundCard
                  title="Incoming call ringtone"
                  description="Played when another user starts a voice or video call."
                  sound={settings.notifications.ringtone}
                  volume={settings.notifications.ringtoneVolume}
                  customName={settings.notifications.customRingtoneName}
                  onSoundChange={(value) => updateSoundSettings({ ringtone: value as any })}
                  onVolumeChange={(value) => updateSoundSettings({ ringtoneVolume: value })}
                  onPreview={previewRingtone}
                  onUploadClick={() => ringtoneUploadRef.current?.click()}
                />
                <input ref={notificationUploadRef} type="file" accept="audio/*" className="hidden" onChange={(event) => void handleAudioUpload(event.target.files?.[0], "notification")} />
                <input ref={ringtoneUploadRef} type="file" accept="audio/*" className="hidden" onChange={(event) => void handleAudioUpload(event.target.files?.[0], "ringtone")} />
              </div>
              <p className="rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                Custom audio is stored in your user settings as a small browser-compatible audio file. Use short MP3, WAV, OGG, or M4A clips under 1.5 MB for reliable sync across dashboards.
              </p>
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

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Failed to read audio file"));
    reader.readAsDataURL(file);
  });
}

function playSoundPreview(sound: string, volume: number, customDataUrl?: string) {
  if (typeof window === "undefined") return;
  if (sound === "custom" && customDataUrl) {
    const audio = new Audio(customDataUrl);
    audio.volume = Math.min(1, Math.max(0, volume));
    void audio.play().catch(() => undefined);
    window.setTimeout(() => {
      audio.pause();
      audio.currentTime = 0;
    }, 3000);
    return;
  }

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass || sound === "silent" || volume <= 0) return;
  const context = new AudioContextClass();
  const gain = context.createGain();
  gain.gain.value = Math.min(1, Math.max(0, volume));
  gain.connect(context.destination);
  const patterns: Record<string, Array<[number, number, number]>> = {
    classic: [[880, 0, 0.18], [660, 0.22, 0.18], [880, 0.48, 0.18]],
    pulse: [[720, 0, 0.12], [720, 0.2, 0.12], [720, 0.4, 0.12]],
    chime: [[523, 0, 0.18], [659, 0.2, 0.18], [784, 0.4, 0.24]],
    digital: [[1046, 0, 0.08], [1318, 0.12, 0.08], [1046, 0.24, 0.08], [1568, 0.36, 0.12]],
    soft: [[440, 0, 0.25], [554, 0.32, 0.25], [659, 0.64, 0.25]],
    urgent: [[980, 0, 0.1], [980, 0.14, 0.1], [780, 0.32, 0.16], [980, 0.54, 0.18]],
    bell: [[784, 0, 0.2], [1046, 0.28, 0.28]],
    pop: [[660, 0, 0.08], [880, 0.1, 0.08]],
    spark: [[1200, 0, 0.06], [1600, 0.09, 0.08], [1000, 0.2, 0.08]],
    tone: [[587, 0, 0.25], [587, 0.32, 0.2]],
  };
  for (const [frequency, offset, duration] of patterns[sound] || patterns.classic) {
    const oscillator = context.createOscillator();
    const noteGain = context.createGain();
    oscillator.type = sound === "digital" ? "square" : "sine";
    oscillator.frequency.value = frequency;
    noteGain.gain.setValueAtTime(0.0001, context.currentTime + offset);
    noteGain.gain.exponentialRampToValueAtTime(Math.max(0.05, volume), context.currentTime + offset + 0.02);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + offset + duration);
    oscillator.connect(noteGain);
    noteGain.connect(gain);
    oscillator.start(context.currentTime + offset);
    oscillator.stop(context.currentTime + offset + duration + 0.03);
  }
  window.setTimeout(() => void context.close().catch(() => undefined), 1300);
}

function SoundCard({
  title,
  description,
  sound,
  volume,
  customName,
  onSoundChange,
  onVolumeChange,
  onPreview,
  onUploadClick,
}: {
  title: string;
  description: string;
  sound: string;
  volume: number;
  customName: string;
  onSoundChange: (value: string) => void;
  onVolumeChange: (value: number) => void;
  onPreview: () => void;
  onUploadClick: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted/20 p-4">
      <div className="mb-4">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-4">
        <SelectField label="Sound" value={sound} onChange={onSoundChange} options={soundOptions} />
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Volume</span>
            <span className="text-xs text-muted-foreground">{Math.round(volume * 100)}%</span>
          </div>
          <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => onVolumeChange(Number(event.target.value))} className="w-full accent-orange-500" />
        </div>
        {sound === "custom" && (
          <p className="text-xs text-muted-foreground">Current file: {customName || "No custom audio uploaded"}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onPreview} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">
            <Volume2 className="size-4" />
            Preview
          </button>
          <button type="button" onClick={onUploadClick} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">
            <Upload className="size-4" />
            Upload audio
          </button>
        </div>
      </div>
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
  onChange: (value: any) => void;
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
