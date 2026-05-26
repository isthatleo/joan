"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { BellRing, CalendarClock, CircleAlert, RefreshCw, ShieldCheck } from "lucide-react";

type AlertItem = {
  id: string;
  childName: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  status: string;
  createdAt?: string | null;
  dueDate?: string | null;
  actionRequired: boolean;
  actionUrl?: string | null;
};

type Settings = {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  appointmentReminders: boolean;
  vaccinationReminders: boolean;
  medicationReminders: boolean;
  healthCheckReminders: boolean;
  reminderAdvanceTime: number;
};

type Payload = { alerts: AlertItem[]; settings: Settings };

export default function GuardianAlertsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [data, setData] = useState<Payload | null>(null);
  const [status, setStatus] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [childName, setChildName] = useState("all");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  async function load(showSpinner = true) {
    if (showSpinner) setRefreshing(true);
    const response = await fetch(`/api/tenant/${slug}/guardian/alerts`, { cache: "no-store", credentials: "include" });
    if (response.ok) setData(await response.json());
    setRefreshing(false);
  }

  useEffect(() => {
    load();
    const interval = setInterval(() => load(false), 30000);
    return () => clearInterval(interval);
  }, [slug]);

  async function updateSettings(next: Settings, key?: string) {
    setSavingKey(key || "settings");
    const response = await fetch(`/api/tenant/${slug}/guardian/alerts/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(next),
    });
    if (response.ok) setData((current) => (current ? { ...current, settings: next } : current));
    setSavingKey(null);
  }

  async function acknowledge(id: string) {
    setSavingKey(id);
    await fetch(`/api/tenant/${slug}/guardian/alerts/${id}/acknowledge`, { method: "POST", credentials: "include" });
    await load(false);
    setSavingKey(null);
  }

  const childOptions = useMemo(
    () => ["all", ...Array.from(new Set((data?.alerts || []).map((item) => item.childName).filter(Boolean)))],
    [data?.alerts],
  );

  const alerts = useMemo(
    () =>
      (data?.alerts || []).filter((item) => {
        const matchesStatus = status === "all" || item.status === status;
        const matchesSeverity = severity === "all" || item.severity === severity;
        const matchesChild = childName === "all" || item.childName === childName;
        const matchesSearch = [item.title, item.message, item.childName, item.type]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search.toLowerCase()));
        return matchesStatus && matchesSeverity && matchesChild && matchesSearch;
      }),
    [childName, data?.alerts, search, severity, status],
  );

  const summary = useMemo(() => {
    const all = data?.alerts || [];
    const dueToday = all.filter((item) => item.dueDate && new Date(item.dueDate).toDateString() === new Date().toDateString()).length;
    return {
      total: all.length,
      active: all.filter((item) => item.status === "active").length,
      highSeverity: all.filter((item) => ["high", "critical"].includes(item.severity)).length,
      dueToday,
      acknowledged: all.filter((item) => item.status === "acknowledged").length,
      actionRequired: all.filter((item) => item.actionRequired).length,
    };
  }, [data?.alerts]);

  if (!data) return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading alerts...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">Alerts & Reminders</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Family alerts and reminder controls</h1>
          <p className="mt-2 text-sm text-muted-foreground">Appointments, balances, system notices, and reminder preferences for all linked children.</p>
        </div>
        <button onClick={() => load()} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
          <RefreshCw className={`mr-2 inline h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><BellRing className="h-5 w-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">Total alerts</p><p className="mt-1 text-3xl font-semibold text-foreground">{summary.total}</p></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><CircleAlert className="h-5 w-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">Active</p><p className="mt-1 text-3xl font-semibold text-foreground">{summary.active}</p></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><ShieldCheck className="h-5 w-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">Acknowledged</p><p className="mt-1 text-3xl font-semibold text-foreground">{summary.acknowledged}</p></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><CircleAlert className="h-5 w-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">High severity</p><p className="mt-1 text-3xl font-semibold text-foreground">{summary.highSeverity}</p></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><CalendarClock className="h-5 w-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">Due today</p><p className="mt-1 text-3xl font-semibold text-foreground">{summary.dueToday}</p></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><BellRing className="h-5 w-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">Action required</p><p className="mt-1 text-3xl font-semibold text-foreground">{summary.actionRequired}</p></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Reminder settings</h2>
            <div className="mt-4 grid gap-3">
              {Object.entries(data.settings).map(([key, value]) =>
                typeof value === "boolean" ? (
                  <label key={key} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground">
                    <span>{key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase())}</span>
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => updateSettings({ ...data.settings, [key]: e.target.checked } as Settings, key)}
                    />
                  </label>
                ) : (
                  <div key={key} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground">
                    <span>Reminder advance time (minutes)</span>
                    <input
                      type="number"
                      min={5}
                      step={5}
                      value={value}
                      onChange={(e) => updateSettings({ ...data.settings, reminderAdvanceTime: Number(e.target.value) } as Settings, key)}
                      className="w-28 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                ),
              )}
            </div>
            {savingKey === "settings" ? <p className="mt-3 text-sm text-muted-foreground">Saving reminder settings...</p> : null}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Reminder guidance</h2>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p>Appointment reminders track child appointments and surface when action is required.</p>
              <p>Billing alerts appear when a family balance can block downstream access like lab result downloads.</p>
              <p>Use acknowledgement to clear reviewed items without losing the audit trail of recent family alerts.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search alerts" className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground xl:col-span-2" />
            <select value={childName} onChange={(e) => setChildName(e.target.value)} className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground">
              {childOptions.map((item) => <option key={item} value={item}>{item === "all" ? "All children" : item}</option>)}
            </select>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground">
              <option value="all">All severity</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="critical">Critical</option>
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-foreground">Alert feed</h2>
              <p className="text-sm text-muted-foreground">{alerts.length} items</p>
            </div>
            <div className="mt-4 space-y-3">
              {alerts.length ? alerts.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.childName || "Family"} - {item.message}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}</span>
                        {item.dueDate ? <span>Due {new Date(item.dueDate).toLocaleString()}</span> : null}
                        <span className="capitalize">{item.type}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium capitalize text-primary">{item.severity}</span>
                      <span className="rounded-full border border-border px-2 py-1 text-xs font-medium capitalize text-muted-foreground">{item.status}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.actionUrl ? <Link href={item.actionUrl} className="rounded-xl border border-border px-3 py-2 text-sm text-foreground hover:bg-muted">Open</Link> : null}
                    {item.status === "active" ? (
                      <button onClick={() => acknowledge(item.id)} disabled={savingKey === item.id} className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                        {savingKey === item.id ? "Saving..." : "Acknowledge"}
                      </button>
                    ) : null}
                  </div>
                </div>
              )) : <div className="rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground">No alerts matched the current filters.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
