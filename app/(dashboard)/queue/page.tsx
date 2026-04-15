"use client";

import { useState } from "react";
import { Topbar } from "@/components/Topbar";
import { KPICard } from "@/components/KPICard";
import { DataCard, DataCardItem } from "@/components/DataCard";
import { Activity, AlertCircle, CheckCircle, Clock, Plus } from "lucide-react";

const mockQueue: DataCardItem[] = [
  {
    id: "Q-001",
    title: "Q-001",
    subtitle: "John Doe",
    status: "in-progress",
    value: "Dr. Smith",
  },
  {
    id: "Q-002",
    title: "Q-002",
    subtitle: "Jane Wilson",
    status: "pending",
    value: "Waiting",
  },
  {
    id: "Q-003",
    title: "Q-003",
    subtitle: "Bob Harris",
    status: "pending",
    value: "Waiting",
  },
  {
    id: "Q-004",
    title: "Q-004",
    subtitle: "Alice Brown",
    status: "pending",
    value: "Waiting",
  },
];

export default function QueuePage() {
  const [queue, setQueue] = useState(mockQueue);

  const handleCallNext = () => {
    if (queue.length > 1) {
      const updated = [...queue];
      updated[0].status = "completed";
      updated[1].status = "in-progress";
      setQueue(updated.slice(1));
    }
  };

  const waitingCount = queue.filter((q) => q.status === "pending").length;
  const servingCount = queue.filter((q) => q.status === "in-progress").length;
  const completedCount = mockQueue.length - queue.length;

  return (
    <div className="space-y-6">
      <Topbar
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Queue" },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Patient Queue
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Real-time queue management and tracking
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors">
          <Plus className="w-5 h-5" />
          Add to Queue
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Waiting Patients"
          value={waitingCount}
          subtitle="In queue"
          color="orange"
          icon={Clock}
        />
        <KPICard
          title="Currently Serving"
          value={servingCount}
          subtitle="With doctor"
          color="blue"
          icon={Activity}
        />
        <KPICard
          title="Completed Today"
          value={completedCount}
          subtitle="Discharged"
          color="green"
          icon={CheckCircle}
        />
        <KPICard
          title="Average Wait Time"
          value="12 min"
          subtitle="Current average"
          color="purple"
          icon={Clock}
        />
      </div>

      {/* Queue Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Now Serving */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-2xl p-8 border border-blue-200 dark:border-blue-700 text-center">
            <p className="text-sm font-medium text-blue-600 dark:text-blue-300 mb-2">
              NOW SERVING
            </p>
            {queue.find((q) => q.status === "in-progress") ? (
              <>
                <h2 className="text-5xl font-bold text-blue-700 dark:text-blue-200 mb-2">
                  {queue.find((q) => q.status === "in-progress")?.id}
                </h2>
                <p className="text-blue-600 dark:text-blue-300 font-medium">
                  {queue.find((q) => q.status === "in-progress")?.subtitle}
                </p>
                <button
                  onClick={handleCallNext}
                  className="mt-6 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  Next Patient
                </button>
              </>
            ) : (
              <p className="text-blue-600 dark:text-blue-300">No patients in queue</p>
            )}
          </div>
        </div>

        {/* Queue List */}
        <div className="lg:col-span-2">
          <DataCard
            title={`Queue (${queue.length} waiting)`}
            items={queue}
            onItemClick={(item) => console.log("View queue item", item)}
          />
        </div>
      </div>

      {/* Queue Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold mb-4">Department Status</h2>
          <div className="space-y-3">
            <div>
              <p className="text-gray-600">Total in Queue</p>
              <p className="text-3xl font-bold">4</p>
            </div>
            <div>
              <p className="text-gray-600">Avg Wait Time</p>
              <p className="text-3xl font-bold">12 min</p>
            </div>
            <div>
              <p className="text-gray-600">Completed Today</p>
              <p className="text-3xl font-bold">32</p>
            </div>
            <button className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700">
              Call Next Patient
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Queue Board Display</h2>
        <div className="text-center p-8 bg-gray-100 rounded-lg">
          <p className="text-6xl font-bold text-blue-600">NOW SERVING</p>
          <p className="text-5xl font-bold mt-4">A-102</p>
          <p className="text-2xl mt-4">Jane Smith</p>
          <p className="text-xl text-gray-600 mt-2">ROOM 3</p>
        </div>
      </div>
    </div>
  );
}
