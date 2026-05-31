"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Database,
  Users,
  Zap,
  AlertCircle,
  CheckCircle,
  Download,
  RefreshCw,
  Server,
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  FlaskConical,
  Pill,
  Stethoscope
} from "lucide-react";

interface UsageStats {
  totalApiCalls: number;
  totalStorageUsed: number;
  totalActiveUsers: number;
  averageResponseTime: number;
  topConsumers: Array<{
    id: string;
    slug?: string;
    name: string;
    apiCalls: number;
    storageUsed: number;
  }>;
  systemLoad: number;
  errorRate: number;
  uptime: number;
  apiCallsTrend: number;
  apiCallsTrendPercent: number;
  storageConsumptionTrend: number;
  storageTrendPercent: number;
  activeUsersTrend: number;
  activeUsersTrendPercent: number;
  responseTimeTrend: number;
  responseTimeTrendPercent: number;
  activeTenants?: number;
  liveSessions?: number;
  securityEvents30d?: number;
  totalPatients?: number;
  totalAppointments?: number;
  totalVisits?: number;
  totalLabOrders?: number;
  totalPrescriptions?: number;
  totalInvoices?: number;
}

const MetricCard = ({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  trendValue
}: {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down";
  trendValue?: string;
}) => (
  <Card className="flex flex-col transition-colors hover:border-primary/50">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
      <CardTitle className="text-sm font-medium text-foreground/80">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent className="flex-1">
      <div className="text-2xl sm:text-3xl font-bold text-foreground">
        {value}
        {unit && <span className="text-base sm:text-lg font-normal text-muted-foreground ml-1">{unit}</span>}
      </div>
      {trendValue && (
        <p className="text-xs text-muted-foreground flex items-center mt-2 gap-1">
          {trend === "up" ? (
            <TrendingUp className="h-3 w-3 text-emerald-500" />
          ) : (
            <TrendingDown className="h-3 w-3 text-emerald-500" />
          )}
          <span>{trendValue}</span>
        </p>
      )}
    </CardContent>
  </Card>
);

