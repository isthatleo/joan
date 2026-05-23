"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, FileSpreadsheet, FileText, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { useTenantPath } from "@/hooks/useTenantPath";

type SnapshotMetric = { label: string; value: string };
type SnapshotTable = { title: string; columns: string[]; rows: string[][] };
type SnapshotSection = { title: string; description?: string; metrics?: SnapshotMetric[]; table?: SnapshotTable };
type ReportSnapshot = {
  templateKey: string;
  periodLabel: string;
  generatedAt: string;
  summary: SnapshotMetric[];
  sections: SnapshotSection[];
  highlights: string[];
};

type ReportDetails = {
  id: string;
  name: string;
  type: string;
  description: string;
  status: string;
  format: string;
  size: string;
  generatedAt: string;
  snapshot: ReportSnapshot | null;
  templateConfig?: {
    accent?: string;
    branding?: {
      coverNote?: string;
      watermarkText?: string;
      footerPrimary?: string;
      footerSecondary?: string;
    };
  };
};

export default function AccountantReportDetailsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const reportId = params?.id as string;
  const tenantPath = useTenantPath();

  const [report, setReport] = useState<ReportDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  useEffect(() => {
    async function loadReport() {
      setLoading(true);
      try {
        const response = await fetch(`/api/tenant/${slug}/accountant/reports/${reportId}`);
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || "Failed to load report details");
        setReport(payload);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load report details";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    }

    loadReport();
  }, [slug, reportId]);

  async function downloadReport(format: "pdf" | "csv" | "html") {
    setDownloadingFormat(format);
    try {
      const response = await fetch(`/api/tenant/${slug}/accountant/reports/${reportId}/download?format=${format}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || `Failed to download ${format.toUpperCase()}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      if (format === "html") {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${report?.name || "report"}.${format}`;
        anchor.click();
      }

      toast.success(`${format.toUpperCase()} action completed`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to download report";
      toast.error(message);
    } finally {
      setDownloadingFormat(null);
    }
  }

  const accent = useMemo(() => report?.templateConfig?.accent || "#f97316", [report]);
  const coverNote = report?.templateConfig?.branding?.coverNote || report?.description || "Generated from live tenant accounting data.";

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="font-semibold text-foreground">Report not found</p>
        <Link href={tenantPath("/accountant/reports")} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">
          <ArrowLeft className="size-4" />
          Back To Reports
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <Link href={tenantPath("/accountant/reports")} className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Back To Reports
          </Link>
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Generated Report</p>
            <h1 className="mt-1 text-3xl font-bold text-foreground">{report.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{report.description}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton
            label="PDF"
            icon={<Download className="size-4" />}
            active={downloadingFormat === "pdf"}
            onClick={() => downloadReport("pdf")}
          />
          <ActionButton
            label="CSV"
            icon={<FileSpreadsheet className="size-4" />}
            active={downloadingFormat === "csv"}
            onClick={() => downloadReport("csv")}
          />
          <ActionButton
            label="HTML"
            icon={<Mail className="size-4" />}
            active={downloadingFormat === "html"}
            onClick={() => downloadReport("html")}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Status", value: report.status },
          { label: "Format", value: report.format.toUpperCase() },
          { label: "Size", value: report.size },
          { label: "Generated", value: new Date(report.generatedAt).toLocaleString() },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-[28px] border border-border bg-[linear-gradient(180deg,var(--tw-gradient-from)_0%,var(--tw-gradient-via)_42%,var(--tw-gradient-to)_100%)] from-orange-50 via-background to-blue-50 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.12)] dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
        <div className="rounded-[24px] border border-white/80 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
          <div className="mb-5 flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-start sm:justify-between" style={{ borderColor: `${accent}30` }}>
            <div>
              <div className="mb-2 inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em]" style={{ backgroundColor: `${accent}18`, color: accent }}>
                {report.type} report
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{report.name}</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{coverNote}</p>
            </div>
            <div className="text-left text-xs text-slate-400 dark:text-slate-500 sm:text-right">
              <p>{report.snapshot?.periodLabel || "Last 12 months"}</p>
              <p>{report.templateConfig?.branding?.watermarkText || "CONFIDENTIAL"}</p>
            </div>
          </div>

          {report.snapshot?.summary?.length ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {report.snapshot.summary.map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{metric.label}</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{metric.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              No structured summary is available for this report.
            </div>
          )}

          {report.snapshot?.highlights?.length ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Highlights</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                {report.snapshot.highlights.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-6 space-y-5">
            {report.snapshot?.sections?.map((section) => (
              <div key={section.title} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{section.title}</h3>
                {section.description ? <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{section.description}</p> : null}

                {section.metrics?.length ? (
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {section.metrics.map((metric) => (
                      <div key={metric.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{metric.label}</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{metric.value}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {section.table ? (
                  <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                          {section.table.columns.map((column) => (
                            <th key={column} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {section.table.rows.map((row, index) => (
                          <tr key={`${section.title}-${index}`}>
                            {row.map((cell, cellIndex) => (
                              <td key={`${section.title}-${index}-${cellIndex}`} className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-6 border-t pt-4 text-xs text-slate-500 dark:text-slate-400">
            <p>{report.templateConfig?.branding?.footerPrimary || "Confidential. For authorized internal use only."}</p>
            <p className="mt-1">{report.templateConfig?.branding?.footerSecondary || "Prepared by the finance office."}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={active}
      className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-60"
    >
      {active ? <Loader2 className="size-4 animate-spin" /> : icon}
      {label}
    </button>
  );
}
