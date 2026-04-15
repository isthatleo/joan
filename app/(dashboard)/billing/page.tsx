"use client";

import { useState } from "react";
import { Topbar } from "@/components/Topbar";
import { KPICard } from "@/components/KPICard";
import { DataCard, DataCardItem } from "@/components/DataCard";
import { DollarSign, TrendingUp, AlertCircle, CheckCircle, Plus, Download } from "lucide-react";

const mockInvoices: DataCardItem[] = [
  {
    id: "INV-001",
    title: "INV-001",
    subtitle: "John Doe - Consultation",
    status: "completed",
    value: "$150",
  },
  {
    id: "INV-002",
    title: "INV-002",
    subtitle: "Jane Smith - Lab",
    status: "pending",
    value: "$200",
  },
  {
    id: "INV-003",
    title: "INV-003",
    subtitle: "Bob Johnson - Procedure",
    status: "pending",
    value: "$450",
  },
];

const mockPayments: DataCardItem[] = [
  {
    id: "PAY-001",
    title: "PAY-001",
    subtitle: "Cash - John Doe",
    status: "completed",
    value: "$150",
  },
  {
    id: "PAY-002",
    title: "PAY-002",
    subtitle: "Insurance - Group A",
    status: "in-progress",
    value: "$2,400",
  },
];

export default function BillingPage() {
  const [view, setView] = useState<"invoices" | "payments" | "reports">("invoices");

  return (
    <div className="space-y-6">
      <Topbar
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Billing" },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Billing & Payments
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage invoices, payments, and financial records
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors">
          <Plus className="w-5 h-5" />
          New Invoice
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Revenue Today"
          value="$5,240"
          subtitle="All services"
          color="green"
          icon={DollarSign}
          trend={{ value: 8, label: "vs target", isPositive: true }}
        />
        <KPICard
          title="Outstanding Payments"
          value="$12,850"
          subtitle="Awaiting settlement"
          color="yellow"
          icon={AlertCircle}
        />
        <KPICard
          title="Monthly Revenue"
          value="$145,230"
          subtitle="This month"
          color="blue"
          icon={TrendingUp}
        />
        <KPICard
          title="Collection Rate"
          value="92%"
          subtitle="This month"
          color="green"
          icon={CheckCircle}
        />
      </div>

      {/* View Toggle */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-200 dark:border-slate-700 flex gap-2">
        <button
          onClick={() => setView("invoices")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            view === "invoices"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-slate-700"
          }`}
        >
          Invoices
        </button>
        <button
          onClick={() => setView("payments")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            view === "payments"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-slate-700"
          }`}
        >
          Payments
        </button>
        <button
          onClick={() => setView("reports")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            view === "reports"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-slate-700"
          }`}
        >
          Reports
        </button>
      </div>

      {/* Invoices View */}
      {view === "invoices" && (
        <>
          <DataCard
            title="Recent Invoices"
            items={mockInvoices}
            onItemClick={(item) => console.log("View invoice", item)}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Total Invoiced</h3>
              <p className="text-3xl font-bold text-blue-600">$28,450</p>
              <p className="text-sm text-gray-600 mt-2">This month</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Paid</h3>
              <p className="text-3xl font-bold text-green-600">$26,150</p>
              <p className="text-sm text-gray-600 mt-2">92% collected</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Outstanding</h3>
              <p className="text-3xl font-bold text-yellow-600">$2,300</p>
              <p className="text-sm text-gray-600 mt-2">8% pending</p>
            </div>
          </div>
        </>
      )}

      {/* Payments View */}
      {view === "payments" && (
        <>
          <DataCard
            title="Recent Payments"
            items={mockPayments}
            onItemClick={(item) => console.log("View payment", item)}
          />
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Methods</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { method: "Cash", count: 45, amount: "$12,450" },
                { method: "Card", count: 32, amount: "$9,200" },
                { method: "Insurance", count: 18, amount: "$6,300" },
                { method: "Mobile Money", count: 12, amount: "$4,100" },
              ].map((pm, idx) => (
                <div key={idx} className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <p className="font-medium text-gray-900 dark:text-white">{pm.method}</p>
                  <p className="text-2xl font-bold text-blue-600 mt-2">{pm.count}</p>
                  <p className="text-sm text-gray-600 mt-1">{pm.amount}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Reports View */}
      {view === "reports" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Revenue</h3>
            <div className="space-y-3">
              {[
                { month: "January", revenue: "$95,230", growth: "+5%" },
                { month: "February", revenue: "$102,450", growth: "+7%" },
                { month: "March", revenue: "$145,230", growth: "+41%" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <span className="font-medium text-gray-900 dark:text-white">{item.month}</span>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-white">{item.revenue}</p>
                    <p className="text-sm text-green-600">{item.growth}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Export Reports</h3>
            <div className="space-y-3">
              {[
                { report: "Monthly P&L", format: "PDF" },
                { report: "Payment Summary", format: "Excel" },
                { report: "Tax Report", format: "PDF" },
              ].map((item, idx) => (
                <button key={idx} className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-gray-100">
                  <span className="font-medium text-gray-900 dark:text-white">{item.report}</span>
                  <Download className="w-4 h-4 text-gray-600" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
