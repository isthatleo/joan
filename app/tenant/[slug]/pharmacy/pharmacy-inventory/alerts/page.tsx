"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Bell, AlertTriangle, Loader2, X, Filter, Download,
  TrendingDown, Clock, Pill, Boxes, AlertCircle
} from "lucide-react";

const orange = "#F97316";

interface StockAlert {
  id: string;
  medicationId: string;
  medicationName: string;
  currentStock: number;
  minStock: number;
  reorderQuantity: number;
  supplier: string;
  alertType: "low-stock" | "out-of-stock" | "expiring-soon" | "overstock";
  isActive: boolean;
  lastReviewedAt?: string;
  createdAt: string;
}

export default function StockAlertsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [filterType, setFilterType] = useState("all");
  const [selectedAlert, setSelectedAlert] = useState<StockAlert | null>(null);

  useEffect(() => {
    fetchAlerts();
  }, [filterType]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/tenant/${slug}/pharmacy/inventory/alerts?type=${filterType}`
      );
      if (res.ok) {
        setAlerts(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch stock alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (alertId: string) => {
    try {
      const res = await fetch(`/api/tenant/${slug}/pharmacy/inventory/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      if (res.ok) {
        setDismissedAlerts([...dismissedAlerts, alertId]);
        setAlerts(alerts.filter(a => a.id !== alertId));
      }
    } catch (error) {
      console.error("Failed to dismiss alert:", error);
    }
  };

  const handleReorder = async (alertId: string) => {
    try {
      const res = await fetch(`/api/tenant/${slug}/pharmacy/inventory/alerts/${alertId}/reorder`, {
        method: "POST",
      });
      if (res.ok) {
        fetchAlerts();
        setSelectedAlert(null);
      }
    } catch (error) {
      console.error("Failed to create reorder:", error);
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case "out-of-stock": return "bg-red-50 text-red-700 border-red-200";
      case "low-stock": return "bg-orange-50 text-orange-700 border-orange-200";
      case "expiring-soon": return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "overstock": return "bg-blue-50 text-blue-700 border-blue-200";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "out-of-stock": return <Boxes className="size-5 text-red-600" />;
      case "low-stock": return <TrendingDown className="size-5 text-orange-600" />;
      case "expiring-soon": return <Clock className="size-5 text-yellow-600" />;
      case "overstock": return <AlertCircle className="size-5 text-blue-600" />;
      default: return <Bell className="size-5 text-gray-600" />;
    }
  };

  const stats = {
    total: alerts.length,
    critical: alerts.filter(a => a.alertType === "out-of-stock").length,
    warning: alerts.filter(a => a.alertType === "low-stock").length,
    info: alerts.filter(a => a.alertType === "expiring-soon").length,
  };

  const activeAlerts = alerts.filter(a => a.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Inventory</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Stock Alerts</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor and manage inventory alerts and reorders.</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all">
            <Download className="size-4" />
            Export
          </button>
        </div>
      </div>

      {/* Alert Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Alerts</p>
              <p className="text-2xl font-semibold text-foreground">{stats.total}</p>
            </div>
            <div className="bg-orange-50 text-orange-600 p-3 rounded-lg">
              <Bell className="size-6" />
            </div>
          </div>
        </div>
        <div className="bg-card border border-red-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-red-700 font-semibold">Out of Stock</p>
              <p className="text-2xl font-semibold text-red-600">{stats.critical}</p>
            </div>
            <div className="bg-red-50 text-red-600 p-3 rounded-lg">
              <Boxes className="size-6" />
            </div>
          </div>
        </div>
        <div className="bg-card border border-orange-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-orange-700 font-semibold">Low Stock</p>
              <p className="text-2xl font-semibold text-orange-600">{stats.warning}</p>
            </div>
            <div className="bg-orange-50 text-orange-600 p-3 rounded-lg">
              <TrendingDown className="size-6" />
            </div>
          </div>
        </div>
        <div className="bg-card border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-yellow-700 font-semibold">Expiring Soon</p>
              <p className="text-2xl font-semibold text-yellow-600">{stats.info}</p>
            </div>
            <div className="bg-yellow-50 text-yellow-600 p-3 rounded-lg">
              <Clock className="size-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none"
          >
            <option value="all">All Alert Types</option>
            <option value="out-of-stock">Out of Stock</option>
            <option value="low-stock">Low Stock</option>
            <option value="expiring-soon">Expiring Soon</option>
            <option value="overstock">Overstock</option>
          </select>
        </div>
      </div>

      {/* Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-6 text-orange-500 animate-spin" />
            </div>
          ) : activeAlerts.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Bell className="size-12 text-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">No active alerts</p>
              <p className="text-xs text-muted-foreground mt-2">All inventory levels are healthy</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeAlerts.map(alert => (
                <div
                  key={alert.id}
                  onClick={() => setSelectedAlert(alert)}
                  className={`bg-card border rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all ${
                    selectedAlert?.id === alert.id
                      ? "ring-2 ring-orange-500"
                      : `border-border ${getAlertColor(alert.alertType).split(" ")[0]}`
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        {getAlertIcon(alert.alertType)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{alert.medicationName}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Current Stock: {alert.currentStock} units
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${getAlertColor(alert.alertType)}`}>
                      {alert.alertType.replace('-', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Min Stock:</span>
                      <span className="font-semibold text-foreground">{alert.minStock} units</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Reorder Qty:</span>
                      <span className="font-semibold text-foreground">{alert.reorderQuantity} units</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Supplier:</span>
                      <span className="font-semibold text-foreground">{alert.supplier}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div>
          {selectedAlert ? (
            <div className="bg-card border border-border rounded-xl p-6 sticky top-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-semibold text-foreground">Alert Details</h3>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">Medication</p>
                  <p className="font-semibold text-foreground">{selectedAlert.medicationName}</p>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Alert Type</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${getAlertColor(selectedAlert.alertType)}`}>
                      {selectedAlert.alertType.replace('-', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="border-t border-border pt-4 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Current Stock</p>
                    <p className="text-lg font-semibold text-foreground">{selectedAlert.currentStock} units</p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Minimum Stock</p>
                    <p className="font-semibold text-foreground">{selectedAlert.minStock} units</p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Suggested Reorder</p>
                    <p className="font-semibold text-foreground">{selectedAlert.reorderQuantity} units</p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Supplier</p>
                    <p className="font-semibold text-foreground">{selectedAlert.supplier}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-border">
                  <button
                    onClick={() => handleReorder(selectedAlert.id)}
                    className="w-full px-4 py-2 rounded-lg bg-green-50 text-green-600 font-semibold text-sm hover:bg-green-100 transition-all flex items-center gap-2 justify-center border border-green-100"
                  >
                    <Pill className="size-4" />
                    Create Reorder
                  </button>
                  <button
                    onClick={() => handleDismiss(selectedAlert.id)}
                    className="w-full px-4 py-2 rounded-lg border border-border text-muted-foreground font-semibold text-sm hover:bg-muted transition-all"
                  >
                    Dismiss Alert
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-6 flex items-center justify-center h-96 text-muted-foreground">
              <div className="text-center">
                <Bell className="size-12 mx-auto mb-4 opacity-50" />
                <p>Select an alert for details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

