"use client";

import { PageHeader, StatCard, SectionCard } from "@/components/ui";

export default function HospitalAdminDashboard() {
  return (
    <div>
      <PageHeader
        title="Hospital Control Tower"
        subtitle="Real-time operational overview - Navigate via sidebar: Patients, Appointments, Staff, Lab, Pharmacy, Billing, Reports"
      />

      {/* Primary KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard title="Patients Today" value="342" subtitle="Active in hospital" />
        <StatCard title="Revenue Today" value="$28,450" subtitle="All departments" />
        <StatCard title="Bed Occupancy" value="87%" subtitle="120/140 beds" />
        <StatCard title="Staff On Duty" value="58" subtitle="All departments" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard title="Appointments Today" value="156" subtitle="Scheduled" />
        <StatCard title="Lab Tests Pending" value="34" subtitle="Awaiting results" />
        <StatCard title="Open Invoices" value="$45,200" subtitle="Payment due" />
      </div>

      {/* Department Performance & Alerts */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <SectionCard title="Department Performance">
          <div className="space-y-3">
            {[
              { dept: "Emergency", patients: 45, rate: "98%", status: "excellent" },
              { dept: "Surgery", patients: 12, rate: "100%", status: "excellent" },
              { dept: "Lab", patients: 234, rate: "92%", status: "good" },
              { dept: "Pediatrics", patients: 67, rate: "95%", status: "excellent" },
            ].map((dept, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{dept.dept}</p>
                  <p className="text-xs text-gray-500">{dept.patients} patients today</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{dept.rate}</p>
                  <span className={`text-xs px-2 py-1 rounded-md ${
                    dept.status === "excellent" ? "text-green-600 bg-green-50" : "text-blue-600 bg-blue-50"
                  }`}>
                    {dept.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Critical Alerts">
          <div className="space-y-3">
            {[
              { title: "High Bed Occupancy", desc: "ICU at 95%", severity: "urgent" },
              { title: "Medication Stock Low", desc: "Amoxicillin running low", severity: "urgent" },
              { title: "Payment Overdue", desc: "Insurance claim INV-0456", severity: "warning" },
              { title: "System Update Pending", desc: "Schedule maintenance window", severity: "info" },
            ].map((alert, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  alert.severity === "urgent"
                    ? "border-red-200 bg-red-50"
                    : alert.severity === "warning"
                    ? "border-yellow-200 bg-yellow-50"
                    : "border-blue-200 bg-blue-50"
                }`}
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                  <p className="text-xs text-gray-500">{alert.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <SectionCard title="Recent Activity">
          <div className="space-y-3">
            {[
              { action: "New patient registered", time: "2 min ago" },
              { action: "Lab results uploaded", time: "5 min ago" },
              { action: "Appointment scheduled", time: "10 min ago" },
              { action: "Payment processed", time: "15 min ago" },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                <p className="text-sm text-gray-700">{item.action}</p>
                <p className="text-xs text-gray-500">{item.time}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Quick Actions">
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: "New Patient", desc: "Register patient" },
              { name: "Schedule Apt", desc: "Book appointment" },
              { name: "Create Invoice", desc: "Billing" },
              { name: "View Alerts", desc: "System alerts" },
            ].map((action, idx) => (
              <button
                key={idx}
                className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg hover:shadow-md transition-all border border-gray-200"
              >
                <p className="text-sm font-medium text-gray-900">{action.name}</p>
                <p className="text-xs text-gray-500 mt-1">{action.desc}</p>
              </button>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
