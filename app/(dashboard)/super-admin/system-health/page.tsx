"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  Download,
  HardDrive,
  MemoryStick,
  RefreshCw,
  Server,
  ShieldAlert,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type HealthStatus = "operational" | "degraded" | "critical";

interface HealthPayload {
  generatedAt: string;
  status: HealthStatus;
  score: number;
  version: string;
  uptime: { processSeconds: number; systemSeconds: number; label: string };
  resources: {
    cpuUsage: number;
    avgTenantCpu: number;
    memoryUsage: number;
    avgTenantMemory: number;
    avgTenantDisk: number;
    totalMemoryMb: number;
    freeMemoryMb: number;
    processMemoryMb: { rss: number; heapTotal: number; heapUsed: number; external: number };
    databaseSizeMb: number;
    databaseConnections: number;
    apiLatency: number;
    failureRate: number;
  };
  platform: {
    totalTenants: number;
    activeTenants: number;
    activeUsers: number;
    activeSessions: number;
    events24h: number;
    failedEvents24h: number;
    openSecurityEvents: number;
    openAlerts: number;
  };
  services: Array<{ key: string; name: string; status: HealthStatus; score: number; latency: number; details: string }>;
  tenantMetrics: Array<{
    id: string;
    tenantName: string;
    tenantSlug: string | null;
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    activeUsers: number;
    apiResponseTime: number;
    uptime: string;
    timestamp: string;
  }>;
  alerts: Array<Record<string, any>>;
  integrations: Array<Record<string, any>>;
  recentActivity: Array<Record<string, any>>;
}

const serviceIcons: Record<string, any> = {
  database: Database,
  api: Server,
  runtime: Cpu,
  integrations: Zap,
};

