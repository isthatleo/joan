"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  PageHeader,
  StatCard,
  SectionCard,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Hospital,
  DollarSign,
  Calendar,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Database,
  Cpu,
  AlertCircle,
  CheckCircle,
  BarChart3,
  PieChart,
  LineChart,
  Zap,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface AnalyticsData {
  // Hospital Performance
  totalHospitals: number;
  activeHospitals: number;
  hospitalTrend: number;
  averagePatientsPerHospital: number;
  patientsGrowth: number;
  appointmentsToday: number;
  appointmentsTrend: number;

  // System Health
  systemLoad: number;
  errorRate: number;
  uptime: number;
  databaseHealth: number;
  apiLatency: number;
  activeRequests: number;

  // Revenue Analytics
  totalRevenue: number;
  revenueTrend: number;
  monthlyRecurring: number;
  averageRevenuePerHospital: number;
  revenueGrowth: number;
  planDistribution: { plan: string; count: number; revenue: number }[];
  topRevenueTenants: { name: string; revenue: number; patients: number }[];
}

type TabType = "hospital" | "system" | "revenue";

const TAB_OPTIONS = [
  { id: "hospital", label: "Hospital Performance", icon: Hospital },
  { id: "system", label: "System Health", icon: Cpu },
  { id: "revenue", label: "Revenue Analytics", icon: DollarSign },
] as const;

