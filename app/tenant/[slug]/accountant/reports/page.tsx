"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  FileText, Search, Plus, Download, Calendar, DollarSign, Users, Receipt,
  FileSpreadsheet, Mail, Loader2, Settings, RefreshCw, Clock, Activity, Trash2, BadgeCheck, Sparkles, PenTool
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useTenantPath } from "@/hooks/useTenantPath";

const orange = "#F97316";

type ReportType = "financial" | "operational" | "patient" | "billing" | "custom";

interface Report {
  id: string;
  name: string;
  type: ReportType;
  description: string;
  createdAt: string;
  lastGenerated: string;
  status: "ready" | "generating" | "failed";
  format: "pdf" | "csv" | "html" | "excel";
  size?: string;
  downloadUrl?: string;
}

interface ReportTemplate {
  id: string;
  key?: string;
  name: string;
  type?: string;
  category: string;
  description: string;
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "custom";
  estimatedTime: string;
  config?: Record<string, unknown>;
  isSystem?: boolean;
}

interface ScheduledReport {
  id: string;
  templateId: string;
  name: string;
  frequency: string;
  nextRun: string;
  recipients: string[];
  format: string;
  isActive: boolean;
}

interface ScheduleEditor {
  mode: "create" | "edit";
  reportId?: string;
  templateId: string;
  name: string;
  frequency: string;
  format: string;
  recipients: string;
  nextRun: string;
}

