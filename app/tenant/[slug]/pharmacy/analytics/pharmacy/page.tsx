"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  FileText, Download, Filter, Calendar, Loader2, BarChart3,
  TrendingUp, Users, Package, AlertTriangle, CheckCircle
} from "lucide-react";

const orange = "#F97316";

interface PharmacyReport {
  id: string;
  title: string;
  description: string;
  type: "daily" | "weekly" | "monthly" | "custom";
  status: "pending" | "ready" | "archived";
  generatedAt: string;
  dataPoints: number;
  summary: {
    totalPrescriptions: number;
    totalFilled: number;
    totalRevenue: number;
    averageValue: number;
  };
}

export default function PharmacyReportsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [reports, setReports] = useState<PharmacyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState("all");
  const [selectedReport, setSelectedReport] = useState<PharmacyReport | null>(null);

  useEffect(() => {
    fetchReports();
  }, [reportType]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/tenant/${slug}/pharmacy/reports?type=${reportType}`
      );
      if (res.ok) {
        setReports(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async (reportId: string) => {
    try {
      const res = await fetch(
        `/api/tenant/${slug}/pharmacy/reports/${reportId}/download`,
        { method: "GET" }
      );
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `report-${reportId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Failed to download report:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready": return "bg-green-50 text-green-700 border-green-100";
      case "pending": return "bg-yellow-50 text-yellow-700 border-yellow-100";
      case "archived": return "bg-gray-50 text-gray-700 border-gray-100";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "daily": return "Daily";
      case "weekly": return "Weekly";
      case "monthly": return "Monthly";
      case "custom": return "Custom";
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Reports</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Pharmacy Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Generate and download pharmacy performance reports.</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all">
            <FileText className="size-4" />
            New Report
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={reportType}
            onChange={e => setReportType(e.target.value)}
            className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none"
          >
            <option value="all">All Reports</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-6 text-orange-500 animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <FileText className="size-12 text-muted mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">No reports found</p>
              <p className="text-xs text-muted-foreground mt-2">Create a new report to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map(report => (
                <div
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className={`bg-card border rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all ${
                    selectedReport?.id === report.id ? "ring-2 ring-orange-500" : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-lg">{report.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{report.description}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${getStatusColor(report.status)}`}>
                      {report.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <div className="bg-muted/50 p-2 rounded-lg">
                      <span className="text-xs text-muted-foreground">Prescriptions</span>
                      <p className="font-semibold text-foreground">{report.summary.totalPrescriptions}</p>
                    </div>
                    <div className="bg-muted/50 p-2 rounded-lg">
                      <span className="text-xs text-muted-foreground">Filled</span>
                      <p className="font-semibold text-foreground">{report.summary.totalFilled}</p>
                    </div>
                    <div className="bg-muted/50 p-2 rounded-lg">
                      <span className="text-xs text-muted-foreground">Revenue</span>
                      <p className="font-semibold text-foreground">${report.summary.totalRevenue}</p>
                    </div>
                    <div className="bg-muted/50 p-2 rounded-lg">
                      <span className="text-xs text-muted-foreground">Type</span>
                      <p className="font-semibold text-foreground">{getTypeLabel(report.type)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{report.dataPoints} data points</span>
                    <span>{new Date(report.generatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div>
          {selectedReport ? (
            <div className="bg-card border border-border rounded-xl p-6 sticky top-6">
              <h3 className="font-semibold text-foreground mb-4">Report Details</h3>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">Title</p>
                  <p className="font-semibold text-foreground">{selectedReport.title}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="font-semibold text-foreground">{getTypeLabel(selectedReport.type)}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(selectedReport.status)}`}>
                    {selectedReport.status.toUpperCase()}
                  </span>
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground font-semibold mb-3">Summary</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Prescriptions</span>
                      <span className="font-semibold text-foreground">{selectedReport.summary.totalPrescriptions}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Filled</span>
                      <span className="font-semibold text-foreground">{selectedReport.summary.totalFilled}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Revenue</span>
                      <span className="font-semibold text-foreground">${selectedReport.summary.totalRevenue.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Avg Value</span>
                      <span className="font-semibold text-foreground">${selectedReport.summary.averageValue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Generated</p>
                  <p className="text-sm text-foreground">{new Date(selectedReport.generatedAt).toLocaleString()}</p>
                </div>

                {selectedReport.status === "ready" && (
                  <button
                    onClick={() => handleDownloadReport(selectedReport.id)}
                    className="w-full px-4 py-2 rounded-lg bg-orange-50 text-orange-600 font-semibold text-sm hover:bg-orange-100 transition-all flex items-center gap-2 justify-center border border-orange-100"
                  >
                    <Download className="size-4" />
                    Download Report
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-6 flex items-center justify-center h-96 text-muted-foreground">
              <div className="text-center">
                <FileText className="size-12 mx-auto mb-4 opacity-50" />
                <p>Select a report to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

