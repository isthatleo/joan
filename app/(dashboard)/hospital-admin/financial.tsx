"use client";

import { DollarSign, TrendingUp, TrendingDown, PieChart, BarChart3, Calendar } from "lucide-react";

export default function FinancialDashboard() {
  const financialMetrics = [
    {
      title: "Total Revenue",
      value: "$2,345,678",
      change: "+12%",
      direction: "up",
      period: "Last 30 days",
    },
    {
      title: "Outstanding Balance",
      value: "$456,789",
      change: "-8%",
      direction: "down",
      period: "Decreasing",
    },
    {
      title: "Paid Invoices",
      value: "$1,889,234",
      change: "+5%",
      direction: "up",
      period: "This month",
    },
    {
      title: "Average Invoice Value",
      value: "$1,234",
      change: "+3%",
      direction: "up",
      period: "Per patient",
    },
  ];

  const revenueByDept = [
    { name: "Emergency", value: "$345,600", percentage: 23 },
    { name: "Surgery", value: "$289,450", percentage: 19 },
    { name: "Cardiology", value: "$234,567", percentage: 16 },
    { name: "Pediatrics", value: "$187,234", percentage: 12 },
    { name: "Others", value: "$456,789", percentage: 30 },
  ];

  const paymentMethods = [
    { method: "Insurance", amount: "$1,234,560", percentage: 52 },
    { method: "Cash", amount: "$456,789", percentage: 19 },
    { method: "Credit Card", amount: "$389,234", percentage: 16 },
    { method: "Cheque", amount: "$264,495", percentage: 11 },
  ];

  const invoiceStatus = [
    { status: "Paid", count: 1234, amount: "$1,889,234", color: "green" },
    { status: "Pending", count: 234, amount: "$345,678", color: "yellow" },
    { status: "Overdue", count: 45, amount: "$98,769", color: "red" },
    { status: "Cancelled", count: 12, amount: "$23,456", color: "gray" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Financial Management
          </p>
          <h1 className="text-3xl font-bold text-foreground mt-1">
            Financial Overview
          </h1>
        </div>
        <select className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium hover:border-orange-300 transition-all">
          <option>Last 30 Days</option>
          <option>Last 90 Days</option>
          <option>Last Year</option>
          <option>Custom Range</option>
        </select>
      </div>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {financialMetrics.map((metric, idx) => (
          <div
            key={idx}
            className="p-6 rounded-2xl border border-gray-200 bg-white hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 rounded-xl bg-green-50 text-green-500">
                <DollarSign className="h-6 w-6" />
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-md font-semibold ${
                  metric.direction === "up"
                    ? "text-green-600 bg-green-50"
                    : "text-blue-600 bg-blue-50"
                }`}
              >
                {metric.change}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">{metric.title}</p>
            <p className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</p>
            <p className="text-xs text-gray-500">{metric.period}</p>
          </div>
        ))}
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* By Department */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-orange-500" />
            Revenue by Department
          </h2>
          <div className="space-y-3">
            {revenueByDept.map((dept, idx) => (
              <div key={idx} className="p-4 rounded-lg border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-900">{dept.name}</p>
                  <p className="text-sm font-bold text-gray-900">{dept.value}</p>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-400 to-orange-500"
                    style={{ width: `${dept.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{dept.percentage}% of total</p>
              </div>
            ))}
          </div>
        </div>

        {/* Invoice Status Summary */}
        <div className="p-6 rounded-2xl border border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-500" />
            Invoice Status
          </h2>
          <div className="space-y-3">
            {invoiceStatus.map((inv, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${
                  inv.color === "green"
                    ? "border-green-200 bg-green-50"
                    : inv.color === "yellow"
                    ? "border-yellow-200 bg-yellow-50"
                    : inv.color === "red"
                    ? "border-red-200 bg-red-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {inv.status}
                    </p>
                    <p className="text-xs text-gray-600">{inv.count} invoices</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900">{inv.amount}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Methods & Collection Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment Methods */}
        <div className="p-6 rounded-2xl border border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <PieChart className="h-5 w-5 text-orange-500" />
            Payment Methods
          </h2>
          <div className="space-y-3">
            {paymentMethods.map((method, idx) => (
              <div key={idx} className="p-4 rounded-lg border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-900">{method.method}</p>
                  <p className="text-sm font-bold text-gray-900">{method.amount}</p>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-500"
                    style={{ width: `${method.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{method.percentage}%</p>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="p-6 rounded-2xl border border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            Collection Performance
          </h2>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
              <p className="text-sm font-medium text-green-900 mb-2">
                Collection Rate
              </p>
              <p className="text-3xl font-bold text-green-600">94.5%</p>
              <p className="text-xs text-green-700 mt-1">Excellent performance</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-lg border border-gray-100">
                <p className="text-xs font-medium text-gray-600 mb-1">
                  Avg Collection Days
                </p>
                <p className="text-2xl font-bold text-gray-900">12</p>
              </div>
              <div className="p-3 rounded-lg border border-gray-100">
                <p className="text-xs font-medium text-gray-600 mb-1">
                  Bad Debt Ratio
                </p>
                <p className="text-2xl font-bold text-red-600">2.1%</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-xs font-medium text-blue-900 mb-2">
                YTD Growth
              </p>
              <p className="text-2xl font-bold text-blue-600">+18.5%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Aging Report */}
      <div className="p-6 rounded-2xl border border-gray-200 bg-white">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-orange-500" />
          Invoice Aging Report
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { range: "Current", amount: "$1,234,560", count: 456 },
            { range: "31-60 Days", amount: "$345,678", count: 89 },
            { range: "61-90 Days", amount: "$123,456", count: 23 },
            { range: "91+ Days", amount: "$98,769", count: 12 },
            { range: "Overdue", amount: "$98,769", count: 45 },
          ].map((aging, idx) => (
            <div key={idx} className="p-4 rounded-lg border border-gray-100">
              <p className="text-xs font-semibold text-gray-600 mb-2">
                {aging.range}
              </p>
              <p className="text-xl font-bold text-gray-900">{aging.amount}</p>
              <p className="text-xs text-gray-500 mt-1">{aging.count} invoices</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

