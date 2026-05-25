"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw } from "lucide-react";
import { Badge, Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, PageHeader, SectionCard, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton, Textarea } from "@/components/ui";

export default function NurseBedsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [selectedBed, setSelectedBed] = useState<any | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [form, setForm] = useState({ status: "available", patientId: "", condition: "", notes: "" });
  const [createForm, setCreateForm] = useState({ bedNumber: "", ward: "", room: "", status: "available", patientId: "", condition: "", notes: "" });
  const queryClient = useQueryClient();

  const bedsQuery = useQuery({
    queryKey: ["tenant-nurse-beds", slug],
    queryFn: async () => {
      const response = await fetch(`/api/nurse/beds?slug=${slug}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load beds");
      return response.json();
    },
    refetchInterval: 60000,
  });

  const patientsQuery = useQuery({
    queryKey: ["tenant-nurse-bed-patients", slug],
    queryFn: async () => {
      const response = await fetch(`/api/nurse/patients?slug=${slug}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load patients");
      return response.json();
    },
  });

  const refreshBeds = () => queryClient.invalidateQueries({ queryKey: ["tenant-nurse-beds"] });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/nurse/beds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, id: selectedBed.id, ...form }),
      });
      if (!response.ok) throw new Error("Failed to update bed");
      return response.json();
    },
    onSuccess: () => {
      refreshBeds();
      setSelectedBed(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/nurse/beds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, ...createForm }),
      });
      if (!response.ok) throw new Error("Failed to create bed");
      return response.json();
    },
    onSuccess: () => {
      refreshBeds();
      setShowCreateDialog(false);
      setCreateForm({ bedNumber: "", ward: "", room: "", status: "available", patientId: "", condition: "", notes: "" });
    },
  });

  const beds = bedsQuery.data?.beds || [];
  const stats = bedsQuery.data?.stats;
  const patients = patientsQuery.data?.patients || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bed Management"
        subtitle="Ward capacity, occupancy, maintenance status, bedside assignment, and bed creation workflow."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => bedsQuery.refetch()} disabled={bedsQuery.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${bedsQuery.isFetching ? "animate-spin" : ""}`} />Refresh</Button>
            <Button onClick={() => setShowCreateDialog(true)}><Plus className="mr-2 h-4 w-4" />Add Bed</Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {bedsQuery.isLoading ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 w-full" />) : (
          <>
            <Tile title="Total Beds" value={stats?.total ?? 0} hint="Beds configured in the current tenant scope." />
            <Tile title="Available" value={stats?.available ?? 0} hint="Ready for admission or transfer." />
            <Tile title="Occupied" value={stats?.occupied ?? 0} hint="Actively assigned to admitted patients." />
            <Tile title="Maintenance" value={stats?.maintenance ?? 0} hint="Unavailable until engineering clears the bed." />
          </>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <SectionCard title="Bed Board" description="Theme-responsive ward board with reassignment, maintenance, and new-bed controls.">
          {bedsQuery.isLoading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-48 w-full" />)}</div> : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {beds.map((bed: any) => (
                <div key={bed.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Ward {bed.ward || "-"}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Room {bed.room || "-"} | Bed {bed.bedNumber}</p>
                    </div>
                    <Badge variant={bed.status === "occupied" ? "secondary" : bed.status === "maintenance" ? "destructive" : "outline"}>{bed.status}</Badge>
                  </div>
                  <div className="mt-4 rounded-xl border border-border bg-background p-4 text-sm">
                    <p className="font-medium text-foreground">{bed.patientName || "No patient assigned"}</p>
                    <p className="mt-1 text-muted-foreground">{bed.condition || (bed.status === "available" ? "Ready for admission" : "Condition not documented")}</p>
                  </div>
                  <Button className="mt-4 w-full" variant="outline" onClick={() => { setSelectedBed(bed); setForm({ status: bed.status || "available", patientId: bed.patientId || "", condition: bed.condition || "", notes: bed.notes || "" }); }}>Manage Bed</Button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Capacity Guidance" description="Quick operational guidance for charge-nurse level bed decisions.">
          <div className="space-y-3">
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-sm font-semibold text-foreground">Admissions ready</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{stats?.available ?? 0}</p>
              <p className="mt-2 text-xs text-muted-foreground">Open beds available for incoming admissions or transfers.</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-sm font-semibold text-foreground">Beds under maintenance</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{stats?.maintenance ?? 0}</p>
              <p className="mt-2 text-xs text-muted-foreground">Coordinate with engineering before returning these beds to service.</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-sm font-semibold text-foreground">Occupied census</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{stats?.occupied ?? 0}</p>
              <p className="mt-2 text-xs text-muted-foreground">Current occupied bed count across the ward board.</p>
            </div>
          </div>
        </SectionCard>
      </div>

      <Dialog open={!!selectedBed} onOpenChange={(open) => { if (!open) setSelectedBed(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Manage Bed Assignment</DialogTitle></DialogHeader>
          {selectedBed ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Status"><Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="available">Available</SelectItem><SelectItem value="occupied">Occupied</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem></SelectContent></Select></Field>
              <Field label="Patient"><Select value={form.patientId || "none"} onValueChange={(value) => setForm((current) => ({ ...current, patientId: value === "none" ? "" : value }))}><SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger><SelectContent><SelectItem value="none">No patient</SelectItem>{patients.map((patient: any) => <SelectItem key={patient.id} value={patient.id}>{patient.fullName || `${patient.firstName || ""} ${patient.lastName || ""}`.trim()}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Bedside Condition" className="md:col-span-2"><Input value={form.condition} onChange={(event) => setForm((current) => ({ ...current, condition: event.target.value }))} placeholder="Post-op observation, isolation, discharge-ready, etc." /></Field>
              <Field label="Notes" className="md:col-span-2"><Textarea rows={4} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Document transfer notes, engineering remarks, or special handling instructions." /></Field>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedBed(null)}>Cancel</Button>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saving..." : "Save Bed Status"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Add New Bed</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Bed Number"><Input value={createForm.bedNumber} onChange={(event) => setCreateForm((current) => ({ ...current, bedNumber: event.target.value }))} placeholder="B-14" /></Field>
            <Field label="Ward"><Input value={createForm.ward} onChange={(event) => setCreateForm((current) => ({ ...current, ward: event.target.value }))} placeholder="Medical" /></Field>
            <Field label="Room"><Input value={createForm.room} onChange={(event) => setCreateForm((current) => ({ ...current, room: event.target.value }))} placeholder="12C" /></Field>
            <Field label="Initial Status"><Select value={createForm.status} onValueChange={(value) => setCreateForm((current) => ({ ...current, status: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="available">Available</SelectItem><SelectItem value="occupied">Occupied</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem></SelectContent></Select></Field>
            <Field label="Patient" className="md:col-span-2"><Select value={createForm.patientId || "none"} onValueChange={(value) => setCreateForm((current) => ({ ...current, patientId: value === "none" ? "" : value }))}><SelectTrigger><SelectValue placeholder="Select patient (optional)" /></SelectTrigger><SelectContent><SelectItem value="none">No patient</SelectItem>{patients.map((patient: any) => <SelectItem key={patient.id} value={patient.id}>{patient.fullName || `${patient.firstName || ""} ${patient.lastName || ""}`.trim()}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Condition" className="md:col-span-2"><Input value={createForm.condition} onChange={(event) => setCreateForm((current) => ({ ...current, condition: event.target.value }))} placeholder="Initial condition or handling note" /></Field>
            <Field label="Notes" className="md:col-span-2"><Textarea rows={4} value={createForm.notes} onChange={(event) => setCreateForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Document any setup notes for this bed." /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !createForm.bedNumber || !createForm.ward}>{createMutation.isPending ? "Creating..." : "Create Bed"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Tile({ title, value, hint }: { title: string; value: number; hint: string }) {
  return <div className="rounded-2xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">{title}</p><p className="mt-2 text-3xl font-semibold text-foreground">{value}</p><p className="mt-2 text-xs text-muted-foreground">{hint}</p></div>;
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={`space-y-2 ${className}`}><label className="text-sm font-medium text-foreground">{label}</label>{children}</div>;
}
