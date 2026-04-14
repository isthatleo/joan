"use client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Search, Plus, Package, AlertTriangle, CheckCircle, Clock, TrendingDown, TrendingUp } from "lucide-react";

export default function LabInventoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Mock data - in real app, fetch from API
  const inventory = [
    {
      id: "I001",
      itemName: "Blood Collection Tubes",
      category: "Consumables",
      currentStock: 150,
      minStock: 50,
      maxStock: 200,
      unit: "tubes",
      expiryDate: "2026-08-15",
      status: "in_stock",
      supplier: "MedSupply Inc",
      lastRestocked: "2026-04-10"
    },
    {
      id: "I002",
      itemName: "Glucose Test Strips",
      category: "Reagents",
      currentStock: 25,
      minStock: 100,
      maxStock: 500,
      unit: "strips",
      expiryDate: "2026-06-30",
      status: "low_stock",
      supplier: "LabCorp Supplies",
      lastRestocked: "2026-03-15"
    },
    {
      id: "I003",
      itemName: "Microscope Slides",
      category: "Equipment",
      currentStock: 300,
      minStock: 200,
      maxStock: 1000,
      unit: "slides",
      expiryDate: null,
      status: "in_stock",
      supplier: "Scientific Instruments Ltd",
      lastRestocked: "2026-04-01"
    },
    {
      id: "I004",
      itemName: "Hemoglobin Reagent",
      category: "Reagents",
      currentStock: 0,
      minStock: 20,
      maxStock: 100,
      unit: "bottles",
      expiryDate: "2026-05-20",
      status: "out_of_stock",
      supplier: "BioChem Labs",
      lastRestocked: "2026-03-20"
    }
  ];

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || item.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: inventory.length,
    inStock: inventory.filter(i => i.status === "in_stock").length,
    lowStock: inventory.filter(i => i.status === "low_stock").length,
    outOfStock: inventory.filter(i => i.status === "out_of_stock").length
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "in_stock": return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "low_stock": return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case "out_of_stock": return <TrendingDown className="w-5 h-5 text-red-600" />;
      default: return <Package className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_stock": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "low_stock": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "out_of_stock": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-200";
    }
  };

  const getStockLevel = (current: number, min: number, max: number) => {
    const percentage = (current / max) * 100;
    if (current === 0) return { level: "out", color: "bg-red-500" };
    if (current < min) return { level: "low", color: "bg-yellow-500" };
    if (percentage > 80) return { level: "high", color: "bg-green-500" };
    return { level: "normal", color: "bg-blue-500" };
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Lab Inventory</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage laboratory supplies and reagents
            </p>
          </div>
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-5 h-5" />
            <span>Add Item</span>
          </button>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Items</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">In Stock</p>
              <p className="text-3xl font-bold text-green-600">{stats.inStock}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Low Stock</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.lowStock}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Out of Stock</p>
              <p className="text-3xl font-bold text-red-600">{stats.outOfStock}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-600" />
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
              placeholder="Search by item name, category, or supplier..."
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
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredInventory.map((item) => {
          const stockInfo = getStockLevel(item.currentStock, item.minStock, item.maxStock);
          return (
            <Card key={item.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(item.status)}
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{item.itemName}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{item.category}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                  {item.status.replace('_', ' ')}
                </span>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Current Stock:</span>
                  <span className="font-semibold">{item.currentStock} {item.unit}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Min/Max:</span>
                  <span>{item.minStock} / {item.maxStock} {item.unit}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${stockInfo.color}`}
                    style={{ width: `${Math.min(100, (item.currentStock / item.maxStock) * 100)}%` }}
                  />
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
                  Stock Level: {stockInfo.level}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Supplier:</span> {item.supplier}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Last Restocked:</span> {item.lastRestocked}
                </div>
                {item.expiryDate && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Expiry:</span> {item.expiryDate}
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                  Update Stock
                </button>
                {item.status === "low_stock" || item.status === "out_of_stock" ? (
                  <button className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors">
                    Reorder
                  </button>
                ) : (
                  <button className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors">
                    Details
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {filteredInventory.length === 0 && (
        <Card className="p-12 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No inventory items found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm ? 'Try adjusting your search terms' : 'No items match your current filters'}
          </p>
        </Card>
      )}
    </div>
  );
}
