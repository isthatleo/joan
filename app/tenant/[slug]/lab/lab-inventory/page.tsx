"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Boxes, Search, Plus, AlertCircle, Loader2, Edit, Trash2,
  Eye, RefreshCw, ArrowLeft, TrendingDown, Package, Calendar
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const orange = "#F97316";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  reorderLevel: number;
  location: string;
  expiryDate?: string;
  supplier?: string;
  cost?: number;
  lastRestocked?: string;
}

export default function LabInventoryPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const queryClient = useQueryClient();

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lab/inventory");
      if (res.ok) {
        const data = await res.json();
        setItems(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchInventory, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, []);

  const addItemMutation = useMutation({
    mutationFn: async (data: Partial<InventoryItem>) => {
      const res = await fetch("/api/lab/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      fetchInventory();
      setShowAddModal(false);
    },
  });

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || (statusFilter === "low" && item.quantity <= item.reorderLevel);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const lowStockItems = items.filter(item => item.quantity <= item.reorderLevel);
  const expiringSoonItems = items.filter(item => {
    if (!item.expiryDate) return false;
    const daysUntilExpiry = Math.floor((new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  });

  const categories = Array.from(new Set(items.map(item => item.category)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href={`/tenant/${slug}/lab`} className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 mb-3">
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </Link>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Lab Inventory Management</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage lab supplies, equipment, and reagents.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchInventory}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all"
          >
            <RefreshCw className="size-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90"
            style={{ backgroundColor: orange }}
          >
            <Plus className="size-4" />
            Add Item
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-blue-50 text-blue-600 rounded-lg p-4">
          <p className="text-xs font-semibold uppercase tracking-wide">Total Items</p>
          <p className="text-2xl font-bold mt-1">{items.length}</p>
        </div>
        <div className="bg-red-50 text-red-600 rounded-lg p-4">
          <p className="text-xs font-semibold uppercase tracking-wide">Low Stock</p>
          <p className="text-2xl font-bold mt-1">{lowStockItems.length}</p>
        </div>
        <div className="bg-yellow-50 text-yellow-600 rounded-lg p-4">
          <p className="text-xs font-semibold uppercase tracking-wide">Expiring Soon</p>
          <p className="text-2xl font-bold mt-1">{expiringSoonItems.length}</p>
        </div>
        <div className="bg-green-50 text-green-600 rounded-lg p-4">
          <p className="text-xs font-semibold uppercase tracking-wide">In Stock</p>
          <p className="text-2xl font-bold mt-1">{items.filter(i => i.quantity > i.reorderLevel).length}</p>
        </div>
      </div>

      {/* Alerts for Low Stock and Expiring Items */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="size-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Low Stock Alert</h3>
              <p className="text-sm text-red-800 mt-1">{lowStockItems.length} items are below reorder level</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                {lowStockItems.slice(0, 3).map(item => (
                  <span key={item.id} className="bg-white text-red-800 text-xs px-2 py-1 rounded">
                    {item.name}
                  </span>
                ))}
                {lowStockItems.length > 3 && <span className="text-xs text-red-800">+{lowStockItems.length - 3} more</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by item name..."
              className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300"
          >
            <option value="all">All Status</option>
            <option value="in-stock">In Stock</option>
            <option value="low">Low Stock</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                <th className="text-left px-5 py-3">Item Name</th>
                <th className="text-left px-5 py-3">Category</th>
                <th className="text-left px-5 py-3">Location</th>
                <th className="text-left px-5 py-3">Quantity</th>
                <th className="text-left px-5 py-3">Reorder Level</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Expiry Date</th>
                <th className="text-left px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={8} className="py-16 text-center"><Loader2 className="size-6 text-orange-500 animate-spin mx-auto" /></td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center">
                  <Boxes className="size-10 text-muted mx-auto mb-2" />
                  <p className="text-muted-foreground font-medium">No items found</p>
                </td></tr>
              ) : (
                filteredItems.map(item => {
                  const isLowStock = item.quantity <= item.reorderLevel;
                  const statusColor = isLowStock ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700";
                  return (
                    <tr key={item.id} className={`hover:bg-muted/30 transition-colors ${isLowStock ? "bg-red-50/30" : ""}`}>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <p className="font-semibold text-foreground">{item.name}</p>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className="text-xs bg-muted px-2 py-1 rounded">{item.category}</span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-sm text-foreground">
                        {item.location}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <p className="font-semibold text-foreground text-lg">{item.quantity}</p>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-sm text-foreground">
                        {item.reorderLevel}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                          {isLowStock ? (
                            <>
                              <TrendingDown className="size-3" />
                              Low Stock
                            </>
                          ) : (
                            <>
                              <Package className="size-3" />
                              In Stock
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-sm text-foreground">
                        {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setShowEditModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 font-semibold text-xs transition-colors"
                        >
                          <Edit className="size-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Add New Item</h2>
            <div className="space-y-4 mb-6">
              <input type="text" placeholder="Item Name" className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
              <input type="text" placeholder="Category" className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
              <input type="number" placeholder="Quantity" className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
              <input type="number" placeholder="Reorder Level" className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
              <input type="text" placeholder="Location" className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
              <input type="date" placeholder="Expiry Date" className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2 rounded-lg text-white text-sm font-semibold"
                style={{ backgroundColor: orange }}
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

