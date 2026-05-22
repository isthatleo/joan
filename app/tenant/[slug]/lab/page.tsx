"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  TestTube, Search, Plus, Clock, CheckCircle, AlertCircle,
  User, Stethoscope, FileText, Loader2, Filter, Calendar,
  TrendingUp, Activity, BarChart3, PieChart, Download,
  RefreshCw, Eye, Edit, Trash2, PlusCircle, MinusCircle
} from "lucide-react";
import Link from "next/link";

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

interface LabTest {
  id: string;
  name: string;
  category: string;
  normalRange: string;
  unit: string;
  turnaroundTime: string;
  price: number;
}

interface LabStats {
  totalOrders: number;
  pendingOrders: number;
  completedToday: number;
  criticalResults: number;
  averageTurnaround: number;
  revenue: number;
}

export default function LabPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [tests, setTests] = useState<LabTest[]>([]);
  const [stats, setStats] = useState<LabStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"orders" | "tests" | "analytics">("orders");

  useEffect(() => {
    fetchLabData();
  }, []);

  const fetchLabData = async () => {
    setLoading(true);
    try {
      const [ordersRes, testsRes, statsRes] = await Promise.all([
        fetch('/api/lab-orders'),
        fetch('/api/lab/lab-tests'),
        fetch('/api/lab/stats')
      ]);

      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (testsRes.ok) setTests(await testsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (error) {
      console.error('Failed to fetch lab data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.patientName.toLowerCase().includes(search.toLowerCase()) ||
                         order.testType.toLowerCase().includes(search.toLowerCase()) ||
                         order.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || order.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
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
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Laboratory Management</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Lab Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage lab orders, tests, and results tracking.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchLabData}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all"
          >
            <RefreshCw className="size-4" />
            Refresh
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90" style={{ backgroundColor: orange }}>
            <Plus className="size-4" />
            New Lab Order
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Orders"
          value={stats?.totalOrders || 0}
          subtitle="This month"
          icon={<TestTube className="size-5" />}
          color="bg-blue-50 text-blue-600"
          trend="+12%"
        />
        <StatCard
          title="Pending"
          value={stats?.pendingOrders || 0}
          subtitle="Awaiting results"
          icon={<Clock className="size-5" />}
          color="bg-yellow-50 text-yellow-600"
        />
        <StatCard
          title="Completed Today"
          value={stats?.completedToday || 0}
          subtitle="Results delivered"
          icon={<CheckCircle className="size-5" />}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          title="Critical Results"
          value={stats?.criticalResults || 0}
          subtitle="Require attention"
          icon={<AlertCircle className="size-5" />}
          color="bg-red-50 text-red-600"
        />
        <StatCard
          title="Revenue"
          value={`$${stats?.revenue?.toFixed(2) || '0.00'}`}
          subtitle="This month"
          icon={<TrendingUp className="size-5" />}
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {[
            { id: "orders", label: "Lab Orders", icon: TestTube },
            { id: "tests", label: "Test Catalog", icon: FileText },
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
      {activeTab === "orders" && (
        <>
          {/* Search and Filters */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search orders by patient, test type, or order ID..."
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
                    <th className="text-left px-5 py-3">Test Type</th>
                    <th className="text-left px-5 py-3">Priority</th>
                    <th className="text-left px-5 py-3">Status</th>
                    <th className="text-left px-5 py-3">Ordered</th>
                    <th className="text-left px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr><td colSpan={7} className="py-16 text-center"><Loader2 className="size-6 text-orange-500 animate-spin mx-auto" /></td></tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr><td colSpan={7} className="py-16 text-center">
                      <TestTube className="size-10 text-muted mx-auto mb-2" />
                      <p className="text-muted-foreground font-medium">No lab orders found</p>
                      <p className="text-xs text-muted-foreground mt-1">Try adjusting your search criteria</p>
                    </td></tr>
                  ) : (
                    filteredOrders.map(order => (
                      <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3 whitespace-nowrap">
                          <p className="font-semibold text-foreground font-mono">#{order.id.slice(-8)}</p>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground border border-border shrink-0">
                              <User className="size-3" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{order.patientName}</p>
                              <p className="text-xs text-muted-foreground">ID: {order.patientId.slice(-8)}</p>
                            </div>
                          </div>
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
                        <td className="px-5 py-3 whitespace-nowrap">
                          <p className="text-sm text-foreground">{new Date(order.orderedAt).toLocaleDateString()}</p>
                          <p className="text-xs text-muted-foreground">{new Date(order.orderedAt).toLocaleTimeString()}</p>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 font-semibold text-xs transition-colors border border-transparent hover:border-blue-100">
                              <Eye className="size-3" />
                              View
                            </button>
                            {order.status === "pending" && (
                              <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-50 font-semibold text-xs transition-colors border border-transparent hover:border-green-100">
                                <CheckCircle className="size-3" />
                                Start
                              </button>
                            )}
                            {order.status === "in-progress" && (
                              <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-purple-600 hover:bg-purple-50 font-semibold text-xs transition-colors border border-transparent hover:border-purple-100">
                                <FileText className="size-3" />
                                Complete
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

      {activeTab === "tests" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Available Lab Tests</h2>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600">
              <Plus className="size-4" />
              Add Test
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tests.map(test => (
              <div key={test.id} className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{test.name}</h3>
                    <p className="text-xs text-muted-foreground">{test.category}</p>
                  </div>
                  <span className="text-sm font-semibold text-orange-600">${test.price}</span>
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p><strong>Normal Range:</strong> {test.normalRange} {test.unit}</p>
                  <p><strong>Turnaround:</strong> {test.turnaroundTime}</p>
                </div>
                <div className="flex gap-2 mt-3">
                  <button className="flex-1 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 text-xs font-semibold hover:bg-orange-100">
                    Order Test
                  </button>
                  <button className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted">
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Test Volume Trends</h3>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="size-12 mx-auto mb-2" />
                  <p>Chart integration coming soon</p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Test Categories Distribution</h3>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <PieChart className="size-12 mx-auto mb-2" />
                  <p>Chart integration coming soon</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-green-50">
                <p className="text-2xl font-bold text-green-600">{stats?.averageTurnaround || 0}h</p>
                <p className="text-sm text-green-700">Avg Turnaround Time</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-blue-50">
                <p className="text-2xl font-bold text-blue-600">98.5%</p>
                <p className="text-sm text-blue-700">Test Accuracy</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-purple-50">
                <p className="text-2xl font-bold text-purple-600">24/7</p>
                <p className="text-sm text-purple-700">Lab Availability</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
