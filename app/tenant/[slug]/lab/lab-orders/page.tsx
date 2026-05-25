"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { withTenantPrefix } from "@/lib/tenant-routing";
import { ArrowLeft, CheckCircle2, FlaskConical, Loader2, Microscope, PlayCircle, Plus, RefreshCw, Search, ShieldX } from "lucide-react";

export default function LabOrdersPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;
  const hostname = typeof window !== "undefined" ? window.location.hostname : null;
  const path = (value: string) => withTenantPrefix(value, slug, hostname);
  const [orders, setOrders] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams?.get("status") || "all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ patientId: "", testName: "", testCode: "", category: "General", priority: "routine", dueDate: "", labLocation: "Main Laboratory", notes: "" });

  const load = async (soft = false) => {
    soft ? setRefreshing(true) : setLoading(true);
    try {
      const status = statusFilter === "all" ? "" : `&status=${statusFilter}`;
      const [ordersRes, patientsRes] = await Promise.all([
        fetch(`/api/lab/orders?slug=${slug}${status}&limit=200`, { cache: "no-store" }),
        fetch(`/api/lab/patients?slug=${slug}`, { cache: "no-store" }),
      ]);
      const ordersPayload = ordersRes.ok ? await ordersRes.json() : { orders: [] };
      const patientsPayload = patientsRes.ok ? await patientsRes.json() : { patients: [] };
      setOrders(Array.isArray(ordersPayload?.orders) ? ordersPayload.orders : []);
      setPatients(Array.isArray(patientsPayload?.patients) ? patientsPayload.patients : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [slug, statusFilter]);

  const mutateOrder = async (orderId: string, method: "PATCH" | "DELETE", body?: any) => {
    const res = await fetch(`/api/lab/orders/${orderId}${method === "DELETE" ? `?slug=${slug}` : ""}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify({ ...body, slug }) : undefined,
    });
    if (res.ok) await load(true);
  };

  const createOrder = async () => {
    const res = await fetch(`/api/lab/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, slug }),
    });
    if (res.ok) {
      setShowCreate(false);
      setForm({ patientId: "", testName: "", testCode: "", category: "General", priority: "routine", dueDate: "", labLocation: "Main Laboratory", notes: "" });
      await load(true);
    }
  };

  const filtered = useMemo(() => orders.filter((order) => {
    const q = search.toLowerCase();
    const matchesSearch = String(order.patientName || "").toLowerCase().includes(q) || String(order.testType || "").toLowerCase().includes(q) || String(order.testCode || "").toLowerCase().includes(q);
    const matchesPriority = priorityFilter === "all" || String(order.priority || "") === priorityFilter;
    return matchesSearch && matchesPriority;
  }), [orders, search, priorityFilter]);

  const stats = {
    total: orders.length,
    pending: orders.filter((order) => order.status === "pending").length,
    inProgress: orders.filter((order) => order.status === "in-progress").length,
    completed: orders.filter((order) => order.status === "completed").length,
    critical: orders.filter((order) => order.priority === "critical").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={path("/lab")} className="mb-3 inline-flex items-center gap-2 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link>
          <h1 className="text-3xl font-bold text-foreground">Lab Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage intake, processing, and result-routing for every order.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => load(true)} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh
          </button>
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"><Plus className="h-4 w-4" />New Order</button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        {[
          ["Total", stats.total], ["Pending", stats.pending], ["In Progress", stats.inProgress], ["Completed", stats.completed], ["Critical", stats.critical],
        ].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-border bg-card p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold text-foreground">{value}</p></div>)}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patient, test, code" className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm text-foreground" /></div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm"><option value="all">All status</option><option value="pending">Pending</option><option value="in-progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm"><option value="all">All priority</option><option value="routine">Routine</option><option value="urgent">Urgent</option><option value="critical">Critical</option></select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-[0.2em] text-muted-foreground"><tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Patient</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Due</th><th className="px-4 py-3">Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="px-4 py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></td></tr> : filtered.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No lab orders found.</td></tr> : filtered.map((order) => (
                <tr key={order.id} className="border-t border-border">
                  <td className="px-4 py-3"><p className="font-medium text-foreground">{order.testType}</p><p className="text-xs text-muted-foreground">{order.testCode || order.id.slice(-8)}</p></td>
                  <td className="px-4 py-3"><p className="font-medium text-foreground">{order.patientName || "Unknown"}</p><p className="text-xs text-muted-foreground">{new Date(order.orderedAt).toLocaleString()}</p></td>
                  <td className="px-4 py-3 text-foreground">{order.priority || "routine"}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{String(order.status || "pending").replace(/-/g, " ")}</span></td>
                  <td className="px-4 py-3 text-foreground">{order.dueDate ? new Date(order.dueDate).toLocaleDateString() : "-"}</td>
                  <td className="px-4 py-3"><div className="flex flex-wrap gap-2">
                    <Link href={path(`/lab/lab-orders/${order.id}`)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">View</Link>
                    {order.status === "pending" && <button onClick={() => mutateOrder(order.id, "PATCH", { status: "in-progress" })} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"><PlayCircle className="h-3.5 w-3.5" />Start</button>}
                    {order.status === "in-progress" && <button onClick={() => mutateOrder(order.id, "PATCH", { status: "completed" })} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"><CheckCircle2 className="h-3.5 w-3.5" />Complete</button>}
                    {order.resultId && <Link href={path(`/lab/lab-results/${order.resultId}`)} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"><Microscope className="h-3.5 w-3.5" />Result</Link>}
                    {order.status !== "cancelled" && <button onClick={() => mutateOrder(order.id, "DELETE")} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"><ShieldX className="h-3.5 w-3.5" />Cancel</button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6"><h2 className="text-xl font-semibold text-foreground">Create lab order</h2><div className="mt-4 grid gap-4 md:grid-cols-2">
        <select value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} className="h-10 rounded-lg border border-border bg-background px-3 text-sm"><option value="">Select patient</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.firstName} {patient.lastName}</option>)}</select>
        <input value={form.testName} onChange={(e) => setForm({ ...form, testName: e.target.value })} placeholder="Test name" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
        <input value={form.testCode} onChange={(e) => setForm({ ...form, testCode: e.target.value })} placeholder="Test code" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
        <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Category" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
        <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="h-10 rounded-lg border border-border bg-background px-3 text-sm"><option value="routine">Routine</option><option value="urgent">Urgent</option><option value="critical">Critical</option></select>
        <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
        <input value={form.labLocation} onChange={(e) => setForm({ ...form, labLocation: e.target.value })} placeholder="Lab location" className="h-10 rounded-lg border border-border bg-background px-3 text-sm md:col-span-2" />
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="min-h-[100px] rounded-lg border border-border bg-background px-3 py-2 text-sm md:col-span-2" />
      </div><div className="mt-6 flex justify-end gap-3"><button onClick={() => setShowCreate(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button><button onClick={createOrder} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Save order</button></div></div></div>}
    </div>
  );
}
