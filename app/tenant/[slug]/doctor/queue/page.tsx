"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Activity, CheckCircle2, Clock3, FlaskConical, History, Loader2, Mail, PhoneCall, Plus, RefreshCw, Search, Stethoscope, UserRound, XCircle } from "lucide-react";
import { toast } from "sonner";
import { KPICard } from "@/components/KPICard";
import { useTenantPath } from "@/hooks/useTenantPath";

type QueueEntry = {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string | null;
  patientPhone: string | null;
  globalPatientId: string | null;
  queueNumber: string | null;
  status: string | null;
  priority: string | null;
  position: number | null;
  completedAt: string | null;
  createdAt: string | null;
  estimatedWaitMinutes: number | null;
};

type QueueResponse = {
  queue: QueueEntry[];
  stats: {
    waiting: number;
    called: number;
    inProgress: number;
    completedToday: number;
    averageWaitMinutes: number;
  };
  activeEntry: QueueEntry | null;
  nextUp: QueueEntry[];
  recentCompleted: QueueEntry[];
};

type Patient = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  globalPatientId: string | null;
};

const statusOptions = ["all", "waiting", "called", "in-progress", "completed", "no-show"];
const queuePriorities = ["routine", "urgent", "critical"];
const labCategories = ["General", "Hematology", "Chemistry", "Microbiology", "Imaging"];
const labPriorities = ["routine", "urgent", "stat"];

const emptyConsultation = () => ({
  reason: "",
  symptoms: "",
  examination: "",
  assessment: "",
  diagnosis: "",
  plan: "",
  followUp: "",
  notes: "",
  createLabOrder: false,
  labTestName: "",
  labCategory: "General",
  labPriority: "routine",
  labNotes: "",
  labLocation: "Main Lab",
  dueDate: "",
});

const rel = (value: string | null) => (value ? formatDistanceToNow(new Date(value), { addSuffix: true }) : "-");

const statusTone = (status: string | null) =>
  status === "in-progress"
    ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
    : status === "called"
      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : status === "completed"
        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        : status === "no-show"
          ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
          : "bg-muted text-muted-foreground";

const priorityTone = (priority: string | null) =>
  priority === "critical"
    ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
    : priority === "urgent"
      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : "bg-muted text-muted-foreground";

