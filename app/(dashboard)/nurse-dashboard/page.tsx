"use client";

import { PageHeader, StatCard, SectionCard } from "@/components/ui";

export default function NurseDashboard() {
  return (
    <div>
      <PageHeader
        title="Care Station"
        subtitle="Patient care overview - Navigate via sidebar: Patients, Vitals, Medications, Care Plans, Beds, Queue, Reports"
      />

      {/* Nursing KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard title="Assigned Patients" value="8" subtitle="Active care" />
        <StatCard title="Vitals Due" value="3" subtitle="In next 30 min" />
        <StatCard title="Medications Due" value="12" subtitle="Next 2 hours" />
        <StatCard title="Alerts" value="2" subtitle="Requires attention" />
      </div>

      {/* Patient Assignments & Vitals */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <SectionCard title="Assigned Patients">
          <div className="space-y-3">
            {[
              { patient: "Room 101", name: "John Doe", condition: "Stable", vitals: "Due now" },
              { patient: "Room 102", name: "Jane Smith", condition: "Monitoring", vitals: "15min ago" },
              { patient: "Room 103", name: "Bob Wilson", condition: "Critical", vitals: "Due now" },
              { patient: "Room 104", name: "Carol Davis", condition: "Stable", vitals: "30min ago" },
            ].map((pt, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{pt.patient} - {pt.name}</p>
                  <p className="text-xs text-gray-500">Condition: {pt.condition}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-md ${
                  pt.condition === "Critical" ? "text-red-600 bg-red-50" :
                  pt.condition === "Monitoring" ? "text-orange-600 bg-orange-50" :
                  "text-green-600 bg-green-50"
                }`}>
                  {pt.vitals}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Vitals Schedule">
          <div className="space-y-3">
            {[
              { room: "Room 101", vitals: "BP, HR, Temp, RR", status: "due", time: "Now" },
              { room: "Room 102", vitals: "BP, HR, Temp", status: "done", time: "15 min ago" },
              { room: "Room 103", vitals: "BP, HR, O2, Temp", status: "due", time: "Now" },
              { room: "Room 104", vitals: "BP, HR, Temp", status: "done", time: "30 min ago" },
            ].map((vital, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">{vital.room}</p>
                  <p className="text-xs text-gray-500">{vital.vitals}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-md ${
                  vital.status === "due" ? "text-orange-600 bg-orange-50" : "text-green-600 bg-green-50"
                }`}>
                  {vital.time}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Ward Status */}
      <SectionCard title="Ward Status">
        <div className="grid grid-cols-3 gap-4">
          {[
            { metric: "Occupied Beds", value: "8/10", color: "blue" },
            { metric: "Available Beds", value: "2", color: "green" },
            { metric: "Pending Discharges", value: "1", color: "orange" },
          ].map((item, idx) => (
            <div key={idx} className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">{item.metric}</p>
              <p className={`text-2xl font-bold ${
                item.color === "blue" ? "text-blue-600" :
                item.color === "green" ? "text-green-600" :
                "text-orange-600"
              }`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Medications & Care Tasks */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <SectionCard title="Medications Due">
          <div className="space-y-2">
            {[
              { room: "Room 101", meds: "Amoxicillin 500mg", time: "Now", status: "pending" },
              { room: "Room 102", meds: "Metformin 1000mg", time: "1:00 PM", status: "pending" },
              { room: "Room 103", meds: "Aspirin 100mg", time: "Now", status: "pending" },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded border border-gray-100">
                <p className="text-sm text-gray-900">{item.room} - {item.meds}</p>
                <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">{item.time}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Care Tasks">
          <div className="space-y-2">
            {[
              { task: "Wound dressing", room: "Room 101", status: "completed" },
              { task: "IV line check", room: "Room 102", status: "pending" },
              { task: "Patient mobility", room: "Room 103", status: "pending" },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded border border-gray-100">
                <p className="text-sm text-gray-900">{item.task} ({item.room})</p>
                <span className={`text-xs px-2 py-1 rounded ${
                  item.status === "completed" ? "text-green-600 bg-green-50" : "text-orange-600 bg-orange-50"
                }`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
