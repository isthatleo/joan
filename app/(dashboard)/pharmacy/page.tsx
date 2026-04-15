"use client";

import { useState } from "react";
import { Topbar } from "@/components/Topbar";
import { KPICard } from "@/components/KPICard";
import { DataCard, DataCardItem } from "@/components/DataCard";
import { Pill, AlertCircle, CheckCircle, Boxes, Plus, TrendingUp } from "lucide-react";

const mockPrescriptions: DataCardItem[] = [
  {
    id: "1",
    title: "Amoxicillin 500mg",
    subtitle: "John Doe",
    status: "pending",
    value: "Dispense",
  },
  {
    id: "2",
    title: "Metformin 1000mg",
    subtitle: "Jane Smith",
    status: "completed",
    value: "Dispensed",
  },
  {
    id: "3",
    title: "Aspirin 100mg",
    subtitle: "Bob Johnson",
    status: "in-progress",
    value: "Processing",
  },
];

const mockInventory: DataCardItem[] = [
  {
    id: "1",
    title: "Amoxicillin 500mg",
    subtitle: "Only 12 units left",
    status: "urgent",
    value: "Order",
  },
  {
    id: "2",
    title: "Metformin 1000mg",
    subtitle: "35 units available",
    status: "pending",
    value: "Monitor",
  },
  {
    id: "3",
    title: "Aspirin 100mg",
    subtitle: "150 units in stock",
    status: "normal",
    value: "Good",
  },
];

export default function PharmacyPage() {
  const [view, setView] = useState<"prescriptions" | "inventory" | "analytics">("prescriptions");

  return (
    <div className="space-y-6">
      <Topbar
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Pharmacy" },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Dispense Hub
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Pharmacy operations and inventory management
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors">
          <Plus className="w-5 h-5" />
          New Prescription
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Prescriptions Pending"
          value="28"
          subtitle="Awaiting dispensing"
          color="orange"
          icon={Pill}
          trend={{ value: 7, label: "new", isPositive: false }}
        />
        <KPICard
          title="Inventory Alerts"
          value="7"
          subtitle="Require action"
          color="red"
          icon={AlertCircle}
        />
        <KPICard
          title="Dispensed Today"
          value="156"
          subtitle="Medications"
          color="green"
          icon={CheckCircle}
        />
        <KPICard
          title="Expiring Soon"
          value="3"
          subtitle="In next 30 days"
          color="yellow"
          icon={TrendingUp}
        />
      </div>

      {/* View Toggle */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-200 dark:border-slate-700 flex gap-2">
        <button
          onClick={() => setView("prescriptions")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            view === "prescriptions"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-slate-700"
          }`}
        >
          Prescriptions
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
        <button
          onClick={() => setView("analytics")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            view === "analytics"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-slate-700"
          }`}
        >
          Analytics
        </button>
      </div>

      {/* Prescriptions View */}
      {view === "prescriptions" && (
        <>
          <DataCard
            title="Prescription Queue"
            items={mockPrescriptions}
            onItemClick={(item) => console.log("Dispense", item)}
          />
        </>
      )}

      {/* Inventory View */}
      {view === "inventory" && (
        <>
          <DataCard
            title="Low Stock Items"
            items={mockInventory}
            onItemClick={(item) => console.log("View inventory", item)}
          />
        </>
      )}

      {/* Analytics View */}
      {view === "analytics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Top Dispensed Drugs
              </h3>
              <div className="space-y-3">
                {[
                  { drug: "Amoxicillin", count: 45, trend: "+5%" },
                  { drug: "Metformin", count: 32, trend: "+8%" },
                  { drug: "Aspirin", count: 28, trend: "-2%" },
                  { drug: "Ibuprofen", count: 21, trend: "+3%" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg"
                  >
                    <span className="font-medium text-gray-900 dark:text-white">{item.drug}</span>
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
                Inventory Value
              </h3>
              <div className="space-y-3">
                {[
                  { category: "Antibiotics", value: "$12,450", items: "234" },
                  { category: "Pain Relief", value: "$8,230", items: "156" },
                  { category: "Chronic Care", value: "$15,670", items: "289" },
                  { category: "Other", value: "$6,450", items: "178" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.category}</p>
                      <p className="text-xs text-gray-600">{item.items} items</p>
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drug Interactions Alert */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Drug Interactions Detected
        </h3>
        <div className="space-y-3">
          {[
            {
              drugs: "Warfarin + Aspirin",
              risk: "High",
              status: "urgent",
            },
            {
              drugs: "Metformin + Contrast",
              risk: "Medium",
              status: "pending",
            },
          ].map((interaction, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between p-4 rounded-lg ${
                interaction.status === "urgent"
                  ? "bg-red-50 dark:bg-red-900"
                  : "bg-yellow-50 dark:bg-yellow-900"
              }`}
            >
              <span className="font-medium text-gray-900 dark:text-white">
                {interaction.drugs}
              </span>
              <span
                className={`text-sm font-semibold ${
                  interaction.status === "urgent"
                    ? "text-red-600"
                    : "text-yellow-600"
                }`}
              >
                {interaction.risk} Risk
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
