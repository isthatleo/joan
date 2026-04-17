"use client";

import { FormEvent, useMemo, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { KPICard } from "@/components/KPICard";
import { DataCard, DataCardItem } from "@/components/DataCard";
import { CalendarCheck2, ClipboardCheck, Timer, UserPlus } from "lucide-react";

const arrivalsSeed: DataCardItem[] = [
  { id: "ap-101", title: "Arianna Patel", subtitle: "09:00 · Cardiology", status: "in-progress", value: "Checked-in" },
  { id: "ap-102", title: "Marcus Cole", subtitle: "09:15 · Endocrinology", status: "pending", value: "Waiting" },
  { id: "ap-103", title: "Sofia Nguyen", subtitle: "09:30 · Neurology", status: "pending", value: "Waiting" },
];

export default function ReceptionistDashboard() {
  const [arrivals, setArrivals] = useState(arrivalsSeed);
  const [name, setName] = useState("");

  const checkInPatient = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setArrivals((current) => [
      {
        id: `ap-${100 + current.length + 1}`,
        title: trimmed,
        subtitle: "Walk-in · General Practice",
        status: "pending",
        value: "Waiting",
      },
      ...current,
    ]);
    setName("");
  };

  const markArrived = (item: DataCardItem) => {
    setArrivals((current) => current.map((entry) => (entry.id === item.id ? { ...entry, status: "in-progress", value: "Checked-in" } : entry)));
  };

  const checkedIn = useMemo(() => arrivals.filter((item) => item.status === "in-progress" || item.status === "completed").length, [arrivals]);

  return (
    <div className="space-y-6">
      <Topbar breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Reception" }]} />

      <section>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reception Desk</h1>
        <p className="text-gray-600 dark:text-gray-400">Handle check-ins, walk-ins, and front-desk queue progression.</p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard title="Appointments today" value={arrivals.length + 18} subtitle="Scheduled" icon={CalendarCheck2} color="blue" />
        <KPICard title="Check-ins complete" value={checkedIn} subtitle="Front desk verified" icon={ClipboardCheck} color="green" />
        <KPICard title="Walk-ins" value={arrivals.filter((item) => item.subtitle?.includes("Walk-in")).length} subtitle="Unscheduled" icon={UserPlus} color="yellow" />
        <KPICard title="Avg wait" value="11 min" subtitle="Current estimate" icon={Timer} color="purple" />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <DataCard title="Arrival Queue" items={arrivals} onItemClick={markArrived} />
        </div>

        <form onSubmit={checkInPatient} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Walk-in Check-in</h2>
          <label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="walkin-name">
            Patient name
          </label>
          <input
            id="walkin-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter full name"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2 dark:border-slate-600 dark:bg-slate-900"
          />
          <button type="submit" className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Add to queue
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400">Tip: click a queue row to mark a patient checked-in.</p>
        </form>
      </section>
    </div>
  );
}
