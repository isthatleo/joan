"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Clock3, History, Pill, Plus, RefreshCw, Search, Stethoscope, UserRound } from "lucide-react";
import { toast } from "sonner";
import { KPICard } from "@/components/KPICard";
import { useTenantPath } from "@/hooks/useTenantPath";

function formatDateTime(value?: string | Date | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function statusClasses(status?: string | null) {
  const normalized = String(status || "active").toLowerCase();
  if (normalized === "completed") return "bg-success-soft text-success-soft-foreground";
  if (normalized === "discontinued") return "bg-destructive-soft text-destructive-soft-foreground";
  if (normalized === "pending") return "bg-warning-soft text-warning-soft-foreground";
  return "bg-info-soft text-info-soft-foreground";
}

export default function PrescriptionsPage() {
  const queryClient = useQueryClient();
  const tenantPath = useTenantPath();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [activeAction, setActiveAction] = useState<{ id: string; type: "complete" | "discontinue" | "refill" } | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["doctor-prescriptions", search, status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const response = await fetch(`/api/doctor/prescriptions?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to load prescriptions");
      return payload;
    },
  });

  const prescriptions = data?.prescriptions ?? [];
  const stats = data?.stats ?? {
    total: 0,
    active: 0,
    pending: 0,
    completed: 0,
    expiringSoon: 0,
    lowRefills: 0,
  };

  const renewalCandidates = useMemo(
    () => prescriptions.filter((item: any) => Number(item.refillsRemaining || 0) <= 1 && item.status === "active").length,
    [prescriptions]
  );

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "complete" | "discontinue" | "refill" }) => {
      setActiveAction({ id, type: action });
      const response = await fetch(`/api/doctor/prescriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          refillAmount: action === "refill" ? 1 : undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to update prescription");
      return payload;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["doctor-prescriptions"] });
      toast.success(
        variables.action === "refill"
          ? "Prescription renewed"
          : variables.action === "complete"
            ? "Prescription marked complete"
            : "Prescription discontinued"
      );
      setActiveAction(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update prescription");
      setActiveAction(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Prescriptions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Write, review, renew, and complete live medication orders using stocked inventory.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["doctor-prescriptions"] })}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${actionMutation.isPending ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href={tenantPath("/doctor/prescriptions/new")}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            New Prescription
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard title="Total Prescriptions" value={stats.total} subtitle="Loaded from live records" icon={Pill} tone="info" />
        <KPICard title="Active Orders" value={stats.active} subtitle="Currently actionable" icon={Stethoscope} tone="primary" />
        <KPICard title="Expiring Soon" value={stats.expiringSoon} subtitle="Within the next 7 days" icon={Clock3} tone="warning" />
        <KPICard title="Needs Renewal" value={renewalCandidates || stats.lowRefills} subtitle="One refill or less remaining" icon={AlertTriangle} tone="destructive" />
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by patient, medication, generic name, or patient ID"
              className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm text-foreground"
            />
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="discontinued">Discontinued</option>
          </select>
        </div>
      </div>

      {isError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load prescriptions.
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">Medication Orders</h2>
          <p className="text-sm text-muted-foreground">{prescriptions.length} prescription(s)</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Patient</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Medication</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Regimen</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Dates</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index} className="border-t border-border">
                    <td colSpan={6} className="px-5 py-4 text-muted-foreground">Loading prescriptions...</td>
                  </tr>
                ))
              ) : prescriptions.length === 0 ? (
                <tr className="border-t border-border">
                  <td colSpan={6} className="px-5 py-10 text-center">
                    <Pill className="mx-auto h-10 w-10 text-muted-foreground" />
                    <p className="mt-3 text-base font-medium text-foreground">No prescriptions found</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Adjust your filters or write a new prescription from stocked medications.
                    </p>
                    <Link
                      href={tenantPath("/doctor/prescriptions/new")}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                    >
                      <Plus className="h-4 w-4" />
                      Write Prescription
                    </Link>
                  </td>
                </tr>
              ) : (
                prescriptions.map((prescription: any) => (
                  <tr key={prescription.id} className="border-t border-border align-top">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-foreground">{prescription.patientName || "Unknown patient"}</p>
                        <p className="text-xs text-muted-foreground">
                          {prescription.globalPatientId || prescription.patientId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {prescription.patientEmail || prescription.patientPhone || "No contact details"}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-foreground">{prescription.medication || "Untitled medication"}</p>
                        <p className="text-xs text-muted-foreground">
                          {prescription.genericName || prescription.strength || "No generic metadata"}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <p className="text-foreground">{prescription.dosage || "-"}</p>
                        <p className="text-xs text-muted-foreground">
                          {prescription.frequency || "Frequency not set"} · {prescription.duration || "Duration not set"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Qty {prescription.quantity || 0} · Refills left {prescription.refillsRemaining ?? 0}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-2">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClasses(prescription.status)}`}>
                          {prescription.status || "active"}
                        </span>
                        {prescription.priority && (
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">
                            {prescription.priority}
                          </div>
                        )}
                        {prescription.isEmergency && (
                          <div className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Emergency
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>Prescribed: {formatDateTime(prescription.prescribedAt)}</p>
                        <p>Expires: {formatDate(prescription.expiresAt || prescription.validUntil)}</p>
                        {prescription.filledAt && <p>Completed: {formatDateTime(prescription.filledAt)}</p>}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={tenantPath(`/doctor/prescriptions/${prescription.id}`)}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40"
                        >
                          View
                        </Link>
                        <Link
                          href={tenantPath(`/doctor/patients/${prescription.patientId}`)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40"
                        >
                          <UserRound className="h-3.5 w-3.5" />
                          Patient
                        </Link>
                        <Link
                          href={tenantPath(`/doctor/analytics/my-patients/${prescription.patientId}`)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40"
                        >
                          <History className="h-3.5 w-3.5" />
                          History
                        </Link>
                        {prescription.status !== "completed" && (
                          <button
                            onClick={() => actionMutation.mutate({ id: prescription.id, action: "complete" })}
                            disabled={actionMutation.isPending}
                            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actionMutation.isPending && activeAction?.id === prescription.id && activeAction?.type === "complete" ? "Saving..." : "Complete"}
                          </button>
                        )}
                        <button
                          onClick={() => actionMutation.mutate({ id: prescription.id, action: "refill" })}
                          disabled={actionMutation.isPending}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <span className="inline-flex items-center gap-1"><RefreshCw className={`h-3.5 w-3.5 ${actionMutation.isPending && activeAction?.id === prescription.id && activeAction?.type === "refill" ? "animate-spin" : ""}`} /> {actionMutation.isPending && activeAction?.id === prescription.id && activeAction?.type === "refill" ? "Renewing..." : "Renew"}</span>
                        </button>
                        {prescription.status !== "discontinued" && (
                          <button
                            onClick={() => {
                              if (window.confirm("Discontinue this prescription?")) {
                                actionMutation.mutate({ id: prescription.id, action: "discontinue" });
                              }
                            }}
                            disabled={actionMutation.isPending}
                            className="rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actionMutation.isPending && activeAction?.id === prescription.id && activeAction?.type === "discontinue" ? "Saving..." : "Discontinue"}
                          </button>
                        )}
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

