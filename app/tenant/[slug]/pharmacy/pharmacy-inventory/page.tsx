"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Boxes, Search, Plus, Eye, Edit, Trash2, AlertTriangle, Loader2,
  Filter, Download, TrendingDown, TrendingUp, MoreVertical, Package, Bell
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
  supplier: string;
  unitPrice: number;
  expiryDate: string;
  batchNumber: string;
  status: "in-stock" | "low-stock" | "out-of-stock" | "expired";
}

export default function InventoryPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);

  useEffect(() => {
    fetchInventory();
  }, [categoryFilter, stockFilter]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/tenant/${slug}/pharmacy/inventory?category=${categoryFilter}&stock=${stockFilter}`
      );
      if (res.ok) {
        setMedications(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async (medicationId: string, newStock: number) => {
    try {
      const res = await fetch(
        `/api/tenant/${slug}/pharmacy/inventory/${medicationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stock: newStock }),
        }
      );
      if (res.ok) {
        fetchInventory();
      }
    } catch (error) {
      console.error("Failed to update stock:", error);
    }
  };

  const handleMarkOutOfStock = async (medicationId: string) => {
    try {
      const res = await fetch(
        `/api/tenant/${slug}/pharmacy/inventory/${medicationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stock: 0 }),
        }
      );
      if (res.ok) {
        fetchInventory();
      }
    } catch (error) {
      console.error("Failed to mark as out of stock:", error);
    }
  };

  const filteredMedications = medications.filter(med => {
    const matchesSearch = med.name.toLowerCase().includes(search.toLowerCase()) ||
                         med.genericName.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in-stock": return "bg-green-50 text-green-700 border-green-100";
      case "low-stock": return "bg-yellow-50 text-yellow-700 border-yellow-100";
      case "out-of-stock": return "bg-red-50 text-red-700 border-red-100";
      case "expired": return "bg-gray-50 text-gray-700 border-gray-100";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStockPercentage = (stock: number, max: number) => {
    return Math.min(100, (stock / max) * 100);
  };

  const stats = {
    total: medications.length,
    lowStock: medications.filter(m => m.status === "low-stock").length,
    outOfStock: medications.filter(m => m.status === "out-of-stock").length,
    expiring: medications.filter(m => m.status === "expired").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Pharmacy</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Inventory Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage medication stock and supply levels.</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all">
            <Download className="size-4" />
            Export
          </button>
          <Link href={`/tenant/${slug}/pharmacy/inventory/new`}>
            <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90" style={{ backgroundColor: orange }}>
              <Plus className="size-4" />
              Add Medication
            </button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Items</p>
              <p className="text-2xl font-semibold text-foreground">{stats.total}</p>
            </div>
            <div className="bg-blue-50 text-blue-600 p-3 rounded-lg">
              <Package className="size-6" />
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Low Stock</p>
              <p className="text-2xl font-semibold text-yellow-600">{stats.lowStock}</p>
            </div>
            <div className="bg-yellow-50 text-yellow-600 p-3 rounded-lg">
              <AlertTriangle className="size-6" />
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Out of Stock</p>
              <p className="text-2xl font-semibold text-red-600">{stats.outOfStock}</p>
            </div>
            <div className="bg-red-50 text-red-600 p-3 rounded-lg">
              <Boxes className="size-6" />
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Expiring</p>
              <p className="text-2xl font-semibold text-gray-600">{stats.expiring}</p>
            </div>
            <div className="bg-gray-50 text-gray-600 p-3 rounded-lg">
              <Bell className="size-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search medications by name or generic name..."
              className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none"
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
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none"
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
                <th className="text-left px-5 py-3">Unit Price</th>
                <th className="text-left px-5 py-3">Expiry</th>
                <th className="text-left px-5 py-3">Supplier</th>
                <th className="text-left px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={8} className="py-16 text-center"><Loader2 className="size-6 text-orange-500 animate-spin mx-auto" /></td></tr>
              ) : filteredMedications.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center">
                  <Boxes className="size-10 text-muted mx-auto mb-2" />
                  <p className="text-muted-foreground font-medium">No medications found</p>
                </td></tr>
              ) : (
                filteredMedications.map(med => (
                  <tr key={med.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3">
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
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{med.stock}</span>
                          <span className="text-xs text-muted-foreground">/ {med.maxStock}</span>
                        </div>
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${
                              med.stock < med.minStock ? "bg-red-500" :
                              med.stock < med.minStock * 1.5 ? "bg-yellow-500" :
                              "bg-green-500"
                            }`}
                            style={{ width: `${getStockPercentage(med.stock, med.maxStock)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(med.status)}`}>
                        {med.status.replace('-', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <p className="font-semibold text-foreground">${med.unitPrice.toFixed(2)}</p>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <p className="text-xs text-muted-foreground">{new Date(med.expiryDate).toLocaleDateString()}</p>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <p className="text-sm text-foreground">{med.supplier}</p>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 font-semibold text-xs transition-colors">
                          <Eye className="size-3" />
                        </button>
                        <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-orange-600 hover:bg-orange-50 font-semibold text-xs transition-colors">
                          <Edit className="size-3" />
                        </button>
                        {med.status !== "out-of-stock" && (
                          <button
                            onClick={() => handleMarkOutOfStock(med.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 font-semibold text-xs transition-colors"
                          >
                            <Trash2 className="size-3" />
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
    </div>
  );
}
