"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Building2, Search, Plus, Users, Activity, TrendingUp,
  BarChart3, PieChart, Clock, CheckCircle, AlertTriangle,
  RefreshCw, Eye, Edit, Settings, UserPlus, Stethoscope,
  Bed, TestTube, Pill, DollarSign, Loader2, Filter
} from "lucide-react";
import Link from "next/link";

const orange = "#F97316";

interface Department {
  id: string;
  name: string;
  description: string;
  headOfDepartment: string;
  totalStaff: number;
  activeStaff: number;
  beds?: number;
  occupiedBeds?: number;
  patients: number;
  utilization: number;
  status: "excellent" | "good" | "warning" | "critical";
  avgWaitTime: number;
  revenue: number;
  budget: number;
  equipmentCount: number;
  lastMaintenance: string;
}

interface DepartmentStats {
  totalDepartments: number;
  totalStaff: number;
  totalBeds: number;
  occupiedBeds: number;
  totalPatients: number;
  averageUtilization: number;
  totalRevenue: number;
}

export default function DepartmentsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stats, setStats] = useState<DepartmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"overview" | "management" | "analytics">("overview");

  useEffect(() => {
    fetchDepartmentData();
  }, []);

  const fetchDepartmentData = async () => {
    setLoading(true);
    try {
      const [departmentsRes, statsRes] = await Promise.all([
        fetch('/api/departments'),
        fetch('/api/departments/stats')
      ]);

      if (departmentsRes.ok) setDepartments(await departmentsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (error) {
      console.error('Failed to fetch department data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDepartments = departments.filter(dept => {
    const matchesSearch = dept.name.toLowerCase().includes(search.toLowerCase()) ||
                         dept.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || dept.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "excellent": return "bg-green-50 text-green-700 border-green-100";
      case "good": return "bg-blue-50 text-blue-700 border-blue-100";
      case "warning": return "bg-yellow-50 text-yellow-700 border-yellow-100";
      case "critical": return "bg-red-50 text-red-700 border-red-100";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const getDepartmentIcon = (name: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      "Emergency": <AlertTriangle className="size-5" />,
      "Cardiology": <Activity className="size-5" />,
      "Surgery": <Stethoscope className="size-5" />,
      "Pediatrics": <Users className="size-5" />,
      "Radiology": <Activity className="size-5" />,
      "Laboratory": <TestTube className="size-5" />,
      "Pharmacy": <Pill className="size-5" />,
      "ICU": <Bed className="size-5" />,
    };
    return iconMap[name] || <Building2 className="size-5" />;
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
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Department Management</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Departments</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage hospital departments, staffing, and performance.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchDepartmentData}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all"
          >
            <RefreshCw className="size-4" />
            Refresh
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90" style={{ backgroundColor: orange }}>
            <Plus className="size-4" />
            Add Department
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Departments"
          value={stats?.totalDepartments || 0}
          subtitle="Active units"
          icon={<Building2 className="size-5" />}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Total Staff"
          value={stats?.totalStaff || 0}
          subtitle="Across all departments"
          icon={<Users className="size-5" />}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          title="Bed Utilization"
          value={`${stats?.averageUtilization || 0}%`}
          subtitle={`${stats?.occupiedBeds || 0}/${stats?.totalBeds || 0} beds occupied`}
          icon={<Bed className="size-5" />}
          color="bg-orange-50 text-orange-600"
        />
        <StatCard
          title="Revenue"
          value={`$${(stats?.totalRevenue || 0).toLocaleString()}`}
          subtitle="This month"
          icon={<DollarSign className="size-5" />}
          color="bg-purple-50 text-purple-600"
          trend="+12%"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {[
            { id: "overview", label: "Overview", icon: Building2 },
            { id: "management", label: "Management", icon: Settings },
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
      {activeTab === "overview" && (
        <>
          {/* Search and Filters */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search departments by name or description..."
                  className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300"
              >
                <option value="all">All Status</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Departments Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-full flex items-center justify-center py-16">
                <Loader2 className="size-6 text-orange-500 animate-spin mx-auto" />
              </div>
            ) : filteredDepartments.length === 0 ? (
              <div className="col-span-full text-center py-16">
                <Building2 className="size-10 text-muted mx-auto mb-2" />
                <p className="text-muted-foreground font-medium">No departments found</p>
                <p className="text-xs text-muted-foreground mt-1">Try adjusting your search criteria</p>
              </div>
            ) : (
              filteredDepartments.map(dept => (
                <div key={dept.id} className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="size-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                        {getDepartmentIcon(dept.name)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{dept.name}</h3>
                        <p className="text-xs text-muted-foreground">{dept.description}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(dept.status)}`}>
                      {dept.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Head:</span>
                      <span className="font-medium">{dept.headOfDepartment}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Staff:</span>
                      <span className="font-medium">{dept.activeStaff}/{dept.totalStaff}</span>
                    </div>

                    {dept.beds && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Beds:</span>
                        <span className="font-medium">{dept.occupiedBeds}/{dept.beds}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Patients:</span>
                      <span className="font-medium">{dept.patients}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Utilization:</span>
                      <span className="font-medium">{dept.utilization}%</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Avg Wait:</span>
                      <span className="font-medium">{dept.avgWaitTime}min</span>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          dept.utilization > 85 ? "bg-red-500" :
                          dept.utilization > 70 ? "bg-yellow-500" : "bg-green-500"
                        }`}
                        style={{ width: `${dept.utilization}%` }}
                      />
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button className="flex-1 px-3 py-2 rounded-lg bg-orange-50 text-orange-600 text-xs font-semibold hover:bg-orange-100 transition-colors">
                        View Details
                      </button>
                      <button className="px-3 py-2 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition-colors">
                        <Settings className="size-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {activeTab === "management" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Staff Allocation</h3>
              <div className="space-y-4">
                {departments.slice(0, 5).map(dept => (
                  <div key={dept.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                        {getDepartmentIcon(dept.name)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{dept.name}</p>
                        <p className="text-xs text-muted-foreground">{dept.activeStaff}/{dept.totalStaff} staff</p>
                      </div>
                    </div>
                    <button className="px-3 py-1 rounded-lg bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600">
                      Manage
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Resource Management</h3>
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">Equipment Maintenance</p>
                    <span className="text-xs text-muted-foreground">Due in 3 days</span>
                  </div>
                  <p className="text-sm text-muted-foreground">MRI Scanner maintenance scheduled</p>
                </div>

                <div className="p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">Supply Orders</p>
                    <span className="text-xs text-green-600">2 pending</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Medical supplies restocking</p>
                </div>

                <div className="p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">Budget Review</p>
                    <span className="text-xs text-orange-600">Q4 2026</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Department budget planning</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Department Performance</h3>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="size-12 mx-auto mb-2" />
                  <p>Performance charts coming soon</p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Utilization Trends</h3>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <PieChart className="size-12 mx-auto mb-2" />
                  <p>Utilization charts coming soon</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Key Performance Indicators</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-green-50">
                <p className="text-2xl font-bold text-green-600">94%</p>
                <p className="text-sm text-green-700">Patient Satisfaction</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-blue-50">
                <p className="text-2xl font-bold text-blue-600">23min</p>
                <p className="text-sm text-blue-700">Avg Treatment Time</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-purple-50">
                <p className="text-2xl font-bold text-purple-600">98.5%</p>
                <p className="text-sm text-purple-700">Equipment Uptime</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-orange-50">
                <p className="text-2xl font-bold text-orange-600">$2.4M</p>
                <p className="text-sm text-orange-700">Monthly Revenue</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
