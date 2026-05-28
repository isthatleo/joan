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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Eye,
  Filter,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth";

type AuditStatus = "success" | "failed" | "warning";

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  userRole: string;
  action: string;
  resource: string;
  resourceType: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  status: AuditStatus;
  complianceFlag: boolean;
  sessionId: string;
  tenantName?: string;
  tenantSlug?: string;
}

interface AuditStats {
  totalEvents: number;
  criticalEvents: number;
  failedLogins: number;
  dataChanges: number;
  complianceFlags: number;
}

interface HospitalAuditApiLog {
  id: string;
  tenantId?: string;
  tenantName?: string | null;
  tenantSlug?: string | null;
  action?: string | null;
  entity?: string | null;
  entityId?: string | null;
  actor?: string | null;
  userId?: string | null;
  timestamp?: string | Date | null;
  metadata?: Record<string, unknown> | string | null;
  type?: string | null;
}

interface HospitalAuditApiResponse {
  logs?: HospitalAuditApiLog[];
  total?: number;
}

function safeString(value: unknown, fallback = "N/A") {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function deriveStatus(action: string, type?: string | null, metadata?: Record<string, unknown> | string | null): AuditStatus {
  const normalized = `${action} ${type || ""}`.toLowerCase();
  const metadataString = typeof metadata === "string" ? metadata.toLowerCase() : "";
  const metadataOutcome =
    metadata && typeof metadata === "object" && "outcome" in metadata
      ? String((metadata as Record<string, unknown>).outcome || "").toLowerCase()
      : "";

  if (
    normalized.includes("fail") ||
    normalized.includes("error") ||
    metadataString.includes("fail") ||
    metadataOutcome.includes("fail") ||
    metadataOutcome.includes("error")
  ) {
    return "failed";
  }
  if (
    normalized.includes("delete") ||
    normalized.includes("remove") ||
    normalized.includes("export") ||
    normalized.includes("breach") ||
    metadataString.includes("compliance") ||
    metadataOutcome.includes("warning")
  ) {
    return "warning";
  }
  return "success";
}

function formatMetadata(metadata: Record<string, unknown> | string | null | undefined) {
  if (!metadata) return "No additional details recorded.";
  if (typeof metadata === "string") return metadata;
  const entries = Object.entries(metadata)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`);
  return entries.length > 0 ? entries.join("\n") : "No additional details recorded.";
}

function getExportName() {
  const now = new Date();
  return `hospital-audit-${now.toISOString().replace(/[:.]/g, "-")}.json`;
}

export default function AuditLogsPage() {
  const { user, isLoading: authLoading } = useAuthStore();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [userFilter, setUserFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [resourceFilter, setResourceFilter] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState(false);
  const tenantId = user?.hospitalId ?? user?.tenantId ?? null;

  const { data: auditData, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["hospital-admin-audit-logs", tenantId],
    queryFn: async (): Promise<{ stats: AuditStats; logs: AuditLog[]; total: number }> => {
      if (!tenantId) {
        throw new Error("No hospital tenant context available");
      }

      const response = await fetch(`/api/hospital/audit?role=hospital_admin&tenantId=${tenantId}&limit=1000`, {
        cache: "no-store",
        credentials: "include",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.details || payload?.error || "Failed to load audit logs");
      }

      const payload = (await response.json()) as HospitalAuditApiResponse;
      const logs = (payload.logs || []).map<AuditLog>((log) => {
        const action = safeString(log.action, "UNKNOWN");
        const resourceType = safeString(log.entity, "System");
        const resourceId = safeString(log.entityId, "");
        const metadata = log.metadata;
        const metadataObject = typeof metadata === "object" && metadata !== null ? metadata : null;
        const derivedStatus = deriveStatus(action, log.type, metadata);

        return {
          id: log.id,
          timestamp: typeof log.timestamp === "string" ? log.timestamp : new Date(log.timestamp || Date.now()).toISOString(),
          user: safeString(log.actor, "System"),
          userRole: safeString(
            metadataObject && "actorRole" in metadataObject ? metadataObject.actorRole : undefined,
            "Hospital Admin"
          ),
          action,
          resource: resourceId ? `${resourceType} #${resourceId}` : resourceType,
          resourceType,
          details: formatMetadata(metadata),
          ipAddress: safeString(metadataObject && "ipAddress" in metadataObject ? metadataObject.ipAddress : undefined),
          userAgent: safeString(metadataObject && "userAgent" in metadataObject ? metadataObject.userAgent : undefined),
          status: derivedStatus,
          complianceFlag:
            derivedStatus !== "success" ||
            Boolean(metadataObject && "complianceFlag" in metadataObject ? metadataObject.complianceFlag : false),
          sessionId: safeString(metadataObject && "sessionId" in metadataObject ? metadataObject.sessionId : undefined),
          tenantName: log.tenantName || undefined,
          tenantSlug: log.tenantSlug || undefined,
        };
      });

      const stats: AuditStats = {
        totalEvents: logs.length,
        criticalEvents: logs.filter((log) => log.status === "failed" || log.complianceFlag).length,
        failedLogins: logs.filter((log) => /login/i.test(log.action) && log.status === "failed").length,
        dataChanges: logs.filter((log) => /create|update|delete|remove|edit|modify|export/i.test(log.action)).length,
        complianceFlags: logs.filter((log) => log.complianceFlag).length,
      };

      return {
        stats,
        logs,
        total: logs.length,
      };
    },
    enabled: !!tenantId && !authLoading,
  });

  const filteredLogs = useMemo(() => {
    const logs = auditData?.logs ?? [];
    return logs.filter((log) => {
      const searchValue = search.trim().toLowerCase();
      const matchesSearch =
        !searchValue ||
        [log.user, log.action, log.resource, log.resourceType, log.details, log.tenantName, log.tenantSlug]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(searchValue));
      const matchesAction = !actionFilter || log.action === actionFilter;
      const matchesUser = !userFilter || log.user === userFilter;
      const matchesStatus = !statusFilter || log.status === statusFilter;
      const matchesResource = !resourceFilter || log.resourceType === resourceFilter;
      return matchesSearch && matchesAction && matchesUser && matchesStatus && matchesResource;
    });
  }, [actionFilter, auditData?.logs, resourceFilter, search, statusFilter, userFilter]);

  const uniqueActions = useMemo(
    () => [...new Set((auditData?.logs ?? []).map((log) => log.action))].filter(Boolean),
    [auditData?.logs]
  );
  const uniqueUsers = useMemo(
    () => [...new Set((auditData?.logs ?? []).map((log) => log.user))].filter(Boolean),
    [auditData?.logs]
  );
  const uniqueResources = useMemo(
    () => [...new Set((auditData?.logs ?? []).map((log) => log.resourceType))].filter(Boolean),
    [auditData?.logs]
  );

  const handleExport = async () => {
    try {
      setExporting(true);
      const payload = {
        exportedAt: new Date().toISOString(),
        total: filteredLogs.length,
        stats: auditData?.stats || null,
        logs: filteredLogs,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = getExportName();
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const statusPill = (status: AuditStatus) => {
    if (status === "failed") {
      return <Badge variant="destructive">Failed</Badge>;
    }
    if (status === "warning") {
      return <Badge variant="secondary">Warning</Badge>;
    }
    return <Badge variant="outline">Success</Badge>;
  };

  const statusIcon = (status: AuditStatus) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        subtitle="Hospital-admin activity history for the current tenant"
      />

      {!authLoading && !tenantId && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No hospital tenant context was found for this account.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {(error as Error).message || "Failed to load audit logs"}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Events</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {(auditData?.stats.totalEvents ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Real tenant audit entries</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Critical Events</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {(auditData?.stats.criticalEvents ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Events requiring review</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed Logins</CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {(auditData?.stats.failedLogins ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Auth failures recorded</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Data Changes</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {(auditData?.stats.dataChanges ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Create/update/delete events</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Compliance Flags</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {(auditData?.stats.complianceFlags ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Events marked for review</p>
          </CardContent>
        </Card>
      </div>

      {(auditData?.stats.complianceFlags ?? 0) > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {auditData?.stats.complianceFlags ?? 0} audit events are flagged for review. Review these events before closing the audit cycle.
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Audit Log Entries</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => setShowFilters((value) => !value)}>
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
              <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button variant="outline" onClick={handleExport} disabled={exporting}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user, action, resource, tenant, or details..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-10"
            />
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-card p-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="action-filter">Action</Label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger id="action-filter">
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All actions</SelectItem>
                    {uniqueActions.map((action) => (
                      <SelectItem key={action} value={action}>
                        {action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-filter">User</Label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger id="user-filter">
                    <SelectValue placeholder="All users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All users</SelectItem>
                    {uniqueUsers.map((user) => (
                      <SelectItem key={user} value={user}>
                        {user}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status-filter">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resource-filter">Resource Type</Label>
                <Select value={resourceFilter} onValueChange={setResourceFilter}>
                  <SelectTrigger id="resource-filter">
                    <SelectValue placeholder="All resources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All resources</SelectItem>
                    {uniqueResources.map((resource) => (
                      <SelectItem key={resource} value={resource}>
                        {resource}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[96px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      Loading audit logs...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No audit logs found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(log.timestamp), "PP p")}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{log.user}</p>
                          <p className="text-xs text-muted-foreground">{log.userRole}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="max-w-[180px] truncate">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{log.resource}</p>
                          <p className="text-xs text-muted-foreground">{log.resourceType}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1">
                            {statusIcon(log.status)}
                            {statusPill(log.status)}
                          </span>
                          {log.complianceFlag && (
                            <Badge variant="destructive" className="text-xs">
                              Flagged
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedLog(log);
                            setIsDetailsOpen(true);
                          }}
                          aria-label="View audit log details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Timestamp</Label>
                  <p className="text-sm text-foreground">{format(new Date(selectedLog.timestamp), "PP p")}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="flex items-center gap-2">
                    {statusIcon(selectedLog.status)}
                    {statusPill(selectedLog.status)}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">User</Label>
                  <p className="text-sm text-foreground">{selectedLog.user}</p>
                  <p className="text-xs text-muted-foreground">{selectedLog.userRole}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Action</Label>
                  <p className="text-sm text-foreground">{selectedLog.action}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Resource</Label>
                  <p className="text-sm text-foreground">{selectedLog.resource}</p>
                  <p className="text-xs text-muted-foreground">{selectedLog.resourceType}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Tenant</Label>
                  <p className="text-sm text-foreground">{selectedLog.tenantName || "Current tenant"}</p>
                  {selectedLog.tenantSlug && (
                    <p className="text-xs text-muted-foreground">{selectedLog.tenantSlug}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">IP Address</Label>
                  <p className="font-mono text-sm text-foreground">{selectedLog.ipAddress}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Session ID</Label>
                  <p className="font-mono text-sm text-foreground">{selectedLog.sessionId}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Details</Label>
                <pre className="whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-3 text-sm text-foreground">
                  {selectedLog.details}
                </pre>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">User Agent</Label>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs text-foreground">
                  {selectedLog.userAgent}
                </pre>
              </div>

              {selectedLog.complianceFlag && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This event is flagged for compliance review.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
