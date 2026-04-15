"use client";

import { useState } from "react";
import { Topbar } from "@/components/Topbar";
import { KPICard } from "@/components/KPICard";
import { DataCard, DataCardItem } from "@/components/DataCard";
import { TestTube, Microscope, Clock, CheckCircle, AlertCircle, Plus } from "lucide-react";

const mockLabOrders: DataCardItem[] = [
  {
    id: "1",
    title: "CBC + Differential",
    subtitle: "Patient: Alice Wilson",
    status: "pending",
    value: "High priority",
  },
  {
    id: "2",
    title: "Blood Glucose",
    subtitle: "Patient: Bob Harris",
    status: "in-progress",
    value: "Processing",
  },
  {
    id: "3",
    title: "Lipid Panel",
    subtitle: "Patient: Carol Davis",
    status: "completed",
    value: "Ready",
  },
];

const mockResults: DataCardItem[] = [
  {
    id: "1",
    title: "CBC Test",
    subtitle: "Patient: John Doe",
    status: "completed",
    value: "Ready",
  },
  {
    id: "2",
    title: "Blood Glucose",
    subtitle: "Patient: Jane Smith",
    status: "in-progress",
    value: "Processing",
  },
];

export default function LabPage() {
  const [view, setView] = useState<"orders" | "results" | "inventory">("orders");

  return (
    <div className="space-y-6">
      <Topbar
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Lab" },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Lab Pipeline
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Test orders, results, and inventory management
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors">
          <Plus className="w-5 h-5" />
          New Test Order
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Tests Pending"
          value="18"
          subtitle="Awaiting processing"
          color="orange"
          icon={TestTube}
          trend={{ value: 5, label: "new today", isPositive: false }}
        />
        <KPICard
          title="In Progress"
          value="5"
          subtitle="Being analyzed"
          color="blue"
          icon={Microscope}
        />
        <KPICard
          title="Completed Today"
          value="42"
          subtitle="Ready for review"
          color="green"
          icon={CheckCircle}
        />
        <KPICard
          title="Avg Turnaround"
          value="2h 15m"
          subtitle="Today's average"
          color="purple"
          icon={Clock}
        />
      </div>

      {/* View Toggle */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-200 dark:border-slate-700 flex gap-2">
        <button
          onClick={() => setView("orders")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            view === "orders"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-slate-700"
          }`}
        >
          Orders
        </button>
        <button
          onClick={() => setView("results")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            view === "results"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-slate-700"
          }`}
        >
          Results
        </button>
        <button
          onClick={() => setView("inventory")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            view === "inventory"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-slate-700"
          }`}
        >
          Inventory
        </button>
      </div>

      {/* Orders View */}
      {view === "orders" && (
        <>
          <DataCard
            title="Lab Orders Queue"
            items={mockLabOrders}
            onItemClick={(item) => console.log("View order", item)}
          />
        </>
      )}

      {/* Results View */}
      {view === "results" && (
        <>
          <DataCard
            title="Test Results"
            items={mockResults}
            onItemClick={(item) => console.log("View result", item)}
          />
        </>
      )}

      {/* Inventory View */}
      {view === "inventory" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Lab Inventory Status
            </h3>
            <div className="space-y-3">
              {[
                { name: "Blood Collection Tubes", stock: "85%", status: "normal" },
                { name: "Reagents - Type A", stock: "35%", status: "urgent" },
                { name: "Culture Media", stock: "60%", status: "normal" },
                { name: "Test Strips", stock: "45%", status: "pending" },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg"
                >
                  <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
                  <span
                    className={`text-sm font-semibold px-3 py-1 rounded-full ${
                      item.status === "urgent"
                        ? "bg-red-100 text-red-700"
                        : item.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                    }`}
                  >
                    {item.stock}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lab Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Tests Today
          </h3>
          <div className="space-y-3">
            {[
              { test: "CBC", count: 12, trend: "+3" },
              { test: "Blood Glucose", count: 8, trend: "+1" },
              { test: "Lipid Panel", count: 6, trend: "+2" },
              { test: "Thyroid Panel", count: 4, trend: "0" },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg"
              >
                <span className="font-medium text-gray-900 dark:text-white">{item.test}</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 dark:text-white">{item.count}</span>
                  <span className="text-sm text-green-600">{item.trend}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quality Metrics
          </h3>
          <div className="space-y-3">
            {[
              { metric: "Accuracy Rate", value: "99.8%", status: "excellent" },
              { metric: "On-time Delivery", value: "97.2%", status: "excellent" },
              { metric: "Zero Errors Today", value: "0", status: "excellent" },
            ].map((item, idx) => (
              <div key={idx} className="p-3 bg-green-50 dark:bg-green-900 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">{item.metric}</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
