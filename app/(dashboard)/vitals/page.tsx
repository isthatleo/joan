"use client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Search, Plus, Activity, Thermometer, Heart, Wind, User, Clock } from "lucide-react";

export default function VitalsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Mock data - in real app, fetch from API
  const vitals = [
    {
      id: "V001",
      patientId: "P001",
      patientName: "John Doe",
      temperature: "98.6°F",
      bloodPressure: "120/80",
      heartRate: "72 bpm",
      respiratoryRate: "16 breaths/min",
      oxygenSaturation: "98%",
      status: "normal",
      recordedBy: "Nurse Johnson",
      recordedAt: "2026-04-15 09:30",
      notes: "Patient reports feeling well"
    },
    {
      id: "V002",
      patientId: "P002",
      patientName: "Jane Smith",
      temperature: "99.8°F",
      bloodPressure: "140/90",
      heartRate: "88 bpm",
      respiratoryRate: "18 breaths/min",
      oxygenSaturation: "96%",
      status: "elevated",
      recordedBy: "Nurse Davis",
      recordedAt: "2026-04-15 10:15",
      notes: "Monitor blood pressure closely"
    },
    {
      id: "V003",
      patientId: "P003",
      patientName: "Bob Wilson",
      temperature: "97.2°F",
      bloodPressure: "118/76",
      heartRate: "68 bpm",
      respiratoryRate: "14 breaths/min",
      oxygenSaturation: "99%",
      status: "normal",
      recordedBy: "Nurse Johnson",
      recordedAt: "2026-04-15 11:00",
      notes: "Stable vitals"
    }
  ];

  const filteredVitals = vitals.filter(vital => {
    const matchesSearch = vital.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vital.patientId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || vital.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: vitals.length,
    normal: vitals.filter(v => v.status === "normal").length,
    elevated: vitals.filter(v => v.status === "elevated").length,
    critical: vitals.filter(v => v.status === "critical").length
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "normal": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "elevated": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "critical": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-200";
    }
  };

  const getVitalIcon = (vital: string) => {
    switch (vital) {
      case "temperature": return <Thermometer className="w-4 h-4 text-red-600" />;
      case "bloodPressure": return <Activity className="w-4 h-4 text-blue-600" />;
      case "heartRate": return <Heart className="w-4 h-4 text-red-600" />;
      case "respiratoryRate": return <Wind className="w-4 h-4 text-green-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Vitals Tracking</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Monitor and record patient vital signs
            </p>
          </div>
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-5 h-5" />
            <span>Record New Vitals</span>
          </button>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Readings</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Normal</p>
              <p className="text-3xl font-bold text-green-600">{stats.normal}</p>
            </div>
            <Heart className="w-8 h-8 text-green-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Elevated</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.elevated}</p>
            </div>
            <Thermometer className="w-8 h-8 text-yellow-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Critical</p>
              <p className="text-3xl font-bold text-red-600">{stats.critical}</p>
            </div>
            <Activity className="w-8 h-8 text-red-600" />
          </div>
        </Card>
      </div>

      {/* Filters Card */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by patient name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="normal">Normal</option>
              <option value="elevated">Elevated</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Vitals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredVitals.map((vital) => (
          <Card key={vital.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{vital.patientName}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">ID: {vital.patientId}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(vital.status)}`}>
                  {vital.status}
                </span>
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400">{vital.recordedAt.split(' ')[1]}</span>
              </div>
            </div>

            {/* Vital Signs Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900 rounded-lg">
                {getVitalIcon("temperature")}
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Temperature</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{vital.temperature}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                {getVitalIcon("bloodPressure")}
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Blood Pressure</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{vital.bloodPressure}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900 rounded-lg">
                {getVitalIcon("heartRate")}
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Heart Rate</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{vital.heartRate}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900 rounded-lg">
                {getVitalIcon("respiratoryRate")}
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Respiratory Rate</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{vital.respiratoryRate}</p>
                </div>
              </div>
            </div>

            <div className="mb-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">O2 Saturation:</span> {vital.oxygenSaturation}
              </p>
            </div>

            <div className="space-y-2 mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Recorded by:</span> {vital.recordedBy}
              </p>
              {vital.notes && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Notes:</span> {vital.notes}
                </p>
              )}
            </div>

            <div className="flex space-x-2">
              <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                View History
              </button>
              <button className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                Update Vitals
              </button>
            </div>
          </Card>
        ))}
      </div>

      {filteredVitals.length === 0 && (
        <Card className="p-12 text-center">
          <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No vitals found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm ? 'Try adjusting your search terms' : 'No vitals match your current filters'}
          </p>
        </Card>
      )}
    </div>
  );
}
