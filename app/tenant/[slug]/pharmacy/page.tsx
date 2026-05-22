"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Pill, Search, Plus, AlertTriangle, Package, Truck,
  DollarSign, TrendingDown, TrendingUp, RefreshCw, Eye,
  Edit, Trash2, PlusCircle, MinusCircle, Download, Filter,
  BarChart3, PieChart, Activity, Clock, CheckCircle, Loader2
} from "lucide-react";
import Link from "next/link";

const orange = "#F97316";

interface Medication {
  id: string;
  name: string;
  genericName: string;
  category: string;
  dosage: string;
  stock: number;
  minStock: number;
  maxStock: number;
  unitPrice: number;
  expiryDate: string;
  supplier: string;
  status: "in-stock" | "low-stock" | "out-of-stock" | "expired";
}

interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  medications: Array<{
    medicationId: string;
    name: string;
    dosage: string;
    quantity: number;
    instructions: string;
  }>;
  status: "pending" | "filled" | "partially-filled" | "cancelled";
  createdAt: string;
  filledAt?: string;
}

interface PharmacyStats {
  totalMedications: number;
  lowStockItems: number;
  outOfStockItems: number;
  expiringSoon: number;
  totalPrescriptions: number;
  pendingPrescriptions: number;
  filledToday: number;
  revenue: number;
}

