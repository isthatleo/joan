"use client";

import { useMemo } from "react";
import { Topbar } from "@/components/Topbar";
import { DataCard, DataCardItem } from "@/components/DataCard";
import { KPICard } from "@/components/KPICard";
import { Brain, Clock3, Stethoscope, UserCheck } from "lucide-react";
import { useQueueStore } from "@/stores/queue";

const initialQueue = [
  { id: "q-1001", patientId: "P-30041", status: "in-progress", priority: "urgent" },
  { id: "q-1002", patientId: "P-30044", status: "pending", priority: "normal" },
  { id: "q-1003", patientId: "P-30052", status: "pending", priority: "normal" },
  { id: "q-1004", patientId: "P-30068", status: "pending", priority: "urgent" },
];

const patientProfiles: Record<string, { name: string; complaint: string; eta: string }> = {
  "P-30041": { name: "Arianna Patel", complaint: "Chest discomfort", eta: "Room 2" },
  "P-30044": { name: "Marcus Cole", complaint: "Follow-up diabetes", eta: "Waiting Area A" },
  "P-30052": { name: "Sofia Nguyen", complaint: "Migraine and dizziness", eta: "Waiting Area B" },
  "P-30068": { name: "James Rivera", complaint: "Post-op pain review", eta: "Fast Track" },
};

export default function DoctorDashboard() {
  const { queue, setQueue } = useQueueStore();

  const workingQueue = queue.length > 0 ? queue : initialQueue;
  const queueItems: DataCardItem[] = workingQueue.map((entry) => {
    const profile = patientProfiles[entry.patientId] ?? {
      name: entry.patientId,
      complaint: "No complaint recorded",
      eta: "Unknown",
    };

    return {
      id: entry.id,
      title: `${entry.id.toUpperCase()} · ${profile.name}`,
      subtitle: profile.complaint,
      status: entry.status === "in-progress" ? "in-progress" : entry.priority === "urgent" ? "urgent" : "pending",
      value: profile.eta,
    };
  });

  const currentPatient = workingQueue.find((entry) => entry.status === "in-progress");

  const callNext = () => {
    if (workingQueue.length === 0) return;

    const updated = [...workingQueue];
    const currentIndex = updated.findIndex((entry) => entry.status === "in-progress");

    if (currentIndex >= 0) {
      updated[currentIndex] = { ...updated[currentIndex], status: "completed" };
    }

    const nextIndex = updated.findIndex((entry) => entry.status === "pending");
    if (nextIndex >= 0) {
      updated[nextIndex] = { ...updated[nextIndex], status: "in-progress" };
    }

    setQueue(updated.filter((entry) => entry.status !== "completed"));
  };

  const aiSuggestions = useMemo(() => {
    if (!currentPatient) return ["No active patient. Call next to load AI suggestions."];

    const profile = patientProfiles[currentPatient.patientId];
    return [
      `Review allergies and previous ECG before examining ${profile?.name ?? currentPatient.patientId}.`,
      "Order CBC + troponin panel if chest pain duration exceeds 20 minutes.",
      "Document risk score and shared decision making in final note.",
    ];
  }, [currentPatient]);

  return (
    <div className="space-y-6">
      <Topbar breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Doctor" }]} />

      <section>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Doctor Command View</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage queue progression, active patient context, and AI-assisted care prompts.</p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard title="Patients waiting" value={workingQueue.filter((item) => item.status === "pending").length} subtitle="Ready for consult" color="yellow" icon={Clock3} />
        <KPICard title="In consult" value={currentPatient ? 1 : 0} subtitle="Active room" color="blue" icon={Stethoscope} />
        <KPICard title="Urgent cases" value={workingQueue.filter((item) => item.priority === "urgent").length} subtitle="High priority" color="red" icon={UserCheck} />
        <KPICard title="Decision support" value="Live" subtitle="AI copilot online" color="purple" icon={Brain} />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <DataCard title="Consultation Queue" items={queueItems} emptyMessage="No patients in queue" />
        </div>

        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Current Patient</h2>
          {currentPatient ? (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400">{patientProfiles[currentPatient.patientId]?.name}</p>
              <p className="font-medium text-gray-900 dark:text-white">{patientProfiles[currentPatient.patientId]?.complaint}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Location: {patientProfiles[currentPatient.patientId]?.eta}</p>
            </>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No patient currently in consultation.</p>
          )}

          <button
            onClick={callNext}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Call Next Patient
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">AI Copilot Recommendations</h2>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          {aiSuggestions.map((recommendation) => (
            <li key={recommendation} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700">
              {recommendation}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
