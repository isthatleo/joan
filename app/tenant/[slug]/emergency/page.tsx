"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  AlertOctagon,
  Ambulance,
  BellRing,
  CheckCircle2,
  Phone,
  RefreshCw,
  Shield,
  Volume2,
  VolumeX,
} from "lucide-react";
import { KPICard } from "@/components/KPICard";
import { mergeUserSettings } from "@/lib/user-settings";
import { useTenantPath } from "@/hooks/useTenantPath";

type EmergencyAlert = {
  id: string;
  patientId: string | null;
  patientName: string;
  type: string;
  severity: string;
  location: string;
  description: string;
  reportedBy: string;
  reportedAt: string;
  status: string;
  assignedTeam?: string;
  eta?: string;
};

type EmergencyTeam = {
  id: string;
  name: string;
  role: string;
  status: string;
  location: string;
  lastActive: string;
};

type EmergencyProtocol = {
  id: string;
  name: string;
  type: string;
  steps: string[];
  estimatedTime: string;
  requiredPersonnel: string[];
};

function severityTone(value: string) {
  if (value === "critical") return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
  if (value === "urgent") return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "bg-muted text-muted-foreground";
}

function statusTone(value: string) {
  if (value === "resolved") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (value === "responding") return "bg-sky-500/10 text-sky-700 dark:text-sky-300";
  if (value === "cancelled") return "bg-muted text-muted-foreground";
  return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
}

