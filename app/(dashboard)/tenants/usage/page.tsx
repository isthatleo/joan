"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader, StatCard, SectionCard } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, Database, Users, Zap } from "lucide-react";

interface UsageStats {
  totalApiCalls: number;
  totalStorageUsed: number;
  totalActiveUsers: number;
  averageResponseTime: number;
  topConsumers: Array<{
    id: string;
    name: string;
    apiCalls: number;
    storageUsed: number;
  }>;
}

export default function TenantUsagePage() {
  const { data: usageStats, isLoading } = useQuery({
    queryKey: ["tenant-usage"],
    queryFn: async () => {
      const response = await fetch("/api/tenants?usage=true");
      if (!response.ok) throw new Error("Failed to fetch usage stats");
      return response.json() as Promise<UsageStats>;
    },
  });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatStorage = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  const getUsagePercentage = (apiCalls: number, total: number) => {
    return ((apiCalls / total) * 100).toFixed(1);
  };

  const getStoragePercentage = (used: number, limit: number = 100 * 1024 * 1024 * 1024) => {
    // Assuming 100GB limit for demo
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageStatus = (percentage: number) => {
    if (percentage > 80) return { label: "High", color: "destructive" };
    if (percentage > 60) return { label: "Medium", color: "secondary" };
    return { label: "Low", color: "outline" };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Tenant Usage Analytics"
          subtitle="Monitor resource consumption across all hospitals"
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
      <PageHeader
        title="Tenant Usage Analytics"
        subtitle="Monitor resource consumption across all hospitals"
      />

      {/* Usage Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total API Calls</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(usageStats?.totalApiCalls || 0)}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatStorage(usageStats?.totalStorageUsed || 0)}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +8% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(usageStats?.totalActiveUsers || 0)}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +5% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageStats?.averageResponseTime || 0}ms</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingDown className="h-3 w-3 mr-1 text-green-500" />
              -3% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Consumers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top API Consumers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {usageStats?.topConsumers?.map((tenant, idx) => {
                const percentage = parseFloat(getUsagePercentage(tenant.apiCalls, usageStats.totalApiCalls));
                const status = getUsageStatus(percentage);

                return (
                  <div
                    key={tenant.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-900">{tenant.name}</p>
                        <Badge variant={status.color as any}>{status.label}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{formatNumber(tenant.apiCalls)} calls</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{percentage}% of total</span>
                        <span>{formatNumber(tenant.apiCalls)} calls</span>
                      </div>
                      <Progress value={percentage} className="mt-1" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Storage Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {usageStats?.topConsumers?.map((tenant, idx) => {
                const percentage = getStoragePercentage(tenant.storageUsed);
                const status = getUsageStatus(percentage);

                return (
                  <div key={tenant.id}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-900">{tenant.name}</p>
                      <div className="text-right">
                        <Badge variant={status.color as any} className="mb-1">{status.label}</Badge>
                        <p className="text-xs text-gray-500">{formatStorage(tenant.storageUsed)} / 100 GB</p>
                      </div>
                    </div>
                    <Progress value={percentage} className="mb-1" />
                    <p className="text-xs text-gray-500">{percentage.toFixed(1)}% used</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Usage Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-900">API Calls Trend</p>
                <div className="flex items-center text-xs text-green-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +12% increase
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-blue-500 h-3 rounded-full transition-all duration-500" style={{ width: "75%" }}></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Last Month</span>
                <span>This Month</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-900">Storage Consumption</p>
                <div className="flex items-center text-xs text-green-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +8% increase
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-green-500 h-3 rounded-full transition-all duration-500" style={{ width: "23%" }}></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Last Month</span>
                <span>This Month</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-900">Active Users</p>
                <div className="flex items-center text-xs text-green-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +5% increase
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-purple-500 h-3 rounded-full transition-all duration-500" style={{ width: "82%" }}></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Last Month</span>
                <span>This Month</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-900">Response Time</p>
                <div className="flex items-center text-xs text-green-600">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  -3% improvement
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-orange-500 h-3 rounded-full transition-all duration-500" style={{ width: "15%" }}></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Last Month</span>
                <span>This Month</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Health Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">System Load</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">62%</div>
            <p className="text-xs text-muted-foreground">Healthy operating range</p>
            <Progress value={62} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">0.02%</div>
            <p className="text-xs text-muted-foreground">Very low error rate</p>
            <Progress value={0.02} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Uptime</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">99.98%</div>
            <p className="text-xs text-muted-foreground">Excellent reliability</p>
            <Progress value={99.98} className="mt-2" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
