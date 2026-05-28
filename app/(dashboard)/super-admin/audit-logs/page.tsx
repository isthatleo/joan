"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PageHeader,
  SectionCard,
  StatusPill,
  Skeleton,
} from "@/components/ui";
import {
  Search,
  Download,
  FileText,
  Shield,
  User,
  Database,
  Activity,
  RefreshCw,
  Filter,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AuditLog {
  id: string;
  tenantId?: string;
  tenantName: string;
  tenantSlug?: string;
  action: string;
  entity: string;
  entityId?: string;
  actor: string;
  userId?: string;
  timestamp: string;
  metadata?: Record<string, any>;
  type: "info" | "warning" | "error";
}

type Severity = "info" | "warning" | "destructive" | "success";

const SEVERITY_MAP: Record<string, Severity> = {
  created: "success",
  updated: "info",
  deleted: "destructive",
  removed: "destructive",
  suspended: "warning",
  activated: "success",
  failed: "destructive",
  rejected: "destructive",
};

function getSeverityTone(log: AuditLog): Severity {
  if (log.type === "error") return "destructive";
  if (log.type === "warning") return "warning";
  return SEVERITY_MAP[String(log.action || "").toLowerCase()] || "info";
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export default function SuperAdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [tenant, setTenant] = useState("");
  const [severity, setSeverity] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const loadAuditLogs = async (background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);

    try {
      const pageSize = 500;
      let offset = 0;
      let collected: AuditLog[] = [];
      let total = Number.POSITIVE_INFINITY;

      while (offset < total) {
        const res = await fetch(`/api/hospital/audit?role=hospital_admin&limit=${pageSize}&offset=${offset}`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || "Failed to load audit logs");
        }

        const batch = Array.isArray(data.logs) ? data.logs : [];
        collected = collected.concat(batch);
        total = Number.isFinite(Number(data.total)) ? Number(data.total) : batch.length;
        offset += pageSize;
        if (batch.length < pageSize) break;
        if (collected.length >= total) break;
      }

      setLogs(collected);
    } finally {
      if (background) setRefreshing(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    void loadAuditLogs(false);
  }, []);

  const uniqueActions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.action))).sort(),
    [logs]
  );

  const uniqueEntities = useMemo(
    () => Array.from(new Set(logs.map((log) => log.entity))).sort(),
    [logs]
  );

  const uniqueTenants = useMemo(
    () => Array.from(new Set(logs.map((log) => `${log.tenantId || ""}|${log.tenantName}`)))
      .map((value) => {
        const [id, name] = value.split("|");
        return { id, name };
      })
      .filter((item) => item.name)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [logs]
  );

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (q) {
        const haystack = [
          log.action,
          log.entity,
          log.actor,
          log.tenantName,
          log.tenantSlug,
          JSON.stringify(log.metadata || {}),
        ].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (action && log.action !== action) return false;
      if (entity && log.entity !== entity) return false;
      if (tenant && log.tenantId !== tenant) return false;
      if (severity && log.type !== severity) return false;
      return true;
    });
  }, [action, entity, logs, search, severity, tenant]);

  const stats = useMemo(() => {
    const total = logs.length;
    const critical = logs.filter((log) => getSeverityTone(log) === "destructive").length;
    const warnings = logs.filter((log) => getSeverityTone(log) === "warning").length;
    const info = logs.filter((log) => getSeverityTone(log) === "info").length;
    const success = logs.filter((log) => getSeverityTone(log) === "success").length;
    return { total, critical, warnings, info, success };
  }, [logs]);

  const pagedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [currentPage, filteredLogs, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));

  const exportCsv = async () => {
    setExporting(true);
    try {
      const headers = ["Timestamp", "Tenant", "Action", "Entity", "Actor", "Severity", "Metadata"];
      const rows = filteredLogs.map((log) => [
        format(new Date(log.timestamp), "PPpp"),
        log.tenantName,
        log.action,
        log.entity,
        log.actor,
        log.type.toUpperCase(),
        JSON.stringify(log.metadata || {}),
      ]);
      const csv = [
        headers.map(csvCell).join(","),
        ...rows.map((row) => row.map(csvCell).join(",")),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        subtitle="Complete trail of hospital-admin actions and privileged operations"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadAuditLogs(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={exporting || filteredLogs.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 transition"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Exporting" : "Export"}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Total Events</p>
          <p className="text-3xl font-bold text-foreground">{stats.total.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Loaded audit rows</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Critical</p>
          <p className="text-3xl font-bold text-foreground">{stats.critical.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Deletion/error actions</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Warnings</p>
          <p className="text-3xl font-bold text-foreground">{stats.warnings.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Sensitive operational changes</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Informational</p>
          <p className="text-3xl font-bold text-foreground">{(stats.info + stats.success).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Routine activity</p>
        </div>
      </div>

      <SectionCard className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by tenant, action, actor, entity..."
              className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Actions</option>
            {uniqueActions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            value={entity}
            onChange={(e) => {
              setEntity(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Entities</option>
            {uniqueEntities.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            value={tenant}
            onChange={(e) => {
              setTenant(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Tenants</option>
            {uniqueTenants.map((item) => (
              <option key={item.id || item.name} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Severity</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="destructive">Critical</option>
            <option value="success">Success</option>
          </select>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setAction("");
              setEntity("");
              setTenant("");
              setSeverity("");
              setCurrentPage(1);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted transition"
          >
            <Filter className="h-4 w-4" />
            Reset Filters
          </button>
          <button
            type="button"
            onClick={() => void loadAuditLogs(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted transition"
          >
            <RefreshCw className="h-4 w-4" />
            Reload Logs
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="Event Log"
        description={`${filteredLogs.length} event${filteredLogs.length === 1 ? "" : "s"} visible`}
        flush
      >
        {loading ? (
          <div className="space-y-2 p-6">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Tenant</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Actor</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pagedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                      <FileText className="size-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">No audit events match the current filters</p>
                    </td>
                  </tr>
                ) : pagedLogs.map((log) => {
                  const tone = getSeverityTone(log);
                  return (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info-soft text-info-soft-foreground">
                            <Database className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{log.action}</p>
                            <p className="text-xs text-muted-foreground">{log.entity}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">{log.tenantName}</p>
                          <p className="text-xs text-muted-foreground">{log.tenantSlug || log.tenantId || "System"}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{log.actor}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusPill tone={tone}>
                          {tone === "destructive" ? "Critical" : tone === "warning" ? "Warning" : tone === "success" ? "Success" : "Info"}
                        </StatusPill>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {format(new Date(log.timestamp), "PPpp")}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted transition"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted transition disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted transition disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </SectionCard>

      <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="size-5 text-orange-500" />
              Audit Event Details
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Tenant</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{selectedLog.tenantName}</p>
                  <p className="text-xs text-muted-foreground">{selectedLog.tenantSlug || selectedLog.tenantId || "System"}</p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Event Time</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{format(new Date(selectedLog.timestamp), "PPpp")}</p>
                </div>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Action</p>
                <p className="mt-1 text-sm font-medium text-foreground">{selectedLog.action}</p>
                <p className="text-xs text-muted-foreground">{selectedLog.entity}</p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Actor</p>
                <p className="mt-1 text-sm font-medium text-foreground">{selectedLog.actor}</p>
                <p className="text-xs text-muted-foreground">{selectedLog.userId || "System"}</p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Metadata</p>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 text-xs text-foreground">
                  {JSON.stringify(selectedLog.metadata || {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
