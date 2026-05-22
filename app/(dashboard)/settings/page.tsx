"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuthStore, type AppRole } from "@/stores/auth";
import {
  Bell, Shield, Palette, Lock, Globe, Server, Key, FileCheck,
  User, Building2, Stethoscope, Users, FlaskConical, Pill, Wallet,
  Calendar, Baby, MessageSquare, CreditCard, Database, Activity,
  Save, CheckCircle2, AlertCircle, Eye, EyeOff, Search, Sun, Moon, Monitor,
  Smartphone, Mail, Languages, Clock, Zap, Sparkles, ShieldCheck, Fingerprint,
  Upload, Download, Trash2, ChevronRight, Plus, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import Link from "next/link";

/* ---------------- Types ---------------- */
type SectionId =
  | "profile" | "appearance" | "notifications" | "security" | "privacy"
  | "language" | "communication" | "devices"
  // role-scoped
  | "clinical" | "prescribing" | "lab" | "pharmacy" | "billing"
  | "reception" | "guardian" | "patient-care" | "tenant" | "platform" | "integrations" | "compliance" | "audit";

interface SectionDef {
  id: SectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  group: "Account" | "Workspace" | "Role" | "Administration";
  roles?: AppRole[]; // if undefined → everyone
}

const SECTIONS: SectionDef[] = [
  // Account
  { id: "profile", label: "Profile", icon: User, description: "Identity, avatar and contact", group: "Account" },
  { id: "appearance", label: "Appearance", icon: Palette, description: "Theme, density and motion", group: "Account" },
  { id: "notifications", label: "Notifications", icon: Bell, description: "Channels, alerts and digests", group: "Account" },
  { id: "security", label: "Security", icon: Lock, description: "Password, 2FA and sessions", group: "Account" },
  { id: "privacy", label: "Privacy", icon: Shield, description: "Visibility and data controls", group: "Account" },
  { id: "language", label: "Language & Region", icon: Globe, description: "Locale, timezone, formats", group: "Account" },
  { id: "devices", label: "Devices & Sessions", icon: Smartphone, description: "Active devices and tokens", group: "Account" },

  // Workspace
  { id: "communication", label: "Communication", icon: MessageSquare, description: "Messaging and availability", group: "Workspace" },

  // Role-specific
  { id: "clinical", label: "Clinical Preferences", icon: Stethoscope, description: "Consultation, templates, briefings", group: "Role", roles: ["doctor", "nurse"] },
  { id: "prescribing", label: "Prescribing", icon: Pill, description: "Defaults, interactions, formularies", group: "Role", roles: ["doctor"] },
  { id: "lab", label: "Lab Workflow", icon: FlaskConical, description: "Result thresholds and signoff", group: "Role", roles: ["lab_technician", "doctor"] },
  { id: "pharmacy", label: "Pharmacy Operations", icon: Pill, description: "Dispensing, stock alerts", group: "Role", roles: ["pharmacist"] },
  { id: "billing", label: "Billing & Finance", icon: Wallet, description: "Invoicing, taxes, payments", group: "Role", roles: ["accountant", "hospital_admin"] },
  { id: "reception", label: "Front Desk", icon: Calendar, description: "Check-in, queue, walk-ins", group: "Role", roles: ["receptionist"] },
  { id: "guardian", label: "Family Care", icon: Baby, description: "Linked children and consent", group: "Role", roles: ["guardian"] },
  { id: "patient-care", label: "My Health", icon: Activity, description: "Sharing, reminders, providers", group: "Role", roles: ["patient"] },

  // Administration
  { id: "tenant", label: "Hospital Profile", icon: Building2, description: "Branding, modules, tenants", group: "Administration", roles: ["hospital_admin", "super_admin"] },
  { id: "platform", label: "Platform", icon: Server, description: "Maintenance and global flags", group: "Administration", roles: ["super_admin"] },
  { id: "integrations", label: "Integrations", icon: Key, description: "Email, SMS, storage providers", group: "Administration", roles: ["hospital_admin", "super_admin"] },
  { id: "compliance", label: "Compliance", icon: FileCheck, description: "HIPAA, GDPR and audit trail", group: "Administration", roles: ["hospital_admin", "super_admin"] },
  { id: "audit", label: "Audit Log", icon: Database, description: "Who did what and when", group: "Administration", roles: ["hospital_admin", "super_admin"] },
];

/* ---------------- Page ---------------- */
export default function SettingsPage() {
  const { user } = useAuthStore();
  const role = (user?.role || "patient") as AppRole;
  const { theme, setTheme } = useTheme();

  const visible = useMemo(
    () => SECTIONS.filter(s => !s.roles || s.roles.includes(role)),
    [role]
  );

  const [active, setActive] = useState<SectionId>("profile");
  const [search, setSearch] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return visible;
    const q = search.toLowerCase();
    return visible.filter(s => s.label.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
  }, [visible, search]);

  const grouped = useMemo(() => {
    const g: Record<string, SectionDef[]> = {};
    filtered.forEach(s => { (g[s.group] ||= []).push(s); });
    return g;
  }, [filtered]);

  const activeDef = visible.find(s => s.id === active) || visible[0];

  async function handleSaveAll() {
    setSaving(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      toast.success("Preferences saved");
      setDirty(false);
    } finally { setSaving(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero */}
      <div className="relative border-b border-border bg-card overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
             style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "24px 24px" }} />
        <div className="relative px-6 py-7 lg:px-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
              <Sparkles className="size-3.5 text-orange-500" />
              <span>Personalized for {prettyRole(role)}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Tailor your workspace, security and role-specific preferences. Changes sync across all your devices.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {dirty && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-500/20">
                <AlertCircle className="size-3.5" /> Unsaved changes
              </span>
            )}
            <button
              onClick={handleSaveAll}
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
                placeholder="Search settings…"
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              />
            </div>

            {Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground px-2 mb-2">{group}</p>
                <nav className="space-y-1">
                  {items.map(s => {
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
                        <span className={`size-8 grid place-items-center rounded-lg ${isActive ? "bg-orange-500 text-white" : "bg-muted text-muted-foreground group-hover:bg-background"}`}>
                          <Icon className="size-4" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold truncate">{s.label}</span>
                          <span className="block text-[11px] text-muted-foreground truncate">{s.description}</span>
                        </span>
                        <ChevronRight className={`size-4 shrink-0 ${isActive ? "text-orange-500" : "text-transparent group-hover:text-muted-foreground"}`} />
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
          <SectionShell def={activeDef} onDirty={() => setDirty(true)}>
            <SectionContent id={activeDef.id} role={role} theme={theme} setTheme={setTheme} onDirty={() => setDirty(true)} />
          </SectionShell>
        </main>
      </div>
    </div>
  );
}

/* ---------------- Section Shell ---------------- */
function SectionShell({ def, children }: { def: SectionDef; children: React.ReactNode; onDirty: () => void }) {
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

/* ---------------- Section Content Router ---------------- */
function SectionContent({ id, role, theme, setTheme, onDirty }: {
  id: SectionId; role: AppRole; theme?: string; setTheme: (t: string) => void; onDirty: () => void;
}) {
  switch (id) {
    case "profile":       return <ProfileSection onDirty={onDirty} role={role} />;
    case "appearance":    return <AppearanceSection theme={theme} setTheme={setTheme} onDirty={onDirty} />;
    case "notifications": return <NotificationsSection onDirty={onDirty} />;
    case "security":      return <SecuritySection onDirty={onDirty} />;
    case "privacy":       return <PrivacySection onDirty={onDirty} />;
    case "language":      return <LanguageSection onDirty={onDirty} />;
    case "devices":       return <DevicesSection />;
    case "communication": return <CommunicationSection onDirty={onDirty} />;
    case "clinical":      return <ClinicalSection onDirty={onDirty} />;
    case "prescribing":   return <PrescribingSection onDirty={onDirty} />;
    case "lab":           return <LabSection onDirty={onDirty} />;
    case "pharmacy":      return <PharmacySection onDirty={onDirty} />;
    case "billing":       return <BillingSection onDirty={onDirty} />;
    case "reception":     return <ReceptionSection onDirty={onDirty} />;
    case "guardian":      return <GuardianSection onDirty={onDirty} />;
    case "patient-care":  return <PatientCareSection onDirty={onDirty} />;
    case "tenant":        return <TenantSection onDirty={onDirty} />;
    case "platform":      return <PlatformSection onDirty={onDirty} />;
    case "integrations":  return <IntegrationsSection onDirty={onDirty} />;
    case "compliance":    return <ComplianceSection onDirty={onDirty} />;
    case "audit":         return <AuditSection />;
    default:              return null;
  }
}

/* ---------------- Reusable atoms ---------------- */
function Card({ title, description, action, children }: { title?: string; description?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden">
      {(title || description || action) && (
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
          <div>
            {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Row({ icon: Icon, title, hint, children }: { icon?: any; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && <span className="size-9 grid place-items-center rounded-lg bg-muted text-foreground shrink-0"><Icon className="size-4" /></span>}
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{title}</p>
          {hint && <p className="text-xs text-muted-foreground truncate">{hint}</p>}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "bg-orange-500" : "bg-muted"}`}
      aria-pressed={checked}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-foreground mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 ${props.className || ""}`} />;
}

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 ${props.className || ""}`} />;
}

function Stat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "success" | "warn" | "danger" }) {
  const toneCls = {
    default: "bg-muted text-foreground",
    success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    warn: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    danger: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
  }[tone];
  return (
    <div className={`rounded-xl px-4 py-3 ${toneCls}`}>
      <p className="text-[11px] font-medium opacity-80 uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
    </div>
  );
}

/* ---------------- Sections ---------------- */
function ProfileSection({ role }: { onDirty: () => void; role: AppRole }) {
  const { user } = useAuthStore();
  return (
    <>
      <Card>
        <div className="flex flex-col md:flex-row gap-5 items-start">
          <div className="relative">
            <div className="size-24 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 grid place-items-center text-white text-3xl font-bold shadow-lg">
              {(user?.fullName || user?.email || "U").slice(0, 1).toUpperCase()}
            </div>
            <button className="absolute -bottom-1 -right-1 size-8 grid place-items-center rounded-full bg-card border border-border shadow hover:bg-muted">
              <Upload className="size-3.5" />
            </button>
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            <Field label="Full name"><TextInput defaultValue={user?.fullName || ""} placeholder="Your name" /></Field>
            <Field label="Email"><TextInput defaultValue={user?.email || ""} type="email" /></Field>
            <Field label="Phone"><TextInput placeholder="+254 ..." /></Field>
            <Field label="Role">
              <div className="px-3 py-2 rounded-lg border border-border bg-muted text-sm font-medium text-foreground inline-flex items-center gap-2">
                <ShieldCheck className="size-4 text-orange-500" /> {prettyRole(role)}
              </div>
            </Field>
          </div>
        </div>
      </Card>
      <Card title="Bio" description="Tell colleagues a bit about yourself">
        <textarea rows={3} placeholder="Short professional bio…" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40" />
      </Card>
    </>
  );
}

function AppearanceSection({ theme, setTheme }: { theme?: string; setTheme: (t: string) => void; onDirty: () => void }) {
  const themes = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Monitor },
  ];
  return (
    <>
      <Card title="Theme" description="Choose how the interface looks to you">
        <div className="grid grid-cols-3 gap-3">
          {themes.map(t => {
            const Icon = t.icon;
            const active = theme === t.id;
            return (
              <button key={t.id} onClick={() => setTheme(t.id)}
                className={`p-4 rounded-xl border text-left transition-all ${active ? "border-orange-500 bg-orange-500/5 ring-2 ring-orange-500/20" : "border-border hover:bg-muted/50"}`}>
                <Icon className={`size-5 mb-2 ${active ? "text-orange-500" : "text-muted-foreground"}`} />
                <p className="text-sm font-semibold">{t.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.id === "system" ? "Match OS preference" : `${t.label} mode`}</p>
              </button>
            );
          })}
        </div>
      </Card>
      <Card title="Density & Motion">
        <Row icon={Zap} title="Reduced motion" hint="Minimize transitions and animations"><Toggle checked={false} onChange={() => {}} /></Row>
        <Row icon={Monitor} title="Compact mode" hint="Tighter spacing for power users"><Toggle checked={false} onChange={() => {}} /></Row>
        <Row icon={Sparkles} title="High contrast" hint="Improve readability"><Toggle checked={false} onChange={() => {}} /></Row>
      </Card>
    </>
  );
}

function NotificationsSection({ onDirty }: { onDirty?: () => void }) {
  const [s, setS] = useState({ email: true, push: true, sms: false, system: true, emergency: true, marketing: false });
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Channels on" value="3" tone="success" />
        <Stat label="Quiet hours" value="22:00–07:00" />
        <Stat label="Today" value="14 alerts" />
        <Stat label="Failed" value="0" tone="success" />
      </div>
      <Card title="Channels">
        <Row icon={Mail} title="Email" hint="Daily digest and important alerts"><Toggle checked={s.email} onChange={v => setS({ ...s, email: v })} /></Row>
        <Row icon={Bell} title="Push" hint="Browser and mobile notifications"><Toggle checked={s.push} onChange={v => setS({ ...s, push: v })} /></Row>
        <Row icon={Smartphone} title="SMS" hint="For urgent alerts only"><Toggle checked={s.sms} onChange={v => setS({ ...s, sms: v })} /></Row>
      </Card>
      <Card title="Categories">
        <Row icon={ShieldCheck} title="System alerts" hint="Maintenance and uptime"><Toggle checked={s.system} onChange={v => setS({ ...s, system: v })} /></Row>
        <Row icon={AlertCircle} title="Emergency" hint="Critical clinical events"><Toggle checked={s.emergency} onChange={v => setS({ ...s, emergency: v })} /></Row>
        <Row icon={Sparkles} title="Product updates" hint="New features and tips"><Toggle checked={s.marketing} onChange={v => setS({ ...s, marketing: v })} /></Row>
      </Card>
    </>
  );
}

function SecuritySection({ onDirty }: { onDirty?: () => void }) {
  const [show, setShow] = useState(false);
  const [twoFa, setTwoFa] = useState(true);
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Password age" value="42 days" />
        <Stat label="2FA" value={twoFa ? "Enabled" : "Off"} tone={twoFa ? "success" : "warn"} />
        <Stat label="Sessions" value="3" />
        <Stat label="Failed logins" value="0" tone="success" />
      </div>
      <Card title="Password">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Current">
            <div className="relative">
              <TextInput type={show ? "text" : "password"} />
              <button onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </Field>
          <Field label="New password"><TextInput type="password" /></Field>
          <Field label="Confirm"><TextInput type="password" /></Field>
        </div>
        <button className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold">
          Update password
        </button>
      </Card>
      <Card title="Two-factor authentication">
        <Row icon={Fingerprint} title="Authenticator app" hint="Use TOTP for sign-in"><Toggle checked={twoFa} onChange={setTwoFa} /></Row>
        <Row icon={Smartphone} title="SMS backup" hint="Fallback if app unavailable"><Toggle checked={false} onChange={() => {}} /></Row>
      </Card>
    </>
  );
}

function PrivacySection({ onDirty }: { onDirty?: () => void }) {
  return (
    <>
      <Card title="Visibility">
        <Field label="Profile visibility">
          <SelectInput defaultValue="contacts">
            <option value="public">Public</option>
            <option value="contacts">Contacts only</option>
            <option value="private">Private</option>
          </SelectInput>
        </Field>
      </Card>
      <Card title="Data">
        <Row icon={Activity} title="Usage analytics" hint="Help us improve the product"><Toggle checked onChange={() => {}} /></Row>
        <Row icon={Database} title="Audit logging" hint="Record privileged actions"><Toggle checked onChange={() => {}} /></Row>
      </Card>
      <Card title="Data export & deletion">
        <div className="flex flex-wrap gap-2">
          <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted text-sm"><Download className="size-4" /> Export my data</button>
          <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-rose-200 dark:border-rose-500/30 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-sm"><Trash2 className="size-4" /> Delete account</button>
        </div>
      </Card>
    </>
  );
}

function LanguageSection({ onDirty }: { onDirty?: () => void }) {
  return (
    <Card title="Locale">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Language">
          <SelectInput defaultValue="en"><option value="en">English (US)</option><option value="sw">Swahili</option><option value="fr">French</option></SelectInput>
        </Field>
        <Field label="Timezone">
          <SelectInput defaultValue="UTC"><option>UTC</option><option>Africa/Nairobi</option><option>Europe/London</option><option>America/New_York</option></SelectInput>
        </Field>
        <Field label="Date format">
          <SelectInput defaultValue="iso"><option value="iso">YYYY-MM-DD</option><option value="us">MM/DD/YYYY</option><option value="eu">DD/MM/YYYY</option></SelectInput>
        </Field>
      </div>
    </Card>
  );
}

function DevicesSection({ onDirty }: { onDirty?: () => void } = {}) {
  const devices = [
    { name: "MacBook Pro · Chrome", where: "Nairobi, KE", last: "Active now", current: true },
    { name: "iPhone 15 · Safari", where: "Nairobi, KE", last: "2h ago" },
    { name: "Windows · Edge", where: "Mombasa, KE", last: "3d ago" },
  ];
  return (
    <Card title="Active sessions" description="Sign out anywhere you don't recognize">
      <div className="space-y-2">
        {devices.map((d, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-muted grid place-items-center"><Smartphone className="size-4" /></div>
              <div>
                <p className="text-sm font-semibold">{d.name} {d.current && <span className="ml-2 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">CURRENT</span>}</p>
                <p className="text-xs text-muted-foreground">{d.where} · {d.last}</p>
              </div>
            </div>
            {!d.current && <button className="text-xs font-semibold text-rose-600 hover:underline">Sign out</button>}
          </div>
        ))}
      </div>
    </Card>
  );
}

function CommunicationSection({ onDirty }: { onDirty?: () => void }) {
  return (
    <>
      <Card title="Messaging">
        <Field label="Allow messages from">
          <SelectInput defaultValue="contacts"><option value="anyone">Anyone</option><option value="contacts">My contacts</option><option value="doctors">Doctors only</option><option value="none">No one</option></SelectInput>
        </Field>
        <Field label="Auto-reply">
          <TextInput placeholder="I'll respond within 24 hours…" />
        </Field>
      </Card>
      <Card title="Working hours">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Row icon={Clock} title="Enable" hint="Show as busy outside hours"><Toggle checked onChange={() => {}} /></Row>
          <Field label="Start"><TextInput type="time" defaultValue="09:00" /></Field>
          <Field label="End"><TextInput type="time" defaultValue="17:00" /></Field>
        </div>
      </Card>
    </>
  );
}

function ClinicalSection({ onDirty }: { onDirty?: () => void }) {
  return (
    <>
      <Card title="Consultation defaults">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Default duration"><SelectInput defaultValue="20"><option>10</option><option>15</option><option>20</option><option>30</option><option>45</option></SelectInput></Field>
          <Field label="Buffer between visits"><SelectInput defaultValue="5"><option>0</option><option>5</option><option>10</option><option>15</option></SelectInput></Field>
        </div>
        <Row icon={Sparkles} title="AI patient briefing" hint="Auto-summarize each chart before visit"><Toggle checked onChange={() => {}} /></Row>
        <Row icon={Activity} title="Vital flags" hint="Highlight out-of-range vitals"><Toggle checked onChange={() => {}} /></Row>
      </Card>
      <Card title="Clinical notes">
        <Field label="Note template">
          <SelectInput defaultValue="soap"><option value="soap">SOAP</option><option value="dap">DAP</option><option value="freeform">Free-form</option></SelectInput>
        </Field>
      </Card>
    </>
  );
}

function PrescribingSection({ onDirty }: { onDirty?: () => void }) {
  return (
    <Card title="Prescribing safeguards">
      <Row icon={AlertCircle} title="Drug interaction warnings" hint="Block prescribing on severe interactions"><Toggle checked onChange={() => {}} /></Row>
      <Row icon={ShieldCheck} title="Allergy double-check" hint="Confirm before any prescription"><Toggle checked onChange={() => {}} /></Row>
      <Field label="Default formulary"><SelectInput defaultValue="who"><option value="who">WHO Essential Medicines</option><option value="custom">Hospital formulary</option></SelectInput></Field>
    </Card>
  );
}

function LabSection({ onDirty }: { onDirty?: () => void }) {
  return (
    <Card title="Lab workflow">
      <Row icon={CheckCircle2} title="Auto-publish normal results" hint="Skip manual signoff for in-range values"><Toggle checked={false} onChange={() => {}} /></Row>
      <Row icon={AlertCircle} title="Critical value alerts" hint="Page on-call doctor immediately"><Toggle checked onChange={() => {}} /></Row>
      <Field label="Result delivery"><SelectInput defaultValue="portal"><option value="portal">Patient portal</option><option value="email">Email</option><option value="sms">SMS link</option></SelectInput></Field>
    </Card>
  );
}

function PharmacySection({ onDirty }: { onDirty?: () => void }) {
  return (
    <Card title="Pharmacy operations">
      <Row icon={AlertCircle} title="Low-stock alerts" hint="Notify when below threshold"><Toggle checked onChange={() => {}} /></Row>
      <Row icon={Clock} title="Expiry warnings" hint="Flag items expiring within 90 days"><Toggle checked onChange={() => {}} /></Row>
      <Field label="Dispensing label printer"><TextInput placeholder="Brother QL-820NWB · Counter 1" /></Field>
    </Card>
  );
}

function BillingSection({ onDirty }: { onDirty?: () => void }) {
  return (
    <>
      <Card title="Invoicing">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Currency"><SelectInput defaultValue="KES"><option>KES</option><option>USD</option><option>EUR</option><option>GBP</option></SelectInput></Field>
          <Field label="Tax (%)"><TextInput type="number" defaultValue={16} /></Field>
          <Field label="Invoice prefix"><TextInput defaultValue="JJH-" /></Field>
        </div>
        <Row icon={CreditCard} title="Auto-charge insurance"><Toggle checked onChange={() => {}} /></Row>
      </Card>
      <Card title="Payment providers">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {["M-Pesa", "Stripe", "PayPal", "Cash"].map(p => (
            <label key={p} className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
              <input type="checkbox" defaultChecked className="accent-orange-500" />
              <span className="text-sm font-medium">{p}</span>
            </label>
          ))}
        </div>
      </Card>
    </>
  );
}

function ReceptionSection({ onDirty }: { onDirty?: () => void }) {
  return (
    <Card title="Front desk">
      <Row icon={Users} title="Walk-in queue" hint="Allow patients without appointments"><Toggle checked onChange={() => {}} /></Row>
      <Row icon={Smartphone} title="SMS check-in confirmations"><Toggle checked onChange={() => {}} /></Row>
      <Field label="Queue display name"><TextInput defaultValue="Counter 1" /></Field>
    </Card>
  );
}

function GuardianSection({ onDirty }: { onDirty?: () => void }) {
  return (
    <Card title="Family care">
      <Row icon={Baby} title="Linked dependents" hint="2 children connected">
        <button className="text-xs font-semibold text-orange-600 hover:underline inline-flex items-center gap-1"><Plus className="size-3.5" /> Add</button>
      </Row>
      <Row icon={Bell} title="Vaccination reminders"><Toggle checked onChange={() => {}} /></Row>
      <Row icon={ShieldCheck} title="Share records with co-guardian"><Toggle checked={false} onChange={() => {}} /></Row>
    </Card>
  );
}

function PatientCareSection({ onDirty }: { onDirty?: () => void }) {
  return (
    <Card title="My health">
      <Row icon={Bell} title="Appointment reminders" hint="24h before, then 1h before"><Toggle checked onChange={() => {}} /></Row>
      <Row icon={Pill} title="Medication reminders"><Toggle checked onChange={() => {}} /></Row>
      <Row icon={Stethoscope} title="Share records with primary doctor"><Toggle checked onChange={() => {}} /></Row>
    </Card>
  );
}

function TenantSection({ onDirty }: { onDirty?: () => void }) {
  return (
    <>
      <Card title="Hospital identity">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Display name"><TextInput defaultValue="JJ Hospital" /></Field>
          <Field label="Slug"><TextInput defaultValue="jjhospital" /></Field>
          <Field label="Contact email"><TextInput type="email" defaultValue="contact@jjhospital.co" /></Field>
          <Field label="Phone"><TextInput defaultValue="+254 700 000 000" /></Field>
        </div>
      </Card>
      <Card title="Branding">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Primary color">
            <div className="flex items-center gap-2">
              <input type="color" defaultValue="#F97316" className="size-10 rounded-lg border border-border bg-background cursor-pointer" />
              <TextInput defaultValue="#F97316" />
            </div>
          </Field>
          <Field label="Logo URL" hint="Square PNG/SVG, 256×256+"><TextInput placeholder="https://…" /></Field>
          <Field label="Favicon"><TextInput placeholder="https://…" /></Field>
        </div>
      </Card>
      <Card title="Active modules">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {["Appointments", "Pharmacy", "Lab", "Billing", "Inpatient", "Emergency", "Telemedicine", "Insurance"].map(m => (
            <label key={m} className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
              <input type="checkbox" defaultChecked className="accent-orange-500" />
              <span className="text-sm font-medium">{m}</span>
            </label>
          ))}
        </div>
      </Card>
    </>
  );
}

function PlatformSection({ onDirty }: { onDirty?: () => void }) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Environment" value="Production" tone="success" />
        <Stat label="Version" value="v2.4.1" />
        <Stat label="Region" value="us-east-1" />
        <Stat label="Uptime" value="99.99%" tone="success" />
      </div>
      <Card title="Platform controls">
        <Row icon={Server} title="Maintenance mode" hint="Show maintenance banner globally"><Toggle checked={false} onChange={() => {}} /></Row>
        <Row icon={Database} title="Read-only mode" hint="Block all writes"><Toggle checked={false} onChange={() => {}} /></Row>
        <Row icon={Sparkles} title="AI features" hint="Enable Lovable AI across tenants"><Toggle checked onChange={() => {}} /></Row>
      </Card>
    </>
  );
}

function IntegrationsSection({ onDirty }: { onDirty?: () => void }) {
  const items = [
    { name: "SendGrid", kind: "Email", status: "Connected" },
    { name: "Twilio", kind: "SMS", status: "Connected" },
    { name: "AWS S3", kind: "Storage", status: "Connected" },
    { name: "Stripe", kind: "Payments", status: "Not connected" },
    { name: "Google Analytics", kind: "Analytics", status: "Not connected" },
  ];
  return (
    <Card title="Connected services">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map(i => (
          <div key={i.name} className="p-4 rounded-xl border border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-muted grid place-items-center"><Key className="size-4" /></div>
              <div>
                <p className="text-sm font-semibold">{i.name}</p>
                <p className="text-xs text-muted-foreground">{i.kind}</p>
              </div>
            </div>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${i.status === "Connected" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
              {i.status.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ComplianceSection({ onDirty }: { onDirty?: () => void }) {
  return (
    <Card title="Regulatory">
      <Row icon={ShieldCheck} title="HIPAA mode" hint="Enforce HIPAA-grade controls"><Toggle checked onChange={() => {}} /></Row>
      <Row icon={Globe} title="GDPR mode" hint="Apply EU data subject rights"><Toggle checked onChange={() => {}} /></Row>
      <Row icon={Database} title="Encryption at rest" hint="AES-256 on all PHI"><Toggle checked onChange={() => {}} /></Row>
      <Row icon={FileCheck} title="Tamper-evident audit trail"><Toggle checked onChange={() => {}} /></Row>
    </Card>
  );
}

function AuditSection({ onDirty }: { onDirty?: () => void } = {}) {
  const events = [
    { who: "you@jjhospital.co", what: "Updated branding color", when: "2m ago" },
    { who: "admin@jjhospital.co", what: "Activated Telemedicine module", when: "1h ago" },
    { who: "system", what: "Scheduled backup completed", when: "4h ago" },
  ];
  return (
    <Card title="Recent activity">
      <div className="space-y-2">
        {events.map((e, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="size-8 grid place-items-center rounded-lg bg-orange-500/10 text-orange-600"><Activity className="size-4" /></div>
              <div>
                <p className="text-sm font-medium">{e.what}</p>
                <p className="text-xs text-muted-foreground">{e.who}</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">{e.when}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------------- Helpers ---------------- */
function prettyRole(r: AppRole) {
  return r.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
