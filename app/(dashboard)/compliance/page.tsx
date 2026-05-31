"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertTriangle,
  CheckCircle,
  Download,
  FileText,
  Filter,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ComplianceStatus = "compliant" | "non_compliant" | "warning" | "pending";

interface CompliancePayload {
  generatedAt: string;
  status: {
    overall: number;
    hipaa: number;
    gdpr: number;
    auditReadiness: number;
    security: number;
  };
  summary: Record<string, number>;
  checks: Array<{
    id: string;
    category: string;
    requirement: string;
    status: ComplianceStatus;
    severity: "high" | "medium" | "low";
    score: number;
    details: string;
  }>;
  tenantMatrix: Array<{
    id: string;
    name: string;
    slug: string;
    plan: string;
    isActive: boolean;
    usersCount: number;
    openSecurityEvents: number;
    criticalSecurityEvents: number;
    openAlerts: number;
    failedActivity: number;
    lastActivityAt: string | null;
    riskScore: number;
    riskLevel: "high" | "medium" | "low";
  }>;
  highRiskTenants: CompliancePayload["tenantMatrix"];
  recentSecurityEvents: Array<Record<string, any>>;
  recentActivity: Array<Record<string, any>>;
  platformFeedback: Array<Record<string, any>>;
}

function formatDate(value?: string | null) {
  if (!value) return "No activity";
  return new Date(value).toLocaleString();
}

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          return `"${String(value ?? "").replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
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

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState<"checks" | "tenants" | "security" | "reports">("checks");
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | "high" | "medium" | "low">("all");

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["super-admin-compliance"],
    queryFn: async (): Promise<CompliancePayload> => {
      const response = await fetch("/api/super-admin/compliance", {
        cache: "no-store",
        credentials: "include",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to load compliance data");
      return payload;
    },
  });

  const filteredTenants = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (data?.tenantMatrix || []).filter((tenant) => {
      const matchesRisk = riskFilter === "all" || tenant.riskLevel === riskFilter;
      const matchesSearch =
        !needle ||
        tenant.name.toLowerCase().includes(needle) ||
        tenant.slug.toLowerCase().includes(needle) ||
        String(tenant.plan || "").toLowerCase().includes(needle);
      return matchesRisk && matchesSearch;
    });
  }, [data?.tenantMatrix, riskFilter, search]);

  const statusIcon = (status: ComplianceStatus) => {
    if (status === "compliant") return <CheckCircle className="h-4 w-4 text-emerald-600" />;
    if (status === "non_compliant") return <XCircle className="h-4 w-4 text-destructive" />;
    if (status === "warning") return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    return <ShieldAlert className="h-4 w-4 text-muted-foreground" />;
  };

  const statusBadge = (status: ComplianceStatus) => {
    if (status === "compliant") return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Compliant</Badge>;
    if (status === "non_compliant") return <Badge variant="destructive">Non-compliant</Badge>;
    if (status === "warning") return <Badge variant="secondary">Warning</Badge>;
    return <Badge variant="outline">Pending</Badge>;
  };

  const riskBadge = (risk: string) => {
    if (risk === "high") return <Badge variant="destructive">High risk</Badge>;
    if (risk === "medium") return <Badge variant="secondary">Medium risk</Badge>;
    return <Badge variant="outline">Low risk</Badge>;
  };

  const exportCompliance = () => {
    if (!data) return;
    downloadCsv(
      `platform-compliance-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        ...data.checks.map((check) => ({
          section: "check",
          name: check.category,
          status: check.status,
          severity: check.severity,
          score: check.score,
          details: check.details,
        })),
        ...data.tenantMatrix.map((tenant) => ({
          section: "tenant",
          name: tenant.name,
          slug: tenant.slug,
          status: tenant.isActive ? "active" : "inactive",
          risk: tenant.riskLevel,
          score: tenant.riskScore,
          criticalSecurityEvents: tenant.criticalSecurityEvents,
          failedActivity: tenant.failedActivity,
        })),
      ]
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Compliance" subtitle="Platform-wide compliance posture and tenant risk monitoring" />
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
      <PageHeader title="Compliance" subtitle="Platform-wide compliance posture, tenant risk, audit readiness, and security controls" />

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")} />
          Refresh
        </Button>
        <Button variant="outline" onClick={exportCompliance} disabled={!data}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Overall", value: data?.status.overall || 0, icon: Shield, note: "Weighted platform score" },
          { label: "HIPAA", value: data?.status.hipaa || 0, icon: ShieldCheck, note: "Healthcare controls" },
          { label: "GDPR", value: data?.status.gdpr || 0, icon: FileText, note: "Privacy controls" },
          { label: "Audit Readiness", value: data?.status.auditReadiness || 0, icon: CheckCircle, note: "Traceability coverage" },
          { label: "Security", value: data?.status.security || 0, icon: ShieldAlert, note: "Open security risk" },
        ].map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}%</div>
              <Progress value={card.value} className="mt-2" />
              <p className="mt-2 text-xs text-muted-foreground">{card.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Active Tenants</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{data?.summary.activeTenants?.toLocaleString() || 0}</div><p className="text-xs text-muted-foreground">of {data?.summary.totalTenants?.toLocaleString() || 0} total</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Audit Events</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{data?.summary.auditEvents?.toLocaleString() || 0}</div><p className="text-xs text-muted-foreground">Audit + activity logs</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Open Security Events</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-amber-600">{data?.summary.openSecurityEvents?.toLocaleString() || 0}</div><p className="text-xs text-muted-foreground">{data?.summary.criticalSecurityEvents || 0} critical/high</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Platform Feedback</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{data?.summary.openPlatformFeedback?.toLocaleString() || 0}</div><p className="text-xs text-muted-foreground">Open platform items</p></CardContent>
        </Card>
      </div>

      {(data?.summary.criticalSecurityEvents || 0) > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {data?.summary.criticalSecurityEvents} critical/high security events are unresolved across the platform.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2 rounded-lg border bg-card p-2">
        {[
          ["checks", "Compliance Checks"],
          ["tenants", "Tenant Risk Matrix"],
          ["security", "Security & Activity"],
          ["reports", "Reports"],
        ].map(([id, label]) => (
          <Button key={id} variant={activeTab === id ? "default" : "ghost"} onClick={() => setActiveTab(id as any)}>
            {label}
          </Button>
        ))}
      </div>

      {activeTab === "checks" && (
        <Card>
          <CardHeader><CardTitle>Regulatory Control Checks</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {data?.checks.map((check) => (
              <div key={check.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex gap-3">
                    <div className="mt-1">{statusIcon(check.status)}</div>
                    <div>
                      <h3 className="font-semibold">{check.category}</h3>
                      <p className="text-sm text-muted-foreground">{check.requirement}</p>
                      <p className="mt-2 text-sm">{check.details}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {statusBadge(check.status)}
                    <Badge variant="outline">{check.severity} severity</Badge>
                  </div>
                </div>
                <Progress value={check.score} className="mt-4" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {activeTab === "tenants" && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle>Tenant Risk Matrix</CardTitle>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search tenant or plan" value={search} onChange={(event) => setSearch(event.target.value)} className="w-72 pl-10" />
                </div>
                {(["all", "high", "medium", "low"] as const).map((risk) => (
                  <Button key={risk} variant={riskFilter === risk ? "default" : "outline"} onClick={() => setRiskFilter(risk)}>
                    <Filter className="mr-2 h-4 w-4" />
                    {risk}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Security</TableHead>
                    <TableHead>Failed Activity</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No tenant risk records found.</TableCell></TableRow>
                  ) : (
                    filteredTenants.map((tenant) => (
                      <TableRow key={tenant.id}>
                        <TableCell><div className="font-medium">{tenant.name}</div><div className="text-xs text-muted-foreground">{tenant.slug}</div></TableCell>
                        <TableCell><Badge variant="outline">{tenant.plan}</Badge></TableCell>
                        <TableCell>{tenant.usersCount.toLocaleString()}</TableCell>
                        <TableCell>{tenant.openSecurityEvents} open, {tenant.criticalSecurityEvents} critical</TableCell>
                        <TableCell>{tenant.failedActivity.toLocaleString()}</TableCell>
                        <TableCell>{riskBadge(tenant.riskLevel)}<div className="mt-1 text-xs text-muted-foreground">{tenant.riskScore}/100</div></TableCell>
                        <TableCell>{formatDate(tenant.lastActivityAt)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "security" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Recent Security Events</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(data?.recentSecurityEvents || []).map((event) => (
                <div key={event.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div><p className="font-medium">{event.event_type}</p><p className="text-sm text-muted-foreground">{event.tenant_name || "Platform"} · {event.user_name || event.user_email || "System"}</p></div>
                    <Badge variant={String(event.severity).toLowerCase() === "critical" ? "destructive" : "secondary"}>{event.severity || "medium"}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{event.description || "No description recorded."}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(event.created_at)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Recent Platform Activity</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(data?.recentActivity || []).map((activity) => (
                <div key={activity.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div><p className="font-medium">{activity.action}</p><p className="text-sm text-muted-foreground">{activity.tenant_name || "Platform"} · {activity.user_name || activity.user_email || "System"}</p></div>
                    <Badge variant={String(activity.status).toLowerCase() === "success" ? "outline" : "destructive"}>{activity.status || "success"}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{activity.description || activity.resource || "No details recorded."}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(activity.timestamp)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "reports" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {[
            { title: "HIPAA Executive Report", desc: "Exports scorecards, risk tenants, audit coverage, and open security exceptions." },
            { title: "GDPR Data Protection Report", desc: "Exports tenant status, feedback risk, privacy readiness, and incident indicators." },
            { title: "Security Operations Report", desc: "Exports recent security events, failed activity, and unresolved alert exposure." },
          ].map((report) => (
            <Card key={report.title}>
              <CardHeader><CardTitle>{report.title}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{report.desc}</p>
                <Button className="w-full" variant="outline" onClick={exportCompliance}>
                  <Download className="mr-2 h-4 w-4" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        Last generated: {formatDate(data?.generatedAt)}
      </div>
    </div>
  );
}
