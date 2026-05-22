"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  BarChart3, PieChart, TrendingUp, Loader2, RefreshCw,
  ArrowLeft, Download, Calendar, Users, Activity
} from "lucide-react";

const orange = "#F97316";

interface AnalyticsData {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  criticalResults: number;
  averageTurnaroundTime: number;
  testsByCategory: Record<string, number>;
  ordersByPriority: Record<string, number>;
  dailyVolume: Array<{ date: string; count: number }>;
}

export default function LabAnalyticsPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lab/analytics`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchAnalytics, 600000); // 10 minutes
    return () => clearInterval(interval);
  }, []);

  const completionRate = analytics
    ? (analytics.completedOrders / analytics.totalOrders * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href={`/tenant/${slug}/lab`} className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 mb-3">
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </Link>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Analytics & Reporting</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Lab Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">View detailed analytics and performance metrics.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchAnalytics}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all"
          >
            <RefreshCw className="size-4" />
            Refresh
          </button>
          <button
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90"
            style={{ backgroundColor: orange }}
          >
            <Download className="size-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Total Orders</p>
          {loading ? (
            <Loader2 className="size-6 animate-spin mt-2" />
          ) : (
            <p className="text-3xl font-bold text-foreground mt-1">{analytics?.totalOrders || 0}</p>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Completion Rate</p>
          {loading ? (
            <Loader2 className="size-6 animate-spin mt-2" />
          ) : (
            <>
              <p className="text-3xl font-bold text-green-600 mt-1">{completionRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">{analytics?.completedOrders} completed</p>
            </>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Avg Turnaround</p>
          {loading ? (
            <Loader2 className="size-6 animate-spin mt-2" />
          ) : (
            <p className="text-3xl font-bold text-blue-600 mt-1">{analytics?.averageTurnaroundTime || 0}h</p>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Pending Orders</p>
          {loading ? (
            <Loader2 className="size-6 animate-spin mt-2" />
          ) : (
            <p className="text-3xl font-bold text-yellow-600 mt-1">{analytics?.pendingOrders || 0}</p>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Critical Results</p>
          {loading ? (
            <Loader2 className="size-6 animate-spin mt-2" />
          ) : (
            <p className="text-3xl font-bold text-red-600 mt-1">{analytics?.criticalResults || 0}</p>
          )}
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by Priority */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Activity className="size-5 text-orange-600" />
            Orders by Priority
          </h3>
          {loading ? (
            <div className="h-64 flex items-center justify-center"><Loader2 className="size-6 animate-spin" /></div>
          ) : (
            <div className="space-y-4">
              {Object.entries(analytics?.ordersByPriority || {}).map(([priority, count]) => {
                const total = analytics?.totalOrders || 1;
                const percentage = (count / total * 100).toFixed(1);
                const colors: Record<string, string> = {
                  routine: "bg-blue-500",
                  urgent: "bg-orange-500",
                  critical: "bg-red-500",
                };
                return (
                  <div key={priority} className="space-y-1">
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="capitalize">{priority}</span>
                      <span>{count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${colors[priority]}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Daily Volume */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <BarChart3 className="size-5 text-orange-600" />
            Daily Order Volume (Last 7 Days)
          </h3>
          {loading ? (
            <div className="h-64 flex items-center justify-center"><Loader2 className="size-6 animate-spin" /></div>
          ) : analytics?.dailyVolume && analytics.dailyVolume.length > 0 ? (
            <div className="space-y-4">
              {analytics.dailyVolume.slice(-7).map(({ date, count }) => {
                const maxCount = Math.max(...analytics.dailyVolume.map(d => d.count), 1);
                const percentage = (count / maxCount * 100);
                return (
                  <div key={date} className="space-y-1">
                    <div className="flex justify-between text-sm font-semibold">
                      <span>{new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      <span>{count} orders</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-green-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">No data available</div>
          )}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-6">Performance Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-4">
            <p className="text-sm text-blue-900 font-semibold">Orders This Month</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{analytics?.totalOrders || 0}</p>
            <p className="text-xs text-blue-800 mt-2">Total tests ordered</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-lg p-4">
            <p className="text-sm text-green-900 font-semibold">Successfully Completed</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{analytics?.completedOrders || 0}</p>
            <p className="text-xs text-green-800 mt-2">Results delivered</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-lg p-4">
            <p className="text-sm text-purple-900 font-semibold">Average Turnaround</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">{analytics?.averageTurnaroundTime || 0}h</p>
            <p className="text-xs text-purple-800 mt-2">Time to completion</p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-lg p-4">
            <p className="text-sm text-red-900 font-semibold">Critical Results</p>
            <p className="text-3xl font-bold text-red-600 mt-2">{analytics?.criticalResults || 0}</p>
            <p className="text-xs text-red-800 mt-2">Requiring immediate attention</p>
          </div>
        </div>
      </div>

      {/* Quality Metrics */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-6">Quality Metrics</h3>
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="font-semibold">Test Accuracy Rate</p>
              <span className="text-lg font-bold text-green-600">98.5%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div className="h-3 rounded-full bg-green-500" style={{ width: "98.5%" }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="font-semibold">Lab Availability</p>
              <span className="text-lg font-bold text-blue-600">99.8%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div className="h-3 rounded-full bg-blue-500" style={{ width: "99.8%" }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="font-semibold">Equipment Uptime</p>
              <span className="text-lg font-bold text-purple-600">97.2%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div className="h-3 rounded-full bg-purple-500" style={{ width: "97.2%" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

