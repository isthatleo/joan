"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Pill, Calendar, AlertTriangle, CheckCircle2, RefreshCw,
  Download, MessageSquare, Phone, Search, Filter,
  Clock, User, Stethoscope, Plus, Eye
} from "lucide-react";

interface Prescription {
  id: string;
  medication: {
    name: string;
    genericName?: string;
    strength: string;
    form: string;
  };
  prescriber: {
    name: string;
    specialty: string;
  };
  instructions: {
    dosage: string;
    frequency: string;
    duration: string;
    directions: string;
  };
  status: "active" | "completed" | "discontinued" | "expired";
  prescribedDate: string;
  startDate: string;
  endDate?: string;
  refillsRemaining: number;
  totalRefills: number;
  pharmacy?: {
    name: string;
    phone: string;
    address: string;
  };
  notes?: string;
  sideEffects?: string[];
  interactions?: string[];
}

interface RefillRequest {
  prescriptionId: string;
  requestedDate: string;
  status: "pending" | "approved" | "denied" | "ready";
  pharmacyNotes?: string;
}

export default function PrescriptionsPage() {
  const { slug } = useParams();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [refillRequests, setRefillRequests] = useState<RefillRequest[]>([]);
  const [filteredPrescriptions, setFilteredPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"current" | "history">("current");

  // Fetch prescriptions
  const fetchPrescriptions = async () => {
    try {
      setRefreshing(true);
      const [prescriptionsRes, refillsRes] = await Promise.all([
        fetch(`/api/tenant/${slug}/patient/prescriptions`),
        fetch(`/api/tenant/${slug}/patient/prescriptions/refills`),
      ]);

      if (prescriptionsRes.ok) {
        const prescriptionsData = await prescriptionsRes.json();
        setPrescriptions(prescriptionsData);
        setFilteredPrescriptions(prescriptionsData);
      }

      if (refillsRes.ok) setRefillRequests(await refillsRes.json());

      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch prescriptions:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  // Filter prescriptions
  useEffect(() => {
    let filtered = prescriptions;

    // Tab filter
    if (activeTab === "current") {
      filtered = filtered.filter(p => ["active", "pending"].includes(p.status));
    } else {
      filtered = filtered.filter(p => !["active", "pending"].includes(p.status));
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.medication.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.prescriber.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    setFilteredPrescriptions(filtered);
  }, [prescriptions, searchTerm, statusFilter, activeTab]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "text-green-600 bg-green-50";
      case "completed": return "text-gray-600 bg-gray-50";
      case "discontinued": return "text-red-600 bg-red-50";
      case "expired": return "text-orange-600 bg-orange-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const handleRefillRequest = async (prescriptionId: string) => {
    try {
      const res = await fetch(`/api/tenant/${slug}/patient/prescriptions/${prescriptionId}/refill`, {
        method: "POST",
      });

      if (res.ok) {
        fetchPrescriptions();
      }
    } catch (error) {
      console.error("Failed to request refill:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
          Loading your prescriptions...
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "current", label: "Current", count: prescriptions.filter(p => ["active", "pending"].includes(p.status)).length },
    { id: "history", label: "History", count: prescriptions.filter(p => !["active", "pending"].includes(p.status)).length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Prescriptions
          </p>
          <h1 className="text-3xl font-bold text-foreground mt-1">
            My Prescriptions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your medications and refill requests
          </p>
        </div>
        <button
          onClick={fetchPrescriptions}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:opacity-50 transition-all"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Refill Requests Alert */}
      {refillRequests.filter(r => r.status === "ready").length > 0 && (
        <div className="p-4 rounded-xl border border-green-200 bg-green-50">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div className="flex-1">
              <p className="text-green-900 font-semibold">
                {refillRequests.filter(r => r.status === "ready").length} Prescription(s) Ready for Pickup
              </p>
              <p className="text-green-700 text-sm">
                Your requested refills are ready at the pharmacy. Please pick them up within 7 days.
              </p>
            </div>
            <button className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-all">
              View Details
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-white text-orange-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
            <span className={`px-2 py-0.5 rounded text-xs ${
              activeTab === tab.id ? "bg-orange-100 text-orange-700" : "bg-gray-200 text-gray-600"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search prescriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="discontinued">Discontinued</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Prescriptions List */}
      <div className="space-y-4">
        {filteredPrescriptions.length === 0 && (
          <div className="text-center py-12">
            <Pill className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No prescriptions found</p>
            <p className="text-sm text-gray-400 mt-1">
              {activeTab === "current"
                ? "You don't have any active prescriptions"
                : "No prescription history found"}
            </p>
          </div>
        )}
        {filteredPrescriptions.map((prescription) => (
          <div key={prescription.id} className="p-6 rounded-2xl border border-gray-200 bg-white hover:shadow-sm transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-orange-50 text-orange-600">
                  <Pill className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {prescription.medication.name}
                      {prescription.medication.genericName && (
                        <span className="text-sm font-normal text-gray-600 ml-2">
                          ({prescription.medication.genericName})
                        </span>
                      )}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded font-semibold ${getStatusColor(prescription.status)}`}>
                      {prescription.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600"><strong>Strength:</strong> {prescription.medication.strength}</p>
                      <p className="text-sm text-gray-600"><strong>Form:</strong> {prescription.medication.form}</p>
                      <p className="text-sm text-gray-600"><strong>Prescriber:</strong> {prescription.prescriber.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600"><strong>Dosage:</strong> {prescription.instructions.dosage}</p>
                      <p className="text-sm text-gray-600"><strong>Frequency:</strong> {prescription.instructions.frequency}</p>
                      <p className="text-sm text-gray-600"><strong>Duration:</strong> {prescription.instructions.duration}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-gray-500 mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Prescribed: {new Date(prescription.prescribedDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>Started: {new Date(prescription.startDate).toLocaleDateString()}</span>
                    </div>
                    {prescription.endDate && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>Ends: {new Date(prescription.endDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mb-3">
                    <strong>Directions:</strong> {prescription.instructions.directions}
                  </p>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="text-sm">
                      <span className="font-medium text-gray-900">Refills:</span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${prescription.refillsRemaining > 0 ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"}`}>
                        {prescription.refillsRemaining} of {prescription.totalRefills} remaining
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {prescription.pharmacy && (
              <div className="pt-4 border-t border-gray-100 mb-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Pharmacy Information</h4>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>{prescription.pharmacy.name}</span>
                  <span>{prescription.pharmacy.phone}</span>
                  <span>{prescription.pharmacy.address}</span>
                </div>
              </div>
            )}
            {((prescription.sideEffects?.length ?? 0) > 0 || (prescription.interactions?.length ?? 0) > 0) && (
              <div className="pt-4 border-t border-gray-100 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {prescription.sideEffects && prescription.sideEffects.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        Common Side Effects
                      </h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {prescription.sideEffects.map((effect, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-orange-500 mt-1">•</span>
                            <span>{effect}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {prescription.interactions && prescription.interactions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        Drug Interactions
                      </h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {prescription.interactions.map((interaction, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-red-500 mt-1">•</span>
                            <span>{interaction}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
            {prescription.notes && (
              <div className="pt-4 border-t border-gray-100 mb-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Notes</h4>
                <p className="text-sm text-gray-600">{prescription.notes}</p>
              </div>
            )}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>Last updated: {new Date(prescription.prescribedDate).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                {prescription.status === "active" && prescription.refillsRemaining > 0 && (
                  <button
                    onClick={() => handleRefillRequest(prescription.id)}
                    className="px-4 py-2 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-all text-sm"
                  >
                    Request Refill
                  </button>
                )}
                <button className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-all">
                  <Download className="h-4 w-4" />
                </button>
                <button className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-all">
                  <MessageSquare className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>


      {/* Prescription Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 text-green-600">
              <Pill className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Active Prescriptions</p>
              <p className="text-xl font-bold text-gray-900">
                {prescriptions.filter(p => p.status === "active").length}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Refills Available</p>
              <p className="text-xl font-bold text-gray-900">
                {prescriptions.filter(p => p.refillsRemaining > 0).length}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Refills</p>
              <p className="text-xl font-bold text-gray-900">
                {refillRequests.filter(r => r.status === "pending").length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
