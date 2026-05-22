"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  TrendingUp, DollarSign, Calendar, Download, Filter,
  BarChart3, PieChart, LineChart, RefreshCw, Loader2,
  ArrowUpRight, ArrowDownRight, Minus, Target, Zap, Clock
} from "lucide-react";

const orange = "#F97316";

interface RevenueData {
  totalRevenue: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  averageTransaction: number;
  topServices: Array<{
    name: string;
    revenue: number;
    percentage: number;
    growth: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    revenue: number;
    transactions: number;
    growth: number;
  }>;
  paymentMethods: Array<{
    method: string;
    amount: number;
    percentage: number;
    count: number;
  }>;
  departmentRevenue: Array<{
    department: string;
    revenue: number;
    patients: number;
    avgRevenuePerPatient: number;
  }>;
  outstandingInvoices: number;
  collectionRate: number;
  averagePaymentTime: number;
}

export default function RevenueReportsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("12m");
  const [activeTab, setActiveTab] = useState<"overview" | "services" | "departments" | "payments">("overview");

  useEffect(() => {
    fetchRevenueData();
  }, [timeRange]);

  const fetchRevenueData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/${slug}/analytics/revenue?timeRange=${timeRange}`);
      if (res.ok) {
        setRevenueData(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "services", label: "By Service", icon: PieChart },
    { id: "departments", label: "By Department", icon: LineChart },
    { id: "payments", label: "Payment Methods", icon: DollarSign }
  ];

  const MetricCard = ({
    title,
    value,
    change,
    changeType,
    icon: Icon,
    color,
    subtitle
  }: {
    title: string;
    value: string | number;
    change?: number;
    changeType?: "positive" | "negative" | "neutral";
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
  }) => (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`size-12 rounded-xl ${color} flex items-center justify-center`}>
          {Icon}
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
            changeType === "positive"
              ? "text-green-600 bg-green-50"
              : changeType === "negative"
              ? "text-red-600 bg-red-50"
              : "text-gray-600 bg-gray-50"
          }`}>
            {changeType === "positive" ? <ArrowUpRight className="size-3" /> :
             changeType === "negative" ? <ArrowDownRight className="size-3" /> :
             <Minus className="size-3" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium text-muted-foreground mb-1">{title}</h3>
      <p className="text-3xl font-bold text-foreground mb-1">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Reports</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Revenue Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Comprehensive financial analytics and revenue insights.</p>
        </div>
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300"
          >
            <option value="3m">Last 3 months</option>
            <option value="6m">Last 6 months</option>
            <option value="12m">Last 12 months</option>
            <option value="1y">Last year</option>
          </select>
          <button
            onClick={fetchRevenueData}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all"
          >
            <RefreshCw className="size-4" />
            Refresh
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90" style={{ backgroundColor: orange }}>
            <Download className="size-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="size-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 text-orange-500 animate-spin mx-auto" />
        </div>
      ) : (
        <>
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Key Revenue Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="Total Revenue"
                  value={`$${(revenueData?.totalRevenue || 0).toLocaleString()}`}
                  change={12}
                  changeType="positive"
                  icon={<DollarSign className="size-6" />}
                  color="bg-green-50 text-green-600"
                  subtitle={`${timeRange} period`}
                />
                <MetricCard
                  title="Monthly Revenue"
                  value={`$${(revenueData?.monthlyRevenue || 0).toLocaleString()}`}
                  change={8}
                  changeType="positive"
                  icon={<TrendingUp className="size-6" />}
                  color="bg-blue-50 text-blue-600"
                  subtitle="Average per month"
                />
                <MetricCard
                  title="Collection Rate"
                  value={`${revenueData?.collectionRate || 0}%`}
                  change={5}
                  changeType="positive"
                  icon={<Target className="size-6" />}
                  color="bg-purple-50 text-purple-600"
                  subtitle="Payments collected"
                />
                <MetricCard
                  title="Outstanding"
                  value={`$${(revenueData?.outstandingInvoices || 0).toLocaleString()}`}
                  change={-10}
                  changeType="positive"
                  icon={<Calendar className="size-6" />}
                  color="bg-red-50 text-red-600"
                  subtitle="Pending collection"
                />
              </div>

              {/* Revenue Trends */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <LineChart className="size-5 text-orange-500" />
                    Monthly Revenue Trends
                  </h3>
                  <div className="space-y-4">
                    {revenueData?.monthlyTrends.map((trend) => (
                      <div key={trend.month} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div>
                          <p className="font-medium text-foreground">{trend.month}</p>
                          <p className="text-sm text-muted-foreground">{trend.transactions} transactions</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">${trend.revenue.toLocaleString()}</p>
                          <p className={`text-sm ${trend.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {trend.growth >= 0 ? '+' : ''}{trend.growth}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <PieChart className="size-5 text-orange-500" />
                    Top Revenue Sources
                  </h3>
                  <div className="space-y-4">
                    {revenueData?.topServices.map((service) => (
                      <div key={service.name} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{service.name}</p>
                          <div className="w-full bg-gray-200 h-2 rounded-full mt-2">
                            <div
                              className="h-full bg-orange-500 rounded-full transition-all"
                              style={{ width: `${service.percentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-semibold text-foreground">${service.revenue.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">{service.percentage}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Payment Analytics */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="size-5 text-orange-500" />
                  Payment Method Distribution
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {revenueData?.paymentMethods.map((method) => (
                    <div key={method.method} className="p-4 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-foreground">{method.method}</span>
                        <span className="text-sm text-muted-foreground">{method.count} transactions</span>
                      </div>
                      <p className="text-2xl font-bold text-foreground">${method.amount.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{method.percentage}% of total</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "services" && (
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-6 border-b border-border">
                  <h3 className="font-semibold text-foreground">Revenue by Service</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Revenue</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Percentage</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Growth</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {revenueData?.topServices.map((service) => (
                        <tr key={service.name} className="hover:bg-muted/50">
                          <td className="px-6 py-4 font-medium text-foreground">{service.name}</td>
                          <td className="px-6 py-4 font-semibold">${service.revenue.toLocaleString()}</td>
                          <td className="px-6 py-4">{service.percentage}%</td>
                          <td className="px-6 py-4">
                            <span className={`flex items-center gap-1 ${service.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {service.growth >= 0 ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                              {Math.abs(service.growth)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "departments" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {revenueData?.departmentRevenue.map((dept) => (
                  <div key={dept.department} className="bg-card border border-border rounded-xl p-6">
                    <h3 className="font-semibold text-foreground mb-4">{dept.department}</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total Revenue</span>
                        <span className="font-semibold text-foreground">${dept.revenue.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Patients Served</span>
                        <span className="font-semibold text-foreground">{dept.patients}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Avg Revenue/Patient</span>
                        <span className="font-semibold text-foreground">${dept.avgRevenuePerPatient}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "payments" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4">Payment Method Performance</h3>
                  <div className="space-y-4">
                    {revenueData?.paymentMethods.map((method) => (
                      <div key={method.method} className="p-4 rounded-lg border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-foreground">{method.method}</span>
                          <span className="text-sm text-muted-foreground">{method.count} transactions</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">${method.amount.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{method.percentage}% of total revenue</p>
                        <div className="w-full bg-gray-200 h-2 rounded-full mt-2">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${method.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4">Collection Metrics</h3>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="size-4 text-green-600" />
                        <span className="font-medium text-foreground">Collection Rate</span>
                      </div>
                      <p className="text-3xl font-bold text-green-600">{revenueData?.collectionRate}%</p>
                      <p className="text-sm text-muted-foreground">Of billed amounts collected</p>
                    </div>

                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="size-4 text-blue-600" />
                        <span className="font-medium text-foreground">Average Payment Time</span>
                      </div>
                      <p className="text-3xl font-bold text-blue-600">{revenueData?.averagePaymentTime} days</p>
                      <p className="text-sm text-muted-foreground">From service to payment</p>
                    </div>

                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="size-4 text-orange-600" />
                        <span className="font-medium text-foreground">Outstanding Invoices</span>
                      </div>
                      <p className="text-3xl font-bold text-orange-600">${(revenueData?.outstandingInvoices || 0).toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Pending collection</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}