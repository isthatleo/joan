"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Eye, FileText, History, ImageIcon, Printer, Search, TriangleAlert, UserRound } from "lucide-react";
import { KPICard } from "@/components/KPICard";
import { Topbar } from "@/components/Topbar";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

export default function DoctorPatientHistoryPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [risk, setRisk] = useState("all");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["doctor-patient-history-roster", search, status, risk],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (risk) params.set("risk", risk);
      const response = await fetch(`/api/doctor/patient-history?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to load patient history roster");
      return payload;
    },
  });

  const patients = data?.patients ?? [];
  const stats = data?.stats ?? {
    totalPatients: 0,
    withVisits: 0,
    activePrescriptions: 0,
    pendingLabOrders: 0,
    needsAttention: 0,
  };

  const emptyMessage = useMemo(() => {
    if (search) return "No patients matched the current search.";
    if (risk === "attention") return "No patients currently need attention from this view.";
    return "No patient history records available yet.";
  }, [risk, search]);

  const detailPath = (id: string, mode?: "print" | "pdf" | "png") => {
    const base = `/analytics/my-patients/${id}`;
    return mode ? `${base}?action=${mode}` : base;
  };

  return (
    <div className="space-y-6">
      <Topbar breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Patient History" }]} />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Patient History</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search your patient panel and open full medical histories with export actions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KPICard title="Patients" value={stats.totalPatients} subtitle="In this history panel" icon={UserRound} tone="info" />
        <KPICard title="With Visits" value={stats.withVisits} subtitle="Documented consultations" icon={History} tone="primary" />
        <KPICard title="Active Prescriptions" value={stats.activePrescriptions} subtitle="Current medication orders" icon={FileText} tone="success" />
        <KPICard title="Pending Labs" value={stats.pendingLabOrders} subtitle="Outstanding workups" icon={Download} tone="warning" />
        <KPICard title="Needs Attention" value={stats.needsAttention} subtitle="Flagged from current filters" icon={TriangleAlert} tone="destructive" />
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by patient name, email, phone, or patient ID"
              className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm text-foreground"
            />
          </div>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select value={risk} onChange={(event) => setRisk(event.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
            <option value="all">All risk views</option>
            <option value="attention">Needs attention</option>
          </select>
        </div>
      </div>

      {isError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load patient history roster.
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">Patient history roster</h2>
          <p className="text-sm text-muted-foreground">{patients.length} patient record(s)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Patient</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">History Summary</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Clinical Load</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Latest Activity</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index} className="border-t border-border">
                    <td colSpan={5} className="px-5 py-4 text-muted-foreground">Loading patient history roster...</td>
                  </tr>
                ))
              ) : patients.length === 0 ? (
                <tr className="border-t border-border">
                  <td colSpan={5} className="px-5 py-10 text-center">
                    <History className="mx-auto h-10 w-10 text-muted-foreground" />
                    <p className="mt-3 text-base font-medium text-foreground">No patient history found</p>
                    <p className="mt-1 text-sm text-muted-foreground">{emptyMessage}</p>
                  </td>
                </tr>
              ) : (
                patients.map((patient: any) => (
                  <tr key={patient.id} className="border-t border-border align-top">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-foreground">{patient.fullName || `${patient.firstName || ""} ${patient.lastName || ""}`.trim()}</p>
                        <p className="text-xs text-muted-foreground">{patient.globalPatientId || patient.id}</p>
                        <p className="text-xs text-muted-foreground">{patient.email || patient.phone || "No contact details"}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>{patient.totalVisits} visit(s)</p>
                        <p>{patient.totalAppointments} appointment(s)</p>
                        <p>{patient.activePrescriptions} active prescription(s)</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-2">
                        <span className="inline-flex rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning-soft-foreground">
                          {patient.pendingLabOrders} pending lab(s)
                        </span>
                        <div className="text-xs text-muted-foreground">
                          Status: {patient.status || "active"}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-foreground">{formatDate(patient.latestInteractionAt)}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link href={detailPath(patient.id)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40">View</Link>
                        <button onClick={() => window.open(detailPath(patient.id, "print"), "_blank", "noopener,noreferrer")} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40">Print</button>
                        <button onClick={() => window.open(detailPath(patient.id, "pdf"), "_blank", "noopener,noreferrer")} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40">PDF</button>
                        <button onClick={() => window.open(detailPath(patient.id, "png"), "_blank", "noopener,noreferrer")} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40">PNG</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
