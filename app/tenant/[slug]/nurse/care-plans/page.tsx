"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Plus, RefreshCw } from "lucide-react";
import { Badge, Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, PageHeader, SectionCard, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton, Textarea } from "@/components/ui";

export default function NurseCarePlansPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;
  const preselectedPatientId = searchParams.get("patientId") || "";
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ patientId: preselectedPatientId, title: "", diagnosis: "", goals: "", interventions: "", priority: "routine", targetDate: "", notes: "" });
  const queryClient = useQueryClient();

  const plansQuery = useQuery({
    queryKey: ["tenant-nurse-care-plans", slug],
    queryFn: async () => {
      const response = await fetch(`/api/nurse/care-plans?slug=${slug}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load care plans");
      return response.json();
    },
  });

  const patientsQuery = useQuery({
    queryKey: ["tenant-nurse-care-plan-patients", slug],
    queryFn: async () => {
      const response = await fetch(`/api/nurse/patients?slug=${slug}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load patients");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/nurse/care-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          patientId: form.patientId,
          title: form.title,
          diagnosis: form.diagnosis,
          goals: form.goals.split(/\r?\n/).filter(Boolean),
          interventions: form.interventions.split(/\r?\n/).filter(Boolean),
          priority: form.priority,
          targetDate: form.targetDate,
          notes: form.notes,
          tasks: form.interventions.split(/\r?\n/).filter(Boolean).map((title) => ({ title })),
        }),
      });
      if (!response.ok) throw new Error("Failed to create care plan");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-nurse-care-plans"] });
      setShowDialog(false);
      setForm({ patientId: preselectedPatientId, title: "", diagnosis: "", goals: "", interventions: "", priority: "routine", targetDate: "", notes: "" });
    },
  });

  const taskMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await fetch("/api/nurse/care-plans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, ...payload }),
      });
      if (!response.ok) throw new Error("Failed to update care plan");
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenant-nurse-care-plans"] }),
  });

  const plans = plansQuery.data?.carePlans || [];
  const stats = plansQuery.data?.stats;
  const patients = patientsQuery.data?.patients || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Care Plans"
        subtitle="Create, coordinate, and close nursing interventions with documented tasks and patient goals."
        actions={<div className="flex gap-2"><Button variant="outline" onClick={() => plansQuery.refetch()} disabled={plansQuery.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${plansQuery.isFetching ? "animate-spin" : ""}`} />Refresh</Button><Button onClick={() => setShowDialog(true)}><Plus className="mr-2 h-4 w-4" />New Care Plan</Button></div>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plansQuery.isLoading ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 w-full" />) : (
          <>
            <StatTile label="Total Plans" value={stats?.total ?? 0} hint="All care plans currently in scope." />
            <StatTile label="Active Plans" value={stats?.active ?? 0} hint="Patients with live nursing interventions." />
            <StatTile label="Completed" value={stats?.completed ?? 0} hint="Care plans successfully closed out." />
            <StatTile label="Overdue Tasks" value={stats?.overdueTasks ?? 0} hint="Interventions that have slipped beyond target." />
          </>
        )}
      </div>

      <SectionCard title="Care Planning Board" description="Industry-style plan view combining diagnosis, goals, interventions, and task completion.">
        {plansQuery.isLoading ? (
          <div className="space-y-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-56 w-full" />)}</div>
        ) : plans.length ? (
          <div className="space-y-4">
            {plans.map((plan: any) => (
              <div key={plan.id} className="rounded-2xl border border-border bg-background p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-foreground">{plan.title}</h3>
                      <Badge variant={plan.status === "completed" ? "secondary" : "outline"}>{plan.status}</Badge>
                      <Badge variant="outline">{plan.priority}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{plan.patientName} | {plan.diagnosis || "Diagnosis pending"}</p>
                    <p className="mt-2 text-sm text-muted-foreground">Target date {plan.targetDate ? new Date(plan.targetDate).toLocaleDateString() : "not set"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => taskMutation.mutate({ action: "update-status", id: plan.id, status: "active" })} disabled={taskMutation.isPending || plan.status === "active"}>Re-open</Button>
                    <Button onClick={() => taskMutation.mutate({ action: "update-status", id: plan.id, status: "completed" })} disabled={taskMutation.isPending || plan.status === "completed"}>Close Plan</Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr_1.2fr]">
                  <Panel title="Goals" items={plan.goals} emptyLabel="No goals documented" />
                  <Panel title="Interventions" items={plan.interventionsList} emptyLabel="No interventions documented" />
                  <div className="rounded-2xl border border-border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold text-foreground">Task Checklist</h4>
                      <Badge variant="outline">{plan.progress}% complete</Badge>
                    </div>
                    <div className="mt-3 space-y-2">
                      {plan.tasks?.length ? plan.tasks.map((task: any) => (
                        <div key={task.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{task.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{task.dueAt ? `Due ${new Date(task.dueAt).toLocaleString()}` : "No due time set"}</p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => taskMutation.mutate({ action: "complete-task", taskId: task.id })} disabled={taskMutation.isPending || task.status === "completed"}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            {task.status === "completed" ? "Done" : "Complete"}
                          </Button>
                        </div>
                      )) : <p className="text-sm text-muted-foreground">No task checklist yet.</p>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground">No care plans have been created yet.</p>}
      </SectionCard>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Create Care Plan</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">Patient</label>
              <Select value={form.patientId} onValueChange={(value) => setForm((current) => ({ ...current, patientId: value }))}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>{patients.map((patient: any) => <SelectItem key={patient.id} value={patient.id}>{patient.fullName || `${patient.firstName || ""} ${patient.lastName || ""}`.trim()}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Field label="Plan Title" className="md:col-span-2"><Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Post-op recovery support" /></Field>
            <Field label="Diagnosis" className="md:col-span-2"><Input value={form.diagnosis} onChange={(event) => setForm((current) => ({ ...current, diagnosis: event.target.value }))} placeholder="Primary nursing diagnosis or concern" /></Field>
            <Field label="Priority"><Select value={form.priority} onValueChange={(value) => setForm((current) => ({ ...current, priority: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="routine">Routine</SelectItem><SelectItem value="urgent">Urgent</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></Field>
            <Field label="Target Date"><Input type="date" value={form.targetDate} onChange={(event) => setForm((current) => ({ ...current, targetDate: event.target.value }))} /></Field>
            <Field label="Goals" className="md:col-span-2"><Textarea rows={4} value={form.goals} onChange={(event) => setForm((current) => ({ ...current, goals: event.target.value }))} placeholder="One goal per line" /></Field>
            <Field label="Interventions" className="md:col-span-2"><Textarea rows={4} value={form.interventions} onChange={(event) => setForm((current) => ({ ...current, interventions: event.target.value }))} placeholder="One intervention per line" /></Field>
            <Field label="Clinical Notes" className="md:col-span-2"><Textarea rows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Additional plan context for handover or escalation." /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.patientId || !form.title}>{createMutation.isPending ? "Creating..." : "Create Plan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatTile({ label, value, hint }: { label: string; value: number; hint: string }) {
  return <div className="rounded-2xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold text-foreground">{value}</p><p className="mt-2 text-xs text-muted-foreground">{hint}</p></div>;
}

function Panel({ title, items, emptyLabel }: { title: string; items: string[]; emptyLabel: string }) {
  return <div className="rounded-2xl border border-border p-4"><h4 className="text-sm font-semibold text-foreground">{title}</h4><div className="mt-3 space-y-2">{items?.length ? items.map((item, index) => <div key={`${title}-${index}`} className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground">{item}</div>) : <p className="text-sm text-muted-foreground">{emptyLabel}</p>}</div></div>;
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={`space-y-2 ${className}`}><label className="text-sm font-medium text-foreground">{label}</label>{children}</div>;
}
