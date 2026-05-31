"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Filter,
  Loader2,
  MessageCircle,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Star,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

type FeedbackItem = {
  id: string;
  scope: "tenant" | "platform";
  type: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string;
  resolution?: string;
  source?: "employee" | "customer";
  submitterRole?: string;
  user?: { id?: string; fullName?: string; email?: string; tenantId?: string };
  tenant?: { id: string; name: string } | null;
  assignedToUser?: { id: string; fullName?: string; email?: string };
};

type FeedbackStats = {
  total: number;
  service: number;
  platform: number;
  open: number;
  inProgress: number;
  resolved: number;
  customers: number;
  employees: number;
  critical: number;
};

const EMPTY_STATS: FeedbackStats = {
  total: 0,
  service: 0,
  platform: 0,
  open: 0,
  inProgress: 0,
  resolved: 0,
  customers: 0,
  employees: 0,
  critical: 0,
};

const EMPTY_PLATFORM_FORM = {
  type: "bug",
  title: "",
  description: "",
  priority: "medium",
};

const statusOptions = [
  { value: "all", label: "All status" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const typeOptions = [
  { value: "all", label: "All types" },
  { value: "service", label: "Service delivery" },
  { value: "staff", label: "Staff conduct" },
  { value: "wait_time", label: "Wait time" },
  { value: "billing", label: "Billing" },
  { value: "bug", label: "Bug" },
  { value: "feature_request", label: "Feature request" },
  { value: "feature_improvement", label: "Feature improvement" },
  { value: "general", label: "General" },
];

const platformTypeOptions = [
  { value: "bug", label: "Bug report" },
  { value: "feature_request", label: "Feature request" },
  { value: "feature_improvement", label: "Feature improvement" },
  { value: "improvement", label: "Workflow improvement" },
  { value: "integration_issue", label: "Integration issue" },
  { value: "platform_billing", label: "Platform billing issue" },
  { value: "platform_general", label: "General platform feedback" },
];

function formatDate(value?: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleString();
}

function statusClass(status: string) {
  switch (status) {
    case "open":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "in_progress":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "resolved":
      return "bg-green-50 text-green-700 border-green-200";
    case "closed":
      return "bg-slate-100 text-slate-700 border-slate-200";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function priorityClass(priority: string) {
  switch (priority) {
    case "critical":
      return "bg-red-50 text-red-700 border-red-200";
    case "high":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "medium":
      return "bg-blue-50 text-blue-700 border-blue-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function typeIcon(type: string) {
  if (type === "bug") return <AlertCircle className="size-4 text-red-600" />;
  if (type.includes("feature")) return <Star className="size-4 text-yellow-600" />;
  return <MessageCircle className="size-4 text-blue-600" />;
}

export default function TenantFeedbackPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [stats, setStats] = useState<FeedbackStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState<"service" | "platform" | "all">("service");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<FeedbackItem | null>(null);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [updateForm, setUpdateForm] = useState({ status: "open", assignedTo: "me", resolution: "" });
  const [platformForm, setPlatformForm] = useState(EMPTY_PLATFORM_FORM);

  const fetchFeedback = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    setError("");
    try {
      const query = new URLSearchParams({
        view: activeView,
        status: statusFilter,
        type: typeFilter,
        source: sourceFilter,
      });
      const res = await fetch(`/api/tenant/${slug}/feedback?${query.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to load feedback");
      setFeedback(Array.isArray(data?.feedback) ? data.feedback : []);
      setStats(data?.stats || EMPTY_STATS);
    } catch (fetchError: any) {
      setError(fetchError?.message || "Failed to load feedback");
      setFeedback([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (slug) fetchFeedback();
  }, [slug, activeView, statusFilter, typeFilter, sourceFilter]);

  const filteredFeedback = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return feedback;
    return feedback.filter((item) =>
      [
        item.title,
        item.description,
        item.type,
        item.priority,
        item.status,
        item.source,
        item.submitterRole,
        item.user?.fullName,
        item.user?.email,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [feedback, search]);

  const openUpdate = (item: FeedbackItem) => {
    setSelected(item);
    setUpdateForm({
      status: item.status || "open",
      assignedTo: item.assignedToUser?.id || "me",
      resolution: item.resolution || "",
    });
    setUpdateOpen(true);
  };

  const updateFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/tenant/${slug}/feedback`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackId: selected.id, ...updateForm }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to update feedback");
      setNotice("Feedback updated.");
      setUpdateOpen(false);
      setSelected(null);
      await fetchFeedback(true);
    } catch (updateError: any) {
      setError(updateError?.message || "Failed to update feedback");
    } finally {
      setSaving(false);
    }
  };

  const submitPlatformFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/tenant/${slug}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(platformForm),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to submit feedback");
      setNotice("Feedback sent to super admin.");
      setSubmitOpen(false);
      setPlatformForm(EMPTY_PLATFORM_FORM);
      setActiveView("platform");
      await fetchFeedback(true);
    } catch (submitError: any) {
      setError(submitError?.message || "Failed to submit feedback");
    } finally {
      setSaving(false);
    }
  };

  const deleteFeedback = async (item: FeedbackItem) => {
    if (!window.confirm("Delete this feedback entry?")) return;
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/tenant/${slug}/feedback?feedbackId=${encodeURIComponent(item.id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to delete feedback");
      setNotice("Feedback deleted.");
      setSelected(null);
      await fetchFeedback(true);
    } catch (deleteError: any) {
      setError(deleteError?.message || "Failed to delete feedback");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setSourceFilter("all");
    setActiveView("service");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Hospital Operations</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Feedback</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review employee/customer service feedback and send product feedback to super admin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => fetchFeedback(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button onClick={clearFilters} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted">
            <Filter className="size-4" />
            Clear filters
          </button>
          <button onClick={() => setSubmitOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600">
            <Send className="size-4" />
            Send to Super Admin
          </button>
        </div>
      </div>

      {(error || notice) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>
          {error || notice}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {[
          { label: "Service Feedback", value: stats.service, icon: MessageSquare, tone: "bg-blue-50 text-blue-700" },
          { label: "Customers", value: stats.customers, icon: Users, tone: "bg-green-50 text-green-700" },
          { label: "Employees", value: stats.employees, icon: UserRound, tone: "bg-slate-100 text-slate-700" },
          { label: "Open", value: stats.open, icon: AlertCircle, tone: "bg-orange-50 text-orange-700" },
          { label: "Critical", value: stats.critical, icon: AlertCircle, tone: "bg-red-50 text-red-700" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className={`flex size-10 items-center justify-center rounded-xl ${card.tone}`}>
                <card.icon className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Service delivery</p>
          <h2 className="mt-2 font-semibold">Tenant operational feedback</h2>
          <p className="mt-1 text-sm text-muted-foreground">Patient, guardian, and employee feedback about services, wait times, billing, care, and internal workflows.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Super admin</p>
          <h2 className="mt-2 font-semibold">Platform feedback</h2>
          <p className="mt-1 text-sm text-muted-foreground">Hospital admin bug reports, feature requests, and product improvement requests are routed to super admin.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Follow up</p>
          <h2 className="mt-2 font-semibold">Operational closure</h2>
          <p className="mt-1 text-sm text-muted-foreground">Use statuses and resolution notes to keep service feedback accountable and auditable.</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_170px_190px_170px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, submitter, role, service area, or description..."
              className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-orange-300"
            />
          </div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none">
            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none">
            {typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} disabled={activeView === "platform"} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none disabled:opacity-50">
            <option value="all">All sources</option>
            <option value="customer">Customers</option>
            <option value="employee">Employees</option>
          </select>
        </div>
      </div>

      <div className="border-b border-border overflow-x-auto">
        <nav className="flex min-w-max gap-8">
          {[
            { id: "service", label: "Service Feedback", count: stats.service },
            { id: "platform", label: "Sent to Super Admin", count: stats.platform },
            { id: "all", label: "All", count: stats.total },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as typeof activeView)}
              className={`border-b-2 px-1 py-4 text-sm font-semibold ${activeView === tab.id ? "border-orange-500 text-orange-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {tab.label} <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">{tab.count}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-7 animate-spin text-orange-500" />
          </div>
        ) : filteredFeedback.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <MessageSquare className="mb-4 size-12 opacity-50" />
            <p className="font-semibold">No feedback found</p>
            <p className="text-sm">Adjust filters or submit feedback to super admin.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b border-border bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">Feedback</th>
                  <th className="px-4 py-3 font-semibold">Submitter</th>
                  <th className="px-4 py-3 font-semibold">Scope</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFeedback.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-3">
                        {typeIcon(item.type)}
                        <div>
                          <p className="font-semibold">{item.title}</p>
                          <p className="mt-1 line-clamp-1 text-muted-foreground">{item.description}</p>
                          <p className="mt-1 text-xs capitalize text-muted-foreground">{item.type.replaceAll("_", " ")}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium">{item.user?.fullName || item.user?.email || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{item.user?.email || "No email"}</p>
                      <p className="text-xs capitalize text-muted-foreground">{(item.submitterRole || item.source || "unknown").replaceAll("_", " ")}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full border border-border bg-muted px-2 py-1 text-xs font-semibold capitalize">
                        {item.scope === "platform" ? "Super admin" : item.source || "Tenant"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold capitalize ${statusClass(item.status)}`}>
                        {item.status === "resolved" ? <CheckCircle className="size-3" /> : item.status === "in_progress" ? <Clock className="size-3" /> : <AlertCircle className="size-3" />}
                        {item.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full border px-2 py-1 text-xs font-semibold capitalize ${priorityClass(item.priority)}`}>{item.priority}</span>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">{formatDate(item.createdAt)}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setSelected(item)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 font-semibold hover:bg-muted">
                          <Eye className="size-4" />
                          View
                        </button>
                        {item.scope === "tenant" && (
                          <button onClick={() => openUpdate(item)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 font-semibold hover:bg-muted">
                            Update
                          </button>
                        )}
                        <button onClick={() => deleteFeedback(item)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 font-semibold text-red-700 hover:bg-red-50">
                          <Trash2 className="size-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {submitOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
          <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-background shadow-xl">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <h2 className="text-xl font-bold">Send Feedback to Super Admin</h2>
                <p className="text-sm text-muted-foreground">Use this for bugs, feature improvements, and platform/product requests.</p>
              </div>
              <button onClick={() => setSubmitOpen(false)} className="rounded-lg p-2 hover:bg-muted"><X className="size-5" /></button>
            </div>
            <form onSubmit={submitPlatformFeedback} className="space-y-4 p-5">
              <label className="block space-y-1">
                <span className="text-sm font-medium">Feedback type</span>
                <select value={platformForm.type} onChange={(event) => setPlatformForm({ ...platformForm, type: event.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2">
                  {platformTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium">Title</span>
                <input required value={platformForm.title} onChange={(event) => setPlatformForm({ ...platformForm, title: event.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2" placeholder="Short, clear summary" />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium">Description</span>
                <textarea required rows={6} value={platformForm.description} onChange={(event) => setPlatformForm({ ...platformForm, description: event.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2" placeholder="Include page, workflow, expected result, actual result, urgency, and any screenshots/reference if relevant." />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium">Priority</span>
                <select value={platformForm.priority} onChange={(event) => setPlatformForm({ ...platformForm, priority: event.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setSubmitOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">Cancel</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60">
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Send Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(selected || updateOpen) && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
          <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-background shadow-xl">
            <div className="flex items-start justify-between border-b border-border p-5">
              <div>
                <h2 className="text-xl font-bold">{updateOpen ? "Update Feedback" : selected?.title}</h2>
                <p className="text-sm text-muted-foreground">{selected?.user?.fullName || selected?.user?.email || "Unknown submitter"} • {formatDate(selected?.createdAt)}</p>
              </div>
              <button onClick={() => { setSelected(null); setUpdateOpen(false); }} className="rounded-lg p-2 hover:bg-muted"><X className="size-5" /></button>
            </div>
            {selected && !updateOpen && (
              <div className="space-y-5 p-5">
                <p className="whitespace-pre-wrap text-sm leading-6">{selected.description}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-border p-3"><p className="text-muted-foreground">Scope</p><p className="font-semibold capitalize">{selected.scope}</p></div>
                  <div className="rounded-lg border border-border p-3"><p className="text-muted-foreground">Source</p><p className="font-semibold capitalize">{selected.source || "platform"}</p></div>
                  <div className="rounded-lg border border-border p-3"><p className="text-muted-foreground">Status</p><p className="font-semibold capitalize">{selected.status.replaceAll("_", " ")}</p></div>
                  <div className="rounded-lg border border-border p-3"><p className="text-muted-foreground">Priority</p><p className="font-semibold capitalize">{selected.priority}</p></div>
                </div>
                {selected.resolution && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                    <p className="font-semibold">Resolution</p>
                    <p className="mt-1 whitespace-pre-wrap">{selected.resolution}</p>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  {selected.scope === "tenant" && <button onClick={() => openUpdate(selected)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">Update Status</button>}
                  <button onClick={() => deleteFeedback(selected)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"><Trash2 className="size-4" /> Delete</button>
                </div>
              </div>
            )}
            {selected && updateOpen && (
              <form onSubmit={updateFeedback} className="space-y-4 p-5">
                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="font-semibold">{selected.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{selected.description}</p>
                </div>
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Status</span>
                  <select value={updateForm.status} onChange={(event) => setUpdateForm({ ...updateForm, status: event.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2">
                    <option value="open">Open</option>
                    <option value="in_progress">In progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Assign</span>
                  <select value={updateForm.assignedTo} onChange={(event) => setUpdateForm({ ...updateForm, assignedTo: event.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2">
                    <option value="">Unassigned</option>
                    <option value="me">Assign to me</option>
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Resolution / internal notes</span>
                  <textarea rows={5} value={updateForm.resolution} onChange={(event) => setUpdateForm({ ...updateForm, resolution: event.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2" placeholder="Document follow-up, actions taken, or closure notes." />
                </label>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setUpdateOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">Cancel</button>
                  <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60">
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
                    Save Update
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
