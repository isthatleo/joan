"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Pill, Search, Plus, Eye, CheckCircle, Clock, Loader2,
  Filter, Download, X, ChevronDown, AlertCircle, Printer
} from "lucide-react";

const orange = "#F97316";

interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  medications: Array<{
    medicationId: string;
    name: string;
    dosage: string;
    quantity: number;
    instructions: string;
    refills: number;
  }>;
  status: "pending" | "filled" | "partially-filled" | "cancelled" | "expired";
  priority: "normal" | "urgent" | "routine";
  createdAt: string;
  filledAt?: string;
  expiresAt: string;
}

export default function PrescriptionsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    fetchPrescriptions();
  }, [statusFilter]);

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/${slug}/pharmacy/prescriptions?status=${statusFilter}`);
      if (res.ok) {
        setPrescriptions(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch prescriptions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFillPrescription = async (prescriptionId: string) => {
    try {
      const res = await fetch(`/api/tenant/${slug}/pharmacy/prescriptions/${prescriptionId}/fill`, {
        method: "POST",
      });
      if (res.ok) {
        fetchPrescriptions();
        setShowDetail(false);
      }
    } catch (error) {
      console.error("Failed to fill prescription:", error);
    }
  };

  const filteredPrescriptions = prescriptions.filter(rx => {
    const matchesSearch = rx.patientName.toLowerCase().includes(search.toLowerCase()) ||
                         rx.id.includes(search) ||
                         rx.doctorName.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-50 text-yellow-700 border-yellow-100";
      case "filled": return "bg-green-50 text-green-700 border-green-100";
      case "partially-filled": return "bg-blue-50 text-blue-700 border-blue-100";
      case "cancelled": return "bg-red-50 text-red-700 border-red-100";
      case "expired": return "bg-gray-50 text-gray-700 border-gray-100";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "text-red-600 bg-red-50";
      case "normal": return "text-orange-600 bg-orange-50";
      default: return "text-blue-600 bg-blue-50";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Pharmacy</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Prescriptions</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and fill patient prescriptions.</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all">
            <Download className="size-4" />
            Export
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90" style={{ backgroundColor: orange }}>
            <Plus className="size-4" />
            New Prescription
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by patient name, prescription ID, or doctor..."
              className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none"
          >
            <option value="pending">Pending</option>
            <option value="filled">Filled</option>
            <option value="partially-filled">Partially Filled</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Prescriptions Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    <th className="text-left px-5 py-3">Rx ID</th>
                    <th className="text-left px-5 py-3">Patient</th>
                    <th className="text-left px-5 py-3">Doctor</th>
                    <th className="text-left px-5 py-3">Status</th>
                    <th className="text-left px-5 py-3">Priority</th>
                    <th className="text-left px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr><td colSpan={6} className="py-16 text-center"><Loader2 className="size-6 text-orange-500 animate-spin mx-auto" /></td></tr>
                  ) : filteredPrescriptions.length === 0 ? (
                    <tr><td colSpan={6} className="py-16 text-center">
                      <Pill className="size-10 text-muted mx-auto mb-2" />
                      <p className="text-muted-foreground font-medium">No prescriptions found</p>
                    </td></tr>
                  ) : (
                    filteredPrescriptions.map(rx => (
                      <tr key={rx.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3 whitespace-nowrap">
                          <p className="font-mono font-semibold text-foreground text-xs">#{rx.id.slice(-6)}</p>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <div>
                            <p className="font-semibold text-foreground">{rx.patientName}</p>
                            <p className="text-xs text-muted-foreground">{rx.patientPhone}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <p className="text-foreground">{rx.doctorName}</p>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(rx.status)}`}>
                            {rx.status.replace('-', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getPriorityColor(rx.priority)}`}>
                            {rx.priority.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSelectedPrescription(rx);
                              setShowDetail(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-orange-600 hover:bg-orange-50 font-semibold text-xs transition-colors"
                          >
                            <Eye className="size-3" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Prescription Detail */}
        <div>
          {showDetail && selectedPrescription ? (
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Prescription Details</h3>
                <button
                  onClick={() => setShowDetail(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">Prescription ID</p>
                  <p className="font-mono font-semibold text-foreground">#{selectedPrescription.id.slice(-6)}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Patient</p>
                  <p className="font-semibold text-foreground">{selectedPrescription.patientName}</p>
                  <p className="text-xs text-muted-foreground">{selectedPrescription.patientPhone}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Doctor</p>
                  <p className="font-semibold text-foreground">{selectedPrescription.doctorName}</p>
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground font-semibold mb-3">Medications</p>
                  <div className="space-y-3">
                    {selectedPrescription.medications.map((med, idx) => (
                      <div key={idx} className="p-3 bg-muted/30 rounded-lg">
                        <p className="font-semibold text-foreground text-sm">{med.name}</p>
                        <p className="text-xs text-muted-foreground">{med.dosage}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Qty: {med.quantity}</span>
                          <span>Refills: {med.refills}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">{med.instructions}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(selectedPrescription.status)}`}>
                      {selectedPrescription.status.replace('-', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Priority</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getPriorityColor(selectedPrescription.priority)}`}>
                      {selectedPrescription.priority.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-border">
                  {selectedPrescription.status === "pending" && (
                    <button
                      onClick={() => handleFillPrescription(selectedPrescription.id)}
                      className="w-full px-4 py-2 rounded-lg bg-green-50 text-green-600 font-semibold text-sm hover:bg-green-100 transition-all flex items-center gap-2 justify-center"
                    >
                      <CheckCircle className="size-4" />
                      Fill Prescription
                    </button>
                  )}
                  <button className="w-full px-4 py-2 rounded-lg border border-border text-muted-foreground font-semibold text-sm hover:bg-muted transition-all flex items-center gap-2 justify-center">
                    <Printer className="size-4" />
                    Print
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-6 flex items-center justify-center h-96 text-muted-foreground">
              <div className="text-center">
                <Pill className="size-12 mx-auto mb-4 opacity-50" />
                <p>Select a prescription to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

