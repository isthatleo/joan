"use client";

import { PageHeader, StatCard, SectionCard } from "@/components/ui";

export default function PatientDashboard() {
  return (
    <div>
      <PageHeader
        title="Patient Portal"
        subtitle="Your health information and care management"
      />

      {/* Patient Health KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard title="My Health Score" value="85/100" subtitle="Overall wellness" />
        <StatCard title="Upcoming Appointments" value="2" subtitle="Navigate: Appointments" />
        <StatCard title="Active Prescriptions" value="3" subtitle="Navigate: Prescriptions" />
        <StatCard title="Lab Results" value="2 New" subtitle="Navigate: Lab Results" />
      </div>

      {/* Health Records & Appointments */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <SectionCard title="Health Records (Navigate via sidebar: Health Records)">
          <div className="space-y-3">
            {[
              { record: "Medical History", date: "Apr 15, 2026", status: "current" },
              { record: "Medications", date: "Apr 10, 2026", status: "current" },
              { record: "Lab Results", date: "Apr 8, 2026", status: "current" },
              { record: "Vaccination Records", date: "Mar 20, 2026", status: "current" },
            ].map((record, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{record.record}</p>
                  <p className="text-xs text-gray-500">{record.date}</p>
                </div>
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-md">
                  View
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="My Appointments (Navigate via sidebar: Appointments)">
          <div className="space-y-3">
            {[
              { date: "Apr 20, 2026 2:00 PM", doctor: "Dr. Smith", type: "Cardiology Checkup", status: "confirmed" },
              { date: "Apr 28, 2026 10:00 AM", doctor: "Dr. Johnson", type: "Lab Work", status: "scheduled" },
              { date: "May 5, 2026 3:30 PM", doctor: "Dr. Lee", type: "Follow-up", status: "scheduled" },
            ].map((apt, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{apt.date}</p>
                  <p className="text-xs text-gray-500">{apt.doctor} - {apt.type}</p>
                </div>
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-md">
                  {apt.status}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Current Health Info */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard title="My Health" value="Active" subtitle="Navigate: My Health (Navigate: Health)" />
        <StatCard title="Book Appointment" value="Available" subtitle="Navigate: Book Appointment" />
        <StatCard title="Billing" value="Current" subtitle="Navigate: Billing (Navigate: Account)" />
      </div>
    </div>
  );
}