export default function SuperAdminAnalytics()  {
  const [activeTab, setActiveTab] = useState<TabType>("hospital");

  // Fetch analytics data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const response = await fetch("/api/global-analytics");
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json() as Promise<AnalyticsData>;
    },
    refetchInterval: 60000, // Refetch every minute
  });

  const getStatusColor = (value: number, type: "load" | "error" | "latency" | "health") => {
    switch (type) {
      case "load":
        return value > 80 ? "destructive" : value > 60 ? "warning" : "success";
      case "error":
        return value > 1 ? "destructive" : value > 0.1 ? "warning" : "success";
      case "latency":
        return value > 200 ? "destructive" : value > 100 ? "warning" : "success";
      case "health":
        return value > 90 ? "success" : value > 70 ? "warning" : "destructive";
      default:
        return "default";
    }
  };

  return (
    <div>
      <PageHeader
        title="System Analytics"
        subtitle="Platform-wide performance and usage insights"
      />

      {/* Navigation Tabs */}
      <div className="mb-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              {TAB_OPTIONS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? "default" : "outline"}
                    onClick={() => setActiveTab(tab.id)}
                    className="inline-flex items-center gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </Button>
                );
              })}
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Hospital Performance Tab */}
      {activeTab === "hospital" && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Hospitals"
              value={analyticsData?.totalHospitals || 0}
              subtitle={`${analyticsData?.activeHospitals || 0} active`}
              icon={Hospital}
              tone="primary"
              trend={{
                value: `${analyticsData?.hospitalTrend || 0 >= 0 ? "+" : ""}${analyticsData?.hospitalTrend || 0}%`,
                direction: (analyticsData?.hospitalTrend || 0) >= 0 ? "up" : "down",
              }}
            />
            <StatCard
              title="Total Patients"
              value={(analyticsData?.averagePatientsPerHospital || 0) * (analyticsData?.totalHospitals || 1)}
              subtitle="Across platform"
              icon={Users}
              tone="info"
              trend={{
                value: `${analyticsData?.patientsGrowth || 0 >= 0 ? "+" : ""}${analyticsData?.patientsGrowth || 0}%`,
                direction: (analyticsData?.patientsGrowth || 0) >= 0 ? "up" : "down",
              }}
            />
            <StatCard
              title="Appointments Today"
              value={analyticsData?.appointmentsToday || 0}
              subtitle="Scheduled visits"
              icon={Calendar}
              tone="success"
              trend={{
                value: `${analyticsData?.appointmentsTrend || 0 >= 0 ? "+" : ""}${analyticsData?.appointmentsTrend || 0}%`,
                direction: (analyticsData?.appointmentsTrend || 0) >= 0 ? "up" : "down",
              }}
            />
            <StatCard
              title="Avg Patients/Hospital"
              value={Math.round(analyticsData?.averagePatientsPerHospital || 0)}
              subtitle="Per hospital average"
              icon={Activity}
              tone="warning"
            />
          </div>

          {/* Hospital Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Hospital Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Active", count: analyticsData?.activeHospitals || 0, color: "bg-emerald-500" },
                  { label: "Inactive", count: (analyticsData?.totalHospitals || 0) - (analyticsData?.activeHospitals || 0), color: "bg-gray-400" },
                ].map((item, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className="text-sm font-semibold">{item.count}</span>
                    </div>
                    <Progress value={(item.count / (analyticsData?.totalHospitals || 1)) * 100} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Plan Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analyticsData?.planDistribution?.map((plan, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{plan.plan}</span>
                      <Badge variant="outline">{plan.count} hospitals</Badge>
                    </div>
                    <Progress value={(plan.count / (analyticsData?.totalHospitals || 1)) * 100} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Top Hospitals */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Hospitals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analyticsData?.topRevenueTenants?.map((hospital, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft">
                        <span className="text-xs font-semibold">{idx + 1}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{hospital.name}</p>
                        <p className="text-xs text-muted-foreground">{hospital.patients.toLocaleString()} patients</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">${(hospital.revenue / 1000).toFixed(0)}K</Badge>
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* System Health Tab */}
      {activeTab === "system" && (
        <div className="space-y-6">
          {/* Health KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">System Load</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className={`text-3xl font-bold ${
                      (analyticsData?.systemLoad || 0) > 80 
                        ? "text-red-600" 
                        : (analyticsData?.systemLoad || 0) > 60 
                        ? "text-yellow-600" 
                        : "text-emerald-600"
                    }`}>
                      {analyticsData?.systemLoad?.toFixed(1) || 0}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">CPU & Memory</p>
                  </div>
                  <Progress value={analyticsData?.systemLoad || 0} className="h-12" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Error Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className={`text-3xl font-bold ${
                      (analyticsData?.errorRate || 0) > 1 
                        ? "text-red-600" 
                        : (analyticsData?.errorRate || 0) > 0.1 
                        ? "text-yellow-600" 
                        : "text-emerald-600"
                    }`}>
                      {(analyticsData?.errorRate || 0).toFixed(3)}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">API Errors</p>
                  </div>
                  <Badge variant={getStatusColor(analyticsData?.errorRate || 0, "error")}>
                    {(analyticsData?.errorRate || 0) > 1 ? "⚠️" : "✓"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Uptime</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className={`text-3xl font-bold ${
                      (analyticsData?.uptime || 0) < 99 ? "text-red-600" : "text-emerald-600"
                    }`}>
                      {(analyticsData?.uptime || 0).toFixed(2)}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
                  </div>
                  <CheckCircle className="h-6 w-6 text-emerald-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">API Latency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className={`text-3xl font-bold ${
                      (analyticsData?.apiLatency || 0) > 200 
                        ? "text-red-600" 
                        : (analyticsData?.apiLatency || 0) > 100 
                        ? "text-yellow-600" 
                        : "text-emerald-600"
                    }`}>
                      {analyticsData?.apiLatency?.toFixed(0) || 0}ms
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Avg Response</p>
                  </div>
                  <Zap className="h-6 w-6 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Connection Pool</span>
                    <Badge variant="outline">Active</Badge>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Query Performance</span>
                    <span className="text-sm font-semibold">142ms avg</span>
                  </div>
                  <Progress value={60} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Replication Lag</span>
                    <span className="text-xs text-muted-foreground">0.2s</span>
                  </div>
                  <Progress value={20} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Active Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-3xl font-bold">{analyticsData?.activeRequests || 0}</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>GET Requests</span>
                      <span className="font-semibold">{Math.round((analyticsData?.activeRequests || 0) * 0.6)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>POST Requests</span>
                      <span className="font-semibold">{Math.round((analyticsData?.activeRequests || 0) * 0.25)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Other Requests</span>
                      <span className="font-semibold">{Math.round((analyticsData?.activeRequests || 0) * 0.15)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Revenue Analytics Tab */}
      {activeTab === "revenue" && (
        <div className="space-y-6">
          {/* Revenue KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Revenue"
              value={`$${(analyticsData?.totalRevenue || 0 / 1000).toFixed(0)}K`}
              subtitle="All time"
              icon={DollarSign}
              tone="success"
              trend={{
                value: `${analyticsData?.revenueTrend || 0 >= 0 ? "+" : ""}${analyticsData?.revenueTrend || 0}%`,
                direction: (analyticsData?.revenueTrend || 0) >= 0 ? "up" : "down",
              }}
            />
            <StatCard
              title="Monthly Recurring"
              value={`$${(analyticsData?.monthlyRecurring || 0 / 1000).toFixed(0)}K`}
              subtitle="MRR"
              icon={TrendingUp}
              tone="info"
            />
            <StatCard
              title="Avg/Hospital"
              value={`$${(analyticsData?.averageRevenuePerHospital || 0 / 1000).toFixed(1)}K`}
              subtitle="Per hospital"
              icon={Activity}
              tone="primary"
            />
            <StatCard
              title="Revenue Growth"
              value={`${analyticsData?.revenueGrowth || 0}%`}
              subtitle="YoY"
              icon={TrendingUp}
              tone="success"
              trend={{
                value: "Quarter over quarter",
                direction: "up",
              }}
            />
          </div>

          {/* Revenue Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  Revenue by Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analyticsData?.planDistribution?.map((plan, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{plan.plan}</span>
                      <Badge>${(plan.revenue / 1000).toFixed(0)}K</Badge>
                    </div>
                    <Progress value={(plan.revenue / (analyticsData?.totalRevenue || 1)) * 100} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Forecast</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="text-sm">Next Quarter Projection</div>
                  <div className="text-2xl font-bold">${((analyticsData?.monthlyRecurring || 0) * 3 * 1.15 / 1000).toFixed(0)}K</div>
                  <div className="text-xs text-emerald-600 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    +15% projected growth
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Revenue Generators */}
          <Card>
            <CardHeader>
              <CardTitle>Top Revenue Generators</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analyticsData?.topRevenueTenants?.map((hospital, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-soft">
                        <span className="text-xs font-semibold">{idx + 1}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{hospital.name}</p>
                        <p className="text-xs text-muted-foreground">{hospital.patients.toLocaleString()} patients</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">${(hospital.revenue / 1000).toFixed(1)}K</p>
                      <p className="text-xs text-muted-foreground">Monthly</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
