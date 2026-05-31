"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { PageHeader } from "@/components/ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Database,
  Download,
  Eye,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditLog {
  id: string;
  rawId: string;
  source: "audit_logs" | "activity_logs";
  timestamp: string;
  tenantId: string | null;
  tenantName: string;
  tenantSlug: string | null;
  userId: string | null;
  actor: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  resource: string;
  resourceId: string | null;
  status: string;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, unknown>;
}

interface AuditPayload {
  generatedAt: string;
  stats: {
    totalEvents: number;
    platformEvents: number;
    tenantEvents: number;
    auditLogEvents: number;
    activityLogEvents: number;
    failedEvents: number;
    uniqueActors: number;
    uniqueTenants: number;
  };
  logs: AuditLog[];
  filters: {
    tenants: Array<{ id: string; name: string; slug: string }>;
    sources: string[];
    statuses: string[];
  };
  actionBreakdown: Array<{ action: string; count: number }>;
  tenantBreakdown: Array<{ tenantName: string; tenantSlug: string | null; count: number; failed: number }>;
}

function stringifyMetadata(value: unknown) {
  if (!value) return "No metadata recorded.";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function downloadCsv(filename: string, logs: AuditLog[]) {
  const headers = ["timestamp", "source", "tenantName", "actor", "actorEmail", "actorRole", "action", "resource", "resourceId", "status", "ipAddress"];
  const csv = [
    headers.join(","),
    ...logs.map((log) => headers.map((header) => `"${String((log as any)[header] ?? "").replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function AuditLogsPage() {
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const [status, setStatus] = useState("all");
  const [tenant, setTenant] = useState("all");
  const [showFilters, setShowFilters] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("25");

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ limit: "1500" });
    if (search.trim()) params.set("search", search.trim());
    if (source !== "all") params.set("source", source);
    if (status !== "all") params.set("status", status);
    if (tenant !== "all") params.set("tenant", tenant);
    return params.toString();
  }, [search, source, status, tenant]);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["super-admin-audit-logs", queryString],
    queryFn: async (): Promise<AuditPayload> => {
      const response = await fetch(`/api/super-admin/audit-logs?${queryString}`, {
        cache: "no-store",
        credentials: "include",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to load global audit logs");
      return payload;
    },
  });

  const logs = data?.logs || [];
  const statuses = useMemo(() => Array.from(new Set(["success", "failed", "error", "warning", ...(data?.filters.statuses || [])])), [data?.filters.statuses]);
  const totalPages = Math.max(1, Math.ceil(logs.length / Number(pageSize)));
  const currentPage = Math.min(page, totalPages);
  const paginatedLogs = logs.slice((currentPage - 1) * Number(pageSize), currentPage * Number(pageSize));

  const clearFilters = () => {
    setSearch("");
    setSource("all");
    setStatus("all");
    setTenant("all");
    setPage(1);
  };

  const statusBadge = (value: string) => {
    const normalized = value.toLowerCase();
    if (normalized === "success") return <Badge variant="outline">Success</Badge>;
    if (normalized === "warning") return <Badge variant="secondary">Warning</Badge>;
    return <Badge variant="destructive">{value || "Failed"}</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" subtitle="Global system audit trail across platform actions and every tenant dashboard" />

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Events</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{(data?.stats.totalEvents || 0).toLocaleString()}</div><p className="text-xs text-muted-foreground">Filtered global records</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tenant Events</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{(data?.stats.tenantEvents || 0).toLocaleString()}</div><p className="text-xs text-muted-foreground">{data?.stats.uniqueTenants || 0} tenants represented</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed Events</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">{(data?.stats.failedEvents || 0).toLocaleString()}</div><p className="text-xs text-muted-foreground">Non-success statuses</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unique Actors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{(data?.stats.uniqueActors || 0).toLocaleString()}</div><p className="text-xs text-muted-foreground">Users and system actors</p></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle>Global Audit Trail</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setShowFilters((value) => !value)}>
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                </Button>
                <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                  <RefreshCw className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")} />
                  Refresh
                </Button>
                <Button variant="outline" onClick={() => downloadCsv(`global-audit-${new Date().toISOString().slice(0, 10)}.csv`, logs)} disabled={!logs.length}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search actor, tenant, action, resource, IP, metadata..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 gap-4 rounded-lg border bg-muted/20 p-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Select value={source} onValueChange={(value) => { setSource(value); setPage(1); }}>
                    <SelectTrigger><SelectValue placeholder="All sources" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All sources</SelectItem>
                      <SelectItem value="audit_logs">Audit logs</SelectItem>
                      <SelectItem value="activity_logs">Activity logs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(value) => { setStatus(value); setPage(1); }}>
                    <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {statuses.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tenant</Label>
                  <Select value={tenant} onValueChange={(value) => { setTenant(value); setPage(1); }}>
                    <SelectTrigger><SelectValue placeholder="All tenants" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All tenants</SelectItem>
                      {(data?.filters.tenants || []).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" className="w-full" onClick={clearFilters}>Clear Filters</Button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Loading global audit logs...</TableCell></TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No audit logs found for these filters.</TableCell></TableRow>
                  ) : (
                    paginatedLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-sm">{format(new Date(log.timestamp), "PP p")}</TableCell>
                        <TableCell><div className="font-medium">{log.actor}</div><div className="text-xs text-muted-foreground">{log.actorRole} · {log.actorEmail || "no email"}</div></TableCell>
                        <TableCell><div>{log.tenantName}</div>{log.tenantSlug && <div className="text-xs text-muted-foreground">{log.tenantSlug}</div>}</TableCell>
                        <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                        <TableCell><div>{log.resource}</div>{log.resourceId && <div className="text-xs text-muted-foreground">{log.resourceId}</div>}</TableCell>
                        <TableCell>{statusBadge(log.status)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => setSelectedLog(log)} aria-label="View audit log details">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {logs.length === 0 ? 0 : (currentPage - 1) * Number(pageSize) + 1}-
                {Math.min(currentPage * Number(pageSize), logs.length)} of {logs.length.toLocaleString()} audit events
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={pageSize} onValueChange={(value) => { setPageSize(value); setPage(1); }}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 / page</SelectItem>
                    <SelectItem value="25">25 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                    <SelectItem value="100">100 / page</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => setPage(1)} disabled={currentPage === 1}>
                  First
                </Button>
                <Button variant="outline" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1}>
                  Previous
                </Button>
                <span className="px-2 text-sm font-medium">
                  Page {currentPage} of {totalPages}
                </span>
                <Button variant="outline" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages}>
                  Next
                </Button>
                <Button variant="outline" onClick={() => setPage(totalPages)} disabled={currentPage === totalPages}>
                  Last
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Top Actions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(data?.actionBreakdown || []).map((item) => (
                <div key={item.action} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="truncate text-sm font-medium">{item.action}</span>
                  <Badge variant="outline">{item.count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Tenant Activity</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(data?.tenantBreakdown || []).map((item) => (
                <div key={`${item.tenantSlug || item.tenantName}-${item.count}`} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.tenantName}</span>
                    <Badge variant="outline">{item.count}</Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Activity className="h-3 w-3" />
                    {item.failed} failed events
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle>Audit Event Details</DialogTitle></DialogHeader>
          {selectedLog && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div><Label className="text-muted-foreground">Timestamp</Label><p>{format(new Date(selectedLog.timestamp), "PP p")}</p></div>
                <div><Label className="text-muted-foreground">Source</Label><p>{selectedLog.source}</p></div>
                <div><Label className="text-muted-foreground">Actor</Label><p>{selectedLog.actor}</p><p className="text-xs text-muted-foreground">{selectedLog.actorEmail}</p></div>
                <div><Label className="text-muted-foreground">Tenant</Label><p>{selectedLog.tenantName}</p><p className="text-xs text-muted-foreground">{selectedLog.tenantSlug || "platform"}</p></div>
                <div><Label className="text-muted-foreground">Action</Label><p>{selectedLog.action}</p></div>
                <div><Label className="text-muted-foreground">Status</Label><div className="mt-1">{statusBadge(selectedLog.status)}</div></div>
                <div><Label className="text-muted-foreground">IP Address</Label><p className="font-mono text-sm">{selectedLog.ipAddress}</p></div>
                <div><Label className="text-muted-foreground">Resource</Label><p>{selectedLog.resource}</p><p className="text-xs text-muted-foreground">{selectedLog.resourceId || "no resource id"}</p></div>
              </div>
              {selectedLog.status === "success" ? (
                <Alert><CheckCircle className="h-4 w-4" /><AlertDescription>This audit event completed successfully.</AlertDescription></Alert>
              ) : (
                <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>This event needs review because its status is not successful.</AlertDescription></Alert>
              )}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Metadata</Label>
                <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 text-xs">{stringifyMetadata(selectedLog.metadata)}</pre>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">User Agent</Label>
                <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 text-xs">{selectedLog.userAgent}</pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
