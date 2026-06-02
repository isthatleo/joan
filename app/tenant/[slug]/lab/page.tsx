"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { withTenantPrefix } from "@/lib/tenant-routing";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FlaskConical,
  Loader2,
  MapPin,
  Microscope,
  RefreshCw,
  Search,
  ShieldAlert,
  TestTube,
  TrendingUp,
  UserRound,
  Zap,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth"; // Import useAuthStore

type LabOrder = {
  id: string;
  patientId?: string;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  doctorName: string;
  testName: string;
  testCode?: string;
  category: string;
  priority: string;
  status: string;
  orderedAt: string;
  collectedAt?: string;
  completedAt?: string;
  dueDate?: string;
  labLocation: string;
  notes?: string;
  overdue: boolean;
  turnaroundHours?: number | null;
  result?: {
    id: string;
    fileUrl?: string;
    status?: string;
    flag?: string;
    summary?: string;
    createdAt?: string;
  } | null;
};

type LabData = {
  stats: Record<string, number>;
  orders: LabOrder[];
  recentResults: Array<Record<string, any>>;
  inventoryAlerts: Array<Record<string, any>>;
  labStaff: Array<{ id: string; fullName: string; email: string; isActive: boolean }>;
  filters: { categories: string[]; locations: string[] };
};

const EMPTY_DATA: LabData = {
  stats: {},
  orders: [],
  recentResults: [],
  inventoryAlerts: [],
  labStaff: [],
  filters: { categories: [], locations: [] },
};

function formatDate(value?: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleString();
}

function statusClass(status: string) {
  switch (status) {
    case "completed":
      return "bg-green-50 text-green-700 border-green-200";
    case "in-progress":
    case "collected":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "cancelled":
      return "bg-slate-100 text-slate-700 border-slate-200";
    default:
      return "bg-orange-50 text-orange-700 border-orange-200";
  }
}