function statusTone(status: string) {
  if (status === "operational") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (status === "degraded") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-destructive/10 text-destructive border-destructive/20";
}

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDate(value?: string | null) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function SystemHealthPage() {
  const [payload, setPayload] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchHealth(background = false) {
    if (background) setRefreshing(true);
    else setLoading(true);
    try {
      setError(null);
      const response = await fetch("/api/system/health", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Failed to load system health");
      setPayload(data);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Failed to load system health";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void fetchHealth();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = window.setInterval(() => void fetchHealth(true), 30000);
    return () => window.clearInterval(interval);
  }, [autoRefresh]);

  const highRiskTenants = useMemo(
    () =>
      (payload?.tenantMetrics || [])
        .filter((tenant) => tenant.cpuUsage >= 80 || tenant.memoryUsage >= 80 || tenant.diskUsage >= 85 || tenant.apiResponseTime >= 1200)
        .slice(0, 8),
    [payload?.tenantMetrics]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="System Health" subtitle="Platform-wide infrastructure, tenant telemetry, and operational monitoring" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <Card key={item} className="animate-pulse">
              <CardContent className="p-6">
                <div className="mb-3 h-4 rounded bg-muted" />
                <div className="mb-3 h-8 rounded bg-muted" />
                <div className="h-2 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="System Health" subtitle="Platform-wide infrastructure, tenant telemetry, runtime performance, and operational alerts" />

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant={autoRefresh ? "default" : "outline"} onClick={() => setAutoRefresh((value) => !value)}>
          <Activity className="mr-2 h-4 w-4" />
          Auto refresh {autoRefresh ? "on" : "off"}
        </Button>
        <Button variant="outline" onClick={() => fetchHealth(true)} disabled={refreshing}>
          <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
          Refresh
        </Button>
        <Button variant="outline" onClick={() => downloadJson(`system-health-${new Date().toISOString().slice(0, 10)}.json`, payload)} disabled={!payload}>
          <Download className="mr-2 h-4 w-4" />
          Export Snapshot
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {payload && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Overall Health</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">{payload.score}%</div>
                  <Badge className={statusTone(payload.status)}>{statusLabel(payload.status)}</Badge>
                </div>
                <Progress value={payload.score} className="mt-3" />
              </CardContent>
            </Card>
            <MetricCard title="CPU Load" value={`${payload.resources.cpuUsage}%`} icon={Cpu} progress={payload.resources.cpuUsage} />
            <MetricCard title="Memory" value={`${payload.resources.memoryUsage}%`} icon={MemoryStick} progress={payload.resources.memoryUsage} />
            <MetricCard title="API Latency" value={`${payload.resources.apiLatency}ms`} icon={Zap} progress={Math.min(100, payload.resources.apiLatency / 15)} />
            <MetricCard title="Failure Rate" value={`${payload.resources.failureRate}%`} icon={ShieldAlert} progress={Math.min(100, payload.resources.failureRate * 10)} destructive={payload.resources.failureRate > 5} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard title="Active Tenants" value={payload.platform.activeTenants} subtitle={`${payload.platform.totalTenants} total tenants`} icon={Server} />
            <SummaryCard title="Active Users" value={payload.platform.activeUsers} subtitle={`${payload.platform.activeSessions} active sessions`} icon={Users} />
            <SummaryCard title="Events 24h" value={payload.platform.events24h} subtitle={`${payload.platform.failedEvents24h} failed events`} icon={Activity} />
            <SummaryCard title="Database Size" value={`${payload.resources.databaseSizeMb} MB`} subtitle={`${payload.resources.databaseConnections} DB connections`} icon={Database} />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Service Status</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {payload.services.map((service) => {
                  const Icon = serviceIcons[service.key] || Activity;
                  return (
                    <div key={service.key} className="rounded-xl border bg-card p-4">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-semibold">{service.name}</p>
                            <p className="text-xs text-muted-foreground">{service.details}</p>
                          </div>
                        </div>
                        <Badge className={statusTone(service.status)}>{statusLabel(service.status)}</Badge>
                      </div>
                      <Progress value={service.score} />
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Score {service.score}%</span>
                        <span>{service.latency > 0 ? `${service.latency}ms` : "N/A"}</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Open Alerts</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {payload.alerts.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No unresolved system alerts.</div>
                ) : (
                  payload.alerts.map((alert) => (
                    <div key={alert.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{alert.title}</p>
                          <p className="text-xs text-muted-foreground">{alert.tenant_name || "Platform"} · {formatDate(alert.created_at)}</p>
                        </div>
                        <Badge variant={String(alert.severity).toLowerCase() === "critical" ? "destructive" : "secondary"}>{alert.severity || "info"}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{alert.message || "No alert message recorded."}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Tenant Telemetry</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>CPU</TableHead>
                      <TableHead>Memory</TableHead>
                      <TableHead>Disk</TableHead>
                      <TableHead>API</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Last Signal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payload.tenantMetrics.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No tenant telemetry has been recorded yet.</TableCell></TableRow>
                    ) : (
                      payload.tenantMetrics.map((tenant) => (
                        <TableRow key={tenant.id}>
                          <TableCell><div className="font-medium">{tenant.tenantName}</div><div className="text-xs text-muted-foreground">{tenant.tenantSlug || "no slug"}</div></TableCell>
                          <TableCell>{tenant.cpuUsage}%</TableCell>
                          <TableCell>{tenant.memoryUsage}%</TableCell>
                          <TableCell>{tenant.diskUsage}%</TableCell>
                          <TableCell>{tenant.apiResponseTime}ms</TableCell>
                          <TableCell>{tenant.activeUsers}</TableCell>
                          <TableCell>{formatDate(tenant.timestamp)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card>
              <CardHeader><CardTitle>High-Risk Tenants</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {highRiskTenants.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No high-risk tenant telemetry currently detected.</div>
                ) : (
                  highRiskTenants.map((tenant) => (
                    <div key={tenant.id} className="rounded-lg border p-3 text-sm">
                      <div className="font-medium">{tenant.tenantName}</div>
                      <div className="mt-1 text-muted-foreground">CPU {tenant.cpuUsage}% · Memory {tenant.memoryUsage}% · API {tenant.apiResponseTime}ms</div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Integration Health</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {payload.integrations.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No tenant integrations configured.</div>
                ) : (
                  payload.integrations.map((item, index) => (
                    <div key={`${item.provider}-${item.status}-${index}`} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                      <span>{item.provider} · {item.status}</span>
                      <Badge variant={Number(item.error_count || 0) > 0 ? "destructive" : "outline"}>{item.count}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {payload.recentActivity.map((item) => (
                  <div key={item.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{item.action}</span>
                      <Badge variant={String(item.status).toLowerCase() === "success" ? "outline" : "destructive"}>{item.status || "success"}</Badge>
                    </div>
                    <p className="mt-1 text-muted-foreground">{item.tenant_name || "Platform"} · {item.actor || item.actor_email || "System"}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="text-xs text-muted-foreground">Last generated: {formatDate(payload.generatedAt)} · Runtime uptime: {payload.uptime.label} · Version: {payload.version}</div>
        </>
      )}
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, progress, destructive = false }: { title: string; value: string; icon: any; progress: number; destructive?: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", destructive && "text-destructive")}>{value}</div>
        <Progress value={Math.min(100, Math.max(0, progress))} className="mt-3" />
      </CardContent>
    </Card>
  );
}

function SummaryCard({ title, value, subtitle, icon: Icon }: { title: string; value: string | number; subtitle: string; icon: any }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
