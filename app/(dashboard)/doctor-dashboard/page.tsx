"use client";

import { PageHeader, StatCard, SectionCard } from "@/components/ui";

export default function DoctorDashboard() {
  return (
    <div>
      <PageHeader
        title="Clinical Command"
        subtitle="Your day at a glance - Navigate via sidebar: Patients, Appointments, Queue, Lab Orders, Prescriptions, Messages"
      />

      {/* Physician KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard title="Today's Appointments" value="12" subtitle="7 remaining" />
        <StatCard title="Waiting Patients" value="3" subtitle="In queue" />
        <StatCard title="Critical Alerts" value="1" subtitle="Requires attention" />
        <StatCard title="Pending Lab Results" value="4" subtitle="Awaiting review" />
      </div>

      {/* Patient Queue and Appointments */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <SectionCard title="Patient Queue">
          <div className="space-y-3">
            {[
              { patient: "John Doe", room: "Room 101", priority: "high", time: "Waiting 15min" },
              { patient: "Jane Smith", room: "Room 102", priority: "normal", time: "Waiting 8min" },
              { patient: "Bob Wilson", room: "Room 103", priority: "normal", time: "Waiting 2min" },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.patient}</p>
                  <p className="text-xs text-gray-500">{item.room}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-md block mb-1 ${
                    item.priority === "high" ? "text-red-600 bg-red-50" : "text-orange-600 bg-orange-50"
                  }`}>
                    {item.priority}
                  </span>
                  <p className="text-xs text-gray-500">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Today's Appointments">
          <div className="space-y-3">
            {[
              { patient: "Alice Johnson", time: "10:00 AM", type: "Consultation", status: "confirmed" },
              { patient: "Carol Davis", time: "11:30 AM", type: "Follow-up", status: "confirmed" },
              { patient: "Emma Wilson", time: "2:00 PM", type: "Lab Review", status: "pending" },
            ].map((apt, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">{apt.patient}</p>
                  <p className="text-xs text-gray-500">{apt.type}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{apt.time}</p>
                  <span className={`text-xs px-2 py-1 rounded-md ${
                    apt.status === "confirmed" ? "text-green-600 bg-green-50" : "text-yellow-600 bg-yellow-50"
                  }`}>
                    {apt.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Clinical Insights */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard title="Avg Consultation" value="18 min" subtitle="Patient engagement" />
        <StatCard title="Patient Satisfaction" value="4.8/5" subtitle="Average rating" />
        <StatCard title="Prescriptions Issued" value="6" subtitle="This session" />
      </div>

      {/* Lab Orders and Prescriptions */}
      <div className="grid grid-cols-2 gap-4">
        <SectionCard title="Lab Orders">
          <div className="space-y-3">
            {[
              { test: "CBC Test", patient: "John Doe", status: "pending", priority: "high" },
              { test: "Blood Glucose", patient: "Jane Smith", status: "processing", priority: "normal" },
              { test: "Lipid Panel", patient: "Bob Wilson", status: "completed", priority: "normal" },
            ].map((order, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
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

        <SectionCard title="Recent Prescriptions">
          <div className="space-y-3">
            {[
              { drug: "Amoxicillin 500mg", patient: "John Doe", dosage: "2x daily", status: "issued" },
              { drug: "Metformin 1000mg", patient: "Jane Smith", dosage: "1x daily", status: "issued" },
              { drug: "Aspirin 100mg", patient: "Bob Wilson", dosage: "1x daily", status: "pending" },
            ].map((rx, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">{rx.drug}</p>
                  <p className="text-xs text-gray-500">{rx.dosage}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-md ${
                  rx.status === "issued" ? "text-green-600 bg-green-50" : "text-yellow-600 bg-yellow-50"
                }`}>
                  {rx.status}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
