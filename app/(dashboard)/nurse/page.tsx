"use client";

import { useMemo, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { KPICard } from "@/components/KPICard";
import { DataCard, DataCardItem } from "@/components/DataCard";
import { BellRing, ClipboardList, HeartPulse, Syringe } from "lucide-react";

const roundsSeed: DataCardItem[] = [
  { id: "rd-1", title: "Arianna Patel", subtitle: "Vitals due · Bed 12", status: "pending", value: "08:30" },
  { id: "rd-2", title: "Marcus Cole", subtitle: "Medication pass · Bed 09", status: "in-progress", value: "08:40" },
  { id: "rd-3", title: "Sofia Nguyen", subtitle: "Pain reassessment · Bed 21", status: "pending", value: "09:05" },
  { id: "rd-4", title: "James Rivera", subtitle: "Discharge prep · Bed 04", status: "urgent", value: "09:10" },
];

export default function NurseDashboard() {
  const [rounds, setRounds] = useState(roundsSeed);
  const [alerts, setAlerts] = useState(2);

  const markDone = (task: DataCardItem) => {
    setRounds((prev) => prev.map((item) => (item.id === task.id ? { ...item, status: "completed", value: "Completed" } : item)));
  };

  const pendingRounds = useMemo(() => rounds.filter((item) => item.status === "pending" || item.status === "urgent").length, [rounds]);
  const completedRounds = useMemo(() => rounds.filter((item) => item.status === "completed").length, [rounds]);

  return (
    <div className="space-y-6">
      <Topbar breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Nurse" }]} />

      <section>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Nursing Station</h1>
        <p className="text-gray-600 dark:text-gray-400">Track rounds, vitals capture, and medication administration in one workflow.</p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard title="Rounds pending" value={pendingRounds} subtitle="Need nurse action" icon={ClipboardList} color="yellow" />
        <KPICard title="Completed tasks" value={completedRounds} subtitle="This shift" icon={HeartPulse} color="green" />
        <KPICard title="Medication passes" value={3} subtitle="Next due in 20m" icon={Syringe} color="blue" />
        <KPICard title="Active alerts" value={alerts} subtitle="Escalations open" icon={BellRing} color="red" />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <DataCard
            title="Shift Round Queue"
            items={rounds}
            onItemClick={markDone}
            emptyMessage="No active rounds"
          />
        </div>

        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Rapid Actions</h2>
          <button
            onClick={() => setAlerts((count) => Math.max(0, count - 1))}
            className="w-full rounded-lg border border-gray-200 px-4 py-2 text-left text-sm hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-700"
          >
            Acknowledge top alert
          </button>
          <button className="w-full rounded-lg border border-gray-200 px-4 py-2 text-left text-sm hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-700">
            Start vitals capture batch
          </button>
          <button className="w-full rounded-lg border border-gray-200 px-4 py-2 text-left text-sm hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-700">
            Print medication checklist
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400">Tip: click a task in the queue to mark it completed.</p>
        </div>
      </section>
    </div>
  );
}
