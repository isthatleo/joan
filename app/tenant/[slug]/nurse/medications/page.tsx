"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, RefreshCw, Search, SkipForward, UserRound } from "lucide-react";
import { Badge, Button, Input, PageHeader, SectionCard, Skeleton } from "@/components/ui";
import { withTenantPrefix } from "@/lib/tenant-routing";

export default function NurseMedicationsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const hostname = typeof window !== "undefined" ? window.location.hostname : null;
  const toTenantPath = (path: string) => withTenantPrefix(path, slug, hostname);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const medicationsQuery = useQuery({
    queryKey: ["tenant-nurse-medications", slug, search],
    queryFn: async () => {
      const qs = new URLSearchParams({ slug, search });
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
      if (!response.ok) throw new Error("Failed to update medication");
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenant-nurse-medications"] }),
  });

  const medications = medicationsQuery.data?.medications || [];
  const stats = medicationsQuery.data?.stats;

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
            <MetricTile title="Missed or Skipped" value={(stats?.missed ?? 0) + (medications.filter((item: any) => item.status === "skipped").length)} subtitle="Needs follow-up, explanation, or rescheduling." />
          </>
        )}
      </div>

      <SectionCard title="Medication Worklist" description="Search by patient, medication, or room to manage the active medication round.">
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patient or medication" className="pl-10" />
        </div>

        {medicationsQuery.isLoading ? (
          <div className="space-y-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-44 w-full" />)}</div>
        ) : medications.length ? (
          <div className="space-y-4">
            {medications.map((medication: any) => (
              <div key={medication.id} className="rounded-2xl border border-border bg-background p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-foreground">{medication.medication || "Medication"}</h3>
                      <Badge variant={medication.status === "pending" ? "outline" : medication.status === "administered" ? "secondary" : "destructive"}>{medication.status}</Badge>
                      <Badge variant="outline">{medication.dueTime ? new Date(medication.dueTime).toLocaleString() : "Due now"}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{medication.patientName} | Room {medication.patientRoom || "-"}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{medication.dosage || "Dose pending"} | {medication.route || "Route pending"} | {medication.frequency || "Schedule pending"}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Prescribed by {medication.prescribedBy || "Doctor"}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 xl:max-w-xs xl:justify-end">
                    <Link href={toTenantPath(`/nurse/patients`)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground"><UserRound className="h-4 w-4" />Patient</Link>
                    <Button variant="outline" onClick={() => actionMutation.mutate({ action: "skip", id: medication.id })} disabled={actionMutation.isPending || medication.status !== "pending"}><SkipForward className="mr-2 h-4 w-4" />Skip</Button>
                    <Button variant="outline" onClick={() => actionMutation.mutate({ action: "administer", id: medication.id })} disabled={actionMutation.isPending || medication.status !== "pending"}><CheckCircle2 className="mr-2 h-4 w-4" />Administer</Button>
                    <Button onClick={() => actionMutation.mutate({ action: "complete-prescription", prescriptionId: medication.prescriptionId })} disabled={actionMutation.isPending || medication.prescriptionStatus === "completed"}>Mark Course Complete</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground">No medications matched the current search.</p>}
      </SectionCard>
    </div>
  );
}

function MetricTile({ title, value, subtitle }: { title: string; value: number; subtitle: string }) {
  return <div className="rounded-2xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">{title}</p><p className="mt-2 text-3xl font-semibold text-foreground">{value}</p><p className="mt-2 text-xs text-muted-foreground">{subtitle}</p></div>;
}