export default function AccountantReportsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const tenantPath = useTenantPath();
  const [reports, setReports] = useState<Report[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"generated" | "templates" | "scheduled">("generated");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [generatingReports, setGeneratingReports] = useState<Set<string>>(new Set());
  const [scheduleEditor, setScheduleEditor] = useState<ScheduleEditor | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    fetchReportsData();
  }, [slug]);

  const fetchReportsData = async (options?: { silent?: boolean }) => {
    if (options?.silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const [reportsRes, templatesRes, scheduledRes] = await Promise.all([
        fetch(`/api/tenant/${slug}/accountant/reports`),
        fetch(`/api/tenant/${slug}/accountant/reports/templates`),
        fetch(`/api/tenant/${slug}/accountant/reports/scheduled`),
      ]);

      const nextReports = reportsRes.ok ? await reportsRes.json() : [];
      const nextTemplates = templatesRes.ok ? await templatesRes.json() : [];
      const nextScheduled = scheduledRes.ok ? await scheduledRes.json() : [];

      setReports(nextReports);
      setTemplates(nextTemplates);
      setScheduledReports(nextScheduled);

      if (activeTab === "generated" && nextReports.length === 0 && nextTemplates.length > 0) {
        setActiveTab("templates");
      }
    } catch (error) {
      console.error("Failed to fetch reports data:", error);
      toast.error("Failed to load reports data");
    } finally {
      if (options?.silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const generateReport = async (templateId: string, format: "pdf" | "csv" | "html" = "pdf") => {
    setGeneratingReports((prev) => new Set(prev).add(templateId));
    try {
      const res = await fetch(`/api/tenant/${slug}/accountant/reports/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, format }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || "Failed to generate report");
      if (payload?.report) {
        setReports((prev) => [payload.report, ...prev.filter((report) => report.id !== payload.report.id)]);
      } else {
        await fetchReportsData();
      }
      toast.success("Report generated");
      setActiveTab("generated");
    } catch (error) {
      toast.error("Failed to generate report");
    } finally {
      setGeneratingReports((prev) => {
        const next = new Set(prev);
        next.delete(templateId);
        return next;
      });
    }
  };

  const downloadReport = async (reportId: string, format: "pdf" | "csv" | "html") => {
    try {
      const res = await fetch(`/api/tenant/${slug}/accountant/reports/${reportId}/download?format=${format}`);
      if (!res.ok) throw new Error("Failed to download report");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      if (format === "html") {
        window.open(url, "_blank", "noopener,noreferrer");
        toast.success("HTML report opened");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = `report-${reportId}.${format}`;
        a.click();
        toast.success("Report downloaded");
      }
    } catch (error) {
      toast.error("Failed to download report");
    }
  };

  const deleteReport = async (reportId: string) => {
    if (!confirm("Delete this generated report?\n\nThis removes it from the generated reports list.")) return;
    try {
      const res = await fetch(`/api/tenant/${slug}/accountant/reports/${reportId}`, { method: "DELETE" });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || "Failed to delete report");
      setReports((prev) => prev.filter((report) => report.id !== reportId));
      toast.success("Report deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete report");
    }
  };

  const startScheduleCreate = (template: ReportTemplate) => {
    setScheduleEditor({
      mode: "create",
      templateId: template.id,
      name: template.name,
      frequency: template.frequency,
      format: "pdf",
      recipients: "",
      nextRun: new Date().toISOString().slice(0, 16),
    });
    setActiveTab("scheduled");
  };

  const startScheduleEdit = (report: ScheduledReport) => {
    setScheduleEditor({
      mode: "edit",
      reportId: report.id,
      templateId: report.templateId,
      name: report.name,
      frequency: report.frequency,
      format: report.format,
      recipients: report.recipients.join(", "),
      nextRun: new Date(report.nextRun).toISOString().slice(0, 16),
    });
    setActiveTab("scheduled");
  };

  const saveSchedule = async () => {
    if (!scheduleEditor) return;
    setSavingSchedule(true);
    const payload = {
      templateId: scheduleEditor.templateId,
      name: scheduleEditor.name,
      frequency: scheduleEditor.frequency,
      format: scheduleEditor.format,
      recipients: scheduleEditor.recipients,
      nextRun: scheduleEditor.nextRun ? new Date(scheduleEditor.nextRun).toISOString() : undefined,
    };

    try {
      const endpoint = scheduleEditor.mode === "create"
        ? `/api/tenant/${slug}/accountant/reports/schedule`
        : `/api/tenant/${slug}/accountant/reports/scheduled/${scheduleEditor.reportId}`;
      const method = scheduleEditor.mode === "create" ? "POST" : "PATCH";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save schedule");
      toast.success(scheduleEditor.mode === "create" ? "Scheduled report created" : "Scheduled report updated");
      setScheduleEditor(null);
      await fetchReportsData();
    } catch (error) {
      toast.error("Failed to save schedule");
    } finally {
      setSavingSchedule(false);
    }
  };

  const toggleScheduledReport = async (report: ScheduledReport) => {
    try {
      const res = await fetch(`/api/tenant/${slug}/accountant/reports/scheduled/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !report.isActive }),
      });
      if (!res.ok) throw new Error("Failed to update schedule");
      await fetchReportsData();
      toast.success(report.isActive ? "Scheduled report paused" : "Scheduled report resumed");
    } catch {
      toast.error("Failed to update scheduled report");
    }
  };

  const deleteScheduledReport = async (reportId: string) => {
    if (!confirm("Delete this scheduled report?\n\nIt will stop future deliveries and remove the saved schedule.")) return;
    try {
      const res = await fetch(`/api/tenant/${slug}/accountant/reports/scheduled/${reportId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete schedule");
      await fetchReportsData();
      toast.success("Scheduled report deleted");
    } catch {
      toast.error("Failed to delete scheduled report");
    }
  };

  const filteredReports = useMemo(() => reports.filter((report) => {
    const matchesSearch = report.name.toLowerCase().includes(search.toLowerCase()) || report.description.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || report.type === typeFilter;
    return matchesSearch && matchesType;
  }), [reports, search, typeFilter]);

  const filteredTemplates = useMemo(() => templates.filter((template) => {
    return template.name.toLowerCase().includes(search.toLowerCase()) || template.description.toLowerCase().includes(search.toLowerCase());
  }), [templates, search]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready": return "bg-green-50 text-green-700 border-green-200";
      case "generating": return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "failed": return "bg-red-50 text-red-700 border-red-200";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "financial": return <DollarSign className="size-4" />;
      case "operational": return <Activity className="size-4" />;
      case "patient": return <Users className="size-4" />;
      case "billing": return <Receipt className="size-4" />;
      default: return <FileText className="size-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Accountant Dashboard</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Generate branded financial reports from live tenant data.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fetchReportsData({ silent: true })} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all">
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link href={tenantPath("/accountant/reports/custom")} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90" style={{ backgroundColor: orange }}>
            <Plus className="size-4" />
            Custom Report
          </Link>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-1">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
          {[
            { id: "generated", label: "Generated Reports", count: reports.length },
            { id: "templates", label: "Report Templates", count: templates.length },
            { id: "scheduled", label: "Scheduled Reports", count: scheduledReports.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? "bg-orange-100 text-orange-700" : "text-muted-foreground hover:bg-muted"}`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
            />
          </div>
          {activeTab === "generated" && (
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300">
              <option value="all">All Types</option>
              <option value="financial">Financial</option>
              <option value="operational">Operational</option>
              <option value="patient">Patient</option>
              <option value="billing">Billing</option>
              <option value="custom">Custom</option>
            </select>
          )}
        </div>
      </div>

      {activeTab === "scheduled" && scheduleEditor && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{scheduleEditor.mode === "create" ? "Schedule Report" : "Edit Scheduled Report"}</h2>
              <p className="text-sm text-muted-foreground">Control recipients, frequency, and delivery format.</p>
            </div>
            <button onClick={() => setScheduleEditor(null)} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">Cancel</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input value={scheduleEditor.name} onChange={(e) => setScheduleEditor({ ...scheduleEditor, name: e.target.value })} placeholder="Schedule name" className="h-10 rounded-lg border border-border px-3 bg-background text-sm" />
            <input type="datetime-local" value={scheduleEditor.nextRun} onChange={(e) => setScheduleEditor({ ...scheduleEditor, nextRun: e.target.value })} className="h-10 rounded-lg border border-border px-3 bg-background text-sm" />
            <select value={scheduleEditor.frequency} onChange={(e) => setScheduleEditor({ ...scheduleEditor, frequency: e.target.value })} className="h-10 rounded-lg border border-border px-3 bg-background text-sm">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="custom">Custom</option>
            </select>
            <select value={scheduleEditor.format} onChange={(e) => setScheduleEditor({ ...scheduleEditor, format: e.target.value })} className="h-10 rounded-lg border border-border px-3 bg-background text-sm">
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
            </select>
          </div>
          <textarea value={scheduleEditor.recipients} onChange={(e) => setScheduleEditor({ ...scheduleEditor, recipients: e.target.value })} placeholder="Recipients separated by commas" className="min-h-24 w-full rounded-lg border border-border px-3 py-2 bg-background text-sm" />
          <button disabled={savingSchedule} onClick={saveSchedule} className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: orange }}>
            {savingSchedule ? <Loader2 className="size-4 animate-spin" /> : <Calendar className="size-4" />}
            Save Schedule
          </button>
        </div>
      )}

      {activeTab === "generated" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Report</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Generated</th>
                  <th className="text-left px-4 py-3">Size</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={6} className="py-16 text-center"><Loader2 className="size-6 text-orange-500 animate-spin mx-auto" /></td></tr>
                ) : filteredReports.length === 0 ? (
                  <tr><td colSpan={6} className="py-16 text-center"><FileText className="size-10 text-muted mx-auto mb-2" /><p className="text-muted-foreground font-medium">No reports found</p><p className="text-xs text-muted-foreground mt-1">Generate reports from the template library</p><button onClick={() => setActiveTab("templates")} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"><Plus className="size-4" />Open report templates</button></td></tr>
                ) : filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="size-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground border border-border">{getTypeIcon(report.type)}</div><div><p className="font-semibold text-foreground">{report.name}</p><p className="text-xs text-muted-foreground">{report.description}</p></div></div></td>
                    <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">{getTypeIcon(report.type)}{report.type}</span></td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(report.status)}`}>{report.status === "generating" && <Loader2 className="size-3 animate-spin" />}{report.status}</span></td>
                    <td className="px-4 py-3"><p className="text-sm text-foreground">{new Date(report.lastGenerated).toLocaleDateString()}</p><p className="text-xs text-muted-foreground">{new Date(report.lastGenerated).toLocaleTimeString()}</p></td>
                    <td className="px-4 py-3"><p className="text-sm text-foreground">{report.size || "N/A"}</p></td>
                    <td className="px-4 py-3"><div className="flex flex-wrap items-center gap-1">{report.status === "ready" && (<><Link href={tenantPath(`/accountant/reports/${report.id}`)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-orange-600 hover:bg-orange-50 font-medium text-xs transition-colors"><FileText className="size-3" />View</Link><button onClick={() => downloadReport(report.id, "pdf")} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 font-medium text-xs transition-colors"><Download className="size-3" />PDF</button><button onClick={() => downloadReport(report.id, "csv")} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-50 font-medium text-xs transition-colors"><FileSpreadsheet className="size-3" />CSV</button><button onClick={() => downloadReport(report.id, "html")} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-purple-600 hover:bg-purple-50 font-medium text-xs transition-colors"><Mail className="size-3" />HTML</button><button onClick={() => deleteReport(report.id)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 font-medium text-xs transition-colors"><Trash2 className="size-3" />Delete</button></> )}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <Link
            href={tenantPath("/accountant/reports/custom")}
            className="group rounded-xl border border-dashed border-orange-300 bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_100%)] p-6 transition hover:border-orange-500 hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="size-12 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center">
                <PenTool className="size-5" />
              </div>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                Builder
              </span>
            </div>
            <div className="mt-4">
              <h3 className="font-semibold text-foreground mb-1">Design Custom Template</h3>
              <p className="text-sm text-muted-foreground">
                Build a reusable branded template with logo, letterhead, footer language, signature block, visual style, and export-ready layout rules.
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2"><Sparkles className="size-3" /><span>Futuristic designer</span></div>
              <div className="flex items-center gap-2"><BadgeCheck className="size-3" /><span>Reusable later</span></div>
            </div>
            <div className="mt-5 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white group-hover:bg-orange-600">
              <Plus className="size-4" />
              Create Custom Template
            </div>
          </Link>
          {filteredTemplates.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
              <FileText className="mx-auto mb-3 size-10 text-muted-foreground" />
              <p className="font-medium text-foreground">No report templates match this search.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Clear the search or create a custom report template.
              </p>
            </div>
          ) : filteredTemplates.map((template) => (
            <div key={template.id} className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="size-12 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">{getTypeIcon(template.type || template.category.toLowerCase())}</div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">{template.category}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${template.isSystem ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>{template.isSystem ? "System" : "Custom"}</span>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{template.name}</h3>
                <p className="text-sm text-muted-foreground">{template.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2"><Clock className="size-3" /><span>Est. {template.estimatedTime}</span></div>
                <div className="flex items-center gap-2"><Calendar className="size-3" /><span className="capitalize">{template.frequency}</span></div>
                <div className="flex items-center gap-2 col-span-2"><BadgeCheck className="size-3" /><span>{String(template.config?.layout || "branded")} layout</span></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => generateReport(template.id, "pdf")} disabled={generatingReports.has(template.id)} className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: orange }}>
                  {generatingReports.has(template.id) ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}Generate PDF
                </button>
                <button onClick={() => generateReport(template.id, "csv")} disabled={generatingReports.has(template.id)} className="px-3 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all disabled:opacity-50">
                  CSV
                </button>
                <button onClick={() => generateReport(template.id, "html")} disabled={generatingReports.has(template.id)} className="px-3 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all disabled:opacity-50">
                  HTML
                </button>
                <button onClick={() => startScheduleCreate(template)} className="px-3 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all"><Calendar className="size-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "scheduled" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Report</th>
                  <th className="text-left px-4 py-3">Frequency</th>
                  <th className="text-left px-4 py-3">Next Run</th>
                  <th className="text-left px-4 py-3">Recipients</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={6} className="py-16 text-center"><Loader2 className="size-6 text-orange-500 animate-spin mx-auto" /></td></tr>
                ) : scheduledReports.length === 0 ? (
                  <tr><td colSpan={6} className="py-16 text-center"><Calendar className="size-10 text-muted mx-auto mb-2" /><p className="text-muted-foreground font-medium">No scheduled reports</p><p className="text-xs text-muted-foreground mt-1">Use any report template to create a schedule.</p></td></tr>
                ) : scheduledReports.map((report) => (
                  <tr key={report.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3"><p className="font-semibold text-foreground">{report.name}</p><p className="text-xs text-muted-foreground">{report.format.toUpperCase()} delivery</p></td>
                    <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700"><Calendar className="size-3" />{report.frequency}</span></td>
                    <td className="px-4 py-3"><p className="text-sm text-foreground">{new Date(report.nextRun).toLocaleDateString()}</p><p className="text-xs text-muted-foreground">{new Date(report.nextRun).toLocaleTimeString()}</p></td>
                    <td className="px-4 py-3"><p className="text-sm text-foreground">{report.recipients.length ? report.recipients.join(", ") : "No recipients"}</p></td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${report.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{report.isActive ? "Active" : "Inactive"}</span></td>
                    <td className="px-4 py-3"><div className="flex flex-wrap items-center gap-1"><button onClick={() => startScheduleEdit(report)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 font-medium text-xs transition-colors"><Settings className="size-3" />Edit</button><button onClick={() => toggleScheduledReport(report)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-amber-600 hover:bg-amber-50 font-medium text-xs transition-colors"><Calendar className="size-3" />{report.isActive ? "Pause" : "Resume"}</button><button onClick={() => deleteScheduledReport(report.id)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 font-medium text-xs transition-colors"><Trash2 className="size-3" />Delete</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
