"use client";

import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, HeartPulse, RefreshCw, Search, Stethoscope } from "lucide-react";
import { Badge, Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, PageHeader, SectionCard, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton, Textarea } from "@/components/ui";

export default function NurseVitalsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;
  const initialPatientId = searchParams.get("patientId") || "";
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [selectedReading, setSelectedReading] = useState<any | null>(null);
  const [form, setForm] = useState({ patientId: initialPatientId, heartRate: "", systolic: "", diastolic: "", temperature: "", respiratoryRate: "", oxygenSaturation: "", painScore: "", notes: "" });
  const queryClient = useQueryClient();

  const vitalsQuery = useQuery({
    queryKey: ["tenant-nurse-vitals", slug, search, status],
    queryFn: async () => {
      const qs = new URLSearchParams({ slug, search, status });
      const response = await fetch(`/api/nurse/vitals?${qs.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load vitals");
      return response.json();
    },
    refetchInterval: 60000,
  });

  const patientsQuery = useQuery({
    queryKey: ["tenant-nurse-patient-select", slug],
    queryFn: async () => {
      const response = await fetch(`/api/nurse/patients?slug=${slug}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load patient list");
      return response.json();
    },
  });

  const recordMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/nurse/vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          patientId: form.patientId,
          heartRate: Number(form.heartRate),
          bloodPressure: `${form.systolic}/${form.diastolic}`,
          temperature: Number(form.temperature),
          respiratoryRate: Number(form.respiratoryRate),
          oxygenSaturation: Number(form.oxygenSaturation),
          painScore: form.painScore ? Number(form.painScore) : null,
          notes: form.notes,
        }),
      });
      if (!response.ok) throw new Error("Failed to record vitals");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-nurse-vitals"] });
      setShowRecordDialog(false);
      setForm({ patientId: initialPatientId, heartRate: "", systolic: "", diastolic: "", temperature: "", respiratoryRate: "", oxygenSaturation: "", painScore: "", notes: "" });
    },
  });

  const data = vitalsQuery.data?.vitals || [];
  const stats = vitalsQuery.data?.stats;
  const patients = patientsQuery.data?.patients || [];

  const alertBanner = useMemo(() => {
    if (!stats?.critical) return null;
    return `${stats.critical} patient${stats.critical === 1 ? "" : "s"} currently have critical bedside observations.`;
  }, [stats]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vitals Monitoring"
        subtitle="Capture bedside observations, surface abnormal readings, and keep the doctor handoff current."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => vitalsQuery.refetch()} disabled={vitalsQuery.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${vitalsQuery.isFetching ? "animate-spin" : ""}`} />Refresh</Button>
            <Button onClick={() => setShowRecordDialog(true)}>Record Vitals</Button>
          </div>
        }
      />

      {alertBanner ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <div className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" />Critical observation alert</div>
          <p className="mt-1">{alertBanner}</p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {vitalsQuery.isLoading ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 w-full" />) : (
          <>
            <div className="rounded-2xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Latest Readings</p><p className="mt-2 text-3xl font-semibold text-foreground">{stats?.total ?? 0}</p><p className="mt-2 text-xs text-muted-foreground">Most recent reading per patient.</p></div>
            <div className="rounded-2xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Critical</p><p className="mt-2 text-3xl font-semibold text-foreground">{stats?.critical ?? 0}</p><p className="mt-2 text-xs text-muted-foreground">Immediate review or escalation required.</p></div>
            <div className="rounded-2xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Warning</p><p className="mt-2 text-3xl font-semibold text-foreground">{stats?.warning ?? 0}</p><p className="mt-2 text-xs text-muted-foreground">Repeat observation or monitor closely.</p></div>
            <div className="rounded-2xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Stable</p><p className="mt-2 text-3xl font-semibold text-foreground">{stats?.normal ?? 0}</p><p className="mt-2 text-xs text-muted-foreground">Within expected bedside thresholds.</p></div>
          </>
        )}
      </div>

      <SectionCard title="Vitals Worklist" description="Filter patient observations by clinical status or bedside location.">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patient or room" className="pl-10" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full lg:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {vitalsQuery.isLoading ? (
          <div className="space-y-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-44 w-full" />)}</div>
        ) : data.length ? (
          <div className="space-y-4">
            {data.map((reading: any) => (
              <div key={reading.id} className="rounded-2xl border border-border bg-background p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-foreground">{reading.patientName}</h3>
                      <Badge variant={reading.status === "critical" ? "destructive" : "outline"}>{reading.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">Room {reading.patientRoom || "-"} | Recorded {new Date(reading.recordedAt).toLocaleString()}</p>
                  </div>
                  <Button variant="outline" onClick={() => setSelectedReading(reading)}>Review Reading</Button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <VitalMetric label="Heart Rate" value={`${reading.heartRate || "-"} bpm`} />
                  <VitalMetric label="Blood Pressure" value={reading.bloodPressure || "-"} />
                  <VitalMetric label="Temperature" value={`${reading.temperature || "-"} C`} />
                  <VitalMetric label="Respiratory Rate" value={`${reading.respiratoryRate || "-"} /min`} />
                  <VitalMetric label="SpO2" value={`${reading.oxygenSaturation || "-"}%`} />
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground">No readings matched the current filter set.</p>}
      </SectionCard>

      <Dialog open={showRecordDialog} onOpenChange={setShowRecordDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Record Vital Signs</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">Patient</label>
              <Select value={form.patientId} onValueChange={(value) => setForm((current) => ({ ...current, patientId: value }))}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>
                  {patients.map((patient: any) => (
                    <SelectItem key={patient.id} value={patient.id}>{patient.fullName || `${patient.firstName || ""} ${patient.lastName || ""}`.trim()} | Room {patient.room || "-"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <FormField label="Heart Rate (bpm)"><Input type="number" value={form.heartRate} onChange={(event) => setForm((current) => ({ ...current, heartRate: event.target.value }))} /></FormField>
            <FormField label="Temperature (C)"><Input type="number" step="0.1" value={form.temperature} onChange={(event) => setForm((current) => ({ ...current, temperature: event.target.value }))} /></FormField>
            <FormField label="Systolic"><Input type="number" value={form.systolic} onChange={(event) => setForm((current) => ({ ...current, systolic: event.target.value }))} /></FormField>
            <FormField label="Diastolic"><Input type="number" value={form.diastolic} onChange={(event) => setForm((current) => ({ ...current, diastolic: event.target.value }))} /></FormField>
            <FormField label="Respiratory Rate (/min)"><Input type="number" value={form.respiratoryRate} onChange={(event) => setForm((current) => ({ ...current, respiratoryRate: event.target.value }))} /></FormField>
            <FormField label="Oxygen Saturation (%)"><Input type="number" value={form.oxygenSaturation} onChange={(event) => setForm((current) => ({ ...current, oxygenSaturation: event.target.value }))} /></FormField>
            <FormField label="Pain Score (0-10)" className="md:col-span-2"><Input type="number" max={10} value={form.painScore} onChange={(event) => setForm((current) => ({ ...current, painScore: event.target.value }))} /></FormField>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">Observation Notes</label>
              <Textarea rows={4} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Document additional observations, patient complaints, or escalation context." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecordDialog(false)}>Cancel</Button>
            <Button onClick={() => recordMutation.mutate()} disabled={recordMutation.isPending || !form.patientId}>{recordMutation.isPending ? "Saving..." : "Save Reading"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedReading} onOpenChange={(open) => { if (!open) setSelectedReading(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Observation Review</DialogTitle></DialogHeader>
          {selectedReading ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Stethoscope className="h-4 w-4 text-blue-500" />{selectedReading.patientName}</div>
                <p className="mt-2 text-sm text-muted-foreground">Recorded by {selectedReading.recordedBy || "Nurse"} on {new Date(selectedReading.recordedAt).toLocaleString()}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <VitalMetric label="Heart Rate" value={`${selectedReading.heartRate || "-"} bpm`} />
                <VitalMetric label="Blood Pressure" value={selectedReading.bloodPressure || "-"} />
                <VitalMetric label="Temperature" value={`${selectedReading.temperature || "-"} C`} />
                <VitalMetric label="Respiratory Rate" value={`${selectedReading.respiratoryRate || "-"} /min`} />
                <VitalMetric label="SpO2" value={`${selectedReading.oxygenSaturation || "-"}%`} />
                <VitalMetric label="Pain Score" value={selectedReading.painScore != null ? String(selectedReading.painScore) : "-"} />
              </div>
              {selectedReading.notes ? <div className="rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground">{selectedReading.notes}</div> : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VitalMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-2 text-lg font-semibold text-foreground">{value}</p></div>;
}

function FormField({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={`space-y-2 ${className}`}><label className="text-sm font-medium text-foreground">{label}</label>{children}</div>;
}
