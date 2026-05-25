"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BedDouble, HeartPulse, Mail, Phone, RefreshCw, Search, ShieldAlert, UserRound } from "lucide-react";
import { Badge, Button, Input, PageHeader, SectionCard, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton } from "@/components/ui";
import { withTenantPrefix } from "@/lib/tenant-routing";

function toAge(dob?: string | Date | null) {
  if (!dob) return "-";
  const birth = new Date(dob);
  return String(Math.max(0, new Date().getFullYear() - birth.getFullYear()));
}

export default function NursePatientsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const hostname = typeof window !== "undefined" ? window.location.hostname : null;
  const toTenantPath = (path: string) => withTenantPrefix(path, slug, hostname);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["tenant-nurse-patients", slug, search, status],
    queryFn: async () => {
      const qs = new URLSearchParams({ slug, status, search });
      const response = await fetch(`/api/nurse/patients?${qs.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load patients");
      return response.json();
    },
  });

  const patients = data?.patients || [];
  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assigned Patients"
        subtitle="Live nursing roster with bed placement, allergies, condition flags, and doctor context."
        actions={<Button variant="outline" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />Refresh</Button>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {isLoading ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 w-full" />) : (
          <>
            <div className="rounded-2xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Roster Size</p><p className="mt-2 text-3xl font-semibold text-foreground">{stats?.total ?? 0}</p><p className="mt-2 text-xs text-muted-foreground">Patients currently visible to the nursing team.</p></div>
            <div className="rounded-2xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Critical Status</p><p className="mt-2 text-3xl font-semibold text-foreground">{stats?.critical ?? 0}</p><p className="mt-2 text-xs text-muted-foreground">Needs rapid review or escalated monitoring.</p></div>
            <div className="rounded-2xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Bed Occupancy</p><p className="mt-2 text-3xl font-semibold text-foreground">{stats?.occupiedBeds ?? 0}</p><p className="mt-2 text-xs text-muted-foreground">Patients with documented ward and bed assignments.</p></div>
            <div className="rounded-2xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Needs Review</p><p className="mt-2 text-3xl font-semibold text-foreground">{stats?.pendingReview ?? 0}</p><p className="mt-2 text-xs text-muted-foreground">Improving or declining cases to revisit this shift.</p></div>
          </>
        )}
      </div>

      <SectionCard title="Roster Filters" description="Search by patient, MRN, room, or current status.">
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patient, MRN, or room" className="pl-10" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full lg:w-48"><SelectValue placeholder="Filter by status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="improving">Improving</SelectItem>
              <SelectItem value="declining">Declining</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <SectionCard title="Patient Registry" description="Clinical and bedside context for each admitted patient.">
          {isLoading ? (
            <div className="space-y-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-44 w-full" />)}</div>
          ) : patients.length ? (
            <div className="space-y-4">
              {patients.map((patient: any) => (
                <div key={patient.id} className="rounded-2xl border border-border bg-background p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-foreground">{patient.fullName || `${patient.firstName || ""} ${patient.lastName || ""}`.trim()}</h3>
                          <Badge variant="outline">MRN {patient.mrn || "Pending"}</Badge>
                          <Badge variant={patient.currentStatus === "critical" ? "destructive" : "outline"}>{patient.currentStatus || "active"}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{toAge(patient.dob)} years | {patient.gender || "Not set"} | {patient.ward || "Ward pending"} / Room {patient.room || "-"} / Bed {patient.bed || "-"}</p>
                      </div>

                      <div className="grid gap-3 text-sm md:grid-cols-2">
                        <div className="rounded-xl border border-border p-3">
                          <p className="font-medium text-foreground">Primary condition</p>
                          <p className="mt-1 text-muted-foreground">{patient.primaryCondition || "Not documented"}</p>
                        </div>
                        <div className="rounded-xl border border-border p-3">
                          <p className="font-medium text-foreground">Attending doctor</p>
                          <p className="mt-1 text-muted-foreground">{patient.doctorName || "Unassigned"}</p>
                        </div>
                      </div>

                      {patient.allergies?.length ? (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-500/30 dark:bg-rose-500/10">
                          <div className="flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-300"><AlertTriangle className="h-4 w-4" />Allergies</div>
                          <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">{patient.allergies.join(", ")}</p>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2 lg:w-64 lg:justify-end">
                      <Link href={toTenantPath(`/nurse/vitals?patientId=${patient.id}`)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground"><HeartPulse className="h-4 w-4" />Vitals</Link>
                      <Link href={toTenantPath(`/nurse/care-plans?patientId=${patient.id}`)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground"><ShieldAlert className="h-4 w-4" />Care Plan</Link>
                      {patient.phone ? <a href={`tel:${patient.phone}`} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground"><Phone className="h-4 w-4" />Call</a> : null}
                      {patient.email ? <a href={`mailto:${patient.email}`} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground"><Mail className="h-4 w-4" />Email</a> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">No patients matched the current filters.</p>}
        </SectionCard>

        <SectionCard title="Roster Intelligence" description="Fast safety and continuity-of-care view for the current shift.">
          <div className="space-y-3">
            <div className="rounded-2xl border border-border bg-background p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><BedDouble className="h-4 w-4 text-blue-500" />Bed coverage</div>
              <p className="mt-3 text-3xl font-semibold text-foreground">{stats?.occupiedBeds ?? 0}</p>
              <p className="mt-2 text-xs text-muted-foreground">Patients with active bed placement and bedside documentation.</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><AlertTriangle className="h-4 w-4 text-rose-500" />Clinical review</div>
              <p className="mt-3 text-3xl font-semibold text-foreground">{stats?.critical ?? 0}</p>
              <p className="mt-2 text-xs text-muted-foreground">Patients already flagged as critical in the nurse roster.</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><UserRound className="h-4 w-4 text-amber-500" />Doctor coverage</div>
              <p className="mt-3 text-sm text-muted-foreground">Every roster card includes the latest linked doctor from the patient encounter history so handoffs stay traceable.</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
