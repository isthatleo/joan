"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  TrendingUp, Search, Calendar, DollarSign, BarChart3, LineChart,
  PieChart, Download, Filter, Eye, RefreshCw, Loader2, TrendingDown,
  Activity, Target, Zap, Clock
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const orange = "#F97316";

interface RevenueData {
  period: string;
  totalRevenue: number;
  insuranceRevenue: number;
  selfPayRevenue: number;
  otherRevenue: number;
  transactionCount: number;
  averageTransaction: number;
  growth: number;
}

interface RevenueMetrics {
  totalRevenue: number;
  monthlyGrowth: number;
  averageTransactionValue: number;
  topRevenueSource: string;
  collectionRate: number;
  outstandingBalance: number;
  projectedRevenue: number;
}

interface RevenueBreakdown {
  source: string;
  amount: number;
  percentage: number;
  transactions: number;
  color: string;
}

export default function AccountantRevenueTrackingPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [breakdown, setBreakdown] = useState<RevenueBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("12months");
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRevenueData();
  }, [slug, timeRange]);

  const fetchRevenueData = async () => {
    setLoading(true);
    try {
      const [dataRes, metricsRes, breakdownRes] = await Promise.all([
        fetch(`/api/tenant/${slug}/accountant/analytics/revenue?range=${timeRange}`),
        fetch(`/api/tenant/${slug}/accountant/analytics/revenue/metrics?range=${timeRange}`),
        fetch(`/api/tenant/${slug}/accountant/analytics/revenue/breakdown?range=${timeRange}`)
      ]);

      if (dataRes.ok) setRevenueData(await dataRes.json());
      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (breakdownRes.ok) setBreakdown(await breakdownRes.json());
    } catch (error) {
      console.error('Failed to fetch revenue data:', error);
      toast.error("Failed to load revenue data");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRevenueData();
    setRefreshing(false);
    toast.success("Revenue data refreshed");
  };

  const exportRevenueReport = async (format: 'csv' | 'pdf') => {
    try {
      const res = await fetch(`/api/tenant/${slug}/accountant/analytics/revenue/export?format=${format}&range=${timeRange}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `revenue-report-${timeRange}.${format}`;
        a.click();
        toast.success(`Revenue report exported`);
      }
    } catch (error) {
      toast.error("Failed to export revenue report");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Mock chart data for visualization
  const chartData = revenueData.map(item => ({
    period: item.period,
    revenue: item.totalRevenue,
    insurance: item.insuranceRevenue,
    selfPay: item.selfPayRevenue,
    other: item.otherRevenue,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Accountant Dashboard</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Revenue Tracking</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor revenue trends, sources, and financial performance.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => exportRevenueReport('csv')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all"
          >
            <Download className="size-4" />
            Export
          </button>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-foreground">Time Range:</span>
          <div className="flex gap-2">
            {[
              { value: "3months", label: "3 Months" },
              { value: "6months", label: "6 Months" },
              { value: "12months", label: "12 Months" },
              { value: "24months", label: "24 Months" },
            ].map(range => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === range.value
                    ? "bg-orange-100 text-orange-700"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Revenue</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(metrics?.totalRevenue || 0)}
              </p>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <TrendingUp className="size-3" />
                {formatPercentage(metrics?.monthlyGrowth || 0)} from last period
              </p>
            </div>
            <div className="size-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
              <DollarSign className="size-6" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Avg Transaction</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(metrics?.averageTransactionValue || 0)}
              </p>
              <p className="text-xs text-blue-600 mt-1">Per transaction</p>
            </div>
            <div className="size-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Target className="size-6" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Collection Rate</p>
              <p className="text-2xl font-bold text-foreground">
                {metrics?.collectionRate || 0}%
              </p>
              <p className="text-xs text-purple-600 mt-1">Payment success</p>
            </div>
            <div className="size-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
              <Activity className="size-6" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Projected Revenue</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(metrics?.projectedRevenue || 0)}
              </p>
              <p className="text-xs text-orange-600 mt-1">Next month estimate</p>
            </div>
            <div className="size-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
              <TrendingUp className="size-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-foreground">Revenue Trends</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setChartType("line")}
                className={`p-2 rounded-lg ${chartType === "line" ? "bg-orange-100 text-orange-700" : "text-muted-foreground hover:bg-muted"}`}
              >
                <LineChart className="size-4" />
              </button>
              <button
                onClick={() => setChartType("bar")}
                className={`p-2 rounded-lg ${chartType === "bar" ? "bg-orange-100 text-orange-700" : "text-muted-foreground hover:bg-muted"}`}
              >
                <BarChart3 className="size-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-blue-500"></div>
              <span>Insurance</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-green-500"></div>
              <span>Self-Pay</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-purple-500"></div>
              <span>Other</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 text-orange-500 animate-spin mx-auto" />
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="size-12 mx-auto mb-4 opacity-50" />
              <p>Revenue chart visualization</p>
              <p className="text-sm mt-1">Chart component would be integrated here</p>
            </div>
          </div>
        )}
      </div>

      {/* Revenue Sources Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Revenue Sources</h3>
            <PieChart className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-4">
            {breakdown.map(source => (
              <div key={source.source} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="size-4 rounded-full"
                    style={{ backgroundColor: source.color }}
                  ></div>
                  <div>
                    <p className="font-medium text-foreground">{source.source}</p>
                    <p className="text-xs text-muted-foreground">{source.transactions} transactions</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">{formatCurrency(source.amount)}</p>
                  <p className="text-xs text-muted-foreground">{source.percentage}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Revenue Insights</h3>
            <Zap className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-start gap-3">
                <TrendingUp className="size-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">Strong Growth</p>
                  <p className="text-sm text-green-700">
                    Revenue increased by {formatPercentage(metrics?.monthlyGrowth || 0)} compared to last period.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <Target className="size-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800">Top Performer</p>
                  <p className="text-sm text-blue-700">
                    {metrics?.topRevenueSource} is your highest revenue source this period.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-start gap-3">
                <Clock className="size-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">Outstanding Balance</p>
                  <p className="text-sm text-yellow-700">
                    ${metrics?.outstandingBalance?.toLocaleString() || '0'} remains to be collected.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Data Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Revenue Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                <th className="text-left px-4 py-3">Period</th>
                <th className="text-left px-4 py-3">Total Revenue</th>
                <th className="text-left px-4 py-3">Insurance</th>
                <th className="text-left px-4 py-3">Self-Pay</th>
                <th className="text-left px-4 py-3">Other</th>
                <th className="text-left px-4 py-3">Transactions</th>
                <th className="text-left px-4 py-3">Avg Transaction</th>
                <th className="text-left px-4 py-3">Growth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={8} className="py-16 text-center">
                  <Loader2 className="size-6 text-orange-500 animate-spin mx-auto" />
                </td></tr>
              ) : revenueData.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center">
                  <TrendingUp className="size-10 text-muted mx-auto mb-2" />
                  <p className="text-muted-foreground font-medium">No revenue data found</p>
                  <p className="text-xs text-muted-foreground mt-1">Data will appear as transactions are processed</p>
                </td></tr>
              ) : (
                revenueData.map((data, index) => (
                  <tr key={data.period} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{data.period}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {formatCurrency(data.totalRevenue)}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {formatCurrency(data.insuranceRevenue)}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {formatCurrency(data.selfPayRevenue)}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {formatCurrency(data.otherRevenue)}
                    </td>
                    <td className="px-4 py-3 text-foreground">{data.transactionCount}</td>
                    <td className="px-4 py-3 text-foreground">
                      {formatCurrency(data.averageTransaction)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                        data.growth >= 0
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                      }`}>
                        {data.growth >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                        {formatPercentage(data.growth)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
