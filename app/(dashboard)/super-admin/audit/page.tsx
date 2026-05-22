"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuthStore, type AppRole } from "@/stores/auth";
import {
  Activity, Download, Settings, Search, RotateCw, AlertTriangle, FileText, Check, AlertCircle, Plus, Edit3, Trash2, Lock, ExternalLink
} from "lucide-react";
import { toast } from "sonner";

interface AuditLog {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  action: string;
  entity: string;
  actor: string;
  timestamp: string;
  type: "info" | "warning" | "error";
  metadata?: Record<string, any>;
}

export default function SystemAuditPage() {
  const { user } = useAuthStore();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedActionType, setSelectedActionType] = useState<string>("all");
  const [selectedTenant, setSelectedTenant] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [showFilters, setShowFilters] = useState(false);

  // Check authorization
  useEffect(() => {
    const role = (user?.role || "patient") as AppRole;
    if (role !== "super_admin") {
      window.location.href = "/";
    }
  }, [user]);

  // Fetch audit logs
  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/hospital/audit?role=super_admin&limit=1000`);
        if (res.ok) {
          const data = await res.json();
          setAuditLogs(data.logs || []);
        } else {
          toast.error("Failed to load audit logs");
        }
      } catch (error) {
        console.error("Error fetching audit logs:", error);
        toast.error("Error loading audit logs");
      } finally {
        setLoading(false);
      }
    };

    fetchAuditLogs();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...auditLogs];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.action.toLowerCase().includes(query) ||
          log.actor.toLowerCase().includes(query) ||
          log.entity?.toLowerCase().includes(query) ||
          log.tenantName.toLowerCase().includes(query)
      );
    }

    // Action type filter
    if (selectedActionType !== "all") {
      filtered = filtered.filter((log) => getAuditActionCategory(log.action) === selectedActionType);
    }

    // Tenant filter
    if (selectedTenant !== "all") {
      filtered = filtered.filter((log) => log.tenantId === selectedTenant);
    }

    // Severity filter
    if (selectedSeverity !== "all") {
      filtered = filtered.filter((log) => log.type === selectedSeverity);
    }

    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter(
        (log) => new Date(log.timestamp) >= new Date(dateRange.start)
      );
    }
    if (dateRange.end) {
      filtered = filtered.filter(
        (log) => new Date(log.timestamp) <= new Date(dateRange.end + "T23:59:59")
      );
    }

    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setFilteredLogs(filtered);
    setCurrentPage(1);
  }, [auditLogs, searchQuery, selectedActionType, selectedTenant, selectedSeverity, dateRange]);

  const uniqueTenants = useMemo(() => {
    const tenants = [...new Set(auditLogs.map((log) => ({ id: log.tenantId, name: log.tenantName })))];
    return tenants.sort((a, b) => a.name.localeCompare(b.name));
  }, [auditLogs]);

  const actionCategories = useMemo(() => {
    const categories = new Set<string>();
    auditLogs.forEach((log) => {
      categories.add(getAuditActionCategory(log.action));
    });
    return Array.from(categories).sort();
  }, [auditLogs]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const headers = ["Timestamp", "Hospital", "Action", "Entity", "Actor", "Severity", "Details"];
      const rows = filteredLogs.map((log) => [
        new Date(log.timestamp).toLocaleString(),
        log.tenantName,
        log.action.replace(/_/g, " "),
        log.entity || "—",
        log.actor,
        log.type.toUpperCase(),
        log.metadata ? JSON.stringify(log.metadata) : "—",
      ]);

      const csv = [
        headers.join(","),
        ...rows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `system-audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Audit logs exported successfully");
    } catch (error) {
      console.error("Error exporting logs:", error);
      toast.error("Failed to export audit logs");
    } finally {
      setExporting(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hospital/audit?role=super_admin&limit=1000`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
        toast.success("Audit logs refreshed");
      }
    } catch (error) {
      console.error("Error refreshing logs:", error);
      toast.error("Failed to refresh logs");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero */}
      <div className="border-b border-border bg-card overflow-hidden">
        <div className="px-6 py-7 lg:px-10">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
            <Activity className="size-3.5 text-orange-500" />
            <span>System Administration</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">
            System Audit Logs
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Complete system-wide activity logs across all hospitals. Track all user actions, system changes, and security events.
          </p>
        </div>
      </div>

      <div className="px-6 lg:px-10 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Total Events
            </p>
            <p className="text-3xl font-bold text-foreground">{filteredLogs.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{auditLogs.length} in system</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Hospitals
            </p>
            <p className="text-3xl font-bold text-foreground">{uniqueTenants.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Active tenants</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Action Types
            </p>
            <p className="text-3xl font-bold text-foreground">{actionCategories.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Categories</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Time Range
            </p>
            <p className="text-3xl font-bold text-foreground">{(new Date().getDate() - new Date(dateRange.start).getDate()) || 30}</p>
            <p className="text-xs text-muted-foreground mt-1">Days of data</p>
          </div>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-border bg-gradient-to-r from-card to-muted/30 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Audit Trail</h2>
              <p className="text-sm text-muted-foreground">System-wide activity and event logs</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 transition"
                title="Refresh logs"
              >
                <RotateCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={handleExportCSV}
                disabled={exporting || filteredLogs.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition"
              >
                <Download className="size-3.5" />
                Export
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold text-xs transition ${
                  showFilters
                    ? "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30"
                    : "border-border text-foreground hover:bg-muted"
                }`}
              >
                <Settings className="size-3.5" />
                {showFilters ? "Hide" : "Show"} Filters
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Filters */}
            {showFilters && (
              <div className="mb-6 p-4 rounded-lg bg-muted/30 border border-border space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Action Type</label>
                    <select
                      value={selectedActionType}
                      onChange={(e) => setSelectedActionType(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                    >
                      <option value="all">All Types</option>
                      {actionCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Hospital</label>
                    <select
                      value={selectedTenant}
                      onChange={(e) => setSelectedTenant(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                    >
                      <option value="all">All Hospitals</option>
                      {uniqueTenants.map((tenant) => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Severity</label>
                    <select
                      value={selectedSeverity}
                      onChange={(e) => setSelectedSeverity(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                    >
                      <option value="all">All Levels</option>
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="error">Error</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Date Range</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        className="flex-1 px-2 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                      />
                      <span className="text-muted-foreground">—</span>
                      <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        className="flex-1 px-2 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground">
                    Showing {paginatedLogs.length} of {filteredLogs.length} events
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedActionType("all");
                      setSelectedTenant("all");
                      setSelectedSeverity("all");
                      setDateRange({
                        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                        end: new Date().toISOString().split("T")[0],
                      });
                    }}
                    className="ml-auto text-xs text-orange-600 hover:text-orange-700 font-medium transition"
                  >
                    Reset All Filters
                  </button>
                </div>
              </div>
            )}

            {/* Table */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-3 w-3 animate-pulse rounded-full bg-orange-500 mb-2" />
                <p className="text-sm text-muted-foreground">Loading audit logs...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <FileText className="size-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">No audit events found</p>
                <p className="text-xs text-muted-foreground">
                  {searchQuery || selectedActionType !== "all" ? "Try adjusting your filters" : "Activity will appear here"}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto border border-border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-foreground">Timestamp</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground">Hospital</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground">Action</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground">Entity</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground">Actor</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground">Severity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {paginatedLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/40 transition">
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-2 text-foreground font-medium">
                              <span className="size-2 rounded-full bg-orange-500" />
                              {log.tenantName}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs font-medium">
                              {getAuditActionIcon(log.action)}
                              {log.action.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-foreground">{log.entity || "—"}</td>
                          <td className="px-4 py-3 text-foreground">{log.actor}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                log.type === "warning"
                                  ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                  : log.type === "error"
                                  ? "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400"
                                  : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              }`}
                            >
                              {log.type === "warning" ? <AlertCircle className="size-3" /> : log.type === "error" ? <AlertTriangle className="size-3" /> : <Check className="size-3" />}
                              {log.type.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages} ({filteredLogs.length} total events)
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition"
                      >
                        Previous
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition ${
                                currentPage === pageNum
                                  ? "bg-orange-500 text-white"
                                  : "border border-border hover:bg-muted"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getAuditActionCategory(action: string): string {
  if (action.includes("create") || action.includes("add")) return "create";
  if (action.includes("update") || action.includes("edit") || action.includes("modify")) return "update";
  if (action.includes("delete") || action.includes("remove")) return "delete";
  if (action.includes("login") || action.includes("logout")) return "auth";
  if (action.includes("export") || action.includes("download")) return "export";
  return "other";
}

function getAuditActionIcon(action: string): React.ReactNode {
  switch (getAuditActionCategory(action)) {
    case "create":
      return <Plus className="size-3" />;
    case "update":
      return <Edit3 className="size-3" />;
    case "delete":
      return <Trash2 className="size-3" />;
    case "auth":
      return <Lock className="size-3" />;
    case "export":
      return <ExternalLink className="size-3" />;
    default:
      return <Activity className="size-3" />;
  }
}

