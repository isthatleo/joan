"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, RefreshCw, Search, SkipForward, UserRound } from "lucide-react";
import { Badge, Button, Input, PageHeader, SectionCard, Skeleton } from "@/components/ui";
import { withTenantPrefix } from "@/lib/tenant-routing";

export default function NurseMedicationsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const hostname = typeof window !== "undefined" ? window.location.hostname : null;
  const toTenantPath = (path: string) => withTenantPrefix(path, slug, hostname);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [routeFilter, setRouteFilter] = useState("all"); // New state for route filter
  const queryClient = useQueryClient();

  const medicationsQuery = useQuery({
    queryKey: ["tenant-nurse-medications", slug, search, statusFilter, routeFilter], // Include routeFilter in queryKey
    queryFn: async () => {
      const qs = new URLSearchParams({ slug, search });
      if (statusFilter !== "all") {
        qs.set("status", statusFilter);
      }
      if (routeFilter !== "all") { // Pass routeFilter to API
        qs.set("route", routeFilter);
      }
      const response = await fetch(`/api/nurse/medications?${qs.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load medications");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const actionMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await fetch("/api/nurse/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, ...payload }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Failed to update medication");
      return result;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenant-nurse-medications"] }),
  });

  const medications = medicationsQuery.data?.medications || [];
  const stats = medicationsQuery.data?.stats;

  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "administered", label: "Administered" },
    { value: "missed", label: "Missed" },
    { value: "skipped", label: "Skipped" },
    { value: "reaction", label: "Reaction" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const routeOptions = [
    { value: "all", label: "All Routes" },
    { value: "iv", label: "IV" },
    { value: "im", label: "IM" },
    { value: "injection", label: "Injection" },
    { value: "subcutaneous", label: "Subcutaneous" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medication Administration"
        subtitle="Doctor-prescribed medication schedule with completion tracking shared across nursing and doctor views."
        actions={<Button variant="outline" onClick={() => medicationsQuery.refetch()} disabled={medicationsQuery.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${medicationsQuery.isFetching ? "animate-spin" : ""}`} />Refresh</Button>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {medicationsQuery.isLoading ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 w-full" />) : (
          <>
            <MetricTile title="Medication Lines" value={stats?.total ?? 0} subtitle="All scheduled administrations on the current roster." />
            <MetricTile title="Pending" value={stats?.pending ?? 0} subtitle="Still due or waiting to be administered." />
            <MetricTile title="Administered" value={stats?.administered ?? 0} subtitle="Successfully given and documented by nursing." />
            <MetricTile title="Missed, Skipped, Reaction" value={(stats?.missed ?? 0) + (stats?.skipped ?? 0) + (stats?.reactions ?? 0)} subtitle="Needs follow-up, explanation, or rescheduling." />
          </>
        )}
      </div>

      <SectionCard title="Medication Worklist" description="Search by patient, medication, or room to manage the active medication round.">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patient or medication" className="pl-10" />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={routeFilter}
            onChange={(event) => setRouteFilter(event.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
          >
            {routeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {medicationsQuery.isLoading ? (
          <div className="space-y-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-44 w-full" />)}</div>
        ) : medications.length ? (
          <div className="space-y-4">
            {medications.map((medication: any) => {
              const progress = medication.administrationProgress || { total: 0, pending: 0, administered: 0, terminal: 0 };
              const isClosed = medication.isPrescriptionClosed || ["completed", "discontinued", "cancelled", "canceled"].includes(String(medication.prescriptionStatus || "").toLowerCase());
              const canUpdate = medication.status === "pending" && !isClosed;
              return (
              <div key={medication.id} className="rounded-2xl border border-border bg-background p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-foreground">{medication.medication || "Medication"}</h3>
                      <Badge variant={medication.status === "pending" ? "outline" : medication.status === "administered" ? "secondary" : "destructive"}>{medication.status}</Badge>
                      {isClosed && <Badge variant="destructive">Prescription closed</Badge>}
                      <Badge variant="outline">{medication.dueTime ? new Date(medication.dueTime).toLocaleString() : "Due now"}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{medication.patientName} | Room {medication.patientRoom || "-"}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{medication.dosage || "Dose pending"} | {medication.route || "Route pending"} | {medication.frequency || "Schedule pending"}</p>
                    <p className="mt-2 text-xs font-medium text-foreground">
                      Progress: {progress.administered} administered, {progress.pending} pending of {progress.total} scheduled dose(s)
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">Prescribed by {medication.prescribedBy || "Doctor"}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 xl:max-w-xs xl:justify-end">
                    <Link href={toTenantPath(`/nurse/patients/${medication.patientId}`)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground"><UserRound className="h-4 w-4" />Patient</Link>
                    <Button variant="outline" onClick={() => actionMutation.mutate({ action: "skip", id: medication.id })} disabled={actionMutation.isPending || !canUpdate}><SkipForward className="mr-2 h-4 w-4" />Skip</Button>
                    <Button variant="outline" onClick={() => actionMutation.mutate({ action: "reaction", id: medication.id })} disabled={actionMutation.isPending || !canUpdate}><AlertTriangle className="mr-2 h-4 w-4" />Reaction</Button>
                    <Button variant="outline" onClick={() => actionMutation.mutate({ action: "administer", id: medication.id })} disabled={actionMutation.isPending || !canUpdate}><CheckCircle2 className="mr-2 h-4 w-4" />Administer</Button>
                    <Button onClick={() => actionMutation.mutate({ action: "complete-prescription", prescriptionId: medication.prescriptionId })} disabled={actionMutation.isPending || isClosed || progress.pending > 0}>Mark Course Complete</Button>
                  </div>
                </div>
              </div>
            )})}
          </div>
        ) : <p className="text-sm text-muted-foreground">No medications matched the current search.</p>}
      </SectionCard>
    </div>
  );
}

function MetricTile({ title, value, subtitle }: { title: string; value: number; subtitle: string }) {
  return <div className="rounded-2xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">{title}</p><p className="mt-2 text-3xl font-semibold text-foreground">{value}</p><p className="mt-2 text-xs text-muted-foreground">{subtitle}</p></div>;
}
