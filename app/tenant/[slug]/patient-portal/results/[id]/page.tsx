"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, FileText, Microscope, RefreshCw } from "lucide-react";

type LabResultDetail = {
  id: string;
  orderId: string;
  testName: string;
  testCode?: string | null;
  category: string;
  status: string;
  orderedAt?: string | null;
  completedAt?: string | null;
  provider: string;
  notes?: string | null;
  resultData: unknown;
  fileUrl?: string | null;
  patientPortalEligible: boolean;
};

function formatStructuredResults(resultData: unknown) {
  if (Array.isArray(resultData)) {
    return resultData.map((entry, index) => {
      const item = typeof entry === "object" && entry ? (entry as Record<string, unknown>) : {};
      return {
        id: String(item.id || item.name || index),
        name: String(item.name || item.parameter || `Finding ${index + 1}`),
        value: String(item.value || item.result || "-"),
        unit: String(item.unit || ""),
        referenceRange: String(item.referenceRange || item.reference || ""),
        interpretation: String(item.interpretation || ""),
      };
    });
  }

  if (resultData && typeof resultData === "object") {
    return Object.entries(resultData as Record<string, unknown>).map(([key, value]) => ({
      id: key,
      name: key,
      value: typeof value === "string" ? value : JSON.stringify(value),
      unit: "",
      referenceRange: "",
      interpretation: "",
    }));
  }

  return [];
}

export default function PatientLabResultDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const id = params?.id as string;
  const [result, setResult] = useState<LabResultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadResult(showSpinner = true) {
    if (showSpinner) setRefreshing(true);
    try {
      const response = await fetch(`/api/tenant/${slug}/patient/lab-results/${id}`, {
        cache: "no-store",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to load lab result");
      setResult(await response.json());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadResult();
  }, [id, slug]);

  const findings = useMemo(() => formatStructuredResults(result?.resultData), [result?.resultData]);

  function handleDownload() {
    window.open(`/api/tenant/${slug}/patient/lab-results/${id}/download`, "_blank", "noopener,noreferrer");
  }

  if (loading || !result) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading test details...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-3">
          <Link href={`/tenant/${slug}/patient-portal/results`} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to results
          </Link>
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">Lab Result Details</p>
            <h1 className="mt-1 text-3xl font-semibold text-foreground">{result.testName}</h1>
            <p className="mt-2 text-sm text-muted-foreground">Review the full test record, findings, and patient-release eligibility for this result.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => loadResult()} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted">
            <RefreshCw className={`mr-2 inline h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleDownload}
            disabled={!result.patientPortalEligible}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="mr-2 inline h-4 w-4" />
            Download e-stamp
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Status</p>
          <p className="mt-2 text-lg font-semibold capitalize text-foreground">{result.status}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Category</p>
          <p className="mt-2 text-lg font-semibold capitalize text-foreground">{result.category || "general"}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Ordered</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{result.orderedAt ? new Date(result.orderedAt).toLocaleString() : "-"}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{result.completedAt ? new Date(result.completedAt).toLocaleString() : "Pending"}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <Microscope className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Test record</h2>
                <p className="text-sm text-muted-foreground">Order metadata and release state for this test.</p>
              </div>
            </div>
            <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Test name</dt>
                <dd className="mt-1 font-medium text-foreground">{result.testName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Test code</dt>
                <dd className="mt-1 font-medium text-foreground">{result.testCode || "-"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Ordered by</dt>
                <dd className="mt-1 font-medium text-foreground">{result.provider}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Release status</dt>
                <dd className="mt-1 font-medium text-foreground">{result.patientPortalEligible ? "Released to patient" : "Awaiting payment clearance"}</dd>
              </div>
            </dl>
            <div className="mt-4 rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Clinical notes</p>
              <p className="mt-2 whitespace-pre-wrap">{result.notes || "No additional notes were attached to this test."}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Findings</h2>
                <p className="text-sm text-muted-foreground">Structured values and observations for this result.</p>
              </div>
            </div>
            {findings.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="py-3 pr-4 font-medium">Parameter</th>
                      <th className="py-3 pr-4 font-medium">Value</th>
                      <th className="py-3 pr-4 font-medium">Unit</th>
                      <th className="py-3 pr-4 font-medium">Reference</th>
                      <th className="py-3 font-medium">Interpretation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-foreground">
                    {findings.map((finding) => (
                      <tr key={finding.id}>
                        <td className="py-3 pr-4 font-medium">{finding.name}</td>
                        <td className="py-3 pr-4">{finding.value}</td>
                        <td className="py-3 pr-4">{finding.unit || "-"}</td>
                        <td className="py-3 pr-4">{finding.referenceRange || "-"}</td>
                        <td className="py-3">{finding.interpretation || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground">
                No structured findings were uploaded for this result yet.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Patient access</h2>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="font-medium text-foreground">Download permission</p>
                <p className="mt-1">{result.patientPortalEligible ? "Full result download is enabled." : "Payment must clear before this result can be downloaded."}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="font-medium text-foreground">Attached file</p>
                <p className="mt-1">{result.fileUrl ? "An uploaded source file exists in the lab record." : "No uploaded file is attached to this result."}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Actions</h2>
            <div className="mt-4 space-y-3">
              <button
                onClick={handleDownload}
                disabled={!result.patientPortalEligible}
                className="w-full rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Download e-stamped result
              </button>
              <Link href={`/tenant/${slug}/patient-portal/billing`} className="block w-full rounded-xl border border-border px-4 py-3 text-center text-sm font-medium text-foreground hover:bg-muted">
                Open billing
              </Link>
              <Link href={`/tenant/${slug}/patient-portal/results`} className="block w-full rounded-xl border border-border px-4 py-3 text-center text-sm font-medium text-foreground hover:bg-muted">
                Back to all results
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
