"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  BarChart3, TrendingUp, PieChart, Calendar, Loader2,
  Filter, Download, DollarSign, Users, Package, TrendingDown
} from "lucide-react";

const orange = "#F97316";

interface AnalyticsData {
  totalRevenue: number;
  revenueGrowth: number;
  totalPrescriptions: number;
  prescriptionsGrowth: number;
  averagePrescriptionValue: number;
  totalDispensed: number;
  topMedications: Array<{
    name: string;
    count: number;
    revenue: number;
  }>;
  monthlyData: Array<{
    month: string;
    revenue: number;
    prescriptions: number;
  }>;
  dispensingAccuracy: number;
  averageFillTime: number;
}

export default function AnalyticsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30days");

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/tenant/${slug}/pharmacy/analytics?range=${dateRange}`
      );
      if (res.ok) {
        setAnalytics(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-6 text-orange-500 animate-spin" />
          Loading analytics...
        </div>
      </div>
    );
  }

  const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendDirection }: {
    title: string;
    value: string | number;
    subtitle: string;
    icon: React.ReactNode;
    trend?: string;
    trendDirection?: "up" | "down";
  }) => (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-xl bg-orange-50 text-orange-500">
          {Icon}
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
              trendDirection === "up"
                ? "text-green-600 bg-green-50"
                : "text-red-600 bg-red-50"
            }`}
          >
            {trendDirection === "up" ? "↑" : "↓"} {trend}
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Reports</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Pharmacy operations and performance metrics.</p>
        </div>
        <div className="flex gap-2">
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="ytd">Year to Date</option>
          </select>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all">
            <Download className="size-4" />
            Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={`$${analytics?.totalRevenue?.toFixed(2) || "0.00"}`}
          subtitle="All prescriptions"
          icon={<DollarSign className="h-6 w-6" />}
          trend={`${analytics?.revenueGrowth}%`}
          trendDirection={analytics?.revenueGrowth && analytics.revenueGrowth >= 0 ? "up" : "down"}
        />
        <StatCard
          title="Prescriptions Filled"
          value={analytics?.totalDispensed || 0}
          subtitle="This period"
          icon={<Package className="h-6 w-6" />}
          trend={`${analytics?.prescriptionsGrowth}%`}
          trendDirection={analytics?.prescriptionsGrowth && analytics.prescriptionsGrowth >= 0 ? "up" : "down"}
        />
        <StatCard
          title="Avg Prescription Value"
          value={`$${analytics?.averagePrescriptionValue?.toFixed(2) || "0.00"}`}
          subtitle="Per transaction"
          icon={<TrendingUp className="h-6 w-6" />}
        />
        <StatCard
          title="Fill Accuracy"
          value={`${analytics?.dispensingAccuracy || 0}%`}
          subtitle="Quality metric"
          icon={<BarChart3 className="h-6 w-6" />}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-orange-500" />
            Revenue Trend
          </h3>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="size-12 mx-auto mb-2 opacity-50" />
              <p>Chart integration available</p>
              <p className="text-xs mt-1">Showing {analytics?.monthlyData?.length || 0} data points</p>
            </div>
          </div>
        </div>

        {/* Prescription Distribution */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <PieChart className="h-5 w-5 text-orange-500" />
            Top Medications
          </h3>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <PieChart className="size-12 mx-auto mb-2 opacity-50" />
              <p>Chart integration available</p>
              <p className="text-xs mt-1">Showing {analytics?.topMedications?.length || 0} top items</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Medications Table */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Top Medications</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr className="text-muted-foreground text-xs font-semibold uppercase">
                <th className="text-left px-4 py-3">Medication Name</th>
                <th className="text-left px-4 py-3">Dispensed</th>
                <th className="text-left px-4 py-3">Revenue</th>
                <th className="text-left px-4 py-3">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {analytics?.topMedications?.map((med, idx) => (
                <tr key={idx} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground">{med.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-foreground">{med.count} units</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground">${med.revenue.toFixed(2)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-600">
                      <TrendingUp className="size-3" />
                      Up
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Dispensing Accuracy</span>
                <span className="text-sm font-semibold text-foreground">{analytics?.dispensingAccuracy || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-green-500"
                  style={{ width: `${analytics?.dispensingAccuracy || 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Average Fill Time</span>
                <span className="text-sm font-semibold text-foreground">{analytics?.averageFillTime || 0} min</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-blue-500"
                  style={{ width: `${Math.min(100, (analytics?.averageFillTime || 0) / 30 * 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="pt-4 border-t border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Transactions</span>
                <span className="font-semibold text-foreground">{analytics?.totalPrescriptions || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg Transaction Value</span>
                <span className="font-semibold text-foreground">${analytics?.averagePrescriptionValue?.toFixed(2) || "0.00"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Key Insights</h3>
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm font-semibold text-blue-900">High Performer</p>
              <p className="text-xs text-blue-700 mt-1">
                Dispensing accuracy is above target at 98%
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-100">
              <p className="text-sm font-semibold text-green-900">Growth Trend</p>
              <p className="text-xs text-green-700 mt-1">
                Revenue increased by {analytics?.revenueGrowth}% this period
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
              <p className="text-sm font-semibold text-orange-900">Optimization</p>
              <p className="text-xs text-orange-700 mt-1">
                Average fill time can be reduced by 2-3 minutes
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

