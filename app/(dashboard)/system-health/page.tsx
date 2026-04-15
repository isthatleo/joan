"use client";

import { Topbar } from "@/components/Topbar";
import { KPICard } from "@/components/KPICard";
import { Activity, TrendingUp, AlertCircle, CheckCircle, Server, Zap } from "lucide-react";

export default function SystemHealthPage() {
  return (
    <div className="space-y-6">
      <Topbar
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "System Health" },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          System Health Monitoring
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Real-time infrastructure and service monitoring
        </p>
      </div>

      {/* Health Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="System Uptime"
          value="99.98%"
          subtitle="Last 30 days"
          color="green"
          icon={CheckCircle}
        />
        <KPICard
          title="API Response Time"
          value="125ms"
          subtitle="Average"
          color="green"
          icon={Zap}
        />
        <KPICard
          title="Database Health"
          value="100%"
          subtitle="All systems normal"
          color="green"
          icon={Server}
        />
        <KPICard
          title="Active Services"
          value="8/8"
          subtitle="All running"
          color="green"
          icon={Activity}
        />
      </div>

      {/* Service Status */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Service Status
        </h3>
        <div className="space-y-3">
          {[
            { service: "Authentication API", status: "Operational", uptime: "99.99%", responseTime: "45ms" },
            { service: "Patient Database", status: "Operational", uptime: "100%", responseTime: "35ms" },
            { service: "Lab System", status: "Operational", uptime: "99.95%", responseTime: "120ms" },
            { service: "Pharmacy System", status: "Operational", uptime: "99.98%", responseTime: "85ms" },
            { service: "Billing Engine", status: "Operational", uptime: "99.92%", responseTime: "200ms" },
            { service: "Email Service", status: "Operational", uptime: "99.88%", responseTime: "500ms" },
            { service: "SMS Gateway", status: "Operational", uptime: "99.85%", responseTime: "1200ms" },
            { service: "File Storage", status: "Operational", uptime: "100%", responseTime: "150ms" },
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{item.service}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{item.status}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {item.responseTime}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{item.uptime}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Infrastructure Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Server Resources
          </h3>
          <div className="space-y-4">
            {[
              { resource: "CPU Usage", value: "42%", limit: "80%" },
              { resource: "Memory Usage", value: "58%", limit: "85%" },
              { resource: "Disk Space", value: "67%", limit: "90%" },
              { resource: "Network I/O", value: "34%", limit: "75%" },
            ].map((item, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.resource}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {item.value} / {item.limit}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      parseInt(item.value) > 70
                        ? "bg-yellow-500"
                        : parseInt(item.value) > 50
                          ? "bg-blue-500"
                          : "bg-green-500"
                    }`}
                    style={{ width: item.value }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Database Performance
          </h3>
          <div className="space-y-3">
            {[
              { metric: "Query Response Time", value: "35ms", status: "Excellent" },
              { metric: "Connection Pool", value: "24/32", status: "Good" },
              { metric: "Transaction Rate", value: "1,245/min", status: "Normal" },
              { metric: "Cache Hit Rate", value: "87%", status: "Excellent" },
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900 dark:to-blue-900 rounded-lg"
              >
                <div className="flex justify-between items-start">
                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                    {item.metric}
                  </p>
                  <span className="text-sm text-green-600 dark:text-green-400 font-semibold">
                    {item.status}
                  </span>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Incidents & Alerts
        </h3>
        <div className="space-y-3">
          {[
            {
              title: "High API latency detected",
              time: "2 hours ago",
              resolved: true,
            },
            { title: "Database backup completed", time: "5 hours ago", resolved: true },
            {
              title: "SSL certificate renewal scheduled",
              time: "1 day ago",
              resolved: true,
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg border-l-4 ${
                item.resolved
                  ? "bg-green-50 dark:bg-green-900 border-green-500"
                  : "bg-red-50 dark:bg-red-900 border-red-500"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className={`font-medium ${
                    item.resolved
                      ? "text-green-900 dark:text-green-100"
                      : "text-red-900 dark:text-red-100"
                  }`}>
                    {item.title}
                  </p>
                  <p className={`text-sm ${
                    item.resolved
                      ? "text-green-700 dark:text-green-300"
                      : "text-red-700 dark:text-red-300"
                  }`}>
                    {item.time}
                  </p>
                </div>
                <span className={`text-sm font-semibold px-3 py-1 rounded ${
                  item.resolved
                    ? "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-100"
                    : "bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-100"
                }`}>
                  {item.resolved ? "Resolved" : "Active"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

