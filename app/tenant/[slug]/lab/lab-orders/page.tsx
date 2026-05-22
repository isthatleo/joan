"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  TestTube, Search, Plus, Clock, CheckCircle, AlertCircle,
  User, FileText, Loader2, Filter, Edit, Trash2, Eye, Download,
  RefreshCw, ArrowLeft, Activity, ChevronDown
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const orange = "#F97316";

interface LabOrder {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  testType: string;
  status: "pending" | "in-progress" | "completed" | "cancelled";
  priority: "routine" | "urgent" | "critical";
  orderedAt: string;
  completedAt?: string;
  results?: string;
  notes?: string;
}

export default function LabOrdersPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;
  const defaultStatus = searchParams?.get("status") || "all";

  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(defaultStatus);
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const queryClient = useQueryClient();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const status = statusFilter === "all" ? "" : statusFilter;
      const res = await fetch(`/api/lab/orders?status=${status}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  useEffect(() => {
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const res = await fetch(`/api/lab/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update order");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-orders"] });
      fetchOrders();
    },
  });

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.patientName.toLowerCase().includes(search.toLowerCase()) ||
                         order.testType.toLowerCase().includes(search.toLowerCase()) ||
                         order.id.toLowerCase().includes(search.toLowerCase());
    const matchesPriority = priorityFilter === "all" || order.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-50 text-yellow-700 border-yellow-100";
      case "in-progress": return "bg-blue-50 text-blue-700 border-blue-100";
      case "completed": return "bg-green-50 text-green-700 border-green-100";
      case "cancelled": return "bg-red-50 text-red-700 border-red-100";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-red-50 text-red-700 border-red-100";
      case "urgent": return "bg-orange-50 text-orange-700 border-orange-100";
      case "routine": return "bg-blue-50 text-blue-700 border-blue-100";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="size-3" />;
      case "in-progress": return <Activity className="size-3" />;
      case "completed": return <CheckCircle className="size-3" />;
      case "cancelled": return <AlertCircle className="size-3" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href={`/tenant/${slug}/lab`} className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 mb-3">
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </Link>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Lab Orders Management</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Lab Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">Create, manage, and track all laboratory test orders.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchOrders}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all"
          >
            <RefreshCw className="size-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowNewOrderModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90"
            style={{ backgroundColor: orange }}
          >
            <Plus className="size-4" />
            New Order
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Orders", count: orders.length, color: "bg-blue-50 text-blue-600" },
          { label: "Pending", count: orders.filter(o => o.status === "pending").length, color: "bg-yellow-50 text-yellow-600" },
          { label: "In Progress", count: orders.filter(o => o.status === "in-progress").length, color: "bg-purple-50 text-purple-600" },
          { label: "Completed", count: orders.filter(o => o.status === "completed").length, color: "bg-green-50 text-green-600" },
          { label: "Critical", count: orders.filter(o => o.priority === "critical").length, color: "bg-red-50 text-red-600" },
        ].map((stat, idx) => (
          <div key={idx} className={`${stat.color} rounded-lg p-4`}>
            <p className="text-xs font-semibold uppercase tracking-wide">{stat.label}</p>
            <p className="text-2xl font-bold mt-1">{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by patient name, test type, or order ID..."
              className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300"
          >
            <option value="all">All Priority</option>
            <option value="routine">Routine</option>
            <option value="urgent">Urgent</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                <th className="text-left px-5 py-3">Order ID</th>
                <th className="text-left px-5 py-3">Patient</th>
                <th className="text-left px-5 py-3">Doctor</th>
                <th className="text-left px-5 py-3">Test Type</th>
                <th className="text-left px-5 py-3">Priority</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Ordered Date</th>
                <th className="text-left px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={8} className="py-16 text-center"><Loader2 className="size-6 text-orange-500 animate-spin mx-auto" /></td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center">
                  <TestTube className="size-10 text-muted mx-auto mb-2" />
                  <p className="text-muted-foreground font-medium">No lab orders found</p>
                </td></tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap">
                      <p className="font-semibold text-foreground font-mono">#{order.id.slice(-8)}</p>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <p className="font-semibold text-foreground">{order.patientName}</p>
                      <p className="text-xs text-muted-foreground">{order.patientId.slice(-8)}</p>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <p className="text-sm text-foreground">{order.doctorName}</p>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <p className="text-sm text-foreground">{order.testType}</p>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(order.priority)}`}>
                        {order.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        {order.status.replace('-', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm text-foreground">
                      {new Date(order.orderedAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 font-semibold text-xs transition-colors"
                        >
                          <Eye className="size-3" />
                        </button>
                        {order.status === "pending" && (
                          <button
                            onClick={() => updateOrderStatusMutation.mutate({ orderId: order.id, status: "in-progress" })}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-50 font-semibold text-xs transition-colors"
                          >
                            <CheckCircle className="size-3" />
                          </button>
                        )}
                        {order.status === "in-progress" && (
                          <button
                            onClick={() => updateOrderStatusMutation.mutate({ orderId: order.id, status: "completed" })}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-purple-600 hover:bg-purple-50 font-semibold text-xs transition-colors"
                          >
                            <FileText className="size-3" />
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

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Order Details</h2>
            <div className="space-y-3 mb-6">
              <div>
                <p className="text-xs text-muted-foreground">Order ID</p>
                <p className="font-mono font-semibold">#{selectedOrder.id.slice(-8)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Patient</p>
                <p className="font-semibold">{selectedOrder.patientName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Test Type</p>
                <p className="font-semibold">{selectedOrder.testType}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(selectedOrder.status)}`}>
                  {getStatusIcon(selectedOrder.status)}
                  {selectedOrder.status.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="text-sm">{selectedOrder.notes || "No notes"}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedOrder(null)}
              className="w-full px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

