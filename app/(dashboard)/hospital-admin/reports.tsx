"use client";

import { FileText, Download, Eye, Trash2, Plus, Calendar, Filter } from "lucide-react";

export default function ReportsDashboard() {
  const reports = [
    {
      id: 1,
      name: "Monthly Patient Census Report",
      type: "Operational",
      date: "May 10, 2026",
      size: "2.4 MB",
      status: "ready",
    },
    {
      id: 2,
      name: "Financial Summary - Q1 2026",
      type: "Financial",
      date: "May 9, 2026",
      size: "1.8 MB",
      status: "ready",
    },
    {
      id: 3,
      name: "Staff Performance Evaluation",
      type: "HR",
      date: "May 8, 2026",
      size: "3.2 MB",
      status: "ready",
    },
    {
      id: 4,
      name: "Clinical Outcomes Analysis",
      type: "Clinical",
      date: "May 7, 2026",
      size: "4.1 MB",
      status: "ready",
    },
  ];

  const reportTemplates = [
    {
      name: "Daily Operations Report",
      description: "Summarizes daily hospital operations and key metrics",
      frequency: "Daily",
    },
    {
      name: "Weekly Patient Report",
      description: "Detailed patient admission and discharge statistics",
      frequency: "Weekly",
    },
    {
      name: "Monthly Financial Report",
      description: "Revenue, expenses, and billing analysis",
      frequency: "Monthly",
    },
    {
      name: "Quarterly Quality Report",
      description: "Quality indicators and compliance status",
      frequency: "Quarterly",
    },
    {
      name: "Annual Compliance Report",
      description: "Complete compliance and audit report",
      frequency: "Annually",
    },
    {
      name: "Staff Utilization Report",
      description: "Staffing allocation and performance metrics",
      frequency: "Monthly",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Reporting
          </p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View, download, and manage hospital reports
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-all">
          <Plus className="h-4 w-4" />
          Generate Report
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <select className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium hover:border-orange-300 transition-all">
          <option>All Report Types</option>
          <option>Operational</option>
          <option>Financial</option>
          <option>Clinical</option>
          <option>HR</option>
        </select>
        <select className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium hover:border-orange-300 transition-all">
          <option>Last 30 Days</option>
          <option>Last 90 Days</option>
          <option>Last Year</option>
          <option>All Time</option>
        </select>
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium hover:border-orange-300 transition-all">
          <Filter className="h-4 w-4" />
          Filter
        </button>
      </div>

      {/* Recent Reports */}
      <div className="p-6 rounded-2xl border border-gray-200 bg-white">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-orange-500" />
          Recent Reports
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600">
                  Report Name
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600">
                  Type
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600">
                  Date
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600">
                  Size
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr
                  key={report.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-all"
                >
                  <td className="py-4 px-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {report.name}
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-xs px-2 py-1 rounded-md bg-blue-50 text-blue-600 font-semibold">
                      {report.type}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600">{report.date}</td>
                  <td className="py-4 px-4 text-sm text-gray-600">{report.size}</td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 rounded-lg hover:bg-gray-100 transition-all text-gray-600 hover:text-orange-500">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-gray-100 transition-all text-gray-600 hover:text-orange-500">
                        <Download className="h-4 w-4" />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-gray-100 transition-all text-gray-600 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Templates */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-orange-500" />
          Available Report Templates
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportTemplates.map((template, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl border border-gray-200 bg-white hover:shadow-lg transition-all group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <FileText className="h-6 w-6 text-orange-500 group-hover:scale-110 transition-transform" />
                <span className="text-xs px-2 py-1 rounded-md bg-orange-50 text-orange-600 font-semibold">
                  {template.frequency}
                </span>
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-2">
                {template.name}
              </h3>
              <p className="text-xs text-gray-600 mb-4">{template.description}</p>
              <button className="w-full py-2 px-3 rounded-lg border border-orange-300 bg-orange-50 text-orange-600 font-semibold hover:bg-orange-100 transition-all text-xs">
                Generate
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Report Scheduling */}
      <div className="p-6 rounded-2xl border border-gray-200 bg-white">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-orange-500" />
          Scheduled Reports
        </h2>
        <div className="space-y-3">
          {[
            {
              name: "Daily Operations Report",
              schedule: "Every day at 9:00 AM",
              recipients: "admin@hospital.com",
            },
            {
              name: "Weekly Financial Summary",
              schedule: "Every Monday at 8:00 AM",
              recipients: "finance@hospital.com",
            },
            {
              name: "Monthly Quality Report",
              schedule: "First day of month at 10:00 AM",
              recipients: "quality@hospital.com",
            },
          ].map((scheduled, idx) => (
            <div
              key={idx}
              className="p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {scheduled.name}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Schedule: {scheduled.schedule}
                  </p>
                  <p className="text-xs text-gray-600">
                    Recipients: {scheduled.recipients}
                  </p>
                </div>
                <button className="px-3 py-1 rounded-md border border-gray-300 hover:border-red-300 hover:bg-red-50 text-gray-600 hover:text-red-600 text-xs font-semibold transition-all">
                  Disable
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

