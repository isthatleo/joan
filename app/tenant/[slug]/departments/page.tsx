"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bed,
  Building2,
  CheckCircle,
  Eye,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Stethoscope,
  TestTube,
  Users,
} from "lucide-react";
import { useTenantPath } from "@/hooks/useTenantPath";

const orange = "#F97316";

type Department = {
  id: string;
  name: string;
  description: string;
  category: string;
  level: "major" | "minor" | "support";
  headOfDepartment: string;
  totalStaff: number;
  activeStaff: number;
  beds: number;
  occupiedBeds: number;
  patients: number;
  utilization: number;
  status: "excellent" | "good" | "warning" | "critical";
  budget: number;
  equipmentCount: number;
  lastMaintenance: string;
};

type DepartmentStats = {
  totalDepartments: number;
  totalStaff: number;
  activeStaff: number;
  totalBeds: number;
  occupiedBeds: number;
  totalPatients: number;
  averageUtilization: number;
  totalRevenue: number;
};

const EMPTY_STATS: DepartmentStats = {
  totalDepartments: 0,
  totalStaff: 0,
  activeStaff: 0,
  totalBeds: 0,
  occupiedBeds: 0,
  totalPatients: 0,
  averageUtilization: 0,
  totalRevenue: 0,
};

export default function DepartmentsPage() {
  const params = useParams();
  const slug = String(params?.slug || "");
  const tenantPath = useTenantPath();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stats, setStats] = useState<DepartmentStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"overview" | "management" | "analytics">("overview");

  const fetchDepartments = async (mode: "initial" | "refresh" = "refresh") => {
    if (!slug) return;
    if (mode === "initial") setLoading(true);
    setRefreshing(true);
    setError(null);
    try {
      const response = await fetch(`/api/tenant/${slug}/departments`, { credentials: "include", cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Failed to fetch departments");
      setDepartments(Array.isArray(data?.departments) ? data.departments : []);
      setStats(data?.stats || EMPTY_STATS);
    } catch (fetchError: any) {
      setError(fetchError?.message || "Failed to fetch departments");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDepartments("initial");
  }, [slug]);

  const syncDefaults = async () => {
    setSyncing(true);
    setError(null);
    try {
      const response = await fetch(`/api/tenant/${slug}/departments/sync`, {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Failed to sync departments");
      await fetchDepartments();
    } catch (syncError: any) {
      setError(syncError?.message || "Failed to sync departments");
    } finally {
      setSyncing(false);
    }
  };

  const categories = useMemo(() => {
    return Array.from(new Set(departments.map((department) => department.category).filter(Boolean))).sort();
  }, [departments]);

  const filteredDepartments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return departments.filter((department) => {
      const matchesSearch = !query || [department.name, department.description, department.category, department.headOfDepartment].some((value) => String(value || "").toLowerCase().includes(query));
      const matchesStatus = statusFilter === "all" || department.status === statusFilter;
      const matchesCategory = categoryFilter === "all" || department.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [departments, search, statusFilter, categoryFilter]);

  const criticalDepartments = departments.filter((department) => department.status === "critical" || department.utilization >= 90);
  const underStaffedDepartments = departments.filter((department) => department.totalStaff === 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Department Management</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">Departments</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage tenant departments, staffing coverage, beds, and operational readiness.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => fetchDepartments()} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-60">
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button onClick={syncDefaults} disabled={syncing} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-60">
            {syncing ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
            Sync Hospital Departments
          </button>
          <Link href={tenantPath("/departments/new")} className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90" style={{ backgroundColor: orange }}>
            <Plus className="size-4" />
            Add Department
          </Link>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{error}</div> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Departments" value={stats.totalDepartments} subtitle={`${criticalDepartments.length} need attention`} icon={<Building2 className="size-5" />} color="bg-blue-50 text-blue-600" />
        <StatCard title="Staff Coverage" value={stats.totalStaff} subtitle={`${stats.activeStaff} active staff assigned`} icon={<Users className="size-5" />} color="bg-green-50 text-green-600" />
        <StatCard title="Bed Utilization" value={`${stats.averageUtilization}%`} subtitle={`${stats.occupiedBeds}/${stats.totalBeds} beds occupied`} icon={<Bed className="size-5" />} color="bg-orange-50 text-orange-600" />
        <StatCard title="Unstaffed Units" value={underStaffedDepartments.length} subtitle="Assign staff from staff registration" icon={<AlertTriangle className="size-5" />} color="bg-red-50 text-red-600" />
      </div>

      <div className="border-b border-border">
        <nav className="flex gap-8 overflow-x-auto">
          {[
            { id: "overview", label: "Overview", icon: Building2 },
            { id: "management", label: "Management", icon: Settings },
            { id: "analytics", label: "Analytics", icon: BarChart3 },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors ${activeTab === tab.id ? "border-orange-500 text-orange-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <tab.icon className="size-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "overview" ? (
        <>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search departments, category, head of department..." className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm text-foreground focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-100" />
              </div>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-orange-300 focus:outline-none">
                <option value="all">All Status</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-orange-300 focus:outline-none">
                <option value="all">All Categories</option>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              <div className="col-span-full flex items-center justify-center py-16"><Loader2 className="size-6 animate-spin text-orange-500" /></div>
            ) : filteredDepartments.length === 0 ? (
              <div className="col-span-full rounded-xl border border-border bg-card py-16 text-center">
                <Building2 className="mx-auto mb-2 size-10 text-muted-foreground" />
                <p className="font-medium text-muted-foreground">No departments found</p>
                <p className="mt-1 text-xs text-muted-foreground">Adjust filters or sync hospital departments.</p>
              </div>
            ) : filteredDepartments.map((department) => (
              <DepartmentCard key={department.id} department={department} href={tenantPath(`/departments/${department.id}`)} />
            ))}
          </div>
        </>
      ) : null}

      {activeTab === "management" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel title="Staff Allocation" subtitle="Departments with the lowest active coverage appear first.">
            {[...departments].sort((a, b) => a.activeStaff - b.activeStaff).slice(0, 8).map((department) => (
              <DepartmentRow key={department.id} department={department} href={tenantPath(`/departments/${department.id}`)} metric={`${department.activeStaff}/${department.totalStaff} active`} />
            ))}
          </Panel>
          <Panel title="Resource Readiness" subtitle="Bed and equipment visibility by department.">
            {[...departments].filter((department) => department.beds > 0 || department.equipmentCount > 0).slice(0, 8).map((department) => (
              <DepartmentRow key={department.id} department={department} href={tenantPath(`/departments/${department.id}`)} metric={`${department.occupiedBeds}/${department.beds} beds, ${department.equipmentCount} assets`} />
            ))}
          </Panel>
        </div>
      ) : null}

      {activeTab === "analytics" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel title="Utilization Leaders" subtitle="Highest bed utilization across departments.">
            {[...departments].sort((a, b) => b.utilization - a.utilization).slice(0, 8).map((department) => (
              <DepartmentRow key={department.id} department={department} href={tenantPath(`/departments/${department.id}`)} metric={`${department.utilization}% utilization`} />
            ))}
          </Panel>
          <Panel title="Department Mix" subtitle="Major, minor, and support department coverage.">
            {["major", "minor", "support"].map((level) => {
              const count = departments.filter((department) => department.level === level).length;
              return <div key={level} className="rounded-xl border border-border bg-background/70 p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{level}</p><p className="mt-1 text-2xl font-semibold text-foreground">{count}</p></div>;
            })}
          </Panel>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, color }: { title: string; value: string | number; subtitle: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className={`flex size-10 items-center justify-center rounded-full ${color}`}>{icon}</div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function DepartmentCard({ department, href }: { department: Department; href: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 transition-all hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600">{getDepartmentIcon(department.name)}</div>
          <div>
            <h3 className="font-semibold text-foreground">{department.name}</h3>
            <p className="line-clamp-2 text-xs text-muted-foreground">{department.description}</p>
          </div>
        </div>
        <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getStatusColor(department.status)}`}>{department.status.toUpperCase()}</span>
      </div>
      <div className="space-y-3 text-sm">
        <Info label="Category" value={`${department.category} / ${department.level}`} />
        <Info label="Head" value={department.headOfDepartment} />
        <Info label="Staff" value={`${department.activeStaff}/${department.totalStaff}`} />
        <Info label="Beds" value={`${department.occupiedBeds}/${department.beds}`} />
        <Info label="Equipment" value={department.equipmentCount.toLocaleString()} />
        <div>
          <div className="mb-1 flex justify-between"><span className="text-muted-foreground">Utilization</span><span className="font-medium">{department.utilization}%</span></div>
          <div className="h-2 rounded-full bg-muted"><div className={`h-2 rounded-full ${department.utilization >= 90 ? "bg-red-500" : department.utilization >= 75 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${Math.min(100, department.utilization)}%` }} /></div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Link href={href} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-600 hover:bg-orange-100"><Eye className="size-3" /> View Details</Link>
        <Link href={href} className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"><Settings className="size-3" /></Link>
      </div>
    </div>
  );
}

function DepartmentRow({ department, href, metric }: { department: Department; href: string; metric: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/70 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-orange-50 text-orange-600">{getDepartmentIcon(department.name)}</div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{department.name}</p>
          <p className="text-xs text-muted-foreground">{metric}</p>
        </div>
      </div>
      <Link href={href} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">Manage</Link>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-start gap-2">
        <Filter className="mt-0.5 size-4 text-orange-500" />
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | number }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className="truncate font-medium text-foreground">{value}</span></div>;
}

function getStatusColor(status: string) {
  if (status === "excellent") return "border-green-100 bg-green-50 text-green-700";
  if (status === "good") return "border-blue-100 bg-blue-50 text-blue-700";
  if (status === "warning") return "border-yellow-100 bg-yellow-50 text-yellow-700";
  if (status === "critical") return "border-red-100 bg-red-50 text-red-700";
  return "border-border bg-muted text-muted-foreground";
}

function getDepartmentIcon(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes("emergency")) return <AlertTriangle className="size-5" />;
  if (normalized.includes("cardio")) return <Activity className="size-5" />;
  if (normalized.includes("surgery")) return <Stethoscope className="size-5" />;
  if (normalized.includes("laboratory")) return <TestTube className="size-5" />;
  if (normalized.includes("intensive") || normalized.includes("icu")) return <Bed className="size-5" />;
  return <Building2 className="size-5" />;
}
