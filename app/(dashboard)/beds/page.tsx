"use client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Search, Plus, Bed, User, Users, Activity, AlertTriangle } from "lucide-react";

export default function BedsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Mock data - in real app, fetch from API
  const beds = [
    {
      id: "B101",
      ward: "Emergency",
      status: "occupied",
      patientId: "P001",
      patientName: "John Doe",
      admissionDate: "2026-04-15",
      condition: "Chest pain",
      assignedNurse: "Nurse Johnson"
    },
    {
      id: "B102",
      ward: "Emergency",
      status: "available",
      patientId: null,
      patientName: null,
      admissionDate: null,
      condition: null,
      assignedNurse: null
    },
    {
      id: "B201",
      ward: "Cardiology",
      status: "occupied",
      patientId: "P002",
      patientName: "Jane Smith",
      admissionDate: "2026-04-14",
      condition: "Heart failure",
      assignedNurse: "Nurse Davis"
    },
    {
      id: "B202",
      ward: "Cardiology",
      status: "maintenance",
      patientId: null,
      patientName: null,
      admissionDate: null,
      condition: null,
      assignedNurse: null
    },
    {
      id: "B301",
      ward: "ICU",
      status: "occupied",
      patientId: "P003",
      patientName: "Bob Wilson",
      admissionDate: "2026-04-13",
      condition: "Pneumonia",
      assignedNurse: "Nurse Johnson"
    },
    {
      id: "B401",
      ward: "Pediatrics",
      status: "occupied",
      patientId: "P004",
      patientName: "Alice Brown",
      admissionDate: "2026-04-12",
      condition: "Asthma",
      assignedNurse: "Nurse Taylor"
    }
  ];

  const filteredBeds = beds.filter(bed => {
    const matchesSearch = bed.ward.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bed.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bed.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || bed.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: beds.length,
    occupied: beds.filter(b => b.status === "occupied").length,
    available: beds.filter(b => b.status === "available").length,
    maintenance: beds.filter(b => b.status === "maintenance").length
  };

  const occupancyRate = Math.round((stats.occupied / stats.total) * 100);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "occupied": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "available": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "maintenance": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "occupied": return <User className="w-5 h-5 text-red-600" />;
      case "available": return <Bed className="w-5 h-5 text-green-600" />;
      case "maintenance": return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default: return <Bed className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Ward Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Monitor bed occupancy and patient assignments
            </p>
          </div>
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-5 h-5" />
            <span>Assign Patient</span>
          </button>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Beds</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <Bed className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Occupied</p>
              <p className="text-3xl font-bold text-red-600">{stats.occupied}</p>
            </div>
            <User className="w-8 h-8 text-red-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Available</p>
              <p className="text-3xl font-bold text-green-600">{stats.available}</p>
            </div>
            <Activity className="w-8 h-8 text-green-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Maintenance</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.maintenance}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Occupancy</p>
              <p className="text-3xl font-bold text-purple-600">{occupancyRate}%</p>
            </div>
            <Users className="w-8 h-8 text-purple-600" />
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
              placeholder="Search by bed number, ward, or patient name..."
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
              <option value="occupied">Occupied</option>
              <option value="available">Available</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Beds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBeds.map((bed) => (
          <Card key={bed.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                {getStatusIcon(bed.status)}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Bed {bed.id}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{bed.ward} Ward</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bed.status)}`}>
                {bed.status}
              </span>
            </div>

            {bed.patientId ? (
              <div className="space-y-3 mb-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <User className="w-4 h-4" />
                  <span className="font-medium">Patient:</span>
                  <span>{bed.patientName} ({bed.patientId})</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Condition:</span> {bed.condition}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Admitted:</span> {bed.admissionDate}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Nurse:</span> {bed.assignedNurse}
                </div>
              </div>
            ) : (
              <div className="mb-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg text-center">
                <Bed className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {bed.status === "available" ? "Bed available for assignment" : "Under maintenance"}
                </p>
              </div>
            )}

            <div className="flex space-x-2">
              {bed.status === "available" && (
                <button className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                  Assign Patient
                </button>
              )}
              {bed.status === "occupied" && (
                <>
                  <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                    View Patient
                  </button>
                  <button className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors">
                    Transfer
                  </button>
                </>
              )}
              {bed.status === "maintenance" && (
                <button className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
                  Mark Ready
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filteredBeds.length === 0 && (
        <Card className="p-12 text-center">
          <Bed className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No beds found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm ? 'Try adjusting your search terms' : 'No beds match your current filters'}
          </p>
        </Card>
      )}
    </div>
  );
}