export default function PharmacyPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [medications, setMedications] = useState<Medication[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [stats, setStats] = useState<PharmacyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"inventory" | "prescriptions" | "analytics">("inventory");

  useEffect(() => {
    fetchPharmacyData();
  }, []);

  const fetchPharmacyData = async () => {
    setLoading(true);
    try {
      const [medicationsRes, prescriptionsRes, statsRes] = await Promise.all([
        fetch('/api/pharmacy/medications'),
        fetch('/api/pharmacy/prescriptions'),
        fetch('/api/pharmacy/stats')
      ]);

      if (medicationsRes.ok) setMedications(await medicationsRes.json());
      if (prescriptionsRes.ok) setPrescriptions(await prescriptionsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (error) {
      console.error('Failed to fetch pharmacy data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMedications = medications.filter(med => {
    const matchesSearch = med.name.toLowerCase().includes(search.toLowerCase()) ||
                         med.genericName.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || med.category === categoryFilter;
    const matchesStock = stockFilter === "all" ||
                        (stockFilter === "low-stock" && med.status === "low-stock") ||
                        (stockFilter === "out-of-stock" && med.status === "out-of-stock") ||
                        (stockFilter === "in-stock" && med.status === "in-stock");
    return matchesSearch && matchesCategory && matchesStock;
  });

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case "in-stock": return "bg-green-50 text-green-700 border-green-100";
      case "low-stock": return "bg-yellow-50 text-yellow-700 border-yellow-100";
      case "out-of-stock": return "bg-red-50 text-red-700 border-red-100";
      case "expired": return "bg-gray-50 text-gray-700 border-gray-100";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const getPrescriptionStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-50 text-yellow-700 border-yellow-100";
      case "filled": return "bg-green-50 text-green-700 border-green-100";
      case "partially-filled": return "bg-blue-50 text-blue-700 border-blue-100";
      case "cancelled": return "bg-red-50 text-red-700 border-red-100";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, trend, color }: {
    title: string;
    value: string | number;
    subtitle: string;
    icon: React.ReactNode;
    trend?: string;
    color: string;
  }) => (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`size-10 rounded-full ${color} flex items-center justify-center`}>
          {Icon}
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {trend && (
          <div className="text-xs font-semibold text-green-600">
            {trend}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Pharmacy Management</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Pharmacy Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage medications, prescriptions, and inventory.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchPharmacyData}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all"
          >
            <RefreshCw className="size-4" />
            Refresh
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90" style={{ backgroundColor: orange }}>
            <Plus className="size-4" />
            Add Medication
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Medications"
          value={stats?.totalMedications || 0}
          subtitle="In inventory"
          icon={<Pill className="size-5" />}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Low Stock"
          value={stats?.lowStockItems || 0}
          subtitle="Need replenishment"
          icon={<AlertTriangle className="size-5" />}
          color="bg-yellow-50 text-yellow-600"
        />
        <StatCard
          title="Out of Stock"
          value={stats?.outOfStockItems || 0}
          subtitle="Unavailable"
          icon={<Package className="size-5" />}
          color="bg-red-50 text-red-600"
        />
        <StatCard
          title="Pending Rx"
          value={stats?.pendingPrescriptions || 0}
          subtitle="Awaiting fulfillment"
          icon={<Clock className="size-5" />}
          color="bg-orange-50 text-orange-600"
        />
        <StatCard
          title="Revenue"
          value={`$${stats?.revenue?.toFixed(2) || '0.00'}`}
          subtitle="This month"
          icon={<DollarSign className="size-5" />}
          color="bg-green-50 text-green-600"
          trend="+8%"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {[
            { id: "inventory", label: "Inventory", icon: Package },
            { id: "prescriptions", label: "Prescriptions", icon: Pill },
            { id: "analytics", label: "Analytics", icon: BarChart3 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="size-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "inventory" && (
        <>
          {/* Search and Filters */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search medications by name or generic name..."
                  className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300"
              >
                <option value="all">All Categories</option>
                <option value="antibiotics">Antibiotics</option>
                <option value="analgesics">Analgesics</option>
                <option value="cardiovascular">Cardiovascular</option>
                <option value="diabetes">Diabetes</option>
                <option value="respiratory">Respiratory</option>
              </select>
              <select
                value={stockFilter}
                onChange={e => setStockFilter(e.target.value)}
                className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300"
              >
                <option value="all">All Stock Levels</option>
                <option value="in-stock">In Stock</option>
                <option value="low-stock">Low Stock</option>
                <option value="out-of-stock">Out of Stock</option>
              </select>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    <th className="text-left px-5 py-3">Medication</th>
                    <th className="text-left px-5 py-3">Category</th>
                    <th className="text-left px-5 py-3">Stock</th>
                    <th className="text-left px-5 py-3">Status</th>
                    <th className="text-left px-5 py-3">Price</th>
                    <th className="text-left px-5 py-3">Expiry</th>
                    <th className="text-left px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr><td colSpan={7} className="py-16 text-center"><Loader2 className="size-6 text-orange-500 animate-spin mx-auto" /></td></tr>
                  ) : filteredMedications.length === 0 ? (
                    <tr><td colSpan={7} className="py-16 text-center">
                      <Pill className="size-10 text-muted mx-auto mb-2" />
                      <p className="text-muted-foreground font-medium">No medications found</p>
                      <p className="text-xs text-muted-foreground mt-1">Try adjusting your search criteria</p>
                    </td></tr>
                  ) : (
                    filteredMedications.map(med => (
                      <tr key={med.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3 whitespace-nowrap">
                          <div>
                            <p className="font-semibold text-foreground">{med.name}</p>
                            <p className="text-xs text-muted-foreground">{med.genericName}</p>
                            <p className="text-xs text-muted-foreground">{med.dosage}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                            {med.category}
                          </span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{med.stock}</span>
                            <span className="text-xs text-muted-foreground">
                              (Min: {med.minStock})
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${getStockStatusColor(med.status)}`}>
                            {med.status.replace('-', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <p className="font-semibold">${med.unitPrice.toFixed(2)}</p>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <p className="text-sm text-foreground">{new Date(med.expiryDate).toLocaleDateString()}</p>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 font-semibold text-xs transition-colors border border-transparent hover:border-blue-100">
                              <Eye className="size-3" />
                              View
                            </button>
                            <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-orange-600 hover:bg-orange-50 font-semibold text-xs transition-colors border border-transparent hover:border-orange-100">
                              <Edit className="size-3" />
                              Edit
                            </button>
                            <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-50 font-semibold text-xs transition-colors border border-transparent hover:border-green-100">
                              <PlusCircle className="size-3" />
                              Stock
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === "prescriptions" && (
        <>
          {/* Prescriptions Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    <th className="text-left px-5 py-3">Prescription ID</th>
                    <th className="text-left px-5 py-3">Patient</th>
                    <th className="text-left px-5 py-3">Doctor</th>
                    <th className="text-left px-5 py-3">Medications</th>
                    <th className="text-left px-5 py-3">Status</th>
                    <th className="text-left px-5 py-3">Date</th>
                    <th className="text-left px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr><td colSpan={7} className="py-16 text-center"><Loader2 className="size-6 text-orange-500 animate-spin mx-auto" /></td></tr>
                  ) : prescriptions.length === 0 ? (
                    <tr><td colSpan={7} className="py-16 text-center">
                      <Pill className="size-10 text-muted mx-auto mb-2" />
                      <p className="text-muted-foreground font-medium">No prescriptions found</p>
                    </td></tr>
                  ) : (
                    prescriptions.map(rx => (
                      <tr key={rx.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3 whitespace-nowrap">
                          <p className="font-semibold text-foreground font-mono">#{rx.id.slice(-8)}</p>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <p className="font-semibold text-foreground">{rx.patientName}</p>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <p className="text-sm text-foreground">{rx.doctorName}</p>
                        </td>
                        <td className="px-5 py-3">
                          <div className="space-y-1">
                            {rx.medications.slice(0, 2).map((med, idx) => (
                              <p key={idx} className="text-xs text-muted-foreground">
                                {med.name} ({med.dosage})
                              </p>
                            ))}
                            {rx.medications.length > 2 && (
                              <p className="text-xs text-muted-foreground">
                                +{rx.medications.length - 2} more
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${getPrescriptionStatusColor(rx.status)}`}>
                            {rx.status.replace('-', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <p className="text-sm text-foreground">{new Date(rx.createdAt).toLocaleDateString()}</p>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 font-semibold text-xs transition-colors border border-transparent hover:border-blue-100">
                              <Eye className="size-3" />
                              View
                            </button>
                            {rx.status === "pending" && (
                              <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-50 font-semibold text-xs transition-colors border border-transparent hover:border-green-100">
                                <CheckCircle className="size-3" />
                                Fill
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Medication Usage Trends</h3>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="size-12 mx-auto mb-2" />
                  <p>Chart integration coming soon</p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Stock Levels Overview</h3>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <PieChart className="size-12 mx-auto mb-2" />
                  <p>Chart integration coming soon</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Pharmacy Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-green-50">
                <p className="text-2xl font-bold text-green-600">95%</p>
                <p className="text-sm text-green-700">Fill Accuracy</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-blue-50">
                <p className="text-2xl font-bold text-blue-600">12min</p>
                <p className="text-sm text-blue-700">Avg Fill Time</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-purple-50">
                <p className="text-2xl font-bold text-purple-600">98.2%</p>
                <p className="text-sm text-purple-700">Stock Availability</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-orange-50">
                <p className="text-2xl font-bold text-orange-600">24/7</p>
                <p className="text-sm text-orange-700">Service Hours</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
