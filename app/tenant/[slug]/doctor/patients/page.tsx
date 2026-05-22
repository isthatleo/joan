"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Users, Search, Filter, Plus, Eye, Edit, UserPlus,
  Calendar, Pill, FileText, Phone, Mail, MapPin,
  Heart, AlertTriangle, CheckCircle, Clock, Loader2,
  Stethoscope, Activity, TrendingUp
} from "lucide-react";
import Link from "next/link";

const orange = "#F97316";

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  bloodType?: string;
  allergies: string[];
  conditions: string[];
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  insurance?: {
    provider: string;
    policyNumber: string;
  };
  lastVisit?: string;
  nextAppointment?: string;
  healthStatus: "excellent" | "good" | "fair" | "poor";
  riskLevel: "low" | "medium" | "high";
  avatar?: string;
}

interface PatientStats {
  totalPatients: number;
  activePatients: number;
  highRiskPatients: number;
  patientsWithAppointments: number;
  newPatientsThisMonth: number;
}

export default function DoctorPatientsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<PatientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterRisk, setFilterRisk] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const [patientsRes, statsRes] = await Promise.all([
        fetch(`/api/doctor/patients?slug=${slug}`),
        fetch(`/api/doctor/patients/stats?slug=${slug}`)
      ]);

      if (patientsRes.ok) setPatients(await patientsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());

      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch patients:", error);
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = `${patient.firstName} ${patient.lastName}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.phone.includes(searchTerm);

    const matchesStatus = filterStatus === "all" || patient.healthStatus === filterStatus;
    const matchesRisk = filterRisk === "all" || patient.riskLevel === filterRisk;

    return matchesSearch && matchesStatus && matchesRisk;
  });

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "high": return "text-red-600 bg-red-50";
      case "medium": return "text-yellow-600 bg-yellow-50";
      case "low": return "text-green-600 bg-green-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case "excellent": return "text-green-600 bg-green-50";
      case "good": return "text-blue-600 bg-blue-50";
      case "fair": return "text-yellow-600 bg-yellow-50";
      case "poor": return "text-red-600 bg-red-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
          Loading patients...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Patient Management
          </p>
          <h1 className="text-3xl font-bold text-foreground mt-1">
            My Patients
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and monitor your patient caseload
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Patient
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Patients</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalPatients || 0}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 text-green-600">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.activePatients || 0}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">High Risk</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.highRiskPatients || 0}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">With Appointments</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.patientsWithAppointments || 0}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">New This Month</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.newPatientsThisMonth || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search patients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="all">All Health Status</option>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>

          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="all">All Risk Levels</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
          </select>
        </div>
      </div>

      {/* Patients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPatients.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No patients found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filterStatus !== "all" || filterRisk !== "all"
                ? "Try adjusting your search or filters"
                : "No patients assigned to you yet"}
            </p>
            {!searchTerm && filterStatus === "all" && filterRisk === "all" && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add First Patient
              </button>
            )}
          </div>
        ) : (
          filteredPatients.map((patient) => (
            <div key={patient.id} className="p-6 rounded-2xl border border-gray-200 bg-white hover:shadow-lg transition-all">
              {/* Patient Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                    <span className="text-orange-600 font-semibold">
                      {patient.firstName.charAt(0)}{patient.lastName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {patient.firstName} {patient.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Age {calculateAge(patient.dob)} • {patient.gender}
                    </p>
                  </div>
                </div>

                <div className="flex gap-1">
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
                    <Edit className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex gap-2 mb-4">
                <span className={`px-2 py-1 rounded-md text-xs font-semibold ${getHealthStatusColor(patient.healthStatus)}`}>
                  {patient.healthStatus.toUpperCase()}
                </span>
                <span className={`px-2 py-1 rounded-md text-xs font-semibold ${getRiskColor(patient.riskLevel)}`}>
                  {patient.riskLevel.toUpperCase()} RISK
                </span>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{patient.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>{patient.email}</span>
                </div>
                {patient.lastVisit && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>Last visit: {new Date(patient.lastVisit).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {/* Medical Info */}
              <div className="space-y-2 mb-4">
                {patient.bloodType && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Heart className="h-4 w-4" />
                    <span>Blood Type: {patient.bloodType}</span>
                  </div>
                )}

                {patient.allergies.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Allergies: {patient.allergies.join(", ")}</span>
                  </div>
                )}

                {patient.conditions.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="h-4 w-4" />
                    <span>Conditions: {patient.conditions.join(", ")}</span>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Link
                  href={`/tenant/${slug}/doctor/patients/${patient.id}`}
                  className="flex-1 text-center px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  View Profile
                </Link>
                <Link
                  href={`/tenant/${slug}/doctor/appointments/new?patient=${patient.id}`}
                  className="flex-1 text-center px-3 py-2 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                >
                  Book Appt
                </Link>
                <Link
                  href={`/tenant/${slug}/doctor/prescriptions/new?patient=${patient.id}`}
                  className="flex-1 text-center px-3 py-2 text-sm bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  Prescribe
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