export default function EmergencyPage() {
  const { slug } = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = String(slug || "");
  const tenantPath = useTenantPath();
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [teams, setTeams] = useState<EmergencyTeam[]>([]);
  const [protocols, setProtocols] = useState<EmergencyProtocol[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedAlertId, setSelectedAlertId] = useState<string>("");
  const [form, setForm] = useState({
    patientName: "",
    type: "medical",
    severity: "urgent",
    location: "Reception",
    description: "",
    reportedBy: "Reception Desk",
  });
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const fetchEmergencyData = async () => {
    try {
      setRefreshing(true);
      const [alertsRes, teamsRes, protocolsRes] = await Promise.all([
        fetch(`/api/tenant/${tenantSlug}/receptionist/emergency/alerts`, { cache: "no-store" }),
        fetch(`/api/tenant/${tenantSlug}/receptionist/emergency/teams`, { cache: "no-store" }),
        fetch(`/api/tenant/${tenantSlug}/receptionist/emergency/protocols`, { cache: "no-store" }),
      ]);
      if (alertsRes.ok) setAlerts(await alertsRes.json());
      if (teamsRes.ok) setTeams(await teamsRes.json());
      if (protocolsRes.ok) setProtocols(await protocolsRes.json());
    } catch (error) {
      console.error("Failed to fetch emergency data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmergencyData();
  }, [tenantSlug]);

  useEffect(() => {
    fetch("/api/users/settings", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        const settings = mergeUserSettings(payload);
        const forcedTutorial = searchParams.get("tutorial") === "1";
        if (forcedTutorial || !settings.workflow.receptionEmergencyTutorialSeen) {
          setTutorialOpen(true);
        }
      })
      .catch(() => {
        if (searchParams.get("tutorial") === "1") {
          setTutorialOpen(true);
        }
      })
      .finally(() => setSettingsLoaded(true));
  }, [searchParams]);

  const activeAlerts = useMemo(() => alerts.filter((item) => ["active", "responding"].includes(item.status)), [alerts]);
  const selectedAlert = useMemo(() => alerts.find((item) => item.id === selectedAlertId) || activeAlerts[0] || null, [alerts, activeAlerts, selectedAlertId]);
  const selectedProtocol = useMemo(() => protocols.find((item) => item.type === selectedAlert?.type) || protocols[0] || null, [protocols, selectedAlert]);

  const createAlert = async () => {
    if (!form.description.trim()) return;
    await fetch(`/api/tenant/${tenantSlug}/receptionist/emergency/alerts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (soundEnabled) {
      const audio = new Audio("/sounds/emergency-alert.mp3");
      audio.play().catch(() => null);
    }
    setForm((current) => ({ ...current, patientName: "", description: "" }));
    fetchEmergencyData();
  };

  const updateAlert = async (alertId: string, patch: Record<string, unknown>) => {
    await fetch(`/api/tenant/${tenantSlug}/receptionist/emergency/alerts/${alertId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    fetchEmergencyData();
  };

  const dispatchTeam = async (teamId: string, alertId: string) => {
    await fetch(`/api/tenant/${tenantSlug}/receptionist/emergency/teams/${teamId}/call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId }),
    });
    fetchEmergencyData();
  };

  const dismissTutorial = async () => {
    try {
      const response = await fetch("/api/users/settings", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      const settings = mergeUserSettings(payload);
      settings.workflow.receptionEmergencyTutorialSeen = true;
      await fetch("/api/users/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
    } catch {
      // keep the tutorial dismissible even if persistence fails
    } finally {
      setTutorialOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
          Loading emergency workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {tutorialOpen && settingsLoaded ? (
        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Quick Tutorial</p>
              <h2 className="mt-1 text-xl font-semibold text-foreground">How to run emergency response from reception</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-foreground">
                <li>Raise an alert with the patient or incident label, severity, location, and a concise description.</li>
                <li>Select the active incident from the board and dispatch the right team immediately.</li>
                <li>Use the protocol card to follow the required steps and keep the incident status current.</li>
                <li>Mark the incident as responding once a team has accepted it, then resolve or cancel it when the situation is closed.</li>
              </ol>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={tenantPath("/reception/settings")} className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground">
                Reception settings
              </Link>
              <button onClick={dismissTutorial} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                Got it
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Emergency Operations</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Emergency Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create incident alerts, coordinate responder teams, and follow the correct response protocol from the front desk.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setSoundEnabled((value) => !value)} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground">
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {soundEnabled ? "Sound On" : "Sound Off"}
          </button>
          <button onClick={fetchEmergencyData} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {activeAlerts.length > 0 ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertOctagon className="h-6 w-6 text-destructive" />
            <div>
              <p className="font-semibold text-foreground">Active emergencies: {activeAlerts.length}</p>
              <p className="text-sm text-muted-foreground">Immediate response is required until all active alerts are resolved or cancelled.</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard title="Active Alerts" value={activeAlerts.length} subtitle="Open incidents" tone="danger" icon={AlertOctagon} />
        <KPICard title="Available Teams" value={teams.filter((item) => item.status === "available").length} subtitle={`${teams.length} total responders`} tone="info" icon={Shield} />
        <KPICard title="Critical Alerts" value={alerts.filter((item) => item.severity === "critical" && item.status !== "resolved").length} subtitle="Requires highest priority" tone="warning" icon={BellRing} />
        <KPICard title="Resolved Today" value={alerts.filter((item) => item.status === "resolved").length} subtitle="Closed emergency incidents" tone="success" icon={CheckCircle2} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">Raise Emergency Alert</h2>
            <div className="mt-4 space-y-3">
              <input
                value={form.patientName}
                onChange={(event) => setForm((current) => ({ ...current, patientName: event.target.value }))}
                placeholder="Patient name or incident label"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
                  <option value="medical">Medical</option>
                  <option value="trauma">Trauma</option>
                  <option value="cardiac">Cardiac</option>
                  <option value="respiratory">Respiratory</option>
                  <option value="neurological">Neurological</option>
                  <option value="other">Other</option>
                </select>
                <select value={form.severity} onChange={(event) => setForm((current) => ({ ...current, severity: event.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
                  <option value="critical">Critical</option>
                  <option value="urgent">Urgent</option>
                  <option value="moderate">Moderate</option>
                  <option value="minor">Minor</option>
                </select>
              </div>
              <input
                value={form.location}
                onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                placeholder="Location"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              />
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Describe the incident, symptoms, or immediate safety issue."
                className="min-h-28 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground"
              />
              <button onClick={createAlert} className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground">
                <Ambulance className="h-4 w-4" />
                Trigger Emergency Alert
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">Response Teams</h2>
            <div className="mt-4 space-y-3">
              {teams.map((team) => (
                <div key={team.id} className="rounded-xl border border-border bg-background/70 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{team.name}</p>
                      <p className="text-xs text-muted-foreground">{team.role} - {team.location}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">{team.status}</span>
                      {selectedAlert ? (
                        <button onClick={() => dispatchTeam(team.id, selectedAlert.id)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground">
                          Call
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Incident Board</h2>
              <span className="text-sm text-muted-foreground">{alerts.length} total alerts</span>
            </div>
            <div className="mt-4 space-y-3">
              {alerts.map((alert) => (
                <button
                  key={alert.id}
                  onClick={() => setSelectedAlertId(alert.id)}
                  className="w-full rounded-xl border border-border bg-background/70 px-4 py-4 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{alert.patientName || "Emergency Incident"}</p>
                      <p className="text-sm text-muted-foreground">{alert.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{alert.location} - {new Date(alert.reportedAt).toLocaleString()}</p>
                    </div>
                    <div className="space-y-2 text-right">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${severityTone(alert.severity)}`}>{alert.severity}</span>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusTone(alert.status)}`}>{alert.status}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedAlert ? (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Selected Alert</p>
                  <h3 className="mt-1 text-lg font-semibold text-foreground">{selectedAlert.patientName || "Emergency Incident"}</h3>
                  <p className="text-sm text-muted-foreground">{selectedAlert.location} - {selectedAlert.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => updateAlert(selectedAlert.id, { status: "responding" })} className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground">
                    Responding
                  </button>
                  <button onClick={() => updateAlert(selectedAlert.id, { status: "resolved" })} className="rounded-lg border border-emerald-500/30 px-3 py-2 text-sm font-medium text-emerald-600">
                    Resolve
                  </button>
                  <button onClick={() => updateAlert(selectedAlert.id, { status: "cancelled" })} className="rounded-lg border border-destructive/30 px-3 py-2 text-sm font-medium text-destructive">
                    Cancel
                  </button>
                </div>
              </div>

              {selectedProtocol ? (
                <div className="mt-5 rounded-xl border border-border bg-background/70 p-4">
                  <h4 className="font-semibold text-foreground">{selectedProtocol.name}</h4>
                  <p className="text-sm text-muted-foreground">Estimated time: {selectedProtocol.estimatedTime}</p>
                  <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-foreground">
                    {selectedProtocol.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  <p className="mt-3 text-sm text-muted-foreground">Required personnel: {selectedProtocol.requiredPersonnel.join(", ")}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
