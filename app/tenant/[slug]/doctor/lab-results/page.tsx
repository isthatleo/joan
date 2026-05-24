"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle2, Download, Eye, FlaskConical, History, Loader2, RefreshCw, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import { KPICard } from "@/components/KPICard";
import { useTenantPath } from "@/hooks/useTenantPath";

type LabResultRow = {
  id: string;
  orderId: string;
  patientId: string;
  patientName: string;
  patientEmail: string | null;
  patientPhone: string | null;
  globalPatientId: string | null;
  testName: string | null;
  testCode: string | null;
  category: string | null;
  priority: string | null;
  status: string;
  flag: string;
  summary: string;
  values: Array<{ name: string; value: string; unit?: string; referenceRange?: string; flag: string }>;
  notes: string | null;
  attachments: string[];
  fileUrl: string | null;
  performedAt: string | null;
  orderedAt: string | null;
  acceptedAt: string | null;
  acceptedByDoctorName: string | null;
  requestedRepeatAt: string | null;
  followUpOrderId: string | null;
};

type ResultsResponse = {
  results: LabResultRow[];
  stats: {
    total: number;
    pendingReview: number;
    accepted: number;
    critical: number;
    abnormal: number;
  };
};

const statuses = ["all", "pending_review", "accepted"];
const flags = ["all", "normal", "high", "low", "critical", "abnormal"];

function flagTone(flag: string) {
  switch (flag) {
    case "critical":
      return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
    case "high":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "low":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
    case "abnormal":
      return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300";
    default:
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
}

function statusTone(status: string) {
  switch (status) {
    case "accepted":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    default:
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
}

export default function LabResultsPage() {
  const queryClient = useQueryClient();
  const tenantPath = useTenantPath();
  const searchParams = useSearchParams();
  const orderId = searchParams?.get("orderId") || "";
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [flag, setFlag] = useState("all");
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const resultsQuery = useQuery<ResultsResponse>({
    queryKey: ["doctor-lab-results", search, status, flag, orderId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (status !== "all") params.set("status", status);
      if (flag !== "all") params.set("flag", flag);
      if (orderId) params.set("orderId", orderId);
      const response = await fetch(`/api/doctor/lab-results?${params.toString()}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to load lab results");
      }
      return response.json();
    },
  });

  const acceptResult = useMutation({
    mutationFn: async (id: string) => {
      setAcceptingId(id);
      const response = await fetch(`/api/doctor/lab-results/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to accept result");
      }
      return response.json();
    },
    onSuccess: async () => {
      toast.success("Lab result accepted.");
      await queryClient.invalidateQueries({ queryKey: ["doctor-lab-results"] });
      setAcceptingId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setAcceptingId(null);
    },
  });

  const rows = useMemo(() => resultsQuery.data?.results ?? [], [resultsQuery.data?.results]);
  const stats = resultsQuery.data?.stats;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Lab Results</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review published results, accept completed findings, and request follow-up testing.
          </p>
        </div>
        <button
          onClick={() => resultsQuery.refetch()}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground"
        >
          <RefreshCw className={`h-4 w-4 ${resultsQuery.isRefetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KPICard title="Total Results" value={stats?.total ?? 0} subtitle="Doctor scoped" tone="info" icon={FlaskConical} />
        <KPICard title="Pending Review" value={stats?.pendingReview ?? 0} subtitle="Awaiting doctor acceptance" tone="warning" icon={AlertTriangle} />
        <KPICard title="Accepted" value={stats?.accepted ?? 0} subtitle="Cleared by you" tone="success" icon={CheckCircle2} />
        <KPICard title="Critical" value={stats?.critical ?? 0} subtitle="Immediate attention" tone="danger" icon={AlertTriangle} />
        <KPICard title="Abnormal" value={stats?.abnormal ?? 0} subtitle="Out-of-range results" tone="primary" icon={FlaskConical} />
      </div>

      {resultsQuery.isError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {(resultsQuery.error as Error).message}
        </div>
      )}

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Result Worklist</h2>
            <p className="text-sm text-muted-foreground">Filter and act on newly published lab results.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search patient or test"
                className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none sm:w-72"
              />
            </div>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none"
            >
              {statuses.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All Status" : option.replace("_", " ")}
                </option>
              ))}
            </select>
            <select
              value={flag}
              onChange={(event) => setFlag(event.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none"
            >
              {flags.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All Flags" : option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Patient</th>
                  <th className="px-4 py-3 font-medium">Result</th>
                  <th className="px-4 py-3 font-medium">Flag</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Performed</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {resultsQuery.isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <FlaskConical className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-3 text-sm font-medium text-foreground">No lab results found.</p>
                      <p className="mt-1 text-sm text-muted-foreground">Published results will appear here for review.</p>
                    </td>
                  </tr>
                ) : (
                  rows.map((result) => (
                    <tr key={result.id}>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{result.patientName}</p>
                          <p className="text-xs text-muted-foreground">{result.globalPatientId || "No patient number"}</p>
                          <p className="text-xs text-muted-foreground">{result.patientPhone || result.patientEmail || "No contact on file"}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{result.testName || "Unnamed test"}</p>
                          <p className="text-xs text-muted-foreground">{[result.testCode || "No code", result.category || "General"].join(" - ")}</p>
                          <p className="text-xs text-muted-foreground">{result.summary}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${flagTone(result.flag)}`}>
                          {result.flag}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusTone(result.status)}`}>
                          {result.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        <div>
                          <p>{result.performedAt ? format(new Date(result.performedAt), "MMM dd, yyyy") : "-"}</p>
                          <p className="text-xs text-muted-foreground">{result.acceptedAt ? `Accepted ${format(new Date(result.acceptedAt), "MMM dd, h:mm a")}` : "Not yet accepted"}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={tenantPath(`/doctor/lab-results/${result.id}`)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground"
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </Link>
                          <Link
                            href={tenantPath(`/doctor/patients/${result.patientId}`)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground"
                          >
                            <UserRound className="h-3 w-3" />
                            Patient
                          </Link>
                          <Link
                            href={tenantPath(`/doctor/analytics/my-patients/${result.patientId}`)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground"
                          >
                            <History className="h-3 w-3" />
                            History
                          </Link>
                          {result.fileUrl && (
                            <a
                              href={result.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground"
                            >
                              <Download className="h-3 w-3" />
                              PDF
                            </a>
                          )}
                          {result.status !== "accepted" && (
                            <button
                              onClick={() => acceptResult.mutate(result.id)}
                              disabled={acceptResult.isPending}
                              className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              {acceptResult.isPending && acceptingId === result.id ? "Accepting..." : "Accept"}
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
      </section>
    </div>
  );
}

