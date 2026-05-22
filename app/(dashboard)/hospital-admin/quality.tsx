"use client";

import { CheckCircle2, AlertTriangle, ClipboardList, TrendingUp, FileText, Shield } from "lucide-react";

export default function QualityComplianceDashboard() {
  const qualityMetrics = [
    {
      title: "Patient Satisfaction",
      value: "4.8/5",
      trend: "+0.2",
      status: "excellent",
    },
    { title: "Care Quality Score", value: "94%", trend: "+3%", status: "excellent" },
    { title: "Safety Incidents", value: "2", trend: "-1", status: "warning" },
    {
      title: "Compliance Score",
      value: "96%",
      trend: "+2%",
      status: "excellent",
    },
  ];

  const complianceChecks = [
    {
      name: "HIPAA Compliance",
      status: "compliant",
      lastAudit: "May 5, 2026",
      nextAudit: "August 5, 2026",
    },
    {
      name: "JCI Accreditation",
      status: "compliant",
      lastAudit: "March 10, 2026",
      nextAudit: "September 10, 2026",
    },
    {
      name: "Quality Standards",
      status: "compliant",
      lastAudit: "April 20, 2026",
      nextAudit: "July 20, 2026",
    },
    {
      name: "Financial Audits",
      status: "compliant",
      lastAudit: "April 1, 2026",
      nextAudit: "July 1, 2026",
    },
  ];

  const qualityIndicators = [
    {
      indicator: "Hospital Acquired Infections (HAI)",
      rate: "0.8%",
      benchmark: "1.2%",
      status: "good",
    },
    {
      indicator: "Readmission Rate",
      rate: "4.2%",
      benchmark: "5.0%",
      status: "good",
    },
    {
      indicator: "Surgery Complication Rate",
      rate: "2.1%",
      benchmark: "3.0%",
      status: "good",
    },
    {
      indicator: "Medication Error Rate",
      rate: "0.3%",
      benchmark: "0.5%",
      status: "good",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          Quality & Compliance
        </p>
        <h1 className="text-3xl font-bold text-foreground mt-1">
          Quality Management & Compliance
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor hospital quality standards and regulatory compliance
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {qualityMetrics.map((metric, idx) => (
          <div
            key={idx}
            className={`p-6 rounded-2xl border ${
              metric.status === "excellent"
                ? "border-green-200 bg-green-50"
                : "border-yellow-200 bg-yellow-50"
            } hover:shadow-lg transition-all`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-white">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-md font-semibold ${
                  metric.status === "excellent"
                    ? "text-green-600 bg-green-100"
                    : "text-yellow-600 bg-yellow-100"
                }`}
              >
                {metric.trend}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">{metric.title}</p>
            <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
          </div>
        ))}
      </div>

      {/* Compliance Status & Quality Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Compliance Certifications */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            Compliance Status
          </h2>
          <div className="space-y-3">
            {complianceChecks.map((check, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg border border-green-200 bg-green-50/30"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {check.name}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Last audit: {check.lastAudit}
                    </p>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold">
                    ✓ {check.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Next audit: {check.nextAudit}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance Timeline */}
        <div className="p-6 rounded-2xl border border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-500" />
            Audit Schedule
          </h2>
          <div className="space-y-2">
            {[
              { month: "May 2026", count: 2, status: "scheduled" },
              { month: "June 2026", count: 1, status: "scheduled" },
              { month: "July 2026", count: 3, status: "scheduled" },
              { month: "August 2026", count: 2, status: "scheduled" },
            ].map((audit, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-blue-200 bg-blue-50/30"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{audit.month}</p>
                  <span className="text-xs font-bold px-2 py-1 rounded-md bg-blue-100 text-blue-700">
                    {audit.count} audits
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quality Indicators */}
      <div className="p-6 rounded-2xl border border-gray-200 bg-white">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-orange-500" />
          Clinical Quality Indicators
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {qualityIndicators.map((qi, idx) => (
            <div key={idx} className="p-4 rounded-lg border border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm font-semibold text-gray-900">
                  {qi.indicator}
                </p>
                <span className="text-xs px-2 py-1 rounded-md bg-green-50 text-green-600 font-semibold">
                  ✓ Good
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Current Rate</p>
                  <p className="text-lg font-bold text-gray-900">{qi.rate}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Benchmark</p>
                  <p className="text-lg font-bold text-green-600">{qi.benchmark}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-green-700 font-semibold">
                  ↓ {(parseFloat(qi.benchmark) - parseFloat(qi.rate)).toFixed(1)}% below benchmark
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Incident Reports */}
      <div className="p-6 rounded-2xl border border-gray-200 bg-white">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Recent Incidents & Corrective Actions
        </h2>
        <div className="space-y-3">
          {[
            {
              incident: "Minor medication error",
              date: "May 8, 2026",
              action: "Staff retraining completed",
              status: "resolved",
            },
            {
              incident: "Equipment maintenance missed",
              date: "May 5, 2026",
              action: "Maintenance schedule updated",
              status: "resolved",
            },
            {
              incident: "Patient satisfaction complaint",
              date: "May 1, 2026",
              action: "Service improvement plan initiated",
              status: "in-progress",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg border ${
                item.status === "resolved"
                  ? "border-green-200 bg-green-50/30"
                  : "border-yellow-200 bg-yellow-50/30"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {item.incident}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">{item.date}</p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-md font-semibold ${
                    item.status === "resolved"
                      ? "text-green-600 bg-green-100"
                      : "text-yellow-600 bg-yellow-100"
                  }`}
                >
                  {item.status === "resolved" ? "✓" : "⏳"}{" "}
                  {item.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-gray-700">
                <strong>Action:</strong> {item.action}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

