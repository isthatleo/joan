"use client";

import { PageHeader, StatCard, SectionCard } from "@/components/ui";

export default function ReceptionistDashboard() {
  return (
    <div>
      <PageHeader
        title="Front Desk"
        subtitle="Patient check-in and appointment management"
      />

      {/* Receptionist KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard title="Today's Appointments" value="156" subtitle="Scheduled (Navigate: Appointments)" />
        <StatCard title="Check-ins" value="124" subtitle="Completed (Navigate: Check-in)" />
        <StatCard title="In Queue" value="8" subtitle="Waiting (Navigate: Queue)" />
        <StatCard title="Registered Today" value="12" subtitle="New patients (Navigate: Patient Registration)" />
      </div>

      {/* Appointments & Queue */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <SectionCard title="Upcoming Appointments (Navigate via sidebar: Appointments)">
          <div className="space-y-3">
            {[
              { time: "2:00 PM", patient: "John Doe", doctor: "Dr. Smith", status: "checked-in" },
              { time: "2:30 PM", patient: "Jane Smith", doctor: "Dr. Johnson", status: "confirmed" },
              { time: "3:00 PM", patient: "Bob Wilson", doctor: "Dr. Lee", status: "pending" },
              { time: "3:30 PM", patient: "Carol Davis", doctor: "Dr. Brown", status: "confirmed" },
            ].map((apt, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{apt.time} - {apt.patient}</p>
                  <p className="text-xs text-gray-500">{apt.doctor}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-md ${
                  apt.status === "checked-in" ? "text-green-600 bg-green-50" :
                  apt.status === "confirmed" ? "text-blue-600 bg-blue-50" :
                  "text-orange-600 bg-orange-50"
                }`}>
                  {apt.status}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Waiting Room (Navigate via sidebar: Waiting Room)">
          <div className="space-y-3">
            {[
              { patient: "Alice Johnson", room: "Room 101", waitTime: "12 min", dept: "Cardiology" },
              { patient: "Charlie Brown", room: "Room 102", waitTime: "5 min", dept: "Surgery" },
              { patient: "Diana Prince", room: "Room 103", waitTime: "2 min", dept: "Lab" },
              { patient: "Emma Wilson", room: "Lab", waitTime: "8 min", dept: "Lab" },
            ].map((pt, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{pt.patient}</p>
                  <p className="text-xs text-gray-500">{pt.room} - {pt.dept}</p>
                </div>
                <p className="text-sm font-semibold text-gray-900">{pt.waitTime}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Check-in Station" value="Ready" subtitle="Navigate: Check-in" />
        <StatCard title="Patient Registration" value="Available" subtitle="Navigate: Registration" />
        <StatCard title="Emergency Cases" value="2" subtitle="Navigate: Emergency" />
      </div>
    </div>
  );
}