function priorityClass(priority: string) {
  switch (priority) {
    case "critical":
    case "stat":
      return "bg-red-50 text-red-700 border-red-200";
    case "urgent":
      return "bg-orange-50 text-orange-700 border-orange-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function csvEscape(value: unknown) {
  const text = value == null ? "" : String(value);
  return text.includes(",") || text.includes('"') || text.includes("\n") ? `"${text.replace(/"/g, '""')}"` : text;
}

export default function LabPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const hostname = typeof window !== "undefined" ? window.location.hostname : null;
  const path = (value: string) => withTenantPrefix(value, slug, hostname);
  const { user } = useAuthStore(); // Get user from auth store
  const [data, setData] = useState<LabData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    setError("");
    try {
      const query = new URLSearchParams({
        status: statusFilter,
        priority: priorityFilter,
        category: categoryFilter,
        limit: "200",
      });
      const res = await fetch(`/api/tenant/${slug}/lab?${query.toString()}`, { cache: "no-store" });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || "Failed to load lab dashboard");
      setData({
        stats: payload?.stats || {},
        orders: Array.isArray(payload?.orders) ? payload.orders : [],
        recentResults: Array.isArray(payload?.recentResults) ? payload.recentResults : [],
        inventoryAlerts: Array.isArray(payload?.inventoryAlerts) ? payload.inventoryAlerts : [],
        labStaff: Array.isArray(payload?.labStaff) ? payload.labStaff : [],
        filters: payload?.filters || { categories: [], locations: [] },
      });
    } catch (loadError: any) {
      setError(loadError?.message || "Failed to load lab dashboard");
      setData(EMPTY_DATA);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (slug) load();
  }, [slug, statusFilter, priorityFilter, categoryFilter]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.orders;
    return data.orders.filter((order) =>
      [
        order.patientName,
        order.doctorName,
        order.testName,
        order.testCode,
        order.category,
        order.priority,
        order.status,
        order.labLocation,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [data.orders, search]);

  const runAction = async (order: LabOrder, action: string, extra: Record<string, any> = {}) => {
    if (action === "cancel" && !window.confirm("Cancel this lab order?")) return;
    setBusyOrderId(order.id);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/tenant/${slug}/lab`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, action, ...extra }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || "Lab order action failed");
      setNotice("Lab order updated.");
      await load(true);
    } catch (actionError: any) {
      setError(actionError?.message || "Lab order action failed");
    } finally {
      setBusyOrderId("");
    }
  };

  const exportCsv = () => {
    const rows = [
      ["Order ID", "Patient", "Doctor", "Test", "Category", "Priority", "Status", "Location", "Ordered", "Due", "Completed", "Result"],
      ...filteredOrders.map((order) => [
        order.id,
        order.patientName,
        order.doctorName,
        order.testName,
        order.category,
        order.priority,
        order.status,
        order.labLocation,
        formatDate(order.orderedAt),
        formatDate(order.dueDate),
        formatDate(order.completedAt),
        order.result ? "Available" : "Pending",
      ]),
    ];
    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lab-operations-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setCategoryFilter("all");
  };

  const stats = data.stats || {};
  const cards = [
    { label: "Total Orders", value: stats.totalOrders || 0, icon: TestTube, tone: "bg-blue-50 text-blue-700" },
    { label: "Pending Work", value: (stats.pending || 0) + (stats.inProgress || 0) + (stats.collected || 0), icon: Clock, tone: "bg-orange-50 text-orange-700" },
    { label: "Completed Today", value: stats.completedToday || 0, icon: CheckCircle2, tone: "bg-green-50 text-green-700" },
    { label: "Overdue", value: stats.overdue || 0, icon: ShieldAlert, tone: "bg-red-50 text-red-700" },
    { label: "Lab Staff", value: stats.labStaff || 0, icon: UserRound, tone: "bg-slate-100 text-slate-700" },
  ];

  const isHospitalAdmin = user?.role === "hospital_admin";
  const isLabTechnician = user?.role === "lab_technician";

  const pageTitle = isHospitalAdmin ? "Lab Operations" : "Lab Technician Dashboard";
  const pageDescription = isHospitalAdmin
    ? "Administrative oversight for lab workload, turnaround, critical results, inventory risk, and staffing."
    : "Manage lab orders, results, and inventory for daily operations.";
  const worklistTitle = isHospitalAdmin ? "Admin Lab Worklist" : "Lab Worklist";
  const worklistDescription = isHospitalAdmin
    ? "Oversight actions do not replace technician result entry."
    : "Current lab orders for processing and result entry.";

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">
            {isHospitalAdmin ? "Hospital Admin" : "Lab Technician"}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">{pageTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{pageDescription}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => load(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          {isHospitalAdmin && ( // Only show Analytics link for Hospital Admin
            <Link href={path("/lab/lab-analytics")} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Link>
          )}
        </div>
      </div>

      {(error || notice) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>
          {error || notice}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((item) => (
          <div key={item.label} className="rounded-xl border border-border bg-card p-5">
            <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${item.tone}`}>
              <item.icon className="h-5 w-5" />
            </div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Completion Rate</p>
          <p className="mt-2 text-3xl font-bold">{stats.completionRate || 0}%</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Avg Turnaround</p>
          <p className="mt-2 text-3xl font-bold">{stats.averageTurnaround || 0}h</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Critical Results</p>
          <p className="mt-2 text-3xl font-bold text-red-600">{stats.critical || 0}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Inventory Risk</p>
          <p className="mt-2 text-3xl font-bold">{(stats.lowStock || 0) + (stats.expiringSoon || 0)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_170px_170px_210px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patient, doctor, test, code, location..." className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-orange-300" />
          </div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
            <option value="all">All status</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In progress</option>
            <option value="collected">Collected</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
            <option value="all">All priority</option>
            <option value="routine">Routine</option>
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
            <option value="critical">Critical</option>
            <option value="stat">STAT</option>
          </select>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
            <option value="all">All categories</option>
            {data.filters.categories.map((category) => (
              <option key={category} value={category.toLowerCase()}>{category}</option>
            ))}
          </select>
          <button onClick={clearFilters} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">Clear</button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <section className="rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
            <div>
              <h2 className="text-lg font-semibold">{worklistTitle}</h2>
              <p className="text-sm text-muted-foreground">{worklistDescription}</p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">{filteredOrders.length} visible</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">Order</th>
                  <th className="px-4 py-3 font-semibold">Patient</th>
                  <th className="px-4 py-3 font-semibold">Doctor</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                  <th className="px-4 py-3 font-semibold">Due</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No lab orders match the current filters.</td></tr>
                ) : filteredOrders.map((order) => (
                  <tr key={order.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-4">
                      <p className="font-semibold">{order.testName}</p>
                      <p className="text-xs text-muted-foreground">{order.testCode || "No code"} • {order.category}</p>
                      <p className="text-xs text-muted-foreground"><MapPin className="mr-1 inline h-3 w-3" />{order.labLocation}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium">{order.patientName}</p>
                      <p className="text-xs text-muted-foreground">{order.patientPhone || order.patientEmail || "No contact"}</p>
                    </td>
                    <td className="px-4 py-4">{order.doctorName}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full border px-2 py-1 text-xs font-semibold capitalize ${statusClass(order.status)}`}>{order.status.replace("-", " ")}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full border px-2 py-1 text-xs font-semibold capitalize ${priorityClass(order.priority)}`}>{order.priority}</span>
                    </td>
                    <td className="px-4 py-4">
                      <p className={order.overdue ? "font-semibold text-red-600" : "text-muted-foreground"}>{formatDate(order.dueDate)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <Link href={path(`/lab/lab-orders/${order.id}`)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 font-semibold hover:bg-muted">
                          <Eye className="h-4 w-4" />
                          View
                        </Link>
                        {isHospitalAdmin && !["completed", "cancelled"].includes(order.status) && ( // Only show Escalate for Hospital Admin
                          <button disabled={busyOrderId === order.id} onClick={() => runAction(order, "escalate")} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">
                            <Zap className="h-4 w-4" />
                            Escalate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Recent Results</h2>
                <p className="text-sm text-muted-foreground">Latest published or uploaded lab findings.</p>
              </div>
              <Link href={path("/lab/lab-results")} className="text-sm font-semibold text-orange-600 hover:underline">Open all</Link>
            </div>
            <div className="space-y-3">
              {data.recentResults.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">No results available.</p>
              ) : data.recentResults.map((result) => (
                <div key={result.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{result.testName}</p>
                      <p className="text-sm text-muted-foreground">{result.patientName}</p>
                    </div>
                    {result.flag && <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${result.flag === "critical" ? "border-red-200 bg-red-50 text-red-700" : "border-border bg-muted text-muted-foreground"}`}>{result.flag}</span>}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{result.summary || "No summary provided."}</p>
                  {result.fileUrl && <a href={result.fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-semibold text-orange-600 hover:underline">Open attachment</a>}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Inventory Risk</h2>
                <p className="text-sm text-muted-foreground">Low stock and expiring supplies affecting lab throughput.</p>
              </div>
              <Link href={path("/lab/lab-inventory")} className="text-sm font-semibold text-orange-600 hover:underline">Inventory</Link>
            </div>
            <div className="space-y-3">
              {data.inventoryAlerts.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">No inventory risks found.</p>
              ) : data.inventoryAlerts.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-4">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.expiringSoon ? `Expires ${formatDate(item.expiryDate)}` : "Stock level requires review"}</p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold">{item.stock} left</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Link href={path("/lab/lab-orders")} className="rounded-2xl border border-border bg-card p-5 hover:bg-muted/40">
          <FlaskConical className="mb-3 h-6 w-6 text-orange-600" />
          <h3 className="font-semibold">Lab Order Registry</h3>
          <p className="mt-1 text-sm text-muted-foreground">Review all orders and technician workflow detail.</p>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orange-600">Open registry <ArrowRight className="h-4 w-4" /></span>
        </Link>
        <Link href={path("/lab/lab-qc")} className="rounded-2xl border border-border bg-card p-5 hover:bg-muted/40">
          <Microscope className="mb-3 h-6 w-6 text-orange-600" />
          <h3 className="font-semibold">Quality Control</h3>
          <p className="mt-1 text-sm text-muted-foreground">Monitor QC activity and exception trends.</p>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orange-600">Open QC <ArrowRight className="h-4 w-4" /></span>
        </Link>
        <Link href={path("/lab/performance")} className="rounded-2xl border border-border bg-card p-5 hover:bg-muted/40">
          <TrendingUp className="mb-3 h-6 w-6 text-orange-600" />
          <h3 className="font-semibold">Performance</h3>
          <p className="mt-1 text-sm text-muted-foreground">Track throughput, turnaround, and queue pressure.</p>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orange-600">Open performance <ArrowRight className="h-4 w-4" /></span>
        </Link>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Lab Staff Coverage</h2>
            <p className="text-sm text-muted-foreground">Active lab technician accounts for this tenant.</p>
          </div>
          {isHospitalAdmin && ( // Only show Manage staff link for Hospital Admin
            <Link href={path("/staff-management")} className="text-sm font-semibold text-orange-600 hover:underline">Manage staff</Link>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {data.labStaff.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground md:col-span-2 xl:col-span-4">No active lab technicians found.</p>
          ) : data.labStaff.map((member) => (
            <div key={member.id} className="rounded-xl border border-border bg-background p-4">
              <p className="font-semibold">{member.fullName}</p>
              <p className="text-sm text-muted-foreground">{member.email}</p>
              <span className="mt-3 inline-flex rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">Active</span>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}