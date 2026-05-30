"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, CheckCircle, Download, Eye, Filter, History, Loader2, RefreshCw, Search, Shield, User, X, XCircle } from "lucide-react";

type AuditLog = {
  id: string;
  timestamp: string;
  user: { id: string; name: string; role: string; email: string; avatar: string };
  action: string;
  resource: string;
  resourceId: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  status: "success" | "warning" | "error";
  category: string;
  metadata: Record<string, unknown>;
  oldValue?: unknown;
  newValue?: unknown;
};

type Payload = { logs: AuditLog[]; stats: { total: number; success: number; warning: number; error: number; uniqueUsers: number; categories: Record<string, number>; topUsers: Array<{ name: string; count: number }> } };
const EMPTY: Payload = { logs: [], stats: { total: 0, success: 0, warning: 0, error: 0, uniqueUsers: 0, categories: {}, topUsers: [] } };

function csvEscape(value: unknown) {
  const text = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  return text.includes(",") || text.includes('"') || text.includes("\n") ? `"${text.replace(/"/g, '""')}"` : text;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleString();
}

function statusClass(status: string) {
  if (status === "success") return "border-green-200 bg-green-50 text-green-700";
  if (status === "warning") return "border-yellow-200 bg-yellow-50 text-yellow-700";
  return "border-red-200 bg-red-50 text-red-700";
}

function statusIcon(status: string) {
  if (status === "success") return <CheckCircle className="size-3" />;
  if (status === "warning") return <AlertTriangle className="size-3" />;
  return <XCircle className="size-3" />;
}

