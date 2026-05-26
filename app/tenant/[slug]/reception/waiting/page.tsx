"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, BellRing, LayoutGrid, List, Phone, RefreshCw, Volume2, VolumeX } from "lucide-react";
import { KPICard } from "@/components/KPICard";
import { useTenantPath } from "@/hooks/useTenantPath";

type WaitingPatient = {
  id: string;
  patientId: string;
  patientName: string;
  age: number;
  priority: string;
  estimatedWaitTime: string;
  actualWaitTime: string;
  status: string;
  position: number;
  queueNumber: string | null;
};

type WaitingStats = {
  totalPatients: number;
  averageWaitTime: string;
  longestWait: string;
  roomsOccupied: number;
  roomsAvailable: number;
  nextPatientCall: string;
};

type Announcement = {
  id: string;
  message: string;
  type: string;
  timestamp: string;
  active: boolean;
};

export default function WaitingRoomPage() {
  const { slug } = useParams();
  const tenantSlug = String(slug || "");
  const toTenantPath = useTenantPath();
  const [patients, setPatients] = useState<WaitingPatient[]>([]);
  const [stats, setStats] = useState<WaitingStats | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [displayMode, setDisplayMode] = useState<"board" | "list">("board");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState("");
  const lastPlayedAnnouncementId = useRef<string | null>(null);

  const fetchWaitingRoomData = async () => {
    try {
      setRefreshing(true);
      const [patientsRes, statsRes, announcementsRes] = await Promise.all([
        fetch(`/api/tenant/${tenantSlug}/receptionist/waiting-room/patients`, { cache: "no-store" }),
        fetch(`/api/tenant/${tenantSlug}/receptionist/waiting-room/stats`, { cache: "no-store" }),
        fetch(`/api/tenant/${tenantSlug}/receptionist/waiting-room/announcements`, { cache: "no-store" }),
      ]);
      if (patientsRes.ok) setPatients(await patientsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (announcementsRes.ok) setAnnouncements(await announcementsRes.json());
    } catch (error) {
      console.error("Failed to fetch waiting room data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWaitingRoomData();
  }, [tenantSlug]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (tenantSlug) {
        fetchWaitingRoomData();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [tenantSlug]);

  useEffect(() => {
    if (!soundEnabled) return;
    const latestCall = announcements.find((item) => item.type === "call" && item.active);
    if (!latestCall || lastPlayedAnnouncementId.current === latestCall.id) return;
    lastPlayedAnnouncementId.current = latestCall.id;
    const audio = new Audio("/sounds/patient-call.mp3");
    audio.play().catch(() => null);
  }, [announcements, soundEnabled]);

  const nextPatient = useMemo(() => patients.find((item) => item.status === "waiting"), [patients]);
  const activeAnnouncements = useMemo(() => announcements.filter((item) => item.active), [announcements]);

  const callPatient = async (queueId: string) => {
    try {
      setBusyId(queueId);
      await fetch(`/api/tenant/${tenantSlug}/receptionist/waiting-room/call/${queueId}`, { method: "POST" });
      if (soundEnabled) {
        const audio = new Audio("/sounds/patient-call.mp3");
        audio.play().catch(() => null);
      }
    } finally {
      setBusyId(null);
      fetchWaitingRoomData();
    }
  };

  const postAnnouncement = async (message: string, type: string) => {
    if (!message.trim()) return;
    await fetch(`/api/tenant/${tenantSlug}/receptionist/waiting-room/announcements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, type }),
    });
    setAnnouncementMessage("");
    fetchWaitingRoomData();
  };

  const updateAnnouncement = async (announcementId: string) => {
    if (!editingMessage.trim()) return;
    await fetch(`/api/tenant/${tenantSlug}/receptionist/waiting-room/announcements/${announcementId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: editingMessage }),
    });
    setEditingAnnouncementId(null);
    setEditingMessage("");
    fetchWaitingRoomData();
  };

  const deleteAnnouncement = async (announcementId: string) => {
    await fetch(`/api/tenant/${tenantSlug}/receptionist/waiting-room/announcements/${announcementId}`, {
      method: "DELETE",
    });
    fetchWaitingRoomData();
  };

  const renderPatientCard = (patient: WaitingPatient) => (
    <div key={patient.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">{patient.patientName}</p>
          <p className="text-xs text-muted-foreground">{patient.queueNumber || `Position ${patient.position}`} - Age {patient.age || "--"}</p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">{patient.status}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border border-border bg-background/70 px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Priority</p>
          <p className="font-medium capitalize text-foreground">{patient.priority}</p>
        </div>
        <div className="rounded-lg border border-border bg-background/70 px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Wait</p>
          <p className="font-medium text-foreground">{patient.actualWaitTime}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => callPatient(patient.id)}
          disabled={busyId === patient.id}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          <Phone className="h-4 w-4" />
          Call Patient
        </button>
        <Link href={toTenantPath(`/patients/${patient.patientId}`)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground">
          Profile
        </Link>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          Loading waiting room...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Patient Flow Board</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Waiting Room</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor live waiting patients, broadcast announcements, and keep the front desk and queue board synchronized.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setSoundEnabled((value) => !value)} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground">
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {soundEnabled ? "Sound On" : "Sound Off"}
          </button>
          <button onClick={() => setDisplayMode((mode) => (mode === "board" ? "list" : "board"))} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground">
            {displayMode === "board" ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
            {displayMode === "board" ? "List View" : "Board View"}
          </button>
          <button onClick={fetchWaitingRoomData} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KPICard title="Waiting Patients" value={stats?.totalPatients ?? 0} subtitle={stats?.nextPatientCall || "No next patient"} tone="warning" icon={BellRing} />
        <KPICard title="Average Wait" value={stats?.averageWaitTime ?? "0 min"} subtitle="Current active queue" tone="info" icon={Phone} />
        <KPICard title="Longest Wait" value={stats?.longestWait ?? "0 min"} subtitle="Escalate if needed" tone="danger" icon={AlertTriangle} />
        <KPICard title="Rooms Occupied" value={stats?.roomsOccupied ?? 0} subtitle={`${stats?.roomsAvailable ?? 0} available`} tone="primary" icon={LayoutGrid} />
        <KPICard title="Next Call" value={nextPatient?.queueNumber || "None"} subtitle={nextPatient?.patientName || "No one waiting"} tone="success" icon={BellRing} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="space-y-4">
          {nextPatient ? (
            <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Next Patient</p>
                  <h2 className="mt-1 text-xl font-semibold text-foreground">{nextPatient.patientName}</h2>
                  <p className="text-sm text-muted-foreground">{nextPatient.queueNumber || `Position ${nextPatient.position}`} - waiting {nextPatient.actualWaitTime}</p>
                </div>
                <button
                  onClick={() => callPatient(nextPatient.id)}
                  disabled={busyId === nextPatient.id}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                >
                  <Phone className="h-4 w-4" />
                  Call Next
                </button>
              </div>
            </div>
          ) : null}

          {displayMode === "board" ? (
            <div className="grid gap-4 md:grid-cols-2">
              {patients.map(renderPatientCard)}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Patient</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Queue</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Wait</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((patient) => (
                      <tr key={patient.id} className="border-t border-border">
                        <td className="px-5 py-4">
                          <p className="font-medium text-foreground">{patient.patientName}</p>
                          <p className="text-xs text-muted-foreground">Age {patient.age || "--"} - {patient.priority}</p>
                        </td>
                        <td className="px-5 py-4 text-foreground">{patient.queueNumber || `Position ${patient.position}`}</td>
                        <td className="px-5 py-4"><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">{patient.status}</span></td>
                        <td className="px-5 py-4 text-foreground">{patient.actualWaitTime}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => callPatient(patient.id)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Call</button>
                            <Link href={toTenantPath(`/patients/${patient.patientId}`)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground">Profile</Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-base font-semibold text-foreground">Broadcast Announcement</h3>
            <div className="mt-4 space-y-3">
              <textarea
                value={announcementMessage}
                onChange={(event) => setAnnouncementMessage(event.target.value)}
                placeholder="Write an announcement for the waiting room display."
                className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground"
              />
              <div className="flex flex-wrap gap-2">
                <button onClick={() => postAnnouncement(announcementMessage, "info")} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                  Post Announcement
                </button>
                <button
                  onClick={() => postAnnouncement("Please proceed to the front desk for assistance.", "call")}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground"
                >
                  Post Standard Call
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold text-foreground">Active Announcements</h3>
            </div>
            <div className="mt-4 space-y-3">
              {activeAnnouncements.map((item) => (
                <div key={item.id} className="rounded-xl border border-border bg-background/70 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      {editingAnnouncementId === item.id ? (
                        <div className="space-y-2">
                          <textarea value={editingMessage} onChange={(event) => setEditingMessage(event.target.value)} className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
                          <div className="flex gap-2">
                            <button onClick={() => updateAnnouncement(item.id)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Save</button>
                            <button onClick={() => { setEditingAnnouncementId(null); setEditingMessage(""); }} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm font-medium text-foreground">{item.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{new Date(item.timestamp).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">{item.type}</span>
                      {editingAnnouncementId !== item.id ? (
                        <>
                          <button onClick={() => { setEditingAnnouncementId(item.id); setEditingMessage(item.message); }} className="rounded-lg border border-border px-2 py-1 text-xs font-medium text-foreground">Edit</button>
                          <button onClick={() => deleteAnnouncement(item.id)} className="rounded-lg border border-destructive/30 px-2 py-1 text-xs font-medium text-destructive">Delete</button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
