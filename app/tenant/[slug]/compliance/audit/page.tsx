"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  History, Search, Filter, Download, Eye, AlertTriangle,
  CheckCircle, XCircle, Clock, User, FileText, Shield,
  Database, Settings, Loader2, Calendar, Activity
} from "lucide-react";

const orange = "#F97316";

interface AuditLog {
  id: string;
  timestamp: string;
  user: {
    id: string;
    name: string;
    role: string;
    email: string;
  };
  action: string;
  resource: string;
  resourceId?: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  status: "success" | "warning" | "error";
  category: "authentication" | "data" | "system" | "security" | "compliance";
  oldValue?: any;
  newValue?: any;
}

export default function AuditLogsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState("7d");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchAuditLogs();
  }, [categoryFilter, statusFilter, dateRange]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        category: categoryFilter,
        status: statusFilter,
        dateRange
      });
      const res = await fetch(`/api/tenant/${slug}/compliance/audit?${params}`);
      if (res.ok) {
        setAuditLogs(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success": return <CheckCircle className="size-4 text-green-600" />;
      case "warning": return <AlertTriangle className="size-4 text-yellow-600" />;
      case "error": return <XCircle className="size-4 text-red-600" />;
      default: return <Clock className="size-4 text-gray-600" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "authentication": return <Shield className="size-4 text-blue-600" />;
      case "data": return <Database className="size-4 text-green-600" />;
      case "system": return <Settings className="size-4 text-purple-600" />;
      case "security": return <AlertTriangle className="size-4 text-red-600" />;
      case "compliance": return <FileText className="size-4 text-orange-600" />;
      default: return <Activity className="size-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success": return "text-green-600 bg-green-50";
      case "warning": return "text-yellow-600 bg-yellow-50";
      case "error": return "text-red-600 bg-red-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const filteredLogs = auditLogs.filter(log =>
    log.user.name.toLowerCase().includes(search.toLowerCase()) ||
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.resource.toLowerCase().includes(search.toLowerCase()) ||
    log.details.toLowerCase().includes(search.toLowerCase())
  );

  const categories = ["all", "authentication", "data", "system", "security", "compliance"];
  const statuses = ["all", "success", "warning", "error"];

  const handleExportLogs = () => {
    if (filteredLogs.length === 0) return;
    setExporting(true);
    try {
      const rows = [
        ["timestamp", "user", "role", "action", "resource", "resourceId", "status", "category", "details", "ipAddress", "userAgent"],
        ...filteredLogs.map((log) => [
          log.timestamp,
          log.user.name,
          log.user.role,
          log.action,
          log.resource,
          log.resourceId || "",
          log.status,
          log.category,
          log.details,
          log.ipAddress,
          log.userAgent,
        ]),
      ];
      const csv = rows
        .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `tenant-audit-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Security</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Audit Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">Complete audit trail of system activities and user actions.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => document.getElementById("audit-filters")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all"
          >
            <Filter className="size-4" />
            Advanced Filters
          </button>
          <button
            type="button"
            onClick={handleExportLogs}
            disabled={exporting || filteredLogs.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: orange }}
          >
            <Download className="size-4" />
            {exporting ? "Exporting..." : "Export Logs"}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <History className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Events</p>
              <p className="text-2xl font-bold text-foreground">{auditLogs.length}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">All logged activities</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
              <CheckCircle className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Success Events</p>
              <p className="text-2xl font-bold text-foreground">
                {auditLogs.filter(log => log.status === 'success').length}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Successful operations</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Warnings</p>
              <p className="text-2xl font-bold text-foreground">
                {auditLogs.filter(log => log.status === 'warning').length}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Potential issues</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <XCircle className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Errors</p>
              <p className="text-2xl font-bold text-foreground">
                {auditLogs.filter(log => log.status === 'error').length}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Failed operations</p>
        </div>
      </div>

      {/* Filters */}
      <div id="audit-filters" className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
          <input
            type="text"
            placeholder="Search audit logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {category === "all" ? "All Categories" : category.charAt(0).toUpperCase() + category.slice(1)}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
        >
          {statuses.map(status => (
            <option key={status} value={status}>
              {status === "all" ? "All Statuses" : status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>

        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
        >
          <option value="1d">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {/* Audit Logs Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 text-orange-500 animate-spin mx-auto" />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resource</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-muted-foreground">
                      <History className="size-12 mx-auto mb-4 opacity-50" />
                      <p>No audit logs found</p>
                      <p className="text-sm">Try adjusting your filters</p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {new Date(log.timestamp).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold text-sm">
                            {log.user.name.split(" ").map(n => n[0]).join("")}
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">{log.user.name}</p>
                            <p className="text-xs text-muted-foreground">{log.user.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(log.category)}
                          <span className="text-sm font-medium text-foreground">{log.action}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">{log.resource}</p>
                          {log.resourceId && (
                            <p className="text-xs text-muted-foreground">ID: {log.resourceId}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(log.status)}`}>
                            {log.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-muted-foreground line-clamp-2">{log.details}</p>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="size-8 rounded-lg hover:bg-muted flex items-center justify-center"
                        >
                          <Eye className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Compliance Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <Shield className="size-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900">Compliance & Security</h3>
            <p className="text-sm text-blue-700 mt-1">
              Audit logs are retained for compliance purposes and help maintain system security.
              All activities are logged with timestamps, user information, and detailed change tracking.
              Logs are automatically archived and cannot be modified once created.
            </p>
          </div>
        </div>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Audit Entry</p>
                <h2 className="mt-1 text-xl font-semibold text-foreground">{selectedLog.action}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Actor</p>
                <p className="mt-2 font-medium text-foreground">{selectedLog.user.name}</p>
                <p className="text-sm text-muted-foreground">{selectedLog.user.email}</p>
                <p className="text-sm text-muted-foreground">{selectedLog.user.role}</p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Event</p>
                <p className="mt-2 text-sm text-foreground">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Resource: {selectedLog.resource}</p>
                {selectedLog.resourceId && <p className="text-sm text-muted-foreground">Resource ID: {selectedLog.resourceId}</p>}
              </div>
              <div className="rounded-xl border border-border bg-background p-4 md:col-span-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Details</p>
                <p className="mt-2 text-sm text-foreground">{selectedLog.details}</p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Network</p>
                <p className="mt-2 text-sm text-foreground">IP: {selectedLog.ipAddress}</p>
                <p className="text-sm text-muted-foreground break-all">{selectedLog.userAgent}</p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Classification</p>
                <p className="mt-2 text-sm text-foreground">Status: {selectedLog.status}</p>
                <p className="text-sm text-muted-foreground">Category: {selectedLog.category}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
