"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Printer, RefreshCw } from "lucide-react";
import { Button, PageHeader, SectionCard, Skeleton } from "@/components/ui";

function toCsv(rows: Array<Array<string | number>>) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell);
          return value.includes(",") || value.includes('"') ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(",")
    )
    .join("\n");
}

function buildReportDocument(title: string, description: string, rows: Array<Array<string | number>>, insights: string[]) {
  return `<!doctype html><html><head><meta charset="utf-8" /><title>${title}</title><style>
    body{font-family:Arial,sans-serif;padding:32px;color:#111827;max-width:960px;margin:0 auto}
    h1{margin:0 0 8px}
    p{line-height:1.6}
    .card{border:1px solid #d1d5db;border-radius:16px;padding:16px;margin:16px 0}
    table{border-collapse:collapse;width:100%;margin-top:24px}
    td,th{border:1px solid #d1d5db;padding:10px;text-align:left}
    th{background:#f3f4f6}
    ul{padding-left:20px}
  </style></head><body>
    <h1>${title}</h1>
    <p>${description}</p>
    <div class="card"><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
    <table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${row[0]}</td><td>${row[1]}</td></tr>`).join("")}</tbody></table>
    <div class="card"><h2>Operational Insights</h2><ul>${insights.map((item) => `<li>${item}</li>`).join("")}</ul></div>
  </body></html>`;
}

export default function NurseReportsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [activeTemplateId, setActiveTemplateId] = useState("shift-handover");

  const reportsQuery = useQuery({
    queryKey: ["tenant-nurse-reports", slug],
    queryFn: async () => {
      const response = await fetch(`/api/nurse/reports?slug=${slug}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load nurse reports");
      return response.json();
    },
  });

  const templates = reportsQuery.data?.templates || [];
  const stats = reportsQuery.data?.stats;
  const activeTemplate = templates.find((template: any) => template.id === activeTemplateId) || templates[0];

  const snapshotRows = useMemo(
    () => [
      ["Total Patients", stats?.totalPatients ?? 0],
      ["Occupied Beds", stats?.occupiedBeds ?? 0],
      ["Pending Medications", stats?.pendingMedications ?? 0],
      ["Open Care Tasks", stats?.openCareTasks ?? 0],
      ["Vitals Captured", stats?.vitalsCaptured ?? 0],
    ],
    [stats]
  );

  const insights = useMemo(
    () => [
      `${stats?.pendingMedications ?? 0} medication lines still require administration or closure.`,
      `${stats?.openCareTasks ?? 0} care-plan tasks are still open for bedside follow-through.`,
      `${stats?.occupiedBeds ?? 0} beds are occupied, which sets the current ward census baseline.`,
    ],
    [stats]
  );

  const openReportWindow = (shouldPrint = false) => {
    const html = buildReportDocument(activeTemplate?.title || "Nurse Report", activeTemplate?.description || "Nursing operations snapshot", snapshotRows, insights);
    const popup = window.open("", "_blank", "noopener,noreferrer,width=1100,height=800");
    if (!popup) return;
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    if (shouldPrint) {
      popup.onload = () => popup.print();
    }
  };

  const handleCsvDownload = () => {
    const csv = toCsv([["Metric", "Value"], ...snapshotRows]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${activeTemplate?.id || "nurse-report"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleHtmlDownload = () => {
    const html = buildReportDocument(activeTemplate?.title || "Nurse Report", activeTemplate?.description || "Nursing operations snapshot", snapshotRows, insights);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${activeTemplate?.id || "nurse-report"}.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nursing Reports"
        subtitle="Shift-ready operational reporting with real tenant metrics, printable report packs, and export actions."
        actions={<Button variant="outline" onClick={() => reportsQuery.refetch()} disabled={reportsQuery.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${reportsQuery.isFetching ? "animate-spin" : ""}`} />Refresh</Button>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {reportsQuery.isLoading ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 w-full" />) : (
          <>
            <Stat title="Patients" value={stats?.totalPatients ?? 0} subtitle="Current monitored census" />
            <Stat title="Occupied Beds" value={stats?.occupiedBeds ?? 0} subtitle="Active bed occupancy baseline" />
            <Stat title="Pending Medications" value={stats?.pendingMedications ?? 0} subtitle="Medication lines still open" />
            <Stat title="Open Care Tasks" value={stats?.openCareTasks ?? 0} subtitle="Tasks needing bedside closeout" />
          </>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
        <SectionCard title="Report Templates" description="Use the left rail like a settings workspace to move between report packs.">
          <div className="space-y-3">
            {reportsQuery.isLoading ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-20 w-full" />) : templates.map((template: any) => (
              <button key={template.id} type="button" onClick={() => setActiveTemplateId(template.id)} className={`w-full rounded-2xl border p-4 text-left transition-colors ${activeTemplateId === template.id ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-muted/40"}`}>
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><FileText className="h-4 w-4" />{template.title}</div>
                <p className="mt-2 text-xs text-muted-foreground">{template.description}</p>
                <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">Formats: {(template.format || []).join(", ")}</p>
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title={activeTemplate?.title || "Report Preview"}
          description={activeTemplate?.description || "Select a report template to preview the current tenant snapshot."}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => openReportWindow(false)}>Preview HTML</Button>
              <Button variant="outline" onClick={() => openReportWindow(true)}><Printer className="mr-2 h-4 w-4" />Print PDF</Button>
              <Button variant="outline" onClick={handleHtmlDownload}>Export HTML</Button>
              <Button onClick={handleCsvDownload}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
            </div>
          }
        >
          {reportsQuery.isLoading ? <Skeleton className="h-72 w-full" /> : (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {snapshotRows.map((row) => (
                  <div key={row[0]} className="rounded-2xl border border-border bg-background p-4">
                    <p className="text-sm text-muted-foreground">{row[0]}</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{row[1]}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                <div className="rounded-2xl border border-border bg-background p-5">
                  <h3 className="text-sm font-semibold text-foreground">Operational Insights</h3>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {insights.map((insight) => (
                      <li key={insight}>{insight}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-border bg-background p-5">
                  <h3 className="text-sm font-semibold text-foreground">Export Behavior</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Print and preview open in a clean document window so the topbar and sidebar are not included in the exported output. CSV and HTML export as direct files.</p>
                </div>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function Stat({ title, value, subtitle }: { title: string; value: number; subtitle: string }) {
  return <div className="rounded-2xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">{title}</p><p className="mt-2 text-3xl font-semibold text-foreground">{value}</p><p className="mt-2 text-xs text-muted-foreground">{subtitle}</p></div>;
}
