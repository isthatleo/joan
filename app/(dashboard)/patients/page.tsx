"use client";
import { useState } from "react";
import { usePatients } from "@/hooks/use-queries";
import { KPICard } from "@/components/KPICard";
import { DataCard, DataCardItem } from "@/components/DataCard";
import { Topbar } from "@/components/Topbar";
import { Search, Plus, Filter, User, Phone, Mail, Calendar, AlertCircle, Users } from "lucide-react";

export default function PatientsPage() {
  const { data: patients, isLoading } = usePatients();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");



  const filteredPatients = patients?.filter((patient: any) => {
    const matchesSearch = patient.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || patient.status === filterStatus;
    return matchesSearch && matchesFilter;
  }) || [];

  return (
    <div className="space-y-6">
      <Topbar
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Patients" },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Patients
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage all patient records and information
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors">
          <Plus className="w-5 h-5" />
          New Patient
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Patients"
          value={patients?.length || 0}
          subtitle="All registered"
          color="blue"
          icon={Users}
          trend={{ value: 12, label: "this month", isPositive: true }}
        />
        <KPICard
          title="Active Patients"
          value={Math.floor((patients?.length || 0) * 0.7)}
          subtitle="Last 30 days"
          color="green"
          icon={Calendar}
          trend={{ value: 8, label: "vs last month", isPositive: true }}
        />
        <KPICard
          title="At Risk"
          value={Math.floor((patients?.length || 0) * 0.1)}
          subtitle="Monitoring needed"
          color="orange"
          icon={AlertCircle}
        />
        <KPICard
          title="New Patients"
          value={Math.floor((patients?.length || 0) * 0.2)}
          subtitle="This month"
          color="purple"
          icon={Plus}
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients by name, email, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Patients</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Patients Data Card */}
      {isLoading ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 animate-pulse">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 dark:bg-slate-700 rounded" />
            ))}
          </div>
        </div>
      ) : (
        <DataCard
          title={`Patients (${filteredPatients.length})`}
          items={(filteredPatients || []).map((patient: any) => ({
            id: patient.id,
            title: `${patient.firstName || ""} ${patient.lastName || ""}`,
            subtitle: `ID: ${patient.id} • DOB: ${patient.dob ? new Date(patient.dob).toLocaleDateString() : "N/A"}`,
            status: patient.status === "active" ? "normal" : patient.status === "pending" ? "pending" : "normal",
            value: patient.status || "Active",
          }))}
          onItemClick={(item) => {
            // Navigate to patient detail
            window.location.href = `/patients/${item.id}`;
          }}
        />
      )}
    </div>
  );
}
