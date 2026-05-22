"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ClipboardList, Search, Plus, Eye, CheckCircle, Clock, Loader2,
  Filter, Pill, AlertCircle, Package, MoreVertical, Download, Barcode
} from "lucide-react";

const orange = "#F97316";

interface DispensingItem {
  id: string;
  prescriptionId: string;
  patientName: string;
  patientId: string;
  medications: Array<{
    medicationId: string;
    name: string;
    dosage: string;
    quantity: number;
    dispensed: number;
    instructions: string;
  }>;
  status: "pending" | "in-progress" | "dispensed" | "partial" | "rejected";
  priority: "normal" | "urgent";
  createdAt: string;
  completedAt?: string;
}

export default function DispensingPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [dispensing, setDispensing] = useState<DispensingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedItem, setSelectedItem] = useState<DispensingItem | null>(null);

  useEffect(() => {
    fetchDispensingQueue();
  }, [statusFilter]);

  const fetchDispensingQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/tenant/${slug}/pharmacy/dispensing?status=${statusFilter}`
      );
      if (res.ok) {
        setDispensing(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch dispensing queue:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDispense = async (itemId: string) => {
    try {
      const res = await fetch(`/api/tenant/${slug}/pharmacy/dispensing/${itemId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
      if (res.ok) {
        fetchDispensingQueue();
        setSelectedItem(null);
      }
    } catch (error) {
      console.error("Failed to complete dispensing:", error);
    }
  };

  const filteredDispensing = dispensing.filter(item => {
    const matchesSearch = item.patientName.toLowerCase().includes(search.toLowerCase()) ||
                         item.prescriptionId.includes(search);
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-50 text-yellow-700 border-yellow-100";
      case "in-progress": return "bg-blue-50 text-blue-700 border-blue-100";
      case "dispensed": return "bg-green-50 text-green-700 border-green-100";
      case "partial": return "bg-orange-50 text-orange-700 border-orange-100";
      case "rejected": return "bg-red-50 text-red-700 border-red-100";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const stats = {
    pending: dispensing.filter(d => d.status === "pending").length,
    inProgress: dispensing.filter(d => d.status === "in-progress").length,
    completed: dispensing.filter(d => d.status === "dispensed").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Pharmacy</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Dispensing Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">Process and dispense prescriptions.</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all">
            <Download className="size-4" />
            Export
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90" style={{ backgroundColor: orange }}>
            <Plus className="size-4" />
            New Dispensing
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-2xl font-semibold text-yellow-600">{stats.pending}</p>
            </div>
            <div className="bg-yellow-50 text-yellow-600 p-3 rounded-lg">
              <Clock className="size-6" />
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">In Progress</p>
              <p className="text-2xl font-semibold text-blue-600">{stats.inProgress}</p>
            </div>
            <div className="bg-blue-50 text-blue-600 p-3 rounded-lg">
              <Barcode className="size-6" />
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Dispensed Today</p>
              <p className="text-2xl font-semibold text-green-600">{stats.completed}</p>
            </div>
            <div className="bg-green-50 text-green-600 p-3 rounded-lg">
              <CheckCircle className="size-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by patient name or prescription ID..."
              className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none"
          >
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="dispensed">Dispensed</option>
            <option value="partial">Partial</option>
          </select>
        </div>
      </div>

      {/* Dispensing Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="size-6 text-orange-500 animate-spin" />
              </div>
            ) : filteredDispensing.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <ClipboardList className="size-12 text-muted mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">No dispensing items found</p>
              </div>
            ) : (
              filteredDispensing.map(item => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`bg-card border border-border rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all ${
                    selectedItem?.id === item.id ? "ring-2 ring-orange-500" : ""
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-lg">{item.patientName}</h3>
                      <p className="text-xs text-muted-foreground">Rx #{item.prescriptionId.slice(-6)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(item.status)}`}>
                        {item.status.replace('-', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    {item.medications.slice(0, 2).map((med, idx) => (
                      <div key={idx} className="text-sm">
                        <p className="font-medium text-foreground">{med.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Qty: {med.dispensed}/{med.quantity} • {med.dosage}
                        </p>
                      </div>
                    ))}
                    {item.medications.length > 2 && (
                      <p className="text-xs text-muted-foreground">
                        +{item.medications.length - 2} more medications
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleTimeString()}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                      item.priority === "urgent" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                    }`}>
                      {item.priority.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div>
          {selectedItem ? (
            <div className="bg-card border border-border rounded-xl p-6 sticky top-6">
              <h3 className="font-semibold text-foreground mb-4">Dispensing Details</h3>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">Patient</p>
                  <p className="font-semibold text-foreground">{selectedItem.patientName}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Prescription ID</p>
                  <p className="font-mono font-semibold text-foreground">#{selectedItem.prescriptionId.slice(-6)}</p>
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground font-semibold mb-3">Medications to Dispense</p>
                  <div className="space-y-2">
                    {selectedItem.medications.map((med, idx) => (
                      <div key={idx} className="p-2 bg-muted/30 rounded-lg">
                        <p className="font-semibold text-foreground text-sm">{med.name}</p>
                        <p className="text-xs text-muted-foreground">{med.dosage}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {med.quantity} units
                          </span>
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full bg-green-500"
                              style={{ width: `${(med.dispensed / med.quantity) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(selectedItem.status)}`}>
                      {selectedItem.status.replace('-', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Priority</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                      selectedItem.priority === "urgent" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                    }`}>
                      {selectedItem.priority.toUpperCase()}
                    </span>
                  </div>
                </div>

                {selectedItem.status === "pending" || selectedItem.status === "in-progress" ? (
                  <button
                    onClick={() => handleDispense(selectedItem.id)}
                    className="w-full px-4 py-3 rounded-lg bg-green-50 text-green-600 font-semibold text-sm hover:bg-green-100 transition-all flex items-center gap-2 justify-center border border-green-100"
                  >
                    <CheckCircle className="size-4" />
                    Complete Dispensing
                  </button>
                ) : (
                  <button className="w-full px-4 py-3 rounded-lg border border-border text-muted-foreground font-semibold text-sm hover:bg-muted transition-all">
                    Completed
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-6 flex items-center justify-center h-96 text-muted-foreground">
              <div className="text-center">
                <ClipboardList className="size-12 mx-auto mb-4 opacity-50" />
                <p>Select a prescription to dispense</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

