"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader, StatCard } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, Users, DollarSign, Activity, TrendingUp, TrendingDown, Calendar, BarChart3, PieChart, LineChart } from "lucide-react";

interface GlobalAnalytics {
  totalHospitals: number;
  totalPatients: number;
  totalRevenue: number;
  activeUsers: number;
  systemUptime: number;
  monthlyGrowth: number;
  hospitalPerformance: Array<{
    id: string;
    name: string;
    patients: number;
    revenue: number;
    growth: number;
  }>;
  systemMetrics: Array<{
    label: string;
    value: string;
    status: "excellent" | "good" | "warning";
  }>;
  revenueTrends: {
    thisMonth: number;
    lastMonth: number;
    growth: number;
    target: number;
  };
  recentActivity: Array<{
    id: string;
    type: "success" | "info" | "warning";
    message: string;
    timestamp: string;
  }>;
}

export default function GlobalAnalyticsPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["global-analytics"],
    queryFn: async () => {
      // This would typically fetch from an analytics API
      // For now, return mock data
      return {
        totalHospitals: 47,
        totalPatients: 124850,
        totalRevenue: 2874500,
        activeUsers: 8234,
        systemUptime: 99.98,
        monthlyGrowth: 12,
        hospitalPerformance: [
          { id: "1", name: "City Medical Center", patients: 1247, revenue: 45230, growth: 8.5 },
          { id: "2", name: "County Hospital", patients: 892, revenue: 38950, growth: 5.2 },
          { id: "3", name: "Private Clinic", patients: 234, revenue: 12340, growth: -2.1 },
          { id: "4", name: "Medical University", patients: 567, revenue: 28100, growth: 15.3 },
          { id: "5", name: "Emergency Care Center", patients: 89, revenue: 2100, growth: 3.7 },
        ],
        systemMetrics: [
          { label: "API Response Time", value: "145ms", status: "excellent" },
          { label: "Database Load", value: "62%", status: "good" },
          { label: "Error Rate", value: "0.02%", status: "excellent" },
          { label: "Memory Usage", value: "78%", status: "good" },
          { label: "CPU Usage", value: "45%", status: "excellent" },
        ],
        revenueTrends: {
          thisMonth: 123456,
          lastMonth: 101234,
          growth: 22.1,
          target: 150000,
        },
        recentActivity: [
          { id: "1", type: "success", message: "New hospital onboarded: Valley Medical Center", timestamp: "2 hours ago" },
          { id: "2", type: "info", message: "System update deployed successfully", timestamp: "5 hours ago" },
          { id: "3", type: "warning", message: "Monthly revenue target exceeded", timestamp: "1 day ago" },
          { id: "4", type: "success", message: "Database backup completed", timestamp: "2 days ago" },
          { id: "5", type: "info", message: "Security scan finished with no issues", timestamp: "3 days ago" },
        ],
      } as GlobalAnalytics;
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "excellent": return "bg-green-500";
      case "good": return "bg-blue-500";
      case "warning": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "success": return "bg-green-500";
      case "info": return "bg-blue-500";
      case "warning": return "bg-orange-500";
      default: return "bg-gray-500";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Global Analytics"
          subtitle="Platform-wide performance and insights"
        />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded mb-1"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <PageHeader
          title="Global Analytics"
          subtitle="Platform-wide performance and insights"
        />
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>Last updated: {new Date().toLocaleString()}</span>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hospitals</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalHospitals}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +2 this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(analytics?.activeUsers || 0)}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +{analytics?.monthlyGrowth}% growth
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics?.totalRevenue || 0)}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +18% this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.systemUptime}%</div>
            <p className="text-xs text-muted-foreground">Excellent</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Hospital Performance</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hospital Performance Rankings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.hospitalPerformance?.map((hospital, index) => (
                  <div key={hospital.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{hospital.name}</h3>
                        <Badge variant={hospital.growth >= 0 ? "default" : "destructive"}>
                          {hospital.growth >= 0 ? "+" : ""}{hospital.growth}%
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>{formatNumber(hospital.patients)} patients</span>
                        <span>{formatCurrency(hospital.revenue)} revenue</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <Progress value={Math.min(100, (hospital.patients / 15) * 10)} className="w-32" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Health Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analytics?.systemMetrics?.map((metric, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{metric.label}</p>
                      <p className="text-lg font-semibold">{metric.value}</p>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(metric.status)}`} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">This Month</span>
                  <span className="text-lg font-bold">{formatCurrency(analytics?.revenueTrends?.thisMonth || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Last Month</span>
                  <span className="text-lg font-bold">{formatCurrency(analytics?.revenueTrends?.lastMonth || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Growth</span>
                  <span className="text-lg font-bold text-green-600">+{analytics?.revenueTrends?.growth}%</span>
                </div>
                <div className="mt-4">
                  <Progress
                    value={(analytics?.revenueTrends?.thisMonth || 0) / (analytics?.revenueTrends?.target || 1) * 100}
                    className="mb-2"
                  />
                  <p className="text-xs text-gray-600">
                    {Math.round((analytics?.revenueTrends?.thisMonth || 0) / (analytics?.revenueTrends?.target || 1) * 100)}% of monthly target achieved
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { plan: "Premium", amount: 145230, percentage: 50.5 },
                    { plan: "Standard", amount: 112450, percentage: 39.1 },
                    { plan: "Basic", amount: 29770, percentage: 10.4 },
                  ].map((item, index) => (
                    <div key={index}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">{item.plan}</span>
                        <span className="text-sm font-semibold">{formatCurrency(item.amount)}</span>
                      </div>
                      <Progress value={item.percentage} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Platform Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics?.recentActivity?.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${getActivityColor(activity.type)}`} />
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-600">{activity.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
