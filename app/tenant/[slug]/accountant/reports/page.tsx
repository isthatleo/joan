"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  FileText, Search, Plus, Download, Filter, Eye, Calendar,
  BarChart3, PieChart, TrendingUp, DollarSign, Users, Receipt,
  FileSpreadsheet, FileImage, Mail, Printer, Loader2, Settings,
  RefreshCw, Clock, Target, Activity
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const orange = "#F97316";

interface Report {
  id: string;
  name: string;
  type: "financial" | "operational" | "patient" | "billing" | "custom";
  description: string;
  createdAt: string;
  lastGenerated: string;
  status: "ready" | "generating" | "failed";
  format: "pdf" | "csv" | "excel";
  size?: string;
  downloadUrl?: string;
}

interface ReportTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "custom";
  icon: React.ReactNode;
  estimatedTime: string;
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

export default function AccountantReportsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [reports, setReports] = useState<Report[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"generated" | "templates" | "scheduled">("generated");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [generatingReports, setGeneratingReports] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchReportsData();
  }, [slug]);

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      const [reportsRes, templatesRes, scheduledRes] = await Promise.all([
        fetch(`/api/tenant/${slug}/accountant/reports`),
        fetch(`/api/tenant/${slug}/accountant/reports/templates`),
        fetch(`/api/tenant/${slug}/accountant/reports/scheduled`)
      ]);

      if (reportsRes.ok) setReports(await reportsRes.json());
      if (templatesRes.ok) setTemplates(await templatesRes.json());
      if (scheduledRes.ok) setScheduledReports(await scheduledRes.json());
    } catch (error) {
      console.error('Failed to fetch reports data:', error);
      toast.error("Failed to load reports data");
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (templateId: string) => {
    setGeneratingReports(prev => new Set(prev).add(templateId));
    try {
      const res = await fetch(`/api/tenant/${slug}/accountant/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, format: 'pdf' })
      });

      if (res.ok) {
        toast.success("Report generation started");
        // Refresh reports list after a delay
        setTimeout(fetchReportsData, 3000);
      } else {
        toast.error("Failed to generate report");
      }
    } catch (error) {
      toast.error("Failed to generate report");
    } finally {
      setGeneratingReports(prev => {
        const newSet = new Set(prev);
        newSet.delete(templateId);
        return newSet;
      });
    }
  };

  const downloadReport = async (reportId: string, format: string) => {
    try {
      const res = await fetch(`/api/tenant/${slug}/accountant/reports/${reportId}/download?format=${format}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${reportId}.${format}`;
        a.click();
        toast.success("Report downloaded");
      }
    } catch (error) {
      toast.error("Failed to download report");
    }
  };

  const scheduleReport = async (templateId: string) => {
    const frequency = prompt("Enter frequency (daily, weekly, monthly):");
    if (!frequency) return;

    try {
      const res = await fetch(`/api/tenant/${slug}/accountant/reports/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, frequency })
      });

      if (res.ok) {
        toast.success("Report scheduled successfully");
        fetchReportsData();
      } else {
        toast.error("Failed to schedule report");
      }
    } catch (error) {
      toast.error("Failed to schedule report");
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.name.toLowerCase().includes(search.toLowerCase()) ||
                         report.description.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || report.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(search.toLowerCase()) ||
                         template.description.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

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

  const reportTemplates: ReportTemplate[] = [
    {
      id: "financial-summary",
      name: "Financial Summary Report",
      category: "Financial",
      description: "Comprehensive overview of revenue, expenses, and financial performance",
      frequency: "monthly",
      icon: <BarChart3 className="size-5" />,
      estimatedTime: "2-3 minutes"
    },
    {
      id: "revenue-analysis",
      name: "Revenue Analysis",
      category: "Financial",
      description: "Detailed breakdown of revenue by source, time period, and trends",
      frequency: "weekly",
      icon: <TrendingUp className="size-5" />,
      estimatedTime: "1-2 minutes"
    },
    {
      id: "billing-report",
      name: "Billing & Collections Report",
      category: "Billing",
      description: "Invoice status, payment tracking, and collection metrics",
      frequency: "weekly",
      icon: <Receipt className="size-5" />,
      estimatedTime: "2-4 minutes"
    },
    {
      id: "insurance-claims",
      name: "Insurance Claims Summary",
      category: "Billing",
      description: "Claims submission status, approval rates, and processing times",
      frequency: "monthly",
      icon: <FileText className="size-5" />,
      estimatedTime: "3-5 minutes"
    },
    {
      id: "patient-financial",
      name: "Patient Financial Overview",
      category: "Patient",
      description: "Outstanding balances, payment history, and patient financial metrics",
      frequency: "monthly",
      icon: <Users className="size-5" />,
      estimatedTime: "2-3 minutes"
    },
    {
      id: "payment-methods",
      name: "Payment Methods Analysis",
      category: "Financial",
      description: "Breakdown of payment methods used and their success rates",
      frequency: "quarterly",
      icon: <PieChart className="size-5" />,
      estimatedTime: "1-2 minutes"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Accountant Dashboard</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Generate, schedule, and manage comprehensive financial reports.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchReportsData}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all"
          >
            <RefreshCw className="size-4" />
            Refresh
          </button>
          <Link
            href={`/tenant/${slug}/accountant/reports/custom`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90"
            style={{ backgroundColor: orange }}
          >
            <Plus className="size-4" />
            Custom Report
          </Link>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-card border border-border rounded-xl p-1">
        <div className="flex gap-1">
          {[
            { id: "generated", label: "Generated Reports", count: reports.length },
            { id: "templates", label: "Report Templates", count: templates.length },
            { id: "scheduled", label: "Scheduled Reports", count: scheduledReports.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-orange-100 text-orange-700"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
            />
          </div>

          {activeTab === "generated" && (
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
            >
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

      {/* Generated Reports Tab */}
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
                  <tr><td colSpan={6} className="py-16 text-center">
                    <Loader2 className="size-6 text-orange-500 animate-spin mx-auto" />
                  </td></tr>
                ) : filteredReports.length === 0 ? (
                  <tr><td colSpan={6} className="py-16 text-center">
                    <FileText className="size-10 text-muted mx-auto mb-2" />
                    <p className="text-muted-foreground font-medium">No reports found</p>
                    <p className="text-xs text-muted-foreground mt-1">Generate your first report using templates</p>
                  </td></tr>
                ) : (
                  filteredReports.map(report => (
                    <tr key={report.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground border border-border">
                            {getTypeIcon(report.type)}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{report.name}</p>
                            <p className="text-xs text-muted-foreground">{report.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                          {getTypeIcon(report.type)}
                          {report.type.charAt(0).toUpperCase() + report.type.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(report.status)}`}>
                          {report.status === "generating" && <Loader2 className="size-3 animate-spin" />}
                          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground">
                          {new Date(report.lastGenerated).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(report.lastGenerated).toLocaleTimeString()}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground">{report.size || 'N/A'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {report.status === "ready" && (
                            <>
                              <button
                                onClick={() => downloadReport(report.id, 'pdf')}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 font-medium text-xs transition-colors"
                              >
                                <Download className="size-3" />
                                PDF
                              </button>
                              <button
                                onClick={() => downloadReport(report.id, 'csv')}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-50 font-medium text-xs transition-colors"
                              >
                                <FileSpreadsheet className="size-3" />
                                CSV
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => downloadReport(report.id, 'pdf')}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-purple-600 hover:bg-purple-50 font-medium text-xs transition-colors"
                          >
                            <Mail className="size-3" />
                            Email
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report Templates Tab */}
      {activeTab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportTemplates.map(template => (
            <div key={template.id} className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="size-12 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                  {template.icon}
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                  {template.category}
                </span>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold text-foreground mb-1">{template.name}</h3>
                <p className="text-sm text-muted-foreground">{template.description}</p>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  <span>Est. {template.estimatedTime}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="size-3" />
                  <span className="capitalize">{template.frequency}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => generateReport(template.id)}
                  disabled={generatingReports.has(template.id)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: orange }}
                >
                  {generatingReports.has(template.id) ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  Generate
                </button>
                <button
                  onClick={() => scheduleReport(template.id)}
                  className="px-3 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all"
                >
                  <Calendar className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Scheduled Reports Tab */}
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
                  <tr><td colSpan={6} className="py-16 text-center">
                    <Loader2 className="size-6 text-orange-500 animate-spin mx-auto" />
                  </td></tr>
                ) : scheduledReports.length === 0 ? (
                  <tr><td colSpan={6} className="py-16 text-center">
                    <Calendar className="size-10 text-muted mx-auto mb-2" />
                    <p className="text-muted-foreground font-medium">No scheduled reports</p>
                    <p className="text-xs text-muted-foreground mt-1">Schedule reports from the templates tab</p>
                  </td></tr>
                ) : (
                  scheduledReports.map(report => (
                    <tr key={report.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{report.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                          <Calendar className="size-3" />
                          {report.frequency}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground">
                          {new Date(report.nextRun).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground">
                          {report.recipients.length} recipient{report.recipients.length !== 1 ? 's' : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          report.isActive
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}>
                          {report.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 font-medium text-xs transition-colors">
                            <Settings className="size-3" />
                            Edit
                          </button>
                          <button className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 font-medium text-xs transition-colors">
                            <Settings className="size-3" />
                            {report.isActive ? "Pause" : "Resume"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
