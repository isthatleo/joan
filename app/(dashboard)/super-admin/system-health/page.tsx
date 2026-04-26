"use client";

import { useEffect, useState } from "react";
import {
  PageHeader,
  StatCard,
  SectionCard,
  StatusPill,
  Skeleton,
} from "@/components/ui";
import {
  Activity,
  Database,
  Server,
  Cpu,
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap,
  HardDrive,
} from "lucide-react";

interface ServiceStatus {
  status: "up" | "down" | "degraded";
  latency: number;
  name?: string;
}

interface HealthStatus {
  status: "operational" | "degraded" | "down" | "error";
  services: Record<string, ServiceStatus>;
  uptime: string;
  timestamp: string;
  version: string;
}

const SERVICE_ICONS = {
  database: Database,
  api: Server,
  redis: Zap,
  storage: HardDrive,
};

export default function SystemHealthPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch health status
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/health");
        if (res.ok) {
          const data = await res.json();
          setHealth(data);
          setLastUpdate(new Date());
        }
      } catch (error) {
        console.error("Failed to fetch health status:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();

    // Refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const statusTone = health
    ? health.status === "operational"
      ? "success"
      : health.status === "degraded"
      ? "warning"
      : "destructive"
    : "info";

  const getServiceIcon = (key: string) => {
    return (SERVICE_ICONS as any)[key] || Activity;
  };

  return (
    <div>
      <PageHeader
        title="System Health"
        subtitle="Real-time infrastructure status and performance metrics"
        actions={
          <span className="text-xs text-muted-foreground">
            Last update: {lastUpdate?.toLocaleTimeString() || "—"}
          </span>
        }
      />

      {/* Overall Status */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : health ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="System Status"
              value={health.status.charAt(0).toUpperCase() + health.status.slice(1)}
              subtitle="Current state"
              icon={Activity}
              tone={statusTone as any}
            />
            <StatCard
              title="Uptime"
              value={health.uptime}
              subtitle="30-day SLA"
              icon={CheckCircle2}
              tone="success"
            />
            <StatCard
              title="Version"
              value={health.version}
              subtitle="Current release"
              icon={Server}
              tone="info"
            />
            <StatCard
              title="Last Check"
              value={lastUpdate?.toLocaleTimeString() || "—"}
              subtitle="Monitoring active"
              icon={Clock}
              tone="primary"
            />
          </div>

          {/* Services Grid */}
          <SectionCard
            title="Service Status"
            description="Real-time service health monitoring"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(health.services).map(([key, service]) => {
                const Icon = getServiceIcon(key);
                const isUp = service.status === "up";
                const tone = isUp ? "success" : service.status === "degraded" ? "warning" : "destructive";

                return (
                  <div
                    key={key}
                    className="rounded-lg border border-border p-4 hover:bg-muted/30 transition"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          tone === "success"
                            ? "bg-success-soft text-success-soft-foreground"
                            : tone === "warning"
                            ? "bg-warning-soft text-warning-soft-foreground"
                            : "bg-destructive-soft text-destructive-soft-foreground"
                        }`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {service.name || key.charAt(0).toUpperCase() + key.slice(1)}
                          </p>
                          <StatusPill tone={tone}>
                            {service.status === "up" && <CheckCircle2 className="h-3 w-3" />}
                            {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                          </StatusPill>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Response Time</span>
                        <span className="font-mono font-medium text-foreground">
                          {service.latency >= 0 ? `${service.latency}ms` : "N/A"}
                        </span>
                      </div>

                      {/* Latency indicator */}
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full ${
                            service.latency > 100
                              ? "bg-destructive"
                              : service.latency > 50
                              ? "bg-warning"
                              : "bg-success"
                          }`}
                          style={{
                            width: `${Math.min(100, (service.latency / 200) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* Alerts */}
          {health.status !== "operational" && (
            <SectionCard
              title="Active Alerts"
              description={`${Object.values(health.services).filter(s => s.status !== "up").length} issue(s) detected`}
              className="mt-6"
            >
              <div className="space-y-2">
                {Object.entries(health.services)
                  .filter(([_, service]) => service.status !== "up")
                  .map(([key, service]) => (
                    <div
                      key={key}
                      className="flex items-center gap-3 rounded-lg border border-destructive-soft bg-destructive-soft/10 p-3"
                    >
                      <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {service.name || key.charAt(0).toUpperCase() + key.slice(1)} {service.status}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Last checked: {lastUpdate?.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </SectionCard>
          )}
        </>
      ) : (
        <SectionCard title="Health Status">
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-muted-foreground">Failed to load health status</p>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

