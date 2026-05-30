"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Download,
  Filter,
  Heart,
  ImageDown,
  Loader2,
  Minus,
  PieChart,
  RefreshCw,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { exportElementAsJpeg, exportElementAsPdf, exportElementAsPng } from "@/lib/export/page-export";

type TimeRange = "7d" | "30d" | "90d" | "1y";

interface PatientAnalytics {
  generatedAt: string;
  timeRange: TimeRange;
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
  careQuality: {
    excellentCare: number;
    needsAttention: number;
    preventiveCare: number;
    chronicManagement: number;
  };
  monthlyTrends: Array<{
    month: string;
    newPatients: number;
    totalPatients: number;
    appointments: number;
  }>;
  topDiagnoses: Array<{ label: string; count: number }>;
}

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "1y": "Last year",
};

const EMPTY_ANALYTICS: PatientAnalytics = {
  generatedAt: new Date().toISOString(),
  timeRange: "30d",
  totalPatients: 0,
  activePatients: 0,
  newPatientsThisMonth: 0,
  patientGrowth: 0,
  avgAge: 0,
  genderDistribution: { male: 0, female: 0, other: 0 },
  ageGroups: { "0-18": 0, "19-35": 0, "36-55": 0, "56+": 0 },
  appointmentStats: { totalAppointments: 0, completedAppointments: 0, noShowRate: 0, avgWaitTime: 0 },
  healthMetrics: { avgLengthOfStay: 0, readmissionRate: 0, patientSatisfaction: 0, chronicConditions: 0 },
  careQuality: { excellentCare: 0, needsAttention: 0, preventiveCare: 0, chronicManagement: 0 },
  monthlyTrends: [],
  topDiagnoses: [],
};

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value || 0);
}

function formatPercent(value: number) {
  return `${Number(value || 0).toFixed(1).replace(".0", "")}%`;
}

function safeWidth(value: number) {
  return `${Math.max(0, Math.min(100, Number(value) || 0))}%`;
}

function fileSafeDate() {
  return new Date().toISOString().slice(0, 10);
}

