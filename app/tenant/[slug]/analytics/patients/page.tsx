"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Users, TrendingUp, TrendingDown, PieChart, Activity,
  Calendar, Clock, RefreshCw, Download, Filter,
  ArrowUpRight, ArrowDownRight, Minus, Loader2,
  UserCheck, UserX, Heart, AlertTriangle
} from "lucide-react";

const orange = "#F97316";

interface PatientAnalytics {
  totalPatients: number;
  activePatients: number;
  newPatientsThisMonth: number;
  patientGrowth: number;
  avgAge: number;
  genderDistribution: {
    male: number;
    female: number;
    other: number;
  };
  ageGroups: {
    "0-18": number;
    "19-35": number;
    "36-55": number;
    "56+": number;
  };
  appointmentStats: {
    totalAppointments: number;
    completedAppointments: number;
    noShowRate: number;
    avgWaitTime: number;
  };
  healthMetrics: {
    avgLengthOfStay: number;
    readmissionRate: number;
    patientSatisfaction: number;
    chronicConditions: number;
  };
  monthlyTrends: Array<{
    month: string;
    newPatients: number;
    totalPatients: number;
    appointments: number;
  }>;
}

export default function PatientAnalyticsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [analytics, setAnalytics] = useState<PatientAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30d");

  useEffect(() => {
    fetchPatientAnalytics();
  }, [timeRange]);

  const fetchPatientAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/${slug}/analytics/patients?timeRange=${timeRange}`);
      if (res.ok) {
        setAnalytics(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch patient analytics:', error);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Patient Analytics</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Patient Insights & Demographics</h1>
          <p className="text-sm text-muted-foreground mt-1">Comprehensive patient data analysis and population health insights.</p>
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
            onClick={fetchPatientAnalytics}
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

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 text-orange-500 animate-spin mx-auto" />
        </div>
      ) : (
        <>
          {/* Key Patient Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Patients"
              value={analytics?.totalPatients || 0}
              change={12}
              changeType="positive"
              icon={<Users className="size-6" />}
              color="bg-blue-50 text-blue-600"
              subtitle={`${analytics?.activePatients || 0} currently active`}
            />
            <MetricCard
              title="New Patients"
              value={analytics?.newPatientsThisMonth || 0}
              change={8}
              changeType="positive"
              icon={<UserCheck className="size-6" />}
              color="bg-green-50 text-green-600"
              subtitle="This month"
            />
            <MetricCard
              title="Average Age"
              value={`${analytics?.avgAge || 0} years`}
              change={-2}
              changeType="positive"
              icon={<Heart className="size-6" />}
              color="bg-purple-50 text-purple-600"
              subtitle="Patient population"
            />
            <MetricCard
              title="Patient Satisfaction"
              value={`${analytics?.healthMetrics.patientSatisfaction || 0}%`}
              change={5}
              changeType="positive"
              icon={<TrendingUp className="size-6" />}
              color="bg-orange-50 text-orange-600"
              subtitle="Based on surveys"
            />
          </div>

          {/* Demographics & Health Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gender Distribution */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <PieChart className="size-5 text-orange-500" />
                Gender Distribution
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <span className="text-sm font-medium">Male</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{analytics?.genderDistribution.male || 0}%</span>
                    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${analytics?.genderDistribution.male || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <span className="text-sm font-medium">Female</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{analytics?.genderDistribution.female || 0}%</span>
                    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-pink-500 transition-all"
                        style={{ width: `${analytics?.genderDistribution.female || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <span className="text-sm font-medium">Other</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{analytics?.genderDistribution.other || 0}%</span>
                    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 transition-all"
                        style={{ width: `${analytics?.genderDistribution.other || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Age Groups */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="size-5 text-orange-500" />
                Age Distribution
              </h3>
              <div className="space-y-4">
                {Object.entries(analytics?.ageGroups || {}).map(([ageGroup, percentage]) => (
                  <div key={ageGroup} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <span className="text-sm font-medium">{ageGroup} years</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{percentage}%</span>
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Appointment & Health Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Appointment Statistics */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="size-5 text-orange-500" />
                Appointment Metrics
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Appointments</span>
                  <span className="text-sm font-semibold">{analytics?.appointmentStats.totalAppointments || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Completed</span>
                  <span className="text-sm font-semibold text-green-600">{analytics?.appointmentStats.completedAppointments || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">No-Show Rate</span>
                  <span className="text-sm font-semibold text-red-600">{analytics?.appointmentStats.noShowRate || 0}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg Wait Time</span>
                  <span className="text-sm font-semibold">{analytics?.appointmentStats.avgWaitTime || 0}min</span>
                </div>
              </div>
            </div>

            {/* Health Outcomes */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Heart className="size-5 text-orange-500" />
                Health Outcomes
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg Length of Stay</span>
                  <span className="text-sm font-semibold">{analytics?.healthMetrics.avgLengthOfStay || 0} days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Readmission Rate</span>
                  <span className="text-sm font-semibold text-yellow-600">{analytics?.healthMetrics.readmissionRate || 0}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Chronic Conditions</span>
                  <span className="text-sm font-semibold">{analytics?.healthMetrics.chronicConditions || 0}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Patient Satisfaction</span>
                  <span className="text-sm font-semibold text-green-600">{analytics?.healthMetrics.patientSatisfaction || 0}%</span>
                </div>
              </div>
            </div>

            {/* Patient Flow Trends */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="size-5 text-orange-500" />
                Monthly Trends
              </h3>
              <div className="space-y-3">
                {analytics?.monthlyTrends.slice(-3).map((trend) => (
                  <div key={trend.month} className="p-3 rounded-lg border border-border">
                    <p className="text-sm font-medium text-foreground">{trend.month}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">New Patients</span>
                      <span className="text-xs font-semibold text-green-600">+{trend.newPatients}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Appointments</span>
                      <span className="text-xs font-semibold text-blue-600">{trend.appointments}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Patient Care Quality Indicators */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="size-5 text-orange-500" />
              Care Quality Indicators
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">Excellent Care</span>
                </div>
                <p className="text-2xl font-bold text-green-600">87%</p>
                <p className="text-xs text-muted-foreground">Patient satisfaction &gt; 90%</p>
              </div>
              <div className="p-4 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-sm font-medium">Needs Attention</span>
                </div>
                <p className="text-2xl font-bold text-yellow-600">9%</p>
                <p className="text-xs text-muted-foreground">Readmission rate &gt; 15%</p>
              </div>
              <div className="p-4 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm font-medium">Preventive Care</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">76%</p>
                <p className="text-xs text-muted-foreground">Vaccination compliance</p>
              </div>
              <div className="p-4 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-sm font-medium">Chronic Management</span>
                </div>
                <p className="text-2xl font-bold text-purple-600">82%</p>
                <p className="text-xs text-muted-foreground">Controlled conditions</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
