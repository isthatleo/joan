"use client";
import { useState } from "react";
import { useAppointments } from "@/hooks/use-queries";

export default function AppointmentsPage() {
  const { data: appointments, isLoading } = useAppointments();
  const [filter, setFilter] = useState("upcoming");

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Appointments</h1>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setFilter("upcoming")}
          className={`px-4 py-2 ${filter === "upcoming" ? "bg-blue-600" : "bg-gray-200"}`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setFilter("completed")}
          className={`px-4 py-2 ${filter === "completed" ? "bg-blue-600" : "bg-gray-200"}`}
        >
          Completed
        </button>
        <button
          onClick={() => setFilter("cancelled")}
          className={`px-4 py-2 ${filter === "cancelled" ? "bg-blue-600" : "bg-gray-200"}`}
        >
          Cancelled
        </button>
      </div>

      <div className="space-y-4">
        {appointments?.map((a: any) => (
          <div key={a.id} className="border rounded-lg p-4">
            <h3 className="font-semibold">{a.patientId}</h3>
            <p className="text-sm text-gray-600">{a.scheduledAt}</p>
            <p className="text-sm">{a.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
