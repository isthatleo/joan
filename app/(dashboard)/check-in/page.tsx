"use client";

import { useState } from "react";
import { Topbar } from "@/components/Topbar";
import { KPICard } from "@/components/KPICard";
import { UserCheck, Clock, Users, CheckCircle, AlertCircle, Plus } from "lucide-react";

export default function CheckInPage() {
  const [patientName, setPatientName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [checkedIn, setCheckedIn] = useState(false);

  const handleCheckIn = () => {
    if (patientName && phoneNumber) {
      setCheckedIn(true);
      setTimeout(() => {
        setCheckedIn(false);
        setPatientName("");
        setPhoneNumber("");
      }, 3000);
    }
  };

  return (
    <div className="space-y-6">
      <Topbar
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Check-in" },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          Patient Check-in
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Fast patient intake and registration
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Checked In Today"
          value="45"
          subtitle="Total registrations"
          color="blue"
          icon={CheckCircle}
        />
        <KPICard
          title="Waiting"
          value="12"
          subtitle="In waiting room"
          color="yellow"
          icon={Clock}
        />
        <KPICard
          title="Being Served"
          value="5"
          subtitle="With doctors"
          color="green"
          icon={Users}
        />
        <KPICard
          title="Avg Check-in Time"
          value="2.5 min"
          subtitle="Today"
          color="purple"
          icon={UserCheck}
        />
      </div>

      {/* Check-in Form */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-gray-200 dark:border-slate-700">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Quick Patient Check-in
        </h3>

        <div className="space-y-4 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Patient Name
            </label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Enter patient name"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Enter phone number"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Appointment Type
              </label>
              <select className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                <option>General Checkup</option>
                <option>Follow-up</option>
                <option>Emergency</option>
                <option>Lab</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Department
              </label>
              <select className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                <option>General</option>
                <option>Pediatrics</option>
                <option>Surgery</option>
                <option>Lab</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleCheckIn}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-lg transition-colors flex items-center justify-center gap-2"
          >
            <UserCheck className="w-6 h-6" />
            Check In Patient
          </button>

          {checkedIn && (
            <div className="p-4 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg">
              <p className="text-green-700 dark:text-green-200 font-semibold">
                ✓ Patient checked in successfully!
              </p>
              <p className="text-sm text-green-600 dark:text-green-300 mt-1">
                Queue number assigned. Waiting time: ~15 minutes
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Today's Check-ins */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Check-ins
          </h3>
          <div className="space-y-3">
            {[
              { name: "John Doe", time: "10:15 AM", queue: "Q-045" },
              { name: "Jane Smith", time: "10:05 AM", queue: "Q-044" },
              { name: "Bob Wilson", time: "09:50 AM", queue: "Q-043" },
              { name: "Alice Brown", time: "09:35 AM", queue: "Q-042" },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {item.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{item.time}</p>
                </div>
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded-full text-sm font-semibold">
                  {item.queue}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Waiting Room Status
          </h3>
          <div className="space-y-4">
            {[
              { dept: "General", patients: 8, wait: "12 min" },
              { dept: "Pediatrics", patients: 3, wait: "8 min" },
              { dept: "Lab", patients: 1, wait: "15 min" },
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {item.dept}
                  </h4>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Wait: {item.wait}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {item.patients} patients waiting
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

