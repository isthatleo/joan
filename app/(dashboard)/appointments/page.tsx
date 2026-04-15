"use client";

import { useState } from "react";
import { useAppointments } from "@/hooks/use-queries";
import { Topbar } from "@/components/Topbar";
import { KPICard } from "@/components/KPICard";
import { DataCard, DataCardItem } from "@/components/DataCard";
import { Calendar, Clock, Users, Plus, AlertCircle, CheckCircle } from "lucide-react";

export default function AppointmentsPage() {
  const { data: appointments, isLoading } = useAppointments();
  const [filter, setFilter] = useState("upcoming");

  // Mock appointments data
  const mockAppointments: DataCardItem[] = [
    {
      id: "1",
      title: "John Doe",
      subtitle: "General Checkup",
      status: "pending",
      value: "10:30 AM",
    },
    {
      id: "2",
      title: "Jane Smith",
      subtitle: "Follow-up",
      status: "in-progress",
      value: "11:00 AM",
    },
    {
      id: "3",
      title: "Bob Johnson",
      subtitle: "Lab Results",
      status: "completed",
      value: "2:00 PM",
    },
    {
      id: "4",
      title: "Alice Wilson",
      subtitle: "Vaccination",
      status: "pending",
      value: "3:30 PM",
    },
  ];

  return (
    <div className="space-y-6">
      <Topbar
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Appointments" },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Appointments
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Schedule and manage patient appointments
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors">
          <Plus className="w-5 h-5" />
          New Appointment
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Today's Appointments"
          value="12"
          subtitle="Scheduled"
          color="blue"
          icon={Calendar}
          trend={{
            value: 3,
            label: "completed",
            isPositive: true,
          }}
        />
        <KPICard
          title="Waiting Patients"
          value="3"
          subtitle="In queue"
          color="orange"
          icon={Clock}
          trend={{
            value: 1,
            label: "urgent",
            isPositive: false,
          }}
        />
        <KPICard
          title="Completed"
          value="8"
          subtitle="Today"
          color="green"
          icon={CheckCircle}
        />
        <KPICard
          title="No-shows"
          value="1"
          subtitle="Today"
          color="red"
          icon={AlertCircle}
        />
      </div>

      {/* Filter Buttons */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-200 dark:border-slate-700 flex gap-2">
        <button
          onClick={() => setFilter("upcoming")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            filter === "upcoming"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600"
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setFilter("completed")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            filter === "completed"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600"
          }`}
        >
          Completed
        </button>
        <button
          onClick={() => setFilter("cancelled")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            filter === "cancelled"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600"
          }`}
        >
          Cancelled
        </button>
      </div>

      {/* Appointments List */}
      <DataCard
        title={`Appointments - ${filter} (${mockAppointments.length})`}
        items={mockAppointments}
        onItemClick={(item) => console.log("View appointment", item)}
      />

      {/* Upcoming Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Tomorrow's Appointments
          </h3>
          <div className="space-y-3">
            {[
              { time: "09:00", patient: "David Wilson", doctor: "Dr. Smith" },
              { time: "10:30", patient: "Emma Davis", doctor: "Dr. Johnson" },
              { time: "02:00", patient: "Frank Miller", doctor: "Dr. Brown" },
            ].map((appt, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {appt.patient}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {appt.doctor}
                  </p>
                </div>
                <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                  {appt.time}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            This Week
          </h3>
          <div className="space-y-3">
            {[
              { date: "Wed, Apr 16", count: 14, available: 8 },
              { date: "Thu, Apr 17", count: 11, available: 5 },
              { date: "Fri, Apr 18", count: 16, available: 3 },
              { date: "Mon, Apr 21", count: 9, available: 12 },
            ].map((day, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {day.date}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {day.count} scheduled
                  </p>
                </div>
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded-full text-sm font-medium">
                  {day.available} slots
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
