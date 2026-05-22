"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ClipboardList, Clock, User, AlertTriangle, CheckCircle2, XCircle,
  RefreshCw, Filter, Search, Phone, MessageSquare, Timer, Zap,
  ArrowUp, ArrowDown, Minus, Users, Activity
} from "lucide-react";

interface QueueItem {
  id: string;
  patientId: string;
  patientName: string;
  age: number;
  priority: "low" | "normal" | "high" | "urgent";
  checkInTime: string;
  estimatedWaitTime: string;
  actualWaitTime: string;
  status: "waiting" | "with-doctor" | "completed" | "cancelled";
  appointmentType: string;
  doctorName: string;
  department: string;
  notes?: string;
  position: number;
}

interface QueueStats {
  totalWaiting: number;
  averageWaitTime: string;
  longestWait: string;
  urgentCount: number;
  completedToday: number;
}

export default function QueuePage() {
  const { slug } = useParams();
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  // Fetch queue data
  const fetchQueueData = async () => {
    try {
      setRefreshing(true);
      const [queueRes, statsRes] = await Promise.all([
        fetch(`/api/tenant/${slug}/receptionist/queue`),
        fetch(`/api/tenant/${slug}/receptionist/queue/stats`),
      ]);

      if (queueRes.ok) {
        const queueData = await queueRes.json();
        setQueueItems(queueData);
        setFilteredItems(queueData);
      }

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch queue data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQueueData();
    const interval = setInterval(fetchQueueData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Filter queue items
  useEffect(() => {
    let filtered = queueItems;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.appointmentType.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter(item => item.priority === priorityFilter);
    }

    // Department filter
    if (departmentFilter !== "all") {
      filtered = filtered.filter(item => item.department === departmentFilter);
    }

    setFilteredItems(filtered);
  }, [queueItems, searchTerm, statusFilter, priorityFilter, departmentFilter]);

  // Update patient status
  const updatePatientStatus = async (patientId: string, newStatus: QueueItem["status"]) => {
    try {
      const res = await fetch(`/api/tenant/${slug}/receptionist/queue/${patientId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        fetchQueueData(); // Refresh data
      }
    } catch (error) {
      console.error("Failed to update patient status:", error);
    }
  };

  // Call next patient
  const callNextPatient = async (patientId: string) => {
    try {
      const res = await fetch(`/api/tenant/${slug}/receptionist/queue/${patientId}/call`, {
        method: "POST",
      });

      if (res.ok) {
        fetchQueueData(); // Refresh data
      }
    } catch (error) {
      console.error("Failed to call patient:", error);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent": return <ArrowUp className="h-4 w-4 text-red-500" />;
      case "high": return <ArrowUp className="h-4 w-4 text-orange-500" />;
      case "normal": return <Minus className="h-4 w-4 text-blue-500" />;
      case "low": return <ArrowDown className="h-4 w-4 text-gray-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "text-red-600 bg-red-50 border-red-200";
      case "high": return "text-orange-600 bg-orange-50 border-orange-200";
      case "normal": return "text-blue-600 bg-blue-50 border-blue-200";
      case "low": return "text-gray-600 bg-gray-50 border-gray-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "waiting": return "text-yellow-600 bg-yellow-50";
      case "with-doctor": return "text-blue-600 bg-blue-50";
      case "completed": return "text-green-600 bg-green-50";
      case "cancelled": return "text-red-600 bg-red-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
          Loading patient queue...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Patient Queue Management
          </p>
          <h1 className="text-3xl font-bold text-foreground mt-1">
            Queue Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor and manage patient flow in real-time
          </p>
        </div>
        <button
          onClick={fetchQueueData}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:opacity-50 transition-all"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Queue Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-50 text-yellow-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Waiting</p>
              <p className="text-xl font-bold text-gray-900">{stats?.totalWaiting || 0}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Timer className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Wait</p>
              <p className="text-xl font-bold text-gray-900">{stats?.averageWaitTime || "0m"}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50 text-red-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Longest Wait</p>
              <p className="text-xl font-bold text-gray-900">{stats?.longestWait || "0m"}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Urgent</p>
              <p className="text-xl font-bold text-gray-900">{stats?.urgentCount || 0}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-xl font-bold text-gray-900">{stats?.completedToday || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-6 rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center gap-4 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-sm"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-sm"
          >
            <option value="all">All Status</option>
            <option value="waiting">Waiting</option>
            <option value="with-doctor">With Doctor</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-sm"
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-sm"
          >
            <option value="all">All Departments</option>
            <option value="Emergency">Emergency</option>
            <option value="General Medicine">General Medicine</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Pediatrics">Pediatrics</option>
            <option value="Orthopedics">Orthopedics</option>
          </select>

          {/* Clear Filters */}
          <button
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
              setPriorityFilter("all");
              setDepartmentFilter("all");
            }}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all text-sm"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Queue List */}
      <div className="p-6 rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-orange-500" />
            Patient Queue ({filteredItems.length})
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Auto-refresh: 30s</span>
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          </div>
        </div>

        <div className="space-y-3">
          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => (
              <div
                key={item.id}
                className="p-4 rounded-lg border border-gray-200 hover:border-orange-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Position & Priority */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                        {item.position}
                      </div>
                      <div className={`p-1 rounded-md border ${getPriorityColor(item.priority)}`}>
                        {getPriorityIcon(item.priority)}
                      </div>
                    </div>

                    {/* Patient Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold">
                          {item.patientName.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{item.patientName}</p>
                          <p className="text-sm text-gray-500">
                            {item.appointmentType} • {item.doctorName} • {item.department}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Wait Time & Status */}
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          Wait: {item.actualWaitTime}
                        </span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-md font-semibold ${getStatusColor(item.status)}`}>
                        {item.status.replace("-", " ").toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    {item.status === "waiting" && (
                      <>
                        <button
                          onClick={() => callNextPatient(item.id)}
                          className="px-3 py-1 rounded-md bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-all flex items-center gap-1"
                        >
                          <Phone className="h-3 w-3" />
                          Call
                        </button>
                        <button
                          onClick={() => updatePatientStatus(item.id, "with-doctor")}
                          className="px-3 py-1 rounded-md bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-all flex items-center gap-1"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Seen
                        </button>
                      </>
                    )}
                    {item.status === "with-doctor" && (
                      <button
                        onClick={() => updatePatientStatus(item.id, "completed")}
                        className="px-3 py-1 rounded-md bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-all flex items-center gap-1"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Complete
                      </button>
                    )}
                    <button className="p-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 transition-all">
                      <MessageSquare className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Checked in: {new Date(item.checkInTime).toLocaleTimeString()}</span>
                    <span>Est. wait: {item.estimatedWaitTime}</span>
                    {item.notes && <span className="text-orange-600">Note: {item.notes}</span>}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No patients in queue</p>
              <p className="text-sm text-gray-400 mt-1">
                Patients will appear here when they check in
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button className="p-4 rounded-2xl border border-gray-200 bg-white hover:border-orange-300 hover:shadow-sm transition-all text-left">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Call Next Patient</p>
              <p className="text-sm text-gray-500">Automatically call the next patient</p>
            </div>
          </div>
        </button>

        <button className="p-4 rounded-2xl border border-gray-200 bg-white hover:border-orange-300 hover:shadow-sm transition-all text-left">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 text-green-600">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Queue Analytics</p>
              <p className="text-sm text-gray-500">View detailed queue performance</p>
            </div>
          </div>
        </button>

        <button className="p-4 rounded-2xl border border-gray-200 bg-white hover:border-orange-300 hover:shadow-sm transition-all text-left">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Emergency Override</p>
              <p className="text-sm text-gray-500">Prioritize emergency patients</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
