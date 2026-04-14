"use client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Search, Plus, Pill, Clock, CheckCircle, AlertTriangle, User } from "lucide-react";

export default function MedicationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Mock data - in real app, fetch from API
  const medications = [
    {
      id: "M001",
      patientId: "P001",
      patientName: "John Doe",
      medication: "Aspirin",
      dosage: "100mg",
      frequency: "2x daily",
      status: "given",
      scheduledTime: "08:00",
      administeredBy: "Nurse Johnson",
      administeredAt: "2026-04-15 08:05",
      notes: "Patient took with water"
    },
    {
      id: "M002",
      patientId: "P002",
      patientName: "Jane Smith",
      medication: "Metformin",
      dosage: "500mg",
      frequency: "3x daily",
      status: "pending",
      scheduledTime: "12:00",
      administeredBy: null,
      administeredAt: null,
      notes: "Take with meals"
    },
    {
      id: "M003",
      patientId: "P003",
      patientName: "Bob Wilson",
      medication: "Lisinopril",
      dosage: "10mg",
      frequency: "1x daily",
      status: "missed",
      scheduledTime: "09:00",
      administeredBy: null,
      administeredAt: null,
      notes: "Patient refused medication"
    }
  ];

  const filteredMedications = medications.filter(med => {
    const matchesSearch = med.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         med.medication.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         med.patientId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || med.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: medications.length,
    given: medications.filter(m => m.status === "given").length,
    pending: medications.filter(m => m.status === "pending").length,
    missed: medications.filter(m => m.status === "missed").length
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "given": return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "pending": return <Clock className="w-5 h-5 text-orange-600" />;
      case "missed": return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default: return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "given": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "missed": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Medication Administration</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Track and administer patient medications
            </p>
          </div>
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-5 h-5" />
            <span>Schedule Medication</span>
          </button>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Doses</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <Pill className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Given</p>
              <p className="text-3xl font-bold text-green-600">{stats.given}</p>
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Missed</p>
              <p className="text-3xl font-bold text-red-600">{stats.missed}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
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
              placeholder="Search by patient name, medication, or patient ID..."
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
              <option value="given">Given</option>
              <option value="pending">Pending</option>
              <option value="missed">Missed</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Medications Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredMedications.map((med) => (
          <Card key={med.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                {getStatusIcon(med.status)}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{med.medication}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Dose #{med.id}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(med.status)}`}>
                  {med.status}
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                  {med.scheduledTime}
                </span>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <User className="w-4 h-4" />
                <span className="font-medium">Patient:</span>
                <span>{med.patientName} ({med.patientId})</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">Dosage:</span>
                  <p className="text-gray-900 dark:text-white">{med.dosage}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">Frequency:</span>
                  <p className="text-gray-900 dark:text-white">{med.frequency}</p>
                </div>
              </div>
              {med.administeredBy && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Administered by:</span> {med.administeredBy}
                  {med.administeredAt && <span> at {med.administeredAt.split(' ')[1]}</span>}
                </div>
              )}
              {med.notes && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Notes:</span> {med.notes}
                </div>
              )}
            </div>

            <div className="flex space-x-2">
              {med.status === "pending" && (
                <>
                  <button className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                    Mark as Given
                  </button>
                  <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
                    Mark as Missed
                  </button>
                </>
              )}
              {med.status === "given" && (
                <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                  View Details
                </button>
              )}
              {med.status === "missed" && (
                <>
                  <button className="flex-1 bg-orange-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors">
                    Reschedule
                  </button>
                  <button className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors">
                    View Details
                  </button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filteredMedications.length === 0 && (
        <Card className="p-12 text-center">
          <Pill className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No medications found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm ? 'Try adjusting your search terms' : 'No medications match your current filters'}
          </p>
        </Card>
      )}
    </div>
  );
}