export default function TenantUsagePage() {
  const { data: usageStats, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["tenant-usage"],
    queryFn: async () => {
      const response = await fetch("/api/tenants?usage=true");
      if (!response.ok) throw new Error("Failed to fetch usage stats");
      return response.json() as Promise<UsageStats>;
    },
    refetchInterval: 60000, // Refetch every minute
  });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatStorage = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getUsagePercentage = (value: number, total: number) => {
    return total > 0 ? ((value / total) * 100).toFixed(1) : "0";
  };

  const getStoragePercentage = (used: number, limit: number = 100 * 1024 * 1024 * 1024) => {
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageStatus = (percentage: number) => {
    const num = parseFloat(percentage.toString());
    if (num > 80) return { label: "High", color: "destructive", bgColor: "bg-destructive/10", textColor: "text-destructive" };
    if (num > 60) return { label: "Medium", color: "secondary", bgColor: "bg-yellow-500/10", textColor: "text-yellow-600 dark:text-yellow-400" };
    return { label: "Low", color: "default", bgColor: "bg-emerald-500/10", textColor: "text-emerald-600 dark:text-emerald-400" };
  };

  const exportCsv = () => {
    if (!usageStats?.topConsumers?.length) return;
    const rows = [
      ["Tenant", "Slug", "Plan", "API Calls", "Storage Used", "Active Sessions", "Patients"],
      ...usageStats.topConsumers.map((tenant: any) => [
        tenant.name,
        tenant.slug || tenant.id,
        tenant.plan || "",
        tenant.apiCalls,
        tenant.storageUsed,
        tenant.activeSessions || 0,
        tenant.patientCount || 0,
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `tenant-usage-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Tenant Usage Analytics"
          subtitle="Monitor resource consumption across all hospitals"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-2/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-full mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tenant Usage Analytics"
        subtitle="Monitor resource consumption across all hospitals"
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={() => refetch()} disabled={isFetching} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground disabled:opacity-60">
              <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white">
              <Download className="size-4" /> Export CSV
            </button>
          </div>
        }
      />

      {/* Main Metrics - Fully Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total API Calls"
          value={formatNumber(usageStats?.totalApiCalls || 0)}
          icon={Activity}
          trend={(usageStats?.apiCallsTrendPercent || 0) >= 0 ? "up" : "down"}
          trendValue={`${usageStats?.apiCallsTrendPercent || 0}% vs previous 30d`}
        />

        <MetricCard
          title="Storage Used"
          value={formatStorage(usageStats?.totalStorageUsed || 0)}
          icon={Database}
          trend={(usageStats?.storageTrendPercent || 0) >= 0 ? "up" : "down"}
          trendValue={`${usageStats?.storageTrendPercent || 0}% patient data growth`}
        />

        <MetricCard
          title="Active Users"
          value={formatNumber(usageStats?.totalActiveUsers || 0)}
          icon={Users}
          trend={(usageStats?.activeUsersTrendPercent || 0) >= 0 ? "up" : "down"}
          trendValue={`${usageStats?.activeUsersTrendPercent || 0}% user growth`}
        />

        <MetricCard
          title="Avg Response Time"
          value={usageStats?.averageResponseTime || 0}
          unit="ms"
          icon={Zap}
          trend={(usageStats?.responseTimeTrendPercent || 0) <= 0 ? "down" : "up"}
          trendValue={`${usageStats?.responseTimeTrendPercent || 0}% response trend`}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Active Tenants" value={usageStats?.activeTenants || 0} icon={Building2} trend="up" trendValue="Real tenant count" />
        <MetricCard title="Live Sessions" value={usageStats?.liveSessions || 0} icon={Server} trend="up" trendValue="Currently active" />
        <MetricCard title="Security Events" value={usageStats?.securityEvents30d || 0} icon={AlertCircle} trend="down" trendValue="Last 30 days" />
        <MetricCard title="Uptime Score" value={`${usageStats?.uptime || 0}%`} icon={CheckCircle} trend="up" trendValue="Derived from live errors" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <MetricCard title="Patients" value={formatNumber(usageStats?.totalPatients || 0)} icon={Stethoscope} trend="up" trendValue="All tenant records" />
        <MetricCard title="Appointments" value={formatNumber(usageStats?.totalAppointments || 0)} icon={CalendarDays} trend="up" trendValue="Scheduled records" />
        <MetricCard title="Visits" value={formatNumber(usageStats?.totalVisits || 0)} icon={ClipboardList} trend="up" trendValue="Clinical encounters" />
        <MetricCard title="Lab Orders" value={formatNumber(usageStats?.totalLabOrders || 0)} icon={FlaskConical} trend="up" trendValue="Lab workload" />
        <MetricCard title="Prescriptions" value={formatNumber(usageStats?.totalPrescriptions || 0)} icon={Pill} trend="up" trendValue="Medication records" />
        <MetricCard title="Invoices" value={formatNumber(usageStats?.totalInvoices || 0)} icon={FileText} trend="up" trendValue="Billing records" />
      </div>

      {/* Top Consumers - Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Consumers */}
        <Card className="flex flex-col">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-lg">Top API Consumers</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 pt-6">
            {usageStats?.topConsumers && usageStats.topConsumers.length > 0 ? (
              <div className="space-y-4">
                {usageStats.topConsumers.map((tenant) => {
                  const percentage = parseFloat(
                    getUsagePercentage(tenant.apiCalls, usageStats.totalApiCalls)
                  );
                  const status = getUsageStatus(percentage);

                  return (
                    <div
                      key={tenant.id}
                      className="space-y-2 p-3 rounded-lg border border-border/50 hover:border-border transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Link 
                          href={`/tenants/${tenant.slug || tenant.id}`}
                          className="text-sm font-semibold text-foreground hover:text-primary truncate flex-1"
                        >
                          {tenant.name}
                        </Link>
                        <Badge variant={status.color as any} className="flex-shrink-0">
                          {status.label}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatNumber(tenant.apiCalls)} calls</span>
                        <span className="font-medium">{percentage}%</span>
                      </div>
                      <Progress
                        value={percentage}
                        className="h-2"
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No usage data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Storage Usage */}
        <Card className="flex flex-col">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-lg">Storage Usage</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 pt-6">
            {usageStats?.topConsumers && usageStats.topConsumers.length > 0 ? (
              <div className="space-y-4">
                {usageStats.topConsumers.map((tenant) => {
                  const percentage = getStoragePercentage(tenant.storageUsed);
                  const status = getUsageStatus(percentage);

                  return (
                    <div
                      key={tenant.id}
                      className="space-y-2 p-3 rounded-lg border border-border/50 hover:border-border transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <Link 
                          href={`/tenants/${tenant.slug || tenant.id}`}
                          className="text-sm font-semibold text-foreground hover:text-primary truncate flex-1"
                        >
                          {tenant.name}
                        </Link>
                        <div className="flex items-center gap-2">
                          <Badge variant={status.color as any}>
                            {status.label}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatStorage(tenant.storageUsed)}</span>
                        <span className="font-medium">{percentage.toFixed(1)}%</span>
                      </div>
                      <Progress
                        value={percentage}
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground">
                        of 100 GB limit
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No storage data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends */}
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-lg">Monthly Usage Trends</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* API Calls Trend */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">API Calls Trend</p>
                <div className={`flex items-center text-xs gap-1 ${usageStats?.apiCallsTrendPercent! >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {usageStats?.apiCallsTrendPercent! >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{usageStats?.apiCallsTrendPercent! >= 0 ? '+' : ''}{usageStats?.apiCallsTrendPercent}%</span>
                </div>
              </div>
              <Progress value={usageStats?.apiCallsTrend || 0} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Last Month</span>
                <span>This Month</span>
              </div>
            </div>

            {/* Storage Consumption Trend */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Storage Consumption</p>
                <div className={`flex items-center text-xs gap-1 ${usageStats?.storageTrendPercent! >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {usageStats?.storageTrendPercent! >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{usageStats?.storageTrendPercent! >= 0 ? '+' : ''}{usageStats?.storageTrendPercent}%</span>
                </div>
              </div>
              <Progress value={usageStats?.storageConsumptionTrend || 0} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Last Month</span>
                <span>This Month</span>
              </div>
            </div>

            {/* Active Users Trend */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Active Users</p>
                <div className={`flex items-center text-xs gap-1 ${usageStats?.activeUsersTrendPercent! >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {usageStats?.activeUsersTrendPercent! >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{usageStats?.activeUsersTrendPercent! >= 0 ? '+' : ''}{usageStats?.activeUsersTrendPercent}%</span>
                </div>
              </div>
              <Progress value={usageStats?.activeUsersTrend || 0} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Last Month</span>
                <span>This Month</span>
              </div>
            </div>

            {/* Response Time Trend */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Response Time</p>
                <div className={`flex items-center text-xs gap-1 ${usageStats?.responseTimeTrendPercent! <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {usageStats?.responseTimeTrendPercent! <= 0 ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : (
                    <TrendingUp className="h-3 w-3" />
                  )}
                  <span>{usageStats?.responseTimeTrendPercent! <= 0 ? '' : '+'}{usageStats?.responseTimeTrendPercent}%</span>
                </div>
              </div>
              <Progress value={Math.min(usageStats?.responseTimeTrend || 0, 100)} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Last Month</span>
                <span>This Month</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Health - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* System Load */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">System Load</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={`text-2xl sm:text-3xl font-bold ${
                (usageStats?.systemLoad || 0) > 80 
                  ? 'text-red-600 dark:text-red-400' 
                  : (usageStats?.systemLoad || 0) > 60 
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {usageStats?.systemLoad?.toFixed(1) || 0}%
              </div>
              <CheckCircle className={`h-5 w-5 ${
                (usageStats?.systemLoad || 0) > 80 
                  ? 'text-red-600 dark:text-red-400' 
                  : (usageStats?.systemLoad || 0) > 60 
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`} />
            </div>
            <p className="text-xs text-muted-foreground">
              {(usageStats?.systemLoad || 0) > 80
                ? 'High load - consider scaling'
                : (usageStats?.systemLoad || 0) > 60
                ? 'Moderate load'
                : 'Healthy operating range'}
            </p>
            <Progress value={usageStats?.systemLoad || 0} className="h-2" />
          </CardContent>
        </Card>

        {/* Error Rate */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">Error Rate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={`text-2xl sm:text-3xl font-bold ${
                (usageStats?.errorRate || 0) > 1 
                  ? 'text-red-600 dark:text-red-400' 
                  : (usageStats?.errorRate || 0) > 0.1 
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {(usageStats?.errorRate || 0).toFixed(3)}%
              </div>
              <CheckCircle className={`h-5 w-5 ${
                (usageStats?.errorRate || 0) > 1 
                  ? 'text-red-600 dark:text-red-400' 
                  : (usageStats?.errorRate || 0) > 0.1 
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`} />
            </div>
            <p className="text-xs text-muted-foreground">
              {(usageStats?.errorRate || 0) > 1
                ? 'High error rate - investigate'
                : (usageStats?.errorRate || 0) > 0.1
                ? 'Acceptable error rate'
                : 'Very low error rate'}
            </p>
            <Progress value={Math.min(usageStats?.errorRate || 0, 100)} className="h-2" />
          </CardContent>
        </Card>

        {/* Uptime */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">Uptime</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={`text-2xl sm:text-3xl font-bold ${
                (usageStats?.uptime || 0) < 99 
                  ? 'text-red-600 dark:text-red-400' 
                  : (usageStats?.uptime || 0) < 99.5 
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {(usageStats?.uptime || 0).toFixed(2)}%
              </div>
              <CheckCircle className={`h-5 w-5 ${
                (usageStats?.uptime || 0) < 99 
                  ? 'text-red-600 dark:text-red-400' 
                  : (usageStats?.uptime || 0) < 99.5 
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`} />
            </div>
            <p className="text-xs text-muted-foreground">
              {(usageStats?.uptime || 0) < 99
                ? 'Below SLA target'
                : (usageStats?.uptime || 0) < 99.5
                ? 'Meeting SLA'
                : 'Excellent reliability'}
            </p>
            <Progress value={usageStats?.uptime || 0} className="h-2" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
