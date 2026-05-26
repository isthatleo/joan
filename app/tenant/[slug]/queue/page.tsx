"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Clock3, Phone, RefreshCw, Search, Timer, UserRound, XCircle } from "lucide-react";
import { KPICard } from "@/components/KPICard";
import { useTenantPath } from "@/hooks/useTenantPath";

type QueueItem = {
  id: string;
  patientId: string;
  patientName: string;
  age: number;
  priority: string;
  checkInTime: string | null;
  estimatedWaitTime: string;
  actualWaitTime: string;
  status: string;
  appointmentType: string;
  doctorName: string;
  department: string;
  notes: string | null;
  position: number;
  queueNumber: string | null;
};

type QueueStats = {
  totalWaiting: number;
  averageWaitTime: string;
  longestWait: string;
  urgentCount: number;
  completedToday: number;
};

function statusTone(status: string) {
  if (status === "completed") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "called") return "bg-sky-500/10 text-sky-700 dark:text-sky-300";
  if (status === "with-doctor") return "bg-violet-500/10 text-violet-700 dark:text-violet-300";
  if (status === "cancelled") return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
  return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

function priorityTone(priority: string) {
  if (priority === "urgent") return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
  if (priority === "high") return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "bg-muted text-muted-foreground";
}

export default function QueuePage() {
  const { slug } = useParams();
  const tenantSlug = String(slug || "");
  const toTenantPath = useTenantPath();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchQueueData = async () => {
    try {
      setRefreshing(true);
      const [queueRes, statsRes] = await Promise.all([
        fetch(`/api/tenant/${tenantSlug}/receptionist/queue`, { cache: "no-store" }),
        fetch(`/api/tenant/${tenantSlug}/receptionist/queue/stats`, { cache: "no-store" }),
      ]);
      if (queueRes.ok) {
        const payload = await queueRes.json().catch(() => []);
        setQueue(Array.isArray(payload) ? payload : []);
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (error) {
      console.error("Failed to fetch queue data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQueueData();
  }, [tenantSlug]);

  const filteredQueue = useMemo(() => {
    return queue.filter((item) =>
      [item.patientName, item.queueNumber, item.priority, item.status].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase()),
    );
  }, [queue, search]);

  const updateQueueStatus = async (queueId: string, status: string) => {
    try {
      setBusyId(`${status}-${queueId}`);
      await fetch(`/api/tenant/${tenantSlug}/receptionist/queue/${queueId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } finally {
      setBusyId(null);
      fetchQueueData();
    }
  };

  const callQueuePatient = async (queueId: string) => {
    try {
      setBusyId(`call-${queueId}`);
      await fetch(`/api/tenant/${tenantSlug}/receptionist/queue/${queueId}/call`, { method: "POST" });
    } finally {
      setBusyId(null);
      fetchQueueData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Live Queue Board</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Reception Queue</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Call patients, advance them to consultation, and keep queue pressure under control in real time.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={toTenantPath("/check-in")} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            <UserRound className="h-4 w-4" />
            Open Check-in
          </Link>
          <button onClick={fetchQueueData} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard title="Waiting" value={stats?.totalWaiting ?? 0} subtitle={`${stats?.urgentCount ?? 0} urgent/high`} tone="warning" icon={Clock3} />
        <KPICard title="Average Wait" value={stats?.averageWaitTime ?? "0 min"} subtitle="Current active queue" tone="info" icon={Timer} />
        <KPICard title="Longest Wait" value={stats?.longestWait ?? "0 min"} subtitle="Attention threshold" tone="danger" icon={Clock3} />
        <KPICard title="Completed Today" value={stats?.completedToday ?? 0} subtitle="Processed queue entries" tone="success" icon={CheckCircle2} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search patient, queue number, priority, or status"
            className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm text-foreground"
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold text-foreground">Queue Registry</h2>
            <p className="text-sm text-muted-foreground">{filteredQueue.length} queue item(s)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Patient</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Queue</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Wait</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="border-t border-border">
                    <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">Loading queue...</td>
                  </tr>
                ) : filteredQueue.length === 0 ? (
                  <tr className="border-t border-border">
                    <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">No queue entries found.</td>
                  </tr>
                ) : (
                  filteredQueue.map((item) => (
                    <tr key={item.id} className="border-t border-border">
                      <td className="px-5 py-4">
                        <p className="font-medium text-foreground">{item.patientName}</p>
                        <p className="text-xs text-muted-foreground">Age {item.age || "--"} - {item.appointmentType}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{item.queueNumber || `Position ${item.position}`}</p>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${priorityTone(item.priority)}`}>{item.priority}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-foreground">
                        <p>{item.actualWaitTime}</p>
                        <p className="text-xs text-muted-foreground">ETA {item.estimatedWaitTime}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusTone(item.status)}`}>{item.status}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Link href={toTenantPath(`/patients/${item.patientId}`)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground">
                            View
                          </Link>
                          {item.status === "waiting" ? (
                            <button
                              onClick={() => callQueuePatient(item.id)}
                              disabled={busyId === `call-${item.id}`}
                              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground disabled:opacity-60"
                            >
                              <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Call</span>
                            </button>
                          ) : null}
                          {item.status === "called" || item.status === "waiting" ? (
                            <button
                              onClick={() => updateQueueStatus(item.id, "with-doctor")}
                              disabled={busyId === `with-doctor-${item.id}`}
                              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
                            >
                              Send to Doctor
                            </button>
                          ) : null}
                          {item.status !== "completed" && item.status !== "cancelled" ? (
                            <button
                              onClick={() => updateQueueStatus(item.id, "completed")}
                              disabled={busyId === `completed-${item.id}`}
                              className="rounded-lg border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-600 disabled:opacity-60"
                            >
                              Complete
                            </button>
                          ) : null}
                          {item.status !== "completed" && item.status !== "cancelled" ? (
                            <button
                              onClick={() => updateQueueStatus(item.id, "cancelled")}
                              disabled={busyId === `cancelled-${item.id}`}
                              className="rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive disabled:opacity-60"
                            >
                              <span className="inline-flex items-center gap-1"><XCircle className="h-3.5 w-3.5" /> Cancel</span>
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-base font-semibold text-foreground">Queue Operations</h3>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p>Use Call to announce the next patient and mark the queue entry as called.</p>
              <p>Send to Doctor moves the patient into the consultation stage without removing them from live visibility.</p>
              <p>Complete closes the front-desk queue record after clinician handoff is finished.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-base font-semibold text-foreground">Escalation Rules</h3>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p>Urgent and high-priority patients should be called before standard queue order when clinically appropriate.</p>
              <p>Use the waiting room board to cross-check which patients are physically present before cancellation.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
