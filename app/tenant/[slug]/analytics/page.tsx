"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  BarChart3, TrendingUp, TrendingDown, PieChart, Activity,
  Users, DollarSign, Calendar, Clock, RefreshCw, Download,
  Filter, Eye, Settings, AlertTriangle, CheckCircle,
  ArrowUpRight, ArrowDownRight, Minus, Loader2
} from "lucide-react";
import Link from "next/link";

const orange = "#F97316";

interface AnalyticsData {
  patientMetrics: {
    totalPatients: number;
    newPatientsThisMonth: number;
    patientGrowth: number;
    avgLengthOfStay: number;
    readmissionRate: number;
  };
  financialMetrics: {
    totalRevenue: number;
    monthlyRevenue: number;
    revenueGrowth: number;
    averageRevenuePerPatient: number;
    outstandingInvoices: number;
  };
  operationalMetrics: {
    averageWaitTime: number;
    bedOccupancyRate: number;
    staffUtilization: number;
    appointmentFillRate: number;
    emergencyResponseTime: number;
  };
  qualityMetrics: {
    patientSatisfaction: number;
    infectionRate: number;
    medicationErrorRate: number;
    mortalityRate: number;
  };
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }>;
}

export default function AnalyticsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30d");
  const [activeTab, setActiveTab] = useState<"overview" | "patients" | "financial" | "operations" | "quality">("overview");

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?timeRange=${timeRange}`);
      if (res.ok) {
        setAnalyticsData(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "patients", label: "Patients", icon: Users },
    { id: "financial", label: "Financial", icon: DollarSign },
    { id: "operations", label: "Operations", icon: Activity },
    { id: "quality", label: "Quality", icon: CheckCircle }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Analytics & Insights</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Hospital Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Comprehensive data analysis and performance insights.</p>
        </div>
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button
            onClick={fetchAnalyticsData}
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
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="Total Patients"
                  value={analyticsData?.patientMetrics.totalPatients || 0}
                  change={12}
                  changeType="positive"
                  icon={<Users className="size-6" />}
                  color="bg-blue-50 text-blue-600"
                  subtitle={`${analyticsData?.patientMetrics.newPatientsThisMonth || 0} new this month`}
                />
                <MetricCard
                  title="Revenue"
                  value={`$${(analyticsData?.financialMetrics.totalRevenue || 0).toLocaleString()}`}
                  change={8}
                  changeType="positive"
                  icon={<DollarSign className="size-6" />}
                  color="bg-green-50 text-green-600"
                  subtitle={`${analyticsData?.financialMetrics.revenueGrowth || 0}% growth`}
                />
                <MetricCard
                  title="Bed Occupancy"
                  value={`${analyticsData?.operationalMetrics.bedOccupancyRate || 0}%`}
                  change={-2}
                  changeType="negative"
                  icon={<Activity className="size-6" />}
                  color="bg-orange-50 text-orange-600"
                  subtitle="Current utilization"
                />
                <MetricCard
                  title="Patient Satisfaction"
                  value={`${analyticsData?.qualityMetrics.patientSatisfaction || 0}%`}
                  change={5}
                  changeType="positive"
                  icon={<CheckCircle className="size-6" />}
                  color="bg-purple-50 text-purple-600"
                  subtitle="Based on surveys"
                />
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4">Patient Volume Trends</h3>
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="size-12 mx-auto mb-2" />
                      <p>Patient volume chart</p>
                      <p className="text-xs">Interactive charts coming soon</p>
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4">Revenue Breakdown</h3>
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <PieChart className="size-12 mx-auto mb-2" />
                      <p>Revenue distribution chart</p>
                      <p className="text-xs">Interactive charts coming soon</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Indicators */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Key Performance Indicators</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Clinical Quality</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Infection Rate</span>
                        <span className="text-sm font-semibold">{analyticsData?.qualityMetrics.infectionRate || 0}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Medication Errors</span>
                        <span className="text-sm font-semibold">{analyticsData?.qualityMetrics.medicationErrorRate || 0}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Mortality Rate</span>
                        <span className="text-sm font-semibold">{analyticsData?.qualityMetrics.mortalityRate || 0}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Operational Efficiency</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Avg Wait Time</span>
                        <span className="text-sm font-semibold">{analyticsData?.operationalMetrics.averageWaitTime || 0}min</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Staff Utilization</span>
                        <span className="text-sm font-semibold">{analyticsData?.operationalMetrics.staffUtilization || 0}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Appointment Fill Rate</span>
                        <span className="text-sm font-semibold">{analyticsData?.operationalMetrics.appointmentFillRate || 0}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Financial Performance</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Avg Revenue/Patient</span>
                        <span className="text-sm font-semibold">${analyticsData?.financialMetrics.averageRevenuePerPatient || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Outstanding Invoices</span>
                        <span className="text-sm font-semibold">${(analyticsData?.financialMetrics.outstandingInvoices || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Monthly Growth</span>
                        <span className="text-sm font-semibold text-green-600">+{analyticsData?.financialMetrics.revenueGrowth || 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "patients" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="Total Patients"
                  value={analyticsData?.patientMetrics.totalPatients || 0}
                  change={12}
                  changeType="positive"
                  icon={<Users className="size-6" />}
                  color="bg-blue-50 text-blue-600"
                />
                <MetricCard
                  title="New Patients"
                  value={analyticsData?.patientMetrics.newPatientsThisMonth || 0}
                  change={8}
                  changeType="positive"
                  icon={<TrendingUp className="size-6" />}
                  color="bg-green-50 text-green-600"
                  subtitle="This month"
                />
                <MetricCard
                  title="Avg Length of Stay"
                  value={`${analyticsData?.patientMetrics.avgLengthOfStay || 0} days`}
                  change={-3}
                  changeType="positive"
                  icon={<Clock className="size-6" />}
                  color="bg-orange-50 text-orange-600"
                />
                <MetricCard
                  title="Readmission Rate"
                  value={`${analyticsData?.patientMetrics.readmissionRate || 0}%`}
                  change={-2}
                  changeType="positive"
                  icon={<AlertTriangle className="size-6" />}
                  color="bg-red-50 text-red-600"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4">Patient Demographics</h3>
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <PieChart className="size-12 mx-auto mb-2" />
                    <p>Demographics chart coming soon</p>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4">Patient Flow</h3>
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <Activity className="size-12 mx-auto mb-2" />
                    <p>Patient flow analysis coming soon</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "financial" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="Total Revenue"
                  value={`$${(analyticsData?.financialMetrics.totalRevenue || 0).toLocaleString()}`}
                  change={8}
                  changeType="positive"
                  icon={<DollarSign className="size-6" />}
                  color="bg-green-50 text-green-600"
                />
                <MetricCard
                  title="Monthly Revenue"
                  value={`$${(analyticsData?.financialMetrics.monthlyRevenue || 0).toLocaleString()}`}
                  change={12}
                  changeType="positive"
                  icon={<TrendingUp className="size-6" />}
                  color="bg-blue-50 text-blue-600"
                />
                <MetricCard
                  title="Avg Revenue/Patient"
                  value={`$${analyticsData?.financialMetrics.averageRevenuePerPatient || 0}`}
                  change={5}
                  changeType="positive"
                  icon={<Users className="size-6" />}
                  color="bg-purple-50 text-purple-600"
                />
                <MetricCard
                  title="Outstanding"
                  value={`$${(analyticsData?.financialMetrics.outstandingInvoices || 0).toLocaleString()}`}
                  change={-10}
                  changeType="positive"
                  icon={<AlertTriangle className="size-6" />}
                  color="bg-red-50 text-red-600"
                />
              </div>

              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Revenue Trends</h3>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <BarChart3 className="size-12 mx-auto mb-2" />
                  <p>Revenue trends chart coming soon</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "operations" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="Avg Wait Time"
                  value={`${analyticsData?.operationalMetrics.averageWaitTime || 0}min`}
                  change={-5}
                  changeType="positive"
                  icon={<Clock className="size-6" />}
                  color="bg-blue-50 text-blue-600"
                />
                <MetricCard
                  title="Bed Occupancy"
                  value={`${analyticsData?.operationalMetrics.bedOccupancyRate || 0}%`}
                  change={2}
                  changeType="negative"
                  icon={<Activity className="size-6" />}
                  color="bg-orange-50 text-orange-600"
                />
                <MetricCard
                  title="Staff Utilization"
                  value={`${analyticsData?.operationalMetrics.staffUtilization || 0}%`}
                  change={3}
                  changeType="positive"
                  icon={<Users className="size-6" />}
                  color="bg-green-50 text-green-600"
                />
                <MetricCard
                  title="Emergency Response"
                  value={`${analyticsData?.operationalMetrics.emergencyResponseTime || 0}min`}
                  change={-2}
                  changeType="positive"
                  icon={<AlertTriangle className="size-6" />}
                  color="bg-red-50 text-red-600"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4">Department Utilization</h3>
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <BarChart3 className="size-12 mx-auto mb-2" />
                    <p>Utilization chart coming soon</p>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4">Appointment Fill Rate</h3>
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <TrendingUp className="size-12 mx-auto mb-2" />
                    <p>Fill rate trends coming soon</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "quality" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="Patient Satisfaction"
                  value={`${analyticsData?.qualityMetrics.patientSatisfaction || 0}%`}
                  change={5}
                  changeType="positive"
                  icon={<CheckCircle className="size-6" />}
                  color="bg-green-50 text-green-600"
                />
                <MetricCard
                  title="Infection Rate"
                  value={`${analyticsData?.qualityMetrics.infectionRate || 0}%`}
                  change={-1}
                  changeType="positive"
                  icon={<AlertTriangle className="size-6" />}
                  color="bg-red-50 text-red-600"
                />
                <MetricCard
                  title="Medication Errors"
                  value={`${analyticsData?.qualityMetrics.medicationErrorRate || 0}%`}
                  change={-0.5}
                  changeType="positive"
                  icon={<Activity className="size-6" />}
                  color="bg-orange-50 text-orange-600"
                />
                <MetricCard
                  title="Mortality Rate"
                  value={`${analyticsData?.qualityMetrics.mortalityRate || 0}%`}
                  change={-0.2}
                  changeType="positive"
                  icon={<TrendingDown className="size-6" />}
                  color="bg-blue-50 text-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4">Quality Metrics Over Time</h3>
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <TrendingUp className="size-12 mx-auto mb-2" />
                    <p>Quality trends chart coming soon</p>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4">Quality Benchmarks</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <span className="text-sm font-medium">Patient Satisfaction</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Target: 95%</span>
                        <span className="text-sm font-semibold text-green-600">✓ Met</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <span className="text-sm font-medium">Infection Rate</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Target: &lt;2%</span>
                        <span className="text-sm font-semibold text-green-600">✓ Met</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <span className="text-sm font-medium">Readmission Rate</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Target: &lt;15%</span>
                        <span className="text-sm font-semibold text-yellow-600">⚠ Close</span>
                      </div>
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
