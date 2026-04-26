"use client";

import { PageHeader, StatCard, SectionCard } from "@/components/ui";

export default function LabTechnicianDashboard() {
  return (
    <div>
      <PageHeader
        title="Lab Management"
        subtitle="Laboratory operations dashboard"
      />

      {/* Lab KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard title="Lab Orders" value="124" subtitle="Today" />
        <StatCard title="Processing" value="34" subtitle="In progress" />
        <StatCard title="Completed" value="78" subtitle="Ready for review" />
        <StatCard title="Pending Review" value="12" subtitle="Urgent items" />
      </div>

      {/* Lab Orders & Results */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <SectionCard title="Lab Orders (Navigate via sidebar: Lab Orders)">
          <div className="space-y-3">
            {[
              { test: "CBC Test", patient: "John Doe", priority: "high", status: "pending" },
              { test: "Blood Glucose", patient: "Jane Smith", priority: "normal", status: "processing" },
              { test: "Lipid Panel", patient: "Bob Wilson", priority: "normal", status: "completed" },
              { test: "Thyroid Panel", patient: "Carol Davis", priority: "high", status: "pending" },
            ].map((order, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{order.test}</p>
                  <p className="text-xs text-gray-500">Patient: {order.patient}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-md ${
                  order.status === "pending" ? "text-orange-600 bg-orange-50" :
                  order.status === "processing" ? "text-blue-600 bg-blue-50" :
                  "text-green-600 bg-green-50"
                }`}>
                  {order.status}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Inventory Status (Navigate via sidebar: Inventory)">
          <div className="space-y-3">
            {[
              { item: "Reagent A", stock: "245 units", level: 65, status: "good" },
              { item: "Reagent B", stock: "89 units", level: 35, status: "low" },
              { item: "Culture Media", stock: "156 units", level: 78, status: "good" },
              { item: "Lab Tubes", stock: "1,234 units", level: 92, status: "excellent" },
            ].map((inv, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900">{inv.item}</p>
                  <p className="text-xs text-gray-500">{inv.stock}</p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      inv.status === "excellent" ? "bg-green-500" :
                      inv.status === "good" ? "bg-blue-500" :
                      "bg-orange-500"
                    }`}
                    style={{ width: `${inv.level}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Quality Control & Analytics */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Quality Control" value="98.5%" subtitle="Pass rate (Navigate: QC)" />
        <StatCard title="Turnaround Time" value="4.2 hrs" subtitle="Average (Navigate: Analytics)" />
        <StatCard title="Equipment Status" value="5/5" subtitle="Operational (Navigate: Performance)" />
      </div>
    </div>
  );
}
