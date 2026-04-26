"use client";

import { PageHeader, StatCard, SectionCard } from "@/components/ui";

export default function PharmacistDashboard() {
  return (
    <div>
      <PageHeader
        title="Pharmacy Management"
        subtitle="Pharmaceutical operations and inventory control"
      />

      {/* Pharmacy KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard title="Prescriptions" value="287" subtitle="Pending (Navigate: Prescriptions)" />
        <StatCard title="Dispensed Today" value="156" subtitle="Successfully" />
        <StatCard title="Stock Alerts" value="8" subtitle="Low inventory (Navigate: Stock Alerts)" />
        <StatCard title="Drug Interactions" value="3" subtitle="Flagged (Navigate: Drug Interactions)" />
      </div>

      {/* Prescriptions & Inventory */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <SectionCard title="Pending Prescriptions (Navigate via sidebar: Prescriptions)">
          <div className="space-y-3">
            {[
              { rx: "Amoxicillin 500mg", patient: "John Doe", qty: 30, doctor: "Dr. Smith" },
              { rx: "Metformin 1000mg", patient: "Jane Smith", qty: 60, doctor: "Dr. Johnson" },
              { rx: "Aspirin 100mg", patient: "Bob Wilson", qty: 90, doctor: "Dr. Lee" },
              { rx: "Lisinopril 10mg", patient: "Carol Davis", qty: 30, doctor: "Dr. Brown" },
            ].map((rx, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{rx.rx}</p>
                  <p className="text-xs text-gray-500">{rx.patient} - {rx.doctor}</p>
                </div>
                <p className="text-sm font-semibold text-gray-900">{rx.qty} units</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Inventory Status (Navigate via sidebar: Inventory)">
          <div className="space-y-3">
            {[
              { drug: "Amoxicillin 500mg", stock: 456, critical: 100, status: "good" },
              { drug: "Metformin 1000mg", stock: 234, critical: 200, status: "low" },
              { drug: "Aspirin 100mg", stock: 1234, critical: 500, status: "good" },
              { drug: "Lisinopril 10mg", stock: 89, critical: 100, status: "critical" },
            ].map((item, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900">{item.drug}</p>
                  <p className={`text-xs font-semibold ${
                    item.stock < item.critical ? "text-red-600" : "text-green-600"
                  }`}>
                    {item.stock} units
                  </p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      item.stock < item.critical ? "bg-red-500" :
                      item.stock < item.critical * 1.5 ? "bg-orange-500" :
                      "bg-green-500"
                    }`}
                    style={{ width: `${Math.min(100, (item.stock / item.critical) * 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Dispensing & Alerts */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Today Dispensed" value="156" subtitle="Navigate: Dispensing" />
        <StatCard title="Drug Interactions" value="0" subtitle="Critical (Navigate: Safety)" />
        <StatCard title="Suppliers" value="12" subtitle="Active (Navigate: Suppliers)" />
      </div>
    </div>
  );
}
