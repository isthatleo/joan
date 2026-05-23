"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, PieChart,
  LineChart, Activity, Target, AlertTriangle, CheckCircle,
  Calendar, Download, RefreshCw, Filter, Eye, Settings,
  Calculator, Percent, ArrowUpRight, ArrowDownRight, Loader2
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { exportElementAsPdf, exportElementAsPng } from "@/lib/export/page-export";

const orange = "#F97316";

interface FinancialMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  accountsReceivable: number;
  accountsPayable: number;
  cashFlow: number;
  debtToEquity: number;
  returnOnAssets: number;
  currentRatio: number;
}

interface TrendData {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
  growth: number;
}

interface RatioAnalysis {
  name: string;
  value: number;
  benchmark: number;
  status: "good" | "warning" | "critical";
  description: string;
}

interface CashFlowData {
  operating: number;
  investing: number;
  financing: number;
  netCashFlow: number;
}

export default function AccountantFinancialAnalysisPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [ratios, setRatios] = useState<RatioAnalysis[]>([]);
  const [cashFlow, setCashFlow] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("12months");
  const [refreshing, setRefreshing] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchFinancialData();
  }, [slug, timeRange]);

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      const [metricsRes, trendsRes, ratiosRes, cashFlowRes] = await Promise.all([
        fetch(`/api/tenant/${slug}/accountant/analytics/financial/metrics?range=${timeRange}`),
        fetch(`/api/tenant/${slug}/accountant/analytics/financial/trends?range=${timeRange}`),
        fetch(`/api/tenant/${slug}/accountant/analytics/financial/ratios?range=${timeRange}`),
        fetch(`/api/tenant/${slug}/accountant/analytics/financial/cashflow?range=${timeRange}`)
      ]);

      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (trendsRes.ok) setTrendData(await trendsRes.json());
      if (ratiosRes.ok) setRatios(await ratiosRes.json());
      if (cashFlowRes.ok) setCashFlow(await cashFlowRes.json());
    } catch (error) {
      console.error('Failed to fetch financial data:', error);
      toast.error("Failed to load financial data");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFinancialData();
    setRefreshing(false);
    toast.success("Financial data refreshed");
  };

  const exportAnalysis = async (format: "pdf" | "png") => {
    const exportNode = exportRef.current;
    if (!exportNode) {
      toast.error("Nothing to export");
      return;
    }

    try {
      const filename = `financial-analysis-${timeRange}.${format}`;
      if (format === "pdf") {
        await exportElementAsPdf(exportNode, filename);
      } else {
        await exportElementAsPng(exportNode, filename);
      }
      toast.success("Financial analysis exported");
    } catch (error) {
      toast.error("Failed to export analysis");
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

  const getRatioStatusColor = (status: string) => {
    switch (status) {
      case "good": return "text-green-600 bg-green-50";
      case "warning": return "text-yellow-600 bg-yellow-50";
      case "critical": return "text-red-600 bg-red-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const getRatioStatusIcon = (status: string) => {
    switch (status) {
      case "good": return <CheckCircle className="size-4" />;
      case "warning": return <AlertTriangle className="size-4" />;
      case "critical": return <AlertTriangle className="size-4" />;
      default: return null;
    }
  };

  const latestGrowth = trendData.length ? trendData[trendData.length - 1]?.growth || 0 : 0;
  const chartMax = Math.max(
    1,
    ...trendData.flatMap((item) => [item.revenue, item.expenses, item.profit])
  );
  const chartPoints = trendData.map((item, index) => {
    const x = trendData.length === 1 ? 40 : 40 + (index * 720) / Math.max(trendData.length - 1, 1);
    return {
      label: item.period,
      x,
      revenueY: 220 - (item.revenue / chartMax) * 180,
      expensesY: 220 - (item.expenses / chartMax) * 180,
      profitY: 220 - (item.profit / chartMax) * 180,
    };
  });
  const linePath = (key: "revenueY" | "expensesY" | "profitY") =>
    chartPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point[key]}`).join(" ");

  return (
    <div ref={exportRef} className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Accountant Dashboard</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Financial Analysis</h1>
          <p className="text-sm text-muted-foreground mt-1">Comprehensive financial performance analysis and ratio calculations.</p>
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
            onClick={() => exportAnalysis("pdf")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all"
          >
            <Download className="size-4" />
            Export PDF
          </button>
          <button
            onClick={() => exportAnalysis("png")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all"
          >
            <Eye className="size-4" />
            Export PNG
          </button>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-foreground">Analysis Period:</span>
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

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Net Profit</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(metrics?.netProfit || 0)}
              </p>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <TrendingUp className="size-3" />
                {formatPercentage(latestGrowth)} from last period
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
              <p className="text-sm text-muted-foreground font-medium">Profit Margin</p>
              <p className="text-2xl font-bold text-foreground">
                {metrics?.profitMargin?.toFixed(1) || 0}%
              </p>
              <p className="text-xs text-blue-600 mt-1">Industry avg: 15.2%</p>
            </div>
            <div className="size-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Percent className="size-6" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Current Ratio</p>
              <p className="text-2xl font-bold text-foreground">
                {metrics?.currentRatio?.toFixed(2) || 0}
              </p>
              <p className="text-xs text-purple-600 mt-1">Liquidity measure</p>
            </div>
            <div className="size-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
              <Activity className="size-6" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Cash Flow</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(cashFlow?.netCashFlow || 0)}
              </p>
              <p className="text-xs text-orange-600 mt-1">Operating cash flow</p>
            </div>
            <div className="size-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
              <TrendingUp className="size-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Financial Performance Chart */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-foreground">Profit & Loss Trends</h3>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="size-3 rounded-full bg-green-500"></div>
                <span>Revenue</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="size-3 rounded-full bg-red-500"></div>
                <span>Expenses</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="size-3 rounded-full bg-blue-500"></div>
                <span>Net Profit</span>
              </div>
            </div>
          </div>
          <LineChart className="size-5 text-muted-foreground" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 text-orange-500 animate-spin mx-auto" />
          </div>
        ) : chartPoints.length === 0 ? (
          <div className="flex h-80 items-center justify-center text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="size-12 mx-auto mb-4 opacity-50" />
              <p>No financial trend data available for this range</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <svg viewBox="0 0 800 260" className="h-80 w-full min-w-[720px]">
              {[0, 1, 2, 3].map((step) => (
                <line
                  key={step}
                  x1="40"
                  y1={40 + step * 45}
                  x2="760"
                  y2={40 + step * 45}
                  stroke="#E2E8F0"
                  strokeDasharray="4 6"
                />
              ))}
              <path d={linePath("revenueY")} fill="none" stroke="#22C55E" strokeWidth="3" />
              <path d={linePath("expensesY")} fill="none" stroke="#EF4444" strokeWidth="3" />
              <path d={linePath("profitY")} fill="none" stroke="#3B82F6" strokeWidth="3" />
              {chartPoints.map((point) => (
                <g key={point.label}>
                  <circle cx={point.x} cy={point.profitY} r="4" fill="#3B82F6" />
                  <text x={point.x} y="248" textAnchor="middle" className="fill-muted-foreground text-[10px]">
                    {point.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        )}
      </div>

      {/* Financial Ratios Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Financial Ratios</h3>
            <Calculator className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-4">
            {ratios.map(ratio => (
              <div key={ratio.name} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getRatioStatusColor(ratio.status)}`}>
                    {getRatioStatusIcon(ratio.status)}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{ratio.name}</p>
                    <p className="text-xs text-muted-foreground">{ratio.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">
                    {ratio.name.includes('Ratio') ? ratio.value.toFixed(2) : `${ratio.value.toFixed(1)}%`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Benchmark: {ratio.benchmark}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Cash Flow Statement</h3>
            <TrendingUp className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="size-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Operating Activities</span>
              </div>
              <span className="font-semibold text-green-800">
                {formatCurrency(cashFlow?.operating || 0)}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 rounded-lg bg-red-50 border border-red-200">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="size-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">Investing Activities</span>
              </div>
              <span className="font-semibold text-red-800">
                {formatCurrency(cashFlow?.investing || 0)}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="size-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Financing Activities</span>
              </div>
              <span className="font-semibold text-blue-800">
                {formatCurrency(cashFlow?.financing || 0)}
              </span>
            </div>

            <div className="border-t border-border pt-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-foreground">Net Cash Flow</span>
                <span className={`font-bold text-lg ${
                  (cashFlow?.netCashFlow || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(cashFlow?.netCashFlow || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Balance Sheet Summary */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">Balance Sheet Overview</h3>
          <Target className="size-5 text-muted-foreground" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-2">
              {formatCurrency(metrics?.accountsReceivable || 0)}
            </div>
            <p className="text-sm text-muted-foreground font-medium">Accounts Receivable</p>
            <p className="text-xs text-muted-foreground mt-1">Outstanding payments due</p>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 mb-2">
              {formatCurrency(metrics?.accountsPayable || 0)}
            </div>
            <p className="text-sm text-muted-foreground font-medium">Accounts Payable</p>
            <p className="text-xs text-muted-foreground mt-1">Outstanding payments owed</p>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-2">
              {metrics?.debtToEquity ? `${metrics.debtToEquity.toFixed(2)}:1` : 'N/A'}
            </div>
            <p className="text-sm text-muted-foreground font-medium">Debt-to-Equity Ratio</p>
            <p className="text-xs text-muted-foreground mt-1">Financial leverage measure</p>
          </div>
        </div>
      </div>

      {/* Financial Health Insights */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Financial Health Insights</h3>
          <Activity className="size-5 text-muted-foreground" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-start gap-3">
              <CheckCircle className="size-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-800">Strong Liquidity Position</p>
                <p className="text-sm text-green-700 mt-1">
                  Current ratio of {metrics?.currentRatio?.toFixed(2)} indicates good short-term financial health.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <TrendingUp className="size-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800">Positive Cash Flow</p>
                <p className="text-sm text-blue-700 mt-1">
                  Operating cash flow of {formatCurrency(cashFlow?.operating || 0)} supports business operations.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">Monitor Receivables</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Accounts receivable of {formatCurrency(metrics?.accountsReceivable || 0)} should be collected promptly.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-start gap-3">
              <Target className="size-5 text-purple-600 mt-0.5" />
              <div>
                <p className="font-medium text-purple-800">Profit Margin Analysis</p>
                <p className="text-sm text-purple-700 mt-1">
                  {metrics?.profitMargin?.toFixed(1)}% profit margin shows room for improvement compared to industry average.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