export default function QueuePage() {
  const queryClient = useQueryClient();
  const tenantPath = useTenantPath();
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [queuePriority, setQueuePriority] = useState("routine");
  const [patientSearch, setPatientSearch] = useState("");
  const [consultationEntry, setConsultationEntry] = useState<QueueEntry | null>(null);
  const [consultationForm, setConsultationForm] = useState(emptyConsultation());
  const [activeQueueAction, setActiveQueueAction] = useState<{ id: string; nextStatus: string } | null>(null);

  const queueQuery = useQuery<QueueResponse>({
    queryKey: ["doctor-queue", status, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(`/api/doctor/queue${params.toString() ? `?${params.toString()}` : ""}`);
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Failed to load queue");
      return response.json();
    },
  });

  const patientsQuery = useQuery<{ patients: Patient[] }>({
    queryKey: ["doctor-queue-patients"],
    queryFn: async () => {
      const response = await fetch("/api/doctor/patients?status=active");
      if (!response.ok) throw new Error("Failed to load patients");
      return response.json();
    },
  });

  const queueAction = useMutation({
    mutationFn: async (payload: { id: string; nextStatus: string }) => {
      setActiveQueueAction(payload);
      const response = await fetch("/api/doctor/queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: payload.id, status: payload.nextStatus }),
      });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Failed to update queue");
      return response.json();
    },
    onSuccess: async (_, payload) => {
      toast.success(`Queue updated to ${payload.nextStatus.replace("-", " ")}.`);
      setActiveQueueAction(null);
      await queryClient.invalidateQueries({ queryKey: ["doctor-queue"] });
    },
    onError: (error: Error) => {
      setActiveQueueAction(null);
      toast.error(error.message);
    },
  });

  const addToQueue = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/doctor/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: selectedPatientId, priority: queuePriority }),
      });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Failed to add patient");
      return response.json();
    },
    onSuccess: async () => {
      toast.success("Patient added to queue.");
      setAddOpen(false);
      setSelectedPatientId("");
      setQueuePriority("routine");
      setPatientSearch("");
      await queryClient.invalidateQueries({ queryKey: ["doctor-queue"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const consultation = useMutation({
    mutationFn: async () => {
      if (!consultationEntry) throw new Error("No consultation selected");
      if (!consultationForm.reason.trim() || !consultationForm.symptoms.trim() || !consultationForm.assessment.trim() || !consultationForm.plan.trim()) {
        throw new Error("Reason, symptoms, assessment, and plan are required to complete consultation");
      }
      if (consultationForm.createLabOrder && !consultationForm.labTestName.trim()) {
        throw new Error("Lab test name is required when creating a lab order");
      }
      const response = await fetch("/api/doctor/queue/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queueId: consultationEntry.id, patientId: consultationEntry.patientId, ...consultationForm }),
      });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Failed to complete consultation");
      return response.json();
    },
    onSuccess: async (payload) => {
      toast.success(payload.labOrder ? "Consultation completed and lab order sent." : "Consultation completed.");
      setConsultationEntry(null);
      setConsultationForm(emptyConsultation());
      await queryClient.invalidateQueries({ queryKey: ["doctor-queue"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const queue = queueQuery.data?.queue ?? [];
  const activeEntry = queueQuery.data?.activeEntry ?? null;
  const nextEntry = queueQuery.data?.nextUp?.[0] ?? null;
  const recentCompleted = queueQuery.data?.recentCompleted ?? [];
  const patients = patientsQuery.data?.patients ?? [];

  const filteredPatients = useMemo(() => {
    const term = patientSearch.toLowerCase();
    if (!term) return patients;
    return patients.filter((patient) =>
      [patient.fullName, patient.email, patient.phone, patient.globalPatientId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [patientSearch, patients]);

  const dueAttentionCount = useMemo(
    () => queue.filter((entry) => entry.priority === "critical" || entry.status === "called").length,
    [queue]
  );

  const renderActionLabel = (entryId: string, nextStatus: string, label: string) =>
    queueAction.isPending && activeQueueAction?.id === entryId && activeQueueAction.nextStatus === nextStatus ? "Saving..." : label;

  const openConsultation = (entry: QueueEntry) => {
    setConsultationEntry(entry);
    setConsultationForm({
      ...emptyConsultation(),
      reason: `Consultation for ${entry.patientName}`,
    });
  };

  const startConsultation = async (entry: QueueEntry) => {
    try {
      if (entry.status !== "in-progress") {
        await queueAction.mutateAsync({ id: entry.id, nextStatus: "in-progress" });
      }
      openConsultation(entry);
    } catch {
      // toast is already handled by the queue mutation
    }
  };

  const closeConsultation = () => {
    setConsultationEntry(null);
    setConsultationForm(emptyConsultation());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Patient Queue</h1>
          <p className="mt-1 text-sm text-muted-foreground">Live consultation queue, direct handoff, and lab ordering from the encounter.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setAddOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"><Plus className="h-4 w-4" />Add to Queue</button>
          <button onClick={() => nextEntry && queueAction.mutate({ id: nextEntry.id, nextStatus: "called" })} disabled={!nextEntry || queueAction.isPending} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-50"><PhoneCall className="h-4 w-4" />{queueAction.isPending && activeQueueAction?.id === nextEntry?.id ? "Calling..." : "Call Next"}</button>
          <button onClick={() => queueQuery.refetch()} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground"><RefreshCw className={`h-4 w-4 ${queueQuery.isRefetching ? "animate-spin" : ""}`} />Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KPICard title="Waiting" value={queueQuery.data?.stats.waiting ?? 0} subtitle="Ready for review" tone="warning" icon={Clock3} />
        <KPICard title="Called" value={queueQuery.data?.stats.called ?? 0} subtitle="In transition" tone="primary" icon={PhoneCall} />
        <KPICard title="In Consultation" value={queueQuery.data?.stats.inProgress ?? 0} subtitle="Currently with you" tone="info" icon={Stethoscope} />
        <KPICard title="Completed Today" value={queueQuery.data?.stats.completedToday ?? 0} subtitle="Closed encounters" tone="success" icon={CheckCircle2} />
        <KPICard title="Avg Wait" value={`${queueQuery.data?.stats.averageWaitMinutes ?? 0} min`} subtitle="Across active queue" tone="danger" icon={Activity} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm xl:col-span-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Operational Focus</p>
          <h2 className="mt-2 text-xl font-semibold text-foreground">Queue readiness and consultation pressure</h2>
          <p className="mt-1 text-sm text-muted-foreground">Watch call volume, active consults, and critical queue items before advancing the next patient.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-background/70 p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Needs Attention</p><p className="mt-2 text-2xl font-semibold text-foreground">{dueAttentionCount}</p></div>
            <div className="rounded-xl border border-border bg-background/70 p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Next Up</p><p className="mt-2 text-lg font-semibold text-foreground">{nextEntry?.patientName || "No one waiting"}</p></div>
            <div className="rounded-xl border border-border bg-background/70 p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Active Consultation</p><p className="mt-2 text-lg font-semibold text-foreground">{activeEntry?.patientName || "None"}</p></div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">Queue Controls</h2>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p className="rounded-lg border border-border bg-background/70 px-4 py-3">Use `Call Next` only when you are ready to receive the next waiting patient.</p>
            <p className="rounded-lg border border-border bg-background/70 px-4 py-3">Move the patient into `in-progress` before recording consultation notes.</p>
            <p className="rounded-lg border border-border bg-background/70 px-4 py-3">Only mark `no-show` after the patient misses the call and cannot be reached.</p>
          </div>
        </div>
      </div>

      {queueQuery.isError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {(queueQuery.error as Error).message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_2fr]">
        <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Current Consultation</h2>
              <p className="text-sm text-muted-foreground">The active patient on your desk.</p>
            </div>
            <Stethoscope className="h-5 w-5 text-muted-foreground" />
          </div>

          {activeEntry ? (
            <>
              <div className="rounded-2xl border border-border bg-background/80 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Now serving</p>
                    <h3 className="text-2xl font-semibold text-foreground">{activeEntry.patientName}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{activeEntry.queueNumber || "Queue"} - {activeEntry.globalPatientId || "No patient number"}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusTone(activeEntry.status)}`}>{String(activeEntry.status || "waiting").replace("-", " ")}</span>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                  <div><p className="text-xs uppercase tracking-wide">Priority</p><span className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${priorityTone(activeEntry.priority)}`}>{activeEntry.priority || "routine"}</span></div>
                  <div><p className="text-xs uppercase tracking-wide">Waiting Since</p><p className="mt-1 text-foreground">{rel(activeEntry.createdAt)}</p></div>
                  <div><p className="text-xs uppercase tracking-wide">Contact</p><p className="mt-1 text-foreground">{activeEntry.patientPhone || activeEntry.patientEmail || "Not available"}</p></div>
                  <div><p className="text-xs uppercase tracking-wide">Estimated Wait</p><p className="mt-1 text-foreground">{activeEntry.estimatedWaitMinutes ?? 0} min</p></div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <button onClick={() => queueAction.mutate({ id: activeEntry.id, nextStatus: "called" })} disabled={queueAction.isPending} className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-60">{renderActionLabel(activeEntry.id, "called", "Mark Called")}</button>
                <button onClick={() => startConsultation(activeEntry)} disabled={queueAction.isPending || consultation.isPending} className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-60">{queueAction.isPending && activeQueueAction?.id === activeEntry.id && activeQueueAction.nextStatus === "in-progress" ? "Opening..." : "Start Consultation"}</button>
                <button onClick={() => openConsultation(activeEntry)} disabled={consultation.isPending} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60">Open Notes</button>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <Link href={tenantPath(`/doctor/patients/${activeEntry.patientId}`)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground">
                  <UserRound className="h-4 w-4" />
                  Patient
                </Link>
                <Link href={tenantPath(`/doctor/analytics/my-patients/${activeEntry.patientId}`)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground">
                  <History className="h-4 w-4" />
                  History
                </Link>
                {activeEntry.patientEmail ? (
                  <a href={`mailto:${activeEntry.patientEmail}`} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground">
                    <Mail className="h-4 w-4" />
                    Message
                  </a>
                ) : (
                  <div className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    No email
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-background/60 p-6 text-center">
              <p className="text-sm font-medium text-foreground">No patient is currently in consultation.</p>
              <p className="mt-2 text-sm text-muted-foreground">Call the next patient or add a patient to your queue to begin.</p>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-background/70 p-4">
            <h3 className="text-sm font-semibold text-foreground">Next Up</h3>
            <p className="text-xs text-muted-foreground">Ordered by queue position.</p>
            <div className="mt-3 space-y-3">
              {(queueQuery.data?.nextUp ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No patients waiting right now.</p>
              ) : (
                (queueQuery.data?.nextUp ?? []).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{entry.patientName}</p>
                      <p className="text-xs text-muted-foreground">{entry.queueNumber || "Queue item"} - Pos. {entry.position ?? "-"}</p>
                    </div>
                    <button onClick={() => queueAction.mutate({ id: entry.id, nextStatus: "called" })} disabled={queueAction.isPending} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-60">{renderActionLabel(entry.id, "called", "Call")}</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Queue Worklist</h2>
              <p className="text-sm text-muted-foreground">Search, triage, and complete the doctor queue.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patient, queue no, contact" className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none sm:w-72" />
              </div>
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none">
                {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Patient</th>
                    <th className="px-4 py-3 font-medium">Queue</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium">Wait</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {queueQuery.isLoading ? (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
                  ) : queue.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-12 text-center"><p className="text-sm font-medium text-foreground">No queue entries match the current filters.</p><p className="mt-1 text-sm text-muted-foreground">Add a patient to queue or clear the current filters.</p></td></tr>
                  ) : (
                    queue.map((entry) => (
                      <tr key={entry.id} className="align-top">
                        <td className="px-4 py-3"><div className="space-y-1"><p className="font-medium text-foreground">{entry.patientName}</p><p className="text-xs text-muted-foreground">{entry.globalPatientId || "No patient number"}</p><p className="text-xs text-muted-foreground">{entry.patientPhone || entry.patientEmail || "No contact on file"}</p></div></td>
                        <td className="px-4 py-3 text-foreground"><p>{entry.queueNumber || "-"}</p><p className="text-xs text-muted-foreground">Position {entry.position ?? "-"}</p></td>
                        <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusTone(entry.status)}`}>{String(entry.status || "waiting").replace("-", " ")}</span></td>
                        <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${priorityTone(entry.priority)}`}>{entry.priority || "routine"}</span></td>
                        <td className="px-4 py-3 text-foreground"><p>{entry.estimatedWaitMinutes ?? 0} min</p><p className="text-xs text-muted-foreground">Queued {rel(entry.createdAt)}</p></td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {entry.status === "waiting" && <button onClick={() => queueAction.mutate({ id: entry.id, nextStatus: "called" })} disabled={queueAction.isPending} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-60">{renderActionLabel(entry.id, "called", "Call")}</button>}
                            {(entry.status === "waiting" || entry.status === "called") && <button onClick={() => startConsultation(entry)} disabled={queueAction.isPending || consultation.isPending} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-60">{queueAction.isPending && activeQueueAction?.id === entry.id && activeQueueAction.nextStatus === "in-progress" ? "Opening..." : "Start"}</button>}
                            {(entry.status === "called" || entry.status === "in-progress") && <button onClick={() => openConsultation(entry)} disabled={consultation.isPending} className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60">Open Notes</button>}
                            {entry.status !== "completed" && entry.status !== "no-show" && <button onClick={() => queueAction.mutate({ id: entry.id, nextStatus: "no-show" })} disabled={queueAction.isPending} className="rounded-lg border border-destructive/30 px-2.5 py-1.5 text-xs font-medium text-destructive disabled:cursor-not-allowed disabled:opacity-60">{renderActionLabel(entry.id, "no-show", "No-show")}</button>}
                            <Link href={tenantPath(`/doctor/patients/${entry.patientId}`)} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground">Patient</Link>
                            <Link href={tenantPath(`/doctor/analytics/my-patients/${entry.patientId}`)} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground">History</Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-foreground">Completed Queue Items</h2><p className="text-sm text-muted-foreground">Recent closed consultations and no-shows.</p></div><CheckCircle2 className="h-5 w-5 text-muted-foreground" /></div>
          <div className="mt-4 space-y-3">
            {recentCompleted.length === 0 ? <p className="text-sm text-muted-foreground">No completed encounters yet today.</p> : recentCompleted.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                <div><p className="font-medium text-foreground">{entry.patientName}</p><p className="text-xs text-muted-foreground">{entry.queueNumber || "Queue item"} - {rel(entry.completedAt)}</p></div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusTone(entry.status)}`}>{String(entry.status || "completed").replace("-", " ")}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Queue Protocol</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {["Add the patient to your queue with the correct priority.", "Call and move the patient into consultation when ready.", "Capture symptoms, assessment, diagnosis, and plan in one place.", "Raise a lab order directly from the consultation if tests are required."].map((item) => (
              <div key={item} className="rounded-xl border border-border bg-background/70 p-4 text-sm text-foreground">{item}</div>
            ))}
          </div>
        </section>
      </div>

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-background p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="text-xl font-semibold text-foreground">Add Patient to Queue</h2><p className="mt-1 text-sm text-muted-foreground">Select an active patient and assign triage priority.</p></div>
              <button onClick={() => setAddOpen(false)} className="rounded-lg border border-border p-2 text-muted-foreground"><XCircle className="h-4 w-4" /></button>
            </div>

            <div className="mt-5 space-y-4">
              <input value={patientSearch} onChange={(event) => setPatientSearch(event.target.value)} placeholder="Name, phone, email, patient number" className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none" />
              <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-border p-3">
                {patientsQuery.isLoading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Loading patients...</div>
                ) : filteredPatients.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">No active patients match this search.</div>
                ) : (
                  filteredPatients.map((patient) => (
                    <button key={patient.id} type="button" onClick={() => setSelectedPatientId(patient.id)} className={`flex w-full items-start justify-between rounded-xl border px-4 py-3 text-left ${selectedPatientId === patient.id ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/40"}`}>
                      <div><p className="font-medium text-foreground">{patient.fullName}</p><p className="text-xs text-muted-foreground">{patient.globalPatientId || "No patient number"}</p><p className="text-xs text-muted-foreground">{patient.phone || patient.email || "No contact"}</p></div>
                      {selectedPatientId === patient.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </button>
                  ))
                )}
              </div>
              <select value={queuePriority} onChange={(event) => setQueuePriority(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none">
                {queuePriorities.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setAddOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground">Cancel</button>
              <button onClick={() => addToQueue.mutate()} disabled={!selectedPatientId || addToQueue.isPending} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">{addToQueue.isPending && <Loader2 className="h-4 w-4 animate-spin" />}{addToQueue.isPending ? "Adding..." : "Add to Queue"}</button>
            </div>
          </div>
        </div>
      )}

      {consultationEntry && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
          <div className="mx-auto w-full max-w-4xl rounded-2xl border border-border bg-background p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="text-xl font-semibold text-foreground">Consultation Workspace</h2><p className="mt-1 text-sm text-muted-foreground">Capture the encounter for {consultationEntry.patientName} and send tests to the lab when needed.</p></div>
              <button onClick={closeConsultation} className="rounded-lg border border-border p-2 text-muted-foreground"><XCircle className="h-4 w-4" /></button>
            </div>

            <div className="mt-5 grid gap-6 xl:grid-cols-[1.1fr_1.4fr]">
              <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
                <p className="text-sm font-semibold text-foreground">Patient Context</p>
                <div className="space-y-3 text-sm">
                  <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Patient</p><p className="mt-1 font-medium text-foreground">{consultationEntry.patientName}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Identifier</p><p className="mt-1 text-foreground">{consultationEntry.globalPatientId || "Not available"}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Contact</p><p className="mt-1 text-foreground">{consultationEntry.patientPhone || consultationEntry.patientEmail || "Not available"}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Queue Wait</p><p className="mt-1 text-foreground">{consultationEntry.estimatedWaitMinutes ?? 0} min</p></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={tenantPath(`/doctor/patients/${consultationEntry.patientId}`)} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground">
                    Open patient profile
                  </Link>
                  <Link href={tenantPath(`/doctor/analytics/my-patients/${consultationEntry.patientId}`)} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground">
                    Open history
                  </Link>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <input value={consultationForm.reason} onChange={(event) => setConsultationForm((current) => ({ ...current, reason: event.target.value }))} placeholder="Reason for visit" className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none" />
                  <input value={consultationForm.diagnosis} onChange={(event) => setConsultationForm((current) => ({ ...current, diagnosis: event.target.value }))} placeholder="Working diagnosis" className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none" />
                </div>
                <textarea value={consultationForm.symptoms} onChange={(event) => setConsultationForm((current) => ({ ...current, symptoms: event.target.value }))} rows={4} placeholder="Presenting symptoms and patient complaint" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none" />
                <textarea value={consultationForm.examination} onChange={(event) => setConsultationForm((current) => ({ ...current, examination: event.target.value }))} rows={3} placeholder="Examination findings, vitals summary, and observed red flags" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none" />
                <textarea value={consultationForm.assessment} onChange={(event) => setConsultationForm((current) => ({ ...current, assessment: event.target.value }))} rows={4} placeholder="Clinical assessment and differential reasoning" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none" />
                <textarea value={consultationForm.plan} onChange={(event) => setConsultationForm((current) => ({ ...current, plan: event.target.value }))} rows={4} placeholder="Treatment plan, medication decisions, and next clinical steps" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none" />
                <textarea value={consultationForm.followUp} onChange={(event) => setConsultationForm((current) => ({ ...current, followUp: event.target.value }))} rows={3} placeholder="Follow-up instructions, review timing, and patient advice" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none" />
                <textarea value={consultationForm.notes} onChange={(event) => setConsultationForm((current) => ({ ...current, notes: event.target.value }))} rows={3} placeholder="Additional consultation notes for the care team" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none" />
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div><h3 className="text-base font-semibold text-foreground">Direct Lab Handoff</h3><p className="text-sm text-muted-foreground">Create a lab order from this consultation and send it to the lab queue.</p></div>
                <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground"><input type="checkbox" checked={consultationForm.createLabOrder} onChange={(event) => setConsultationForm((current) => ({ ...current, createLabOrder: event.target.checked }))} className="h-4 w-4 rounded border-border" />Create lab order</label>
              </div>

              {consultationForm.createLabOrder && (
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <input value={consultationForm.labTestName} onChange={(event) => setConsultationForm((current) => ({ ...current, labTestName: event.target.value }))} placeholder="Test name" className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none xl:col-span-2" />
                  <select value={consultationForm.labCategory} onChange={(event) => setConsultationForm((current) => ({ ...current, labCategory: event.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none">{labCategories.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                  <select value={consultationForm.labPriority} onChange={(event) => setConsultationForm((current) => ({ ...current, labPriority: event.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none">{labPriorities.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                  <input value={consultationForm.labLocation} onChange={(event) => setConsultationForm((current) => ({ ...current, labLocation: event.target.value }))} placeholder="Lab location" className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none" />
                  <input type="datetime-local" value={consultationForm.dueDate} onChange={(event) => setConsultationForm((current) => ({ ...current, dueDate: event.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none" />
                  <textarea value={consultationForm.labNotes} onChange={(event) => setConsultationForm((current) => ({ ...current, labNotes: event.target.value }))} rows={3} placeholder="Lab notes" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none md:col-span-2 xl:col-span-3" />
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={closeConsultation} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground">Cancel</button>
              <button onClick={() => consultation.mutate()} disabled={consultation.isPending || !consultationForm.reason.trim() || !consultationForm.symptoms.trim() || !consultationForm.assessment.trim() || !consultationForm.plan.trim() || (consultationForm.createLabOrder && !consultationForm.labTestName.trim())} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">{consultation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}{consultation.isPending ? "Saving Encounter..." : "Complete Consultation"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