export default function AuditLogsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [payload, setPayload] = useState<Payload>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("7d");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [error, setError] = useState("");

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    setError("");
    try {
      const query = new URLSearchParams({ category: categoryFilter, status: statusFilter, dateRange });
      const res = await fetch(`/api/tenant/${slug}/compliance/audit?${query.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to load audit logs");
      setPayload({ ...EMPTY, ...data });
    } catch (loadError: any) {
      setError(loadError?.message || "Failed to load audit logs");
      setPayload(EMPTY);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (slug) load();
  }, [slug, categoryFilter, statusFilter, dateRange]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payload.logs;
    return payload.logs.filter((log) => [log.user.name, log.user.email, log.user.role, log.action, log.resource, log.details, log.ipAddress, log.category, log.status].join(" ").toLowerCase().includes(q));
  }, [payload.logs, search]);

  const exportCsv = () => {
    const rows = [["timestamp", "user", "role", "email", "action", "resource", "resourceId", "status", "category", "details", "ipAddress", "userAgent"], ...filteredLogs.map((log) => [log.timestamp, log.user.name, log.user.role, log.user.email, log.action, log.resource, log.resourceId, log.status, log.category, log.details, log.ipAddress, log.userAgent])];
    const blob = new Blob([rows.map((row) => row.map(csvEscape).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tenant-audit-${slug}-${dateRange}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setDateRange("7d");
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="size-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Security & Compliance</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">Audit Logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tenant-wide audit trail across all dashboards, users, entities, and system actions.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => load(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"><RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</button>
          <button onClick={exportCsv} disabled={!filteredLogs.length} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"><Download className="size-4" />Export CSV</button>
          <button onClick={resetFilters} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"><Filter className="size-4" />Reset filters</button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-5">
        {[{ label: "Events", value: payload.stats.total, icon: History, tone: "bg-blue-50 text-blue-700" }, { label: "Success", value: payload.stats.success, icon: CheckCircle, tone: "bg-green-50 text-green-700" }, { label: "Warnings", value: payload.stats.warning, icon: AlertTriangle, tone: "bg-yellow-50 text-yellow-700" }, { label: "Errors", value: payload.stats.error, icon: XCircle, tone: "bg-red-50 text-red-700" }, { label: "Users", value: payload.stats.uniqueUsers, icon: User, tone: "bg-purple-50 text-purple-700" }].map((card) => <div key={card.label} className="rounded-xl border border-border bg-card p-5"><div className={`mb-3 flex size-11 items-center justify-center rounded-xl ${card.tone}`}><card.icon className="size-5" /></div><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{card.label}</p><p className="mt-1 text-2xl font-bold">{card.value}</p></div>)}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_160px_160px]">
          <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users, actions, resources, details..." className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-orange-300" /></div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"><option value="all">All categories</option><option value="authentication">Authentication</option><option value="data">Data</option><option value="system">System</option><option value="security">Security</option><option value="compliance">Compliance</option></select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"><option value="all">All status</option><option value="success">Success</option><option value="warning">Warning</option><option value="error">Error</option></select>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"><option value="1d">Last 24 hours</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="1y">Last year</option></select>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4"><h2 className="font-semibold">Audit Event Stream</h2><p className="mt-1 text-sm text-muted-foreground">{filteredLogs.length} events visible after filters.</p></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-5 py-3">Time</th><th className="px-5 py-3">Actor</th><th className="px-5 py-3">Action</th><th className="px-5 py-3">Resource</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.length === 0 ? <tr><td colSpan={6} className="py-16 text-center text-muted-foreground">No audit logs found.</td></tr> : filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30">
                    <td className="px-5 py-3"><p className="font-medium">{formatDate(log.timestamp)}</p><p className="text-xs text-muted-foreground">{log.category}</p></td>
                    <td className="px-5 py-3"><p className="font-semibold">{log.user.name}</p><p className="text-xs text-muted-foreground">{log.user.role} - {log.user.email}</p></td>
                    <td className="px-5 py-3"><p className="font-mono text-xs">{log.action}</p><p className="text-xs text-muted-foreground">{log.details}</p></td>
                    <td className="px-5 py-3"><p>{log.resource}</p><p className="text-xs text-muted-foreground">{log.resourceId || "No entity id"}</p></td>
                    <td className="px-5 py-3"><span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(log.status)}`}>{statusIcon(log.status)}{log.status}</span></td>
                    <td className="px-5 py-3 text-right"><button onClick={() => setSelectedLog(log)} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"><Eye className="size-3" />View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5"><h2 className="flex items-center gap-2 font-semibold"><Shield className="size-5 text-orange-500" />Categories</h2><div className="mt-4 space-y-2">{Object.entries(payload.stats.categories).map(([name, count]) => <div key={name} className="flex justify-between rounded-lg bg-background px-3 py-2 text-sm"><span className="capitalize">{name}</span><span className="font-semibold">{count}</span></div>)}</div></div>
          <div className="rounded-xl border border-border bg-card p-5"><h2 className="font-semibold">Top Actors</h2><div className="mt-4 space-y-2">{payload.stats.topUsers.map((item) => <div key={item.name} className="flex justify-between rounded-lg bg-background px-3 py-2 text-sm"><span>{item.name}</span><span className="font-semibold">{item.count}</span></div>)}</div></div>
        </div>
      </div>

      {selectedLog && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Audit detail</p><h2 className="mt-1 text-2xl font-bold">{selectedLog.action}</h2><p className="mt-1 text-sm text-muted-foreground">{formatDate(selectedLog.timestamp)}</p></div><button onClick={() => setSelectedLog(null)} className="rounded-lg border border-border p-2 hover:bg-muted"><X className="size-4" /></button></div><div className="mt-6 grid gap-4 md:grid-cols-2"><Detail label="Actor" value={`${selectedLog.user.name} (${selectedLog.user.role})`} /><Detail label="Email" value={selectedLog.user.email} /><Detail label="Resource" value={selectedLog.resource} /><Detail label="Entity ID" value={selectedLog.resourceId || "Not set"} /><Detail label="Status" value={selectedLog.status} /><Detail label="Category" value={selectedLog.category} /><Detail label="IP Address" value={selectedLog.ipAddress} /><Detail label="User Agent" value={selectedLog.userAgent} /></div><div className="mt-6 rounded-xl border border-border bg-background p-4"><p className="font-semibold">Details</p><p className="mt-2 text-sm text-muted-foreground">{selectedLog.details}</p></div><div className="mt-6 rounded-xl border border-border bg-background p-4"><p className="font-semibold">Metadata</p><pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(selectedLog.metadata || {}, null, 2)}</pre></div></div></div>}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-background p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p><p className="mt-2 text-sm font-semibold">{value}</p></div>;
}
