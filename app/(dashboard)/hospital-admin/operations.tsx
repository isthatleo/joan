"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Zap,
  BarChart3,
} from "lucide-react";

export default function OperationsDashboard() {
  const systemStatus = [
    {
      name: "Patient Management",
      status: "operational",
      uptime: "99.9%",
      lastChecked: "2 min ago",
    },
    {
      name: "Billing System",
      status: "operational",
      uptime: "99.8%",
      lastChecked: "1 min ago",
    },
    {
      name: "Lab Integration",
      status: "operational",
      uptime: "99.7%",
      lastChecked: "3 min ago",
    },
    {
      name: "Pharmacy System",
      status: "degraded",
      uptime: "98.5%",
      lastChecked: "now",
    },
  ];

  const incidents = [
    {
      id: 1,
      title: "High Server Load",
      description: "Database server experiencing high load",
      severity: "warning",
      status: "investigating",
      time: "45 min ago",
    },
    {
      id: 2,
      title: "Backup Completed",
      description: "Daily backup completed successfully",
      severity: "info",
      status: "resolved",
      time: "2 hours ago",
    },
    {
      id: 3,
      title: "Network Latency",
      description: "Slight network latency in clinic branch",
      severity: "warning",
      status: "resolved",
      time: "5 hours ago",
    },
  ];

  const resources = [
    { name: "CPU Usage", value: 65, unit: "%" },
    { name: "Memory Usage", value: 52, unit: "%" },
    { name: "Storage Usage", value: 78, unit: "%" },
    { name: "Network Bandwidth", value: 34, unit: "%" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          System Operations
        </p>
        <h1 className="text-3xl font-bold text-foreground mt-1">
          Operations Center
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          System health monitoring and incident management
        </p>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {systemStatus.map((service, idx) => (
          <div
            key={idx}
            className="p-6 rounded-2xl border border-gray-200 bg-white hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                {service.name}
              </h3>
              <div
                className={`h-2 w-2 rounded-full ${
                  service.status === "operational"
                    ? "bg-green-500"
                    : "bg-yellow-500"
                }`}
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-500">
                Uptime: <span className="font-semibold text-gray-900">{service.uptime}</span>
              </p>
              <p className="text-xs text-gray-500">
                Last checked: {service.lastChecked}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active Incidents */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Recent Incidents
          </h2>
          <div className="space-y-3">
            {incidents.map((incident) => (
              <div
                key={incident.id}
                className={`p-4 rounded-lg border ${
                  incident.severity === "warning"
                    ? "border-yellow-200 bg-yellow-50/30"
                    : "border-blue-200 bg-blue-50/30"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {incident.title}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {incident.description}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-md font-semibold ${
                      incident.status === "resolved"
                        ? "text-green-600 bg-green-50"
                        : "text-yellow-600 bg-yellow-50"
                    }`}
                  >
                    {incident.status === "resolved" ? "✓" : "⏳"}{" "}
                    {incident.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{incident.time}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="p-6 rounded-2xl border border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-500" />
            System Health
          </h2>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-green-50 border border-green-200">
              <p className="text-xs font-semibold text-green-900">All Systems</p>
              <p className="text-lg font-bold text-green-600 mt-1">Operational</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">
                Avg Response Time
              </p>
              <p className="text-2xl font-bold text-gray-900">145ms</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">
                Active Users
              </p>
              <p className="text-2xl font-bold text-gray-900">234</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">
                Error Rate
              </p>
              <p className="text-2xl font-bold text-green-600">0.02%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Resource Usage */}
      <div className="p-6 rounded-2xl border border-gray-200 bg-white">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-orange-500" />
          Server Resource Usage
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {resources.map((resource, idx) => (
            <div key={idx} className="p-4 rounded-lg border border-gray-100">
              <p className="text-sm font-medium text-gray-900 mb-3">
                {resource.name}
              </p>
              <div className="relative h-32 bg-gray-50 rounded-lg flex items-end justify-center mb-2">
                <div
                  className="w-12 bg-gradient-to-t from-orange-500 to-orange-400 rounded-t transition-all"
                  style={{ height: `${resource.value}%` }}
                />
              </div>
              <p className="text-2xl font-bold text-gray-900 text-center">
                {resource.value}
                <span className="text-sm text-gray-500">{resource.unit}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Maintenance Schedule */}
      <div className="p-6 rounded-2xl border border-gray-200 bg-white">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-500" />
          Scheduled Maintenance
        </h2>
        <div className="space-y-3">
          {[
            {
              name: "Database Optimization",
              date: "May 15, 2026",
              duration: "2 hours",
            },
            {
              name: "Security Patches",
              date: "May 16, 2026",
              duration: "1 hour",
            },
            {
              name: "System Upgrade",
              date: "May 20, 2026",
              duration: "4 hours",
            },
          ].map((maintenance, idx) => (
            <div
              key={idx}
              className="p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {maintenance.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {maintenance.date} • {maintenance.duration}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded-md bg-blue-50 text-blue-600 font-semibold">
                  SCHEDULED
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

