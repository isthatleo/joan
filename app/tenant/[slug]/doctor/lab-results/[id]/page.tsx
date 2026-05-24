"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, CheckCircle2, Download, FileText, FlaskConical, Loader2, Repeat2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useTenantPath } from "@/hooks/useTenantPath";

type ResultDetail = {
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
  values: Array<{ name: string; value: string; unit?: string; referenceRange?: string; flag: string; interpretation?: string }>;
  notes: string | null;
  attachments: string[];
  fileUrl: string | null;
  performedAt: string | null;
  orderedAt: string | null;
  dueDate: string | null;
  acceptedAt: string | null;
  acceptedByDoctorName: string | null;
  requestedRepeatAt: string | null;
  followUpOrderId: string | null;
  patientPortalEligible: boolean;
};

const categories = ["General", "Hematology", "Chemistry", "Microbiology", "Imaging"];
const priorities = ["routine", "urgent", "critical"];

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

export default function LabResultDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantPath = useTenantPath();
  const queryClient = useQueryClient();
  const id = params?.id as string;
  const [repeatForm, setRepeatForm] = useState({
    testName: "",
    testCode: "",
    category: "General",
    priority: "routine",
    labLocation: "Main Lab",
    dueDate: "",
    notes: "",
  });
  const [pendingAction, setPendingAction] = useState<"accept" | "repeat" | null>(null);

  const resultQuery = useQuery<ResultDetail>({
    queryKey: ["doctor-lab-result", id],
    queryFn: async () => {
      const response = await fetch(`/api/doctor/lab-results/${id}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to load lab result");
      }
      return response.json();
    },
  });

  const acceptResult = useMutation({
    mutationFn: async () => {
      setPendingAction("accept");
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
      await queryClient.invalidateQueries({ queryKey: ["doctor-lab-result", id] });
      await queryClient.invalidateQueries({ queryKey: ["doctor-lab-results"] });
      setPendingAction(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setPendingAction(null);
    },
  });

  const requestRepeat = useMutation({
    mutationFn: async () => {
      setPendingAction("repeat");
      const response = await fetch(`/api/doctor/lab-results/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request-repeat", ...repeatForm }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to request follow-up order");
      }
      return response.json();
    },
    onSuccess: async (data) => {
      toast.success("Follow-up lab order created.");
      if (data.followUpOrder?.id) {
        router.push(tenantPath("/doctor/lab-orders"));
      }
      await queryClient.invalidateQueries({ queryKey: ["doctor-lab-result", id] });
      await queryClient.invalidateQueries({ queryKey: ["doctor-lab-orders"] });
      setPendingAction(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setPendingAction(null);
    },
  });

  const result = resultQuery.data;
  const patientDetailPath = result ? tenantPath(`/doctor/patients/${result.patientId}`) : tenantPath("/doctor/patients");
  const patientHistoryPath = result ? tenantPath(`/doctor/analytics/my-patients/${result.patientId}`) : tenantPath("/doctor/analytics/my-patients");

  useEffect(() => {
    if (!result) return;
    setRepeatForm((current) => ({
      ...current,
      testName: result.testName || current.testName || "",
      testCode: result.testCode || current.testCode || "",
      category: result.category || current.category || "General",
      priority: result.priority || current.priority || "routine",
    }));
  }, [result]);

  const onRepeatSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await requestRepeat.mutateAsync();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => router.push(tenantPath("/doctor/lab-results"))}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Lab Result Details</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review the result, accept it, or request a follow-up test.</p>
        </div>
      </div>

      {resultQuery.isLoading ? (
        <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center text-muted-foreground">
          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
        </div>
      ) : resultQuery.isError ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {(resultQuery.error as Error).message}
        </div>
      ) : result ? (
        <>
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{result.testName}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{[result.testCode || "No code", result.category || "General"].join(" - ")}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${flagTone(result.flag)}`}>{result.flag}</span>
                  <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-foreground">{result.status.replace("_", " ")}</span>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Patient</p>
                  <p className="mt-1 font-medium text-foreground">{result.patientName}</p>
                  <p className="text-sm text-muted-foreground">{result.globalPatientId || "No patient number"}</p>
                  <p className="text-sm text-muted-foreground">{result.patientPhone || result.patientEmail || "No contact on file"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Timeline</p>
                  <p className="mt-1 text-foreground">Ordered: {result.orderedAt ? format(new Date(result.orderedAt), "MMM dd, yyyy h:mm a") : "-"}</p>
                  <p className="text-sm text-muted-foreground">Published: {result.performedAt ? format(new Date(result.performedAt), "MMM dd, yyyy h:mm a") : "-"}</p>
                  <p className="text-sm text-muted-foreground">Accepted: {result.acceptedAt ? format(new Date(result.acceptedAt), "MMM dd, yyyy h:mm a") : "Not yet accepted"}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link href={patientDetailPath} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground">
                  <UserRound className="h-4 w-4" />
                  Patient Profile
                </Link>
                <Link href={patientHistoryPath} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground">
                  <FileText className="h-4 w-4" />
                  Patient History
                </Link>
              </div>

              <div className="rounded-xl border border-border">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/40 text-left text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Parameter</th>
                      <th className="px-4 py-3 font-medium">Value</th>
                      <th className="px-4 py-3 font-medium">Range</th>
                      <th className="px-4 py-3 font-medium">Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {result.values.map((value, index) => (
                      <tr key={`${value.name}-${index}`}>
                        <td className="px-4 py-3 font-medium text-foreground">{value.name}</td>
                        <td className="px-4 py-3 text-foreground">{value.value} {value.unit || ""}</td>
                        <td className="px-4 py-3 text-muted-foreground">{value.referenceRange || "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${flagTone(value.flag)}`}>{value.flag}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {result.notes && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Clinical Notes</p>
                  <div className="mt-2 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground">
                    {result.notes}
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Actions</h2>
                <p className="text-sm text-muted-foreground">Close this review loop or request further work.</p>
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-background/70 p-4">
                <p className="text-sm font-medium text-foreground">Doctor review status</p>
                <p className="text-sm text-muted-foreground">
                  {result.acceptedAt
                    ? `Accepted by ${result.acceptedByDoctorName || "doctor"} on ${format(new Date(result.acceptedAt), "MMM dd, yyyy h:mm a")}.`
                    : "This result is still pending doctor acceptance."}
                </p>
                {!result.acceptedAt && (
                  <button
                    onClick={() => acceptResult.mutate()}
                    disabled={acceptResult.isPending || requestRepeat.isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {acceptResult.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {pendingAction === "accept" ? "Accepting..." : "Accept Result"}
                  </button>
                )}
              </div>

              {result.fileUrl && (
                <a
                  href={result.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground"
                >
                  <Download className="h-4 w-4" />
                  Open PDF / Attachment
                </a>
              )}

              <div className="rounded-xl border border-border bg-background/70 p-4">
                <p className="text-sm font-medium text-foreground">Patient portal release</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {result.patientPortalEligible
                    ? "This patient has a billing record or payment trail that can support later portal release logic."
                    : "No billing/payment trail detected yet for patient-facing result release."}
                </p>
              </div>

              <form onSubmit={onRepeatSubmit} className="space-y-3 rounded-xl border border-border bg-background/70 p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Request Another Test</p>
                  <p className="text-sm text-muted-foreground">Send a follow-up or repeat order back to the lab.</p>
                </div>
                <input
                  required
                  value={repeatForm.testName || result.testName || ""}
                  onChange={(event) => setRepeatForm((current) => ({ ...current, testName: event.target.value }))}
                  placeholder="Test name"
                  className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none"
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    value={repeatForm.testCode}
                    onChange={(event) => setRepeatForm((current) => ({ ...current, testCode: event.target.value }))}
                    placeholder={result.testCode || "Test code"}
                    className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none"
                  />
                  <select
                    value={repeatForm.category}
                    onChange={(event) => setRepeatForm((current) => ({ ...current, category: event.target.value }))}
                    className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none"
                  >
                    {categories.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <select
                    value={repeatForm.priority}
                    onChange={(event) => setRepeatForm((current) => ({ ...current, priority: event.target.value }))}
                    className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none"
                  >
                    {priorities.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <input
                    value={repeatForm.labLocation}
                    onChange={(event) => setRepeatForm((current) => ({ ...current, labLocation: event.target.value }))}
                    placeholder="Lab location"
                    className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none"
                  />
                  <input
                    type="datetime-local"
                    value={repeatForm.dueDate}
                    onChange={(event) => setRepeatForm((current) => ({ ...current, dueDate: event.target.value }))}
                    className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none md:col-span-2"
                  />
                </div>
                <textarea
                  value={repeatForm.notes}
                  onChange={(event) => setRepeatForm((current) => ({ ...current, notes: event.target.value }))}
                  rows={4}
                  placeholder="Why is another test required?"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none"
                />
                <button
                  type="submit"
                  disabled={requestRepeat.isPending || acceptResult.isPending || !repeatForm.testName.trim()}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground disabled:opacity-50"
                >
                  {requestRepeat.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Repeat2 className="h-4 w-4" />}
                  {pendingAction === "repeat" ? "Creating Follow-up..." : "Request Another Test"}
                </button>
                {result.followUpOrderId && (
                  <p className="text-xs text-muted-foreground">
                    Existing follow-up order: {result.followUpOrderId}
                  </p>
                )}
              </form>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}




