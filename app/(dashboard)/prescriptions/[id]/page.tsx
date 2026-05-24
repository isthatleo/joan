"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, Pill, Printer, RefreshCw, UserRound } from "lucide-react";
import { toast } from "sonner";
import { KPICard } from "@/components/KPICard";
import { Topbar } from "@/components/Topbar";

function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClasses(status?: string | null) {
  const normalized = String(status || "active").toLowerCase();
  if (normalized === "completed") return "bg-success-soft text-success-soft-foreground";
  if (normalized === "discontinued") return "bg-destructive-soft text-destructive-soft-foreground";
  if (normalized === "pending") return "bg-warning-soft text-warning-soft-foreground";
  return "bg-info-soft text-info-soft-foreground";
}

function stockClasses(status?: string | null) {
  if (status === "out_of_stock") return "bg-destructive-soft text-destructive-soft-foreground";
  if (status === "low_stock") return "bg-warning-soft text-warning-soft-foreground";
  return "bg-success-soft text-success-soft-foreground";
}

export default function PrescriptionDetailsPage() {
  const params = useParams();
  const id = String(params?.id || "");
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["doctor-prescription", id],
    queryFn: async () => {
      const response = await fetch(`/api/doctor/prescriptions/${id}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to load prescription");
      return payload;
    },
    enabled: Boolean(id),
  });

  const actionMutation = useMutation({
    mutationFn: async ({ action }: { action: "complete" | "discontinue" | "refill" }) => {
      const response = await fetch(`/api/doctor/prescriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, refillAmount: action === "refill" ? 1 : undefined }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to update prescription");
      return payload;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["doctor-prescription", id] });
      queryClient.invalidateQueries({ queryKey: ["doctor-prescriptions"] });
      toast.success(
        variables.action === "refill"
          ? "Prescription renewed"
          : variables.action === "complete"
            ? "Prescription marked complete"
            : "Prescription discontinued"
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update prescription");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Topbar breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Prescriptions", href: "/prescriptions" }, { label: "Loading..." }]} />
        <div className="rounded-xl border border-border bg-card px-5 py-8 text-sm text-muted-foreground shadow-sm">
          Loading prescription details...
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <Topbar breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Prescriptions", href: "/prescriptions" }, { label: "Details" }]} />
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-5 py-8 text-sm text-destructive shadow-sm">
          Failed to load this prescription.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Topbar breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Prescriptions", href: "/prescriptions" }, { label: data.medication || "Details" }]} />

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/prescriptions" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted/40">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-semibold text-foreground">{data.medication || "Prescription"}</h1>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClasses(data.status)}`}>
                  {data.status || "active"}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.patientName} · {data.globalPatientId || data.patientId}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/40"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
          <button
            type="button"
            onClick={() => actionMutation.mutate({ action: "refill" })}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/40"
          >
            <RefreshCw className="h-4 w-4" />
            Renew
          </button>
          {data.status !== "completed" && (
            <button
              type="button"
              onClick={() => actionMutation.mutate({ action: "complete" })}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/40"
            >
              <CheckCircle2 className="h-4 w-4" />
              Complete
            </button>
          )}
          {data.status !== "discontinued" && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Discontinue this prescription?")) {
                  actionMutation.mutate({ action: "discontinue" });
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              <AlertTriangle className="h-4 w-4" />
              Discontinue
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard title="Medication Count" value={data.items?.length ?? 0} subtitle="Line items" icon={Pill} tone="info" />
        <KPICard title="Refills Remaining" value={data.refillsRemaining ?? 0} subtitle="Primary order tracking" icon={RefreshCw} tone="warning" />
        <KPICard title="Prescribed" value={formatDate(data.prescribedAt)} subtitle={data.prescribedBy || "Doctor"} icon={Clock3} tone="primary" />
        <KPICard title="Patient" value={data.patientName} subtitle={data.patientEmail || data.patientPhone || "No contact details"} icon={UserRound} tone="success" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">Medication items</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Drug</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Regimen</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Refills</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Stock</th>
                </tr>
              </thead>
              <tbody>
                {(data.items ?? []).map((item: any) => (
                  <tr key={item.id} className="border-t border-border align-top">
                    <td className="px-4 py-4">
                      <p className="font-medium text-foreground">{item.drugName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.genericName || "No generic metadata"} {item.strength ? `· ${item.strength}` : ""}
                      </p>
                      {item.instructions && (
                        <p className="mt-2 text-xs text-muted-foreground">{item.instructions}</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-foreground">{item.dosage || "-"}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.frequency || "No frequency"} · {item.duration || "No duration"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Qty {item.quantity || 0} {item.route ? `· ${item.route}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-foreground">{item.refills ?? 0}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${stockClasses(item.stockInfo?.status)}`}>
                        {item.stockInfo?.status?.replaceAll("_", " ") || "not tracked"}
                      </span>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {item.stockInfo?.totalQuantity ?? 0} units available
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">Patient context</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Patient</dt>
                <dd className="font-medium text-foreground">{data.patientName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Contact</dt>
                <dd className="text-foreground">{data.patientEmail || data.patientPhone || "No contact details"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Diagnosis</dt>
                <dd className="text-foreground">{data.diagnosis || data.indications || "Not specified"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Preferred pharmacy</dt>
                <dd className="text-foreground">{data.pharmacy || "Not specified"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Visit reason</dt>
                <dd className="text-foreground">{data.visitReason || "Prescription review"}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">Clinical notes</h2>
            <div className="mt-4 space-y-3 text-sm text-foreground">
              <p>{data.notes || "No additional notes recorded."}</p>
              {Array.isArray(data.interactions) && data.interactions.length > 0 && (
                <div>
                  <p className="font-medium text-foreground">Interaction watch-outs</p>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    {data.interactions.map((item: string, index: number) => (
                      <li key={index}>- {item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {Array.isArray(data.sideEffects) && data.sideEffects.length > 0 && (
                <div>
                  <p className="font-medium text-foreground">Side effects discussed</p>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    {data.sideEffects.map((item: string, index: number) => (
                      <li key={index}>- {item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
