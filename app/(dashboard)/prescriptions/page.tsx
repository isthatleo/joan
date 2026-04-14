"use client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Search, Plus, Pill, Clock, CheckCircle, AlertTriangle, User } from "lucide-react";

export default function PrescriptionsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Mock data - in real app, fetch from API
  const prescriptions = [
    {
      id: "RX001",
      patientId: "P001",
      patientName: "John Doe",
      medication: "Metformin",
      dosage: "500mg",
      frequency: "Twice daily",
      duration: "30 days",
      status: "active",
      prescribedBy: "Dr. Smith",
      prescribedAt: "2026-04-15 09:30",
      notes: "Take with meals"
    },
    {
      id: "RX002",
      patientId: "P002",
      patientName: "Jane Smith",
      medication: "Lisinopril",
      dosage: "10mg",
      frequency: "Once daily",
      duration: "90 days",
      status: "pending",
      prescribedBy: "Dr. Johnson",
      prescribedAt: "2026-04-15 10:15",
      notes: "Monitor blood pressure"
    },
    {
      id: "RX003",
      patientId: "P003",
      patientName: "Bob Wilson",
      medication: "Amoxicillin",
      dosage: "500mg",
      frequency: "Three times daily",
      duration: "7 days",
      status: "completed",
      prescribedBy: "Dr. Smith",
      prescribedAt: "2026-04-14 14:20",
      notes: "Complete full course"
    }
  ];

  const filteredPrescriptions = prescriptions.filter(rx => {
    const matchesSearch = rx.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rx.medication.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rx.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || rx.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: prescriptions.length,
    active: prescriptions.filter(rx => rx.status === "active").length,
    pending: prescriptions.filter(rx => rx.status === "pending").length,
    completed: prescriptions.filter(rx => rx.status === "completed").length
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "pending": return <Clock className="w-5 h-5 text-orange-600" />;
      case "completed": return <AlertTriangle className="w-5 h-5 text-blue-600" />;
      default: return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "completed": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Prescriptions</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage patient prescriptions and medication orders
            </p>
          </div>
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-5 h-5" />
            <span>Write Prescription</span>
          </button>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Prescriptions</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <Pill className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active</p>
              <p className="text-3xl font-bold text-green-600">{stats.active}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-3xl font-bold text-orange-600">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-3xl font-bold text-blue-600">{stats.completed}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-blue-600" />
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
              placeholder="Search by patient name, medication, or prescription ID..."
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
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Prescriptions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredPrescriptions.map((rx) => (
          <Card key={rx.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                {getStatusIcon(rx.status)}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{rx.medication}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Rx #{rx.id}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(rx.status)}`}>
                {rx.status}
              </span>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <User className="w-4 h-4" />
                <span className="font-medium">Patient:</span>
                <span>{rx.patientName} ({rx.patientId})</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">Dosage:</span>
                  <p className="text-gray-900 dark:text-white">{rx.dosage}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">Frequency:</span>
                  <p className="text-gray-900 dark:text-white">{rx.frequency}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">Duration:</span>
                  <p className="text-gray-900 dark:text-white">{rx.duration}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">Prescribed by:</span>
                  <p className="text-gray-900 dark:text-white">{rx.prescribedBy}</p>
                </div>
              </div>
              {rx.notes && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Notes:</span> {rx.notes}
                </div>
              )}
            </div>

            <div className="flex space-x-2">
              <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                View Details
              </button>
              {rx.status === "pending" && (
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                  Dispense
                </button>
              )}
              {rx.status === "active" && (
                <button className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors">
                  Refill
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filteredPrescriptions.length === 0 && (
        <Card className="p-12 text-center">
          <Pill className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No prescriptions found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm ? 'Try adjusting your search terms' : 'No prescriptions match your current filters'}
          </p>
        </Card>
      )}
    </div>
  );
}
