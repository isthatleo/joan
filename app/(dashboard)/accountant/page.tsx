"use client";

import { PageHeader, StatCard, SectionCard } from "@/components/ui";

export default function AccountantDashboard() {
  return (
    <div>
      <PageHeader
        title="Financial Management"
        subtitle="Billing, revenue, and financial analytics"
      />

      {/* Financial KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard title="Daily Revenue" value="$28,450" subtitle="Today" />
        <StatCard title="Outstanding" value="$145,230" subtitle="Unpaid invoices (Navigate: Invoices)" />
        <StatCard title="Payments Today" value="$18,900" subtitle="Processed (Navigate: Payments)" />
        <StatCard title="Insurance Claims" value="34" subtitle="Pending (Navigate: Insurance Claims)" />
      </div>

      {/* Billing & Revenue */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <SectionCard title="Recent Invoices (Navigate via sidebar: Invoices)">
          <div className="space-y-3">
            {[
              { invoice: "INV-2026-001", patient: "John Doe", amount: "$2,450", status: "paid" },
              { invoice: "INV-2026-002", patient: "Jane Smith", amount: "$1,890", status: "pending" },
              { invoice: "INV-2026-003", patient: "Bob Wilson", amount: "$3,200", status: "overdue" },
              { invoice: "INV-2026-004", patient: "Carol Davis", amount: "$1,560", status: "pending" },
            ].map((inv, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{inv.invoice} - {inv.patient}</p>
                  <p className="text-xs text-gray-500">{inv.amount}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-md ${
                  inv.status === "paid" ? "text-green-600 bg-green-50" :
                  inv.status === "pending" ? "text-orange-600 bg-orange-50" :
                  "text-red-600 bg-red-50"
                }`}>
                  {inv.status}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Revenue Tracking (Navigate via sidebar: Revenue Tracking)">
          <div className="space-y-4">
            {[
              { month: "April 2026", revenue: "$287,450", target: "$300,000", pct: 96 },
              { month: "March 2026", revenue: "$245,120", target: "$300,000", pct: 82 },
              { month: "February 2026", revenue: "$312,890", target: "$300,000", pct: 104 },
            ].map((item, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900">{item.month}</p>
                  <p className="text-xs text-gray-500">{item.revenue}</p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      item.pct >= 100 ? "bg-green-500" : item.pct >= 90 ? "bg-blue-500" : "bg-orange-500"
                    }`}
                    style={{ width: `${Math.min(100, item.pct)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Payment Methods" value="5" subtitle="Types (Navigate: Reports)" />
        <StatCard title="Financial Analysis" value="Active" subtitle="Dashboard (Navigate: Analysis)" />
        <StatCard title="Audit Trail" value="Complete" subtitle="All transactions logged" />
      </div>
    </div>
  );
}