function MetricCard({
  title,
  value,
  change,
  icon,
  color,
  subtitle,
}: {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}) {
  const changeType = !change ? "neutral" : change > 0 ? "positive" : "negative";

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className={`flex size-12 items-center justify-center rounded-xl ${color}`}>{icon}</div>
        {change !== undefined ? (
          <div className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${
            changeType === "positive"
              ? "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-300"
              : changeType === "negative"
                ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300"
                : "bg-muted text-muted-foreground"
          }`}>
            {changeType === "positive" ? <ArrowUpRight className="size-3" /> : changeType === "negative" ? <ArrowDownRight className="size-3" /> : <Minus className="size-3" />}
            {formatPercent(Math.abs(change))}
          </div>
        ) : null}
      </div>
      <h3 className="mb-1 text-sm font-medium text-muted-foreground">{title}</h3>
      <p className="mb-1 text-3xl font-bold text-foreground">{value}</p>
      {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

function DistributionRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm text-muted-foreground">{formatPercent(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: safeWidth(value) }} />
      </div>
    </div>
  );
}

export default function PatientAnalyticsPage() {
  const params = useParams();
  const slug = String(params?.slug || "");
  const reportRef = useRef<HTMLDivElement | null>(null);
  const [analytics, setAnalytics] = useState<PatientAnalytics>(EMPTY_ANALYTICS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "png" | "jpg" | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [error, setError] = useState<string | null>(null);

  const maxTrendValue = useMemo(
    () => Math.max(1, ...analytics.monthlyTrends.map((trend) => Math.max(trend.newPatients, trend.appointments))),
    [analytics.monthlyTrends],
  );

  const fetchPatientAnalytics = async (showRefresh = false) => {
    if (!slug) return;
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tenant/${slug}/analytics/patients?timeRange=${timeRange}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to fetch patient analytics");
      setAnalytics({ ...EMPTY_ANALYTICS, ...data });
    } catch (fetchError: any) {
      console.error("Failed to fetch patient analytics:", fetchError);
      setError(fetchError?.message || "Failed to fetch patient analytics");
      setAnalytics(EMPTY_ANALYTICS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchPatientAnalytics(false);
  }, [slug, timeRange]);

  const exportReport = async (format: "pdf" | "png" | "jpg") => {
    if (!reportRef.current) return;
    setExporting(format);
    const filename = `patient-analytics-${slug || "tenant"}-${TIME_RANGE_LABELS[timeRange].toLowerCase().replace(/\s+/g, "-")}-${fileSafeDate()}`;

    try {
      if (format === "pdf") await exportElementAsPdf(reportRef.current, `${filename}.pdf`);
      if (format === "png") await exportElementAsPng(reportRef.current, `${filename}.png`);
      if (format === "jpg") await exportElementAsJpeg(reportRef.current, `${filename}.jpg`);
    } catch (exportError) {
      console.error("Failed to export patient analytics:", exportError);
      setError("Failed to export report. Try again.");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Patient Analytics</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">Patient Insights & Demographics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time patient-role population, appointment, demographic, and care-quality analytics.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchPatientAnalytics(true)}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-60"
        >
          <RefreshCw className={`size-4 ${refreshing || loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 rounded-xl border border-border bg-card p-3">
        <div className="mr-auto flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="size-4" />
          <span>Report filters and exports</span>
        </div>
        <select
          value={timeRange}
          onChange={(event) => setTimeRange(event.target.value as TimeRange)}
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:border-orange-300"
        >
          {Object.entries(TIME_RANGE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => exportReport("pdf")}
          disabled={loading || Boolean(exporting)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {exporting === "pdf" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Export Report
        </button>
        <button
          type="button"
          onClick={() => exportReport("png")}
          disabled={loading || Boolean(exporting)}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
        >
          {exporting === "png" ? <Loader2 className="size-4 animate-spin" /> : <ImageDown className="size-4" />}
          PNG
        </button>
        <button
          type="button"
          onClick={() => exportReport("jpg")}
          disabled={loading || Boolean(exporting)}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
        >
          {exporting === "jpg" ? <Loader2 className="size-4 animate-spin" /> : <ImageDown className="size-4" />}
          JPG
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-orange-500" />
        </div>
      ) : (
        <div ref={reportRef} className="space-y-6 bg-background">
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Showing {TIME_RANGE_LABELS[timeRange].toLowerCase()} for tenant patient-role users only. Generated {new Date(analytics.generatedAt).toLocaleString()}.
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Patients"
              value={formatNumber(analytics.totalPatients)}
              change={analytics.patientGrowth}
              icon={<Users className="size-6" />}
              color="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"
              subtitle={`${formatNumber(analytics.activePatients)} currently active`}
            />
            <MetricCard
              title="New Patients"
              value={formatNumber(analytics.newPatientsThisMonth)}
              change={analytics.patientGrowth}
              icon={<UserCheck className="size-6" />}
              color="bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-300"
              subtitle={TIME_RANGE_LABELS[timeRange]}
            />
            <MetricCard
              title="Average Age"
              value={`${analytics.avgAge || 0} years`}
              icon={<Heart className="size-6" />}
              color="bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-300"
              subtitle="Based on recorded DOB"
            />
            <MetricCard
              title="Patient Satisfaction"
              value={formatPercent(analytics.healthMetrics.patientSatisfaction)}
              icon={<TrendingUp className="size-6" />}
              color="bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300"
              subtitle="Resolved patient feedback rate"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <PieChart className="size-5 text-orange-500" />
                Gender Distribution
              </h3>
              <div className="space-y-3">
                <DistributionRow label="Male" value={analytics.genderDistribution.male} color="bg-blue-500" />
                <DistributionRow label="Female" value={analytics.genderDistribution.female} color="bg-pink-500" />
                <DistributionRow label="Other / Not recorded" value={analytics.genderDistribution.other} color="bg-purple-500" />
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <Activity className="size-5 text-orange-500" />
                Age Distribution
              </h3>
              <div className="space-y-3">
                {Object.entries(analytics.ageGroups).map(([ageGroup, percentage]) => (
                  <DistributionRow key={ageGroup} label={`${ageGroup} years`} value={percentage} color="bg-green-500" />
                ))}
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <Calendar className="size-5 text-orange-500" />
                Appointment Metrics
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Total Appointments</span><span className="text-sm font-semibold">{formatNumber(analytics.appointmentStats.totalAppointments)}</span></div>
                <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Completed</span><span className="text-sm font-semibold text-green-600">{formatNumber(analytics.appointmentStats.completedAppointments)}</span></div>
                <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">No-Show Rate</span><span className="text-sm font-semibold text-red-600">{formatPercent(analytics.appointmentStats.noShowRate)}</span></div>
                <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Avg Wait Time</span><span className="text-sm font-semibold">{analytics.appointmentStats.avgWaitTime || 0} min</span></div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <Heart className="size-5 text-orange-500" />
                Health Outcomes
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Avg Length of Stay</span><span className="text-sm font-semibold">{analytics.healthMetrics.avgLengthOfStay || 0} days</span></div>
                <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Readmission Rate</span><span className="text-sm font-semibold text-yellow-600">{formatPercent(analytics.healthMetrics.readmissionRate)}</span></div>
                <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Chronic Conditions</span><span className="text-sm font-semibold">{formatPercent(analytics.healthMetrics.chronicConditions)}</span></div>
                <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Patient Satisfaction</span><span className="text-sm font-semibold text-green-600">{formatPercent(analytics.healthMetrics.patientSatisfaction)}</span></div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <TrendingUp className="size-5 text-orange-500" />
                Monthly Trends
              </h3>
              <div className="space-y-3">
                {analytics.monthlyTrends.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No monthly trend data available.</p>
                ) : (
                  analytics.monthlyTrends.slice(-4).map((trend) => (
                    <div key={trend.month} className="rounded-lg border border-border p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">{trend.month}</p>
                        <span className="text-xs text-muted-foreground">{formatNumber(trend.totalPatients)} total</span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <div className="mb-1 flex justify-between text-xs"><span>New patients</span><span className="font-semibold text-green-600">+{formatNumber(trend.newPatients)}</span></div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-green-500" style={{ width: `${(trend.newPatients / maxTrendValue) * 100}%` }} /></div>
                        </div>
                        <div>
                          <div className="mb-1 flex justify-between text-xs"><span>Appointments</span><span className="font-semibold text-blue-600">{formatNumber(trend.appointments)}</span></div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-blue-500" style={{ width: `${(trend.appointments / maxTrendValue) * 100}%` }} /></div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
            <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <AlertTriangle className="size-5 text-orange-500" />
                Care Quality Indicators
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  ["Excellent Care", analytics.careQuality.excellentCare, "bg-green-500", "Resolved patient feedback"],
                  ["Needs Attention", analytics.careQuality.needsAttention, "bg-yellow-500", "Open patient feedback"],
                  ["Preventive Care", analytics.careQuality.preventiveCare, "bg-blue-500", "No structured source yet"],
                  ["Chronic Management", analytics.careQuality.chronicManagement, "bg-purple-500", "Patients with recorded conditions"],
                ].map(([label, value, dot, subtitle]) => (
                  <div key={String(label)} className="rounded-lg border border-border p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <div className={`size-3 rounded-full ${dot}`} />
                      <span className="text-sm font-medium text-foreground">{label}</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{formatPercent(Number(value))}</p>
                    <p className="text-xs text-muted-foreground">{subtitle}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <Activity className="size-5 text-orange-500" />
                Top Diagnoses & Conditions
              </h3>
              <div className="space-y-3">
                {analytics.topDiagnoses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No diagnoses or patient conditions recorded for this tenant yet.</p>
                ) : (
                  analytics.topDiagnoses.map((item, index) => (
                    <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{index + 1}</span>
                        <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                      </div>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">{formatNumber(item.count)} cases</span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
