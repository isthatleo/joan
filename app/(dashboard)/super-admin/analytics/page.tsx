"use client";

import {
  PageHeader,
  StatCard,
  SectionCard,
} from "@/components/ui";
import {
  TrendingUp,
  Users,
  Hospital,
  DollarSign,
  Calendar,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

export default function SuperAdminAnalytics() {
  return (
    <div>
      <PageHeader
        title="System Analytics"
        subtitle="Platform-wide performance and usage insights"
      />

      {/* Top KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Users"
          value="1,234"
          subtitle="All accounts"
          icon={Users}
          tone="info"
          trend={{ value: "+23%", direction: "up" }}
        />
        <StatCard
          title="Active Hospitals"
          value="24"
          subtitle="Currently operational"
          icon={Hospital}
          tone="primary"
          trend={{ value: "+3 this quarter", direction: "up" }}
        />
        <StatCard
          title="Monthly Revenue"
          value="$2.4M"
          subtitle="Recurring + one-off"
          icon={DollarSign}
          tone="success"
          trend={{ value: "+18%", direction: "up" }}
        />
        <StatCard
          title="Active Appointments"
          value="892"
          subtitle="Today across tenants"
          icon={Calendar}
          tone="warning"
          trend={{ value: "+12%", direction: "up" }}
        />
      </div>

      {/* Growth + Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <SectionCard title="User Growth" description="Last 6 months">
          <div className="space-y-4">
            {[
              { month: "January", value: 45, total: 540 },
              { month: "February", value: 62, total: 744 },
              { month: "March", value: 73, total: 876 },
              { month: "April", value: 81, total: 972 },
              { month: "May", value: 92, total: 1104 },
              { month: "June", value: 100, total: 1234 },
            ].map((data, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-foreground">{data.month}</p>
                  <p className="text-sm font-semibold text-foreground">{data.total.toLocaleString()}</p>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-info"
                    style={{ width: `${data.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Hospital Distribution" description="By subscription tier">
          <div className="space-y-3">
            {[
              { tier: "Enterprise", count: 4, percentage: 17 },
              { tier: "Professional", count: 8, percentage: 33 },
              { tier: "Standard", count: 9, percentage: 38 },
              { tier: "Basic", count: 3, percentage: 12 },
            ].map((tier, idx) => (
              <div key={idx} className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">{tier.tier}</span>
                  <span className="text-sm font-semibold text-foreground">{tier.count} hospitals</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${tier.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{tier.percentage}% of total</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Revenue */}
      <SectionCard title="Revenue Trends" description="Comparative period view" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "This Month", value: "$425K", change: "+15%", direction: "up" as const },
            { label: "Last Month", value: "$370K", change: "+8%", direction: "up" as const },
            { label: "YTD Total", value: "$2.1M", change: "+23%", direction: "up" as const },
          ].map((stat, idx) => (
            <div key={idx} className="rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground mb-2">{stat.label}</p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm font-semibold text-success">
                    {stat.change} from previous
                  </p>
                </div>
                {stat.direction === "up" ? (
                  <ArrowUpRight className="h-6 w-6 text-success" />
                ) : (
                  <ArrowDownRight className="h-6 w-6 text-destructive" />
                )}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Engagement & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Engagement Metrics" description="Last 30 days">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Avg Session", value: "12m 34s", tone: "info" as const, icon: Activity },
              { label: "Daily Active", value: "8,234", tone: "primary" as const, icon: Users },
              { label: "API Latency", value: "145ms", tone: "success" as const, icon: TrendingUp },
              { label: "Error Rate", value: "0.12%", tone: "warning" as const, icon: Activity },
            ].map((m, idx) => (
              <StatCard
                key={idx}
                title={m.label}
                value={m.value}
                icon={m.icon}
                tone={m.tone}
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Top Performing Tenants" description="By patient volume">
          <div className="space-y-2">
            {[
              { name: "City Medical Center", patients: 1247, growth: "+8%" },
              { name: "County Hospital", patients: 892, growth: "+5%" },
              { name: "Medical University", patients: 567, growth: "+12%" },
              { name: "Private Clinic", patients: 234, growth: "+3%" },
              { name: "Wellness Center", patients: 189, growth: "+15%" },
            ].map((t, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
                    <Hospital className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.patients.toLocaleString()} patients</p>
                  </div>
                </div>
                <span className="rounded-md bg-success-soft px-2 py-0.5 text-xs font-medium text-success-soft-foreground">
                  {t.growth}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
