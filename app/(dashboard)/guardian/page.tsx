"use client";

import { PageHeader, StatCard, SectionCard } from "@/components/ui";

export default function GuardianDashboard() {
  return (
    <div>
      <PageHeader
        title="Guardian Portal"
        subtitle="Manage your family's health - Navigate via sidebar: Family, Child Profiles, Appointments, Health Records, Vaccinations, Alerts"
      />

      {/* Guardian KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard title="Children Managed" value="2" subtitle="Navigate: Child Profiles" />
        <StatCard title="Upcoming Appointments" value="3" subtitle="Navigate: Appointments" />
        <StatCard title="Vaccinations Due" value="1" subtitle="Navigate: Vaccinations" />
        <StatCard title="Alerts & Reminders" value="2" subtitle="Navigate: Alerts & Reminders" />
      </div>

      {/* Family Management & Health */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <SectionCard title="Child Profiles (Navigate via sidebar: Child Profiles)">
          <div className="space-y-3">
            {[
              { name: "Emma Wilson (9 years)", age: "9 yrs", lastVisit: "Apr 10, 2026", status: "healthy" },
              { name: "Lucas Wilson (5 years)", age: "5 yrs", lastVisit: "Mar 25, 2026", status: "healthy" },
            ].map((child, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{child.name}</p>
                  <p className="text-xs text-gray-500">Last visit: {child.lastVisit}</p>
                </div>
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-md">
                  {child.status}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Family Appointments (Navigate via sidebar: Appointments)">
          <div className="space-y-3">
            {[
              { date: "Apr 22, 2026 2:00 PM", child: "Emma Wilson", doctor: "Dr. Smith", type: "Checkup" },
              { date: "Apr 25, 2026 10:00 AM", child: "Lucas Wilson", doctor: "Dr. Johnson", type: "Lab Work" },
              { date: "May 2, 2026 3:00 PM", child: "Emma Wilson", doctor: "Dr. Lee", type: "Dental" },
            ].map((apt, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{apt.date}</p>
                  <p className="text-xs text-gray-500">{apt.child} - {apt.type}</p>
                </div>
                <button className="text-blue-600 hover:text-blue-700 text-xs font-medium">
                  View
                </button>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Vaccinations & Family Management */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard title="Vaccinations" value="Up to date" subtitle="Navigate: Vaccinations" />
        <StatCard title="Book Appointment" value="Available" subtitle="Navigate: Book Appointment" />
        <StatCard title="Family Health" value="Managed" subtitle="Navigate: Family" />
      </div>

      {/* Health Records */}
      <SectionCard title="Family Health Records (Navigate via sidebar: Health Records)">
        <div className="space-y-3">
          {[
            { child: "Emma Wilson", record: "Medical History", date: "Apr 15, 2026" },
            { child: "Emma Wilson", record: "Vaccination Records", date: "Apr 10, 2026" },
            { child: "Lucas Wilson", record: "Lab Results", date: "Mar 20, 2026" },
            { child: "Lucas Wilson", record: "Growth Chart", date: "Mar 15, 2026" },
          ].map((rec, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-900">{rec.child}</p>
                <p className="text-xs text-gray-500">{rec.record} - {rec.date}</p>
              </div>
              <button className="text-blue-600 hover:text-blue-700 text-xs font-medium">
                View
              </button>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
