"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
} from "lucide-react";

export default function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState("week");
  const [loading, setLoading] = useState(false);

  const metrics = [
    {
      label: "Patient Admissions",
      value: "342",
      change: "+12%",
      direction: "up",
    },
    {
      label: "Appointment Completed",
      value: "1,245",
      change: "+8%",
      direction: "up",
    },
    { label: "Revenue Generated", value: "$125,450", change: "+15%", direction: "up" },
    {
      label: "Avg Wait Time",
      value: "12 mins",
      change: "-3%",
      direction: "down",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Analytics & Reports
          </p>
          <h1 className="text-3xl font-bold text-foreground mt-1">
            Hospital Analytics
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium hover:border-orange-300 transition-all"
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-all">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, idx) => (
          <div
            key={idx}
            className="p-6 rounded-2xl border border-gray-200 bg-white hover:shadow-lg transition-all"
          >
            <p className="text-sm font-medium text-gray-600 mb-2">{metric.label}</p>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-md ${
                  metric.direction === "up"
                    ? "text-green-600 bg-green-50"
                    : "text-red-600 bg-red-50"
                }`}
              >
                {metric.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Patient Trends */}
        <div className="p-6 rounded-2xl border border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <LineChart className="h-5 w-5 text-orange-500" />
            Patient Trends
          </h2>
          <div className="h-72 bg-gray-50 rounded-lg flex items-center justify-center">
            <p className="text-sm text-gray-500">
              Line chart - Patient admission trends over time
            </p>
          </div>
        </div>

        {/* Department Revenue */}
        <div className="p-6 rounded-2xl border border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <PieChart className="h-5 w-5 text-orange-500" />
            Revenue by Department
          </h2>
          <div className="h-72 bg-gray-50 rounded-lg flex items-center justify-center">
            <p className="text-sm text-gray-500">
              Pie chart - Revenue distribution by department
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Appointment Completion Rate */}
        <div className="p-6 rounded-2xl border border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-orange-500" />
            Completion Rate
          </h2>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Scheduled</span>
                <span className="text-sm font-semibold text-gray-900">92%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full w-[92%] bg-green-500"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Completed</span>
                <span className="text-sm font-semibold text-gray-900">85%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full w-[85%] bg-blue-500"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Cancelled</span>
                <span className="text-sm font-semibold text-gray-900">5%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full w-[5%] bg-red-500"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Performing Departments */}
        <div className="p-6 rounded-2xl border border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            Top Departments
          </h2>
          <div className="space-y-3">
            {["Emergency", "Surgery", "Cardiology", "Pediatrics"].map(
              (dept, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-gray-100 hover:bg-orange-50/30 transition-all"
                >
                  <p className="text-sm font-semibold text-gray-900">{dept}</p>
                  <p className="text-xs text-gray-500">Revenue: $45,300</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Performance Indicators */}
        <div className="p-6 rounded-2xl border border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            KPI Summary
          </h2>
          <div className="space-y-3">
            {[
              { label: "Avg Rating", value: "4.8/5", status: "excellent" },
              { label: "Patient Satisfaction", value: "94%", status: "excellent" },
              { label: "Bed Utilization", value: "78%", status: "good" },
              { label: "Staff Efficiency", value: "91%", status: "excellent" },
            ].map((kpi, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg border border-gray-100"
              >
                <p className="text-sm text-gray-900 font-medium">{kpi.label}</p>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-md ${
                    kpi.status === "excellent"
                      ? "text-green-600 bg-green-50"
                      : "text-blue-600 bg-blue-50"
                  }`}
                >
                  {kpi.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

