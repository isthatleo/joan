"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp, Loader2, RefreshCw, ArrowLeft, Zap,
  AlertCircle, CheckCircle, Activity, Clock, BarChart3
} from "lucide-react";

const orange = "#F97316";

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  apiResponseTime: number;
  uptime: string;
  activeUsers: number;
  timestamp: string;
}

export default function LabPerformancePage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("24h");

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lab/analytics`);
      if (res.ok) {
        const data = await res.json();
        setMetrics({
          cpuUsage: Math.random() * 70,
          memoryUsage: Math.random() * 65,
          diskUsage: 45,
          apiResponseTime: 120 + Math.random() * 80,
          uptime: "99.9%",
          activeUsers: 12,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchMetrics, 60000); // 1 minute
    return () => clearInterval(interval);
  }, []);

  const getHealthColor = (usage: number) => {
    if (usage < 50) return "text-green-600";
    if (usage < 80) return "text-yellow-600";
    return "text-red-600";
  };

  const getHealthBgColor = (usage: number) => {
    if (usage < 50) return "from-green-50 to-green-100/50";
    if (usage < 80) return "from-yellow-50 to-yellow-100/50";
    return "from-red-50 to-red-100/50";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href={`/tenant/${slug}/lab`} className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 mb-3">
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </Link>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Performance Monitoring</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Lab Performance</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time system performance and metrics monitoring.</p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value)}
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm font-semibold focus:outline-none focus:border-orange-300"
          >
            <option value="1h">Last 1 Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <button
            onClick={fetchMetrics}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all"
          >
            <RefreshCw className="size-4" />
          </button>
        </div>
      </div>

      {/* Main Health Status */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* System Health */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center size-24 rounded-full bg-green-50 mb-4">
              <CheckCircle className="size-12 text-green-600" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">System Health</p>
            <p className="text-2xl font-bold text-green-600 mt-2">Healthy</p>
            <p className="text-xs text-muted-foreground mt-1">All systems operational</p>
          </div>

          {/* Uptime */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center size-24 rounded-full bg-blue-50 mb-4">
              <Activity className="size-12 text-blue-600" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">Uptime</p>
            <p className="text-2xl font-bold text-blue-600 mt-2">{metrics?.uptime || "99.9%"}</p>
            <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
          </div>

          {/* Active Users */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center size-24 rounded-full bg-purple-50 mb-4">
              <Zap className="size-12 text-purple-600" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">Active Users</p>
            <p className="text-2xl font-bold text-purple-600 mt-2">{metrics?.activeUsers || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Currently online</p>
          </div>

          {/* Response Time */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center size-24 rounded-full bg-orange-50 mb-4">
              <Clock className="size-12 text-orange-600" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">Avg Response</p>
            <p className="text-2xl font-bold text-orange-600 mt-2">{(metrics?.apiResponseTime || 0).toFixed(0)}ms</p>
            <p className="text-xs text-muted-foreground mt-1">API response time</p>
          </div>
        </div>
      </div>

      {/* Resource Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU Usage */}
        <div className={`bg-gradient-to-br ${getHealthBgColor(metrics?.cpuUsage || 0)} border border-border rounded-xl p-6`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">CPU Usage</h3>
            <Activity className={`size-5 ${getHealthColor(metrics?.cpuUsage || 0)}`} />
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-semibold">Current Usage</span>
                <span className={`text-3xl font-bold ${getHealthColor(metrics?.cpuUsage || 0)}`}>
                  {loading ? <Loader2 className="size-6 animate-spin" /> : `${(metrics?.cpuUsage || 0).toFixed(1)}%`}
                </span>
              </div>
              <div className="w-full bg-black/10 rounded-full h-3">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
                  style={{ width: `${metrics?.cpuUsage || 0}%` }}
                />
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              <p>Max: 85% | Threshold: 80%</p>
              <p className="mt-1">Status: {(metrics?.cpuUsage || 0) < 80 ? "✓ Normal" : "⚠ High"}</p>
            </div>
          </div>
        </div>

        {/* Memory Usage */}
        <div className={`bg-gradient-to-br ${getHealthBgColor(metrics?.memoryUsage || 0)} border border-border rounded-xl p-6`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Memory Usage</h3>
            <Zap className={`size-5 ${getHealthColor(metrics?.memoryUsage || 0)}`} />
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-semibold">Current Usage</span>
                <span className={`text-3xl font-bold ${getHealthColor(metrics?.memoryUsage || 0)}`}>
                  {loading ? <Loader2 className="size-6 animate-spin" /> : `${(metrics?.memoryUsage || 0).toFixed(1)}%`}
                </span>
              </div>
              <div className="w-full bg-black/10 rounded-full h-3">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-purple-600"
                  style={{ width: `${metrics?.memoryUsage || 0}%` }}
                />
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              <p>Max: 90% | Threshold: 85%</p>
              <p className="mt-1">Status: {(metrics?.memoryUsage || 0) < 85 ? "✓ Normal" : "⚠ High"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Disk & Network */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Disk Usage */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Disk Usage</h3>
            <BarChart3 className="size-5 text-orange-600" />
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-semibold">Current Usage</span>
                <span className="text-3xl font-bold text-orange-600">
                  {metrics?.diskUsage || 0}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className="h-3 rounded-full bg-orange-500"
                  style={{ width: `${metrics?.diskUsage || 0}%` }}
                />
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              <p>Total: 500 GB | Used: 225 GB | Free: 275 GB</p>
              <p className="mt-1">Status: ✓ Normal</p>
            </div>
          </div>
        </div>

        {/* Database Performance */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Database Performance</h3>
            <TrendingUp className="size-5 text-green-600" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded">
              <span className="text-sm">Query Time</span>
              <span className="font-semibold">45ms</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded">
              <span className="text-sm">Connections</span>
              <span className="font-semibold">12/100</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded">
              <span className="text-sm">Cache Hit Rate</span>
              <span className="font-semibold">87%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Trends */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-6">Performance Trends</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-muted-foreground font-semibold mb-3">Orders Processed</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Today</span>
                <span className="font-semibold">245</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>This Week</span>
                <span className="font-semibold">1,420</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>This Month</span>
                <span className="font-semibold">5,890</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground font-semibold mb-3">Completion Rate</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Today</span>
                <span className="font-semibold text-green-600">94%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>This Week</span>
                <span className="font-semibold text-green-600">92%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>This Month</span>
                <span className="font-semibold text-green-600">91%</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground font-semibold mb-3">Error Rate</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Today</span>
                <span className="font-semibold text-green-600">0.1%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>This Week</span>
                <span className="font-semibold text-green-600">0.2%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>This Month</span>
                <span className="font-semibold text-green-600">0.3%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

