"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  Filter,
  Image as ImageIcon,
  Info,
  Loader2,
  Megaphone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Target,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";

const orange = "#F97316";

type BroadcastStatus = "draft" | "scheduled" | "sent" | "cancelled";
type BroadcastType = "announcement" | "memo" | "alert" | "reminder" | "update" | "flyer" | "poster";

type Broadcast = {
  id: string;
  title: string;
  message: string;
  type: BroadcastType;
  priority: "low" | "normal" | "high" | "urgent";
  targetAudience: string[];
  status: BroadcastStatus;
  scheduledFor?: string;
  sentAt?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  recipientCount: number;
  readCount: number;
  createdBy: { id: string; name: string; role: string };
  createdAt: string;
  updatedAt?: string;
};

type Stats = {
  total: number;
  sent: number;
  scheduled: number;
  drafts: number;
  totalReach: number;
  readRate: number;
};

type BroadcastForm = {
  title: string;
  message: string;
  type: BroadcastType;
  priority: "low" | "normal" | "high" | "urgent";
  targetAudience: string[];
  status: BroadcastStatus;
  scheduledFor: string;
  attachmentUrl: string;
  attachmentName: string;
  attachmentType: string;
};

const EMPTY_FORM: BroadcastForm = {
  title: "",
  message: "",
  type: "announcement",
  priority: "normal",
  targetAudience: ["all_staff"],
  status: "draft",
  scheduledFor: "",
  attachmentUrl: "",
  attachmentName: "",
  attachmentType: "",
};

const EMPTY_STATS: Stats = { total: 0, sent: 0, scheduled: 0, drafts: 0, totalReach: 0, readRate: 0 };

const tabs = [
  { id: "all", label: "All Broadcasts", icon: Megaphone },
  { id: "draft", label: "Drafts", icon: Clock },
  { id: "scheduled", label: "Scheduled", icon: Calendar },
  { id: "sent", label: "Sent", icon: CheckCircle },
  { id: "cancelled", label: "Cancelled", icon: AlertTriangle },
];

const typeOptions: Array<{ value: BroadcastType | "all"; label: string }> = [
  { value: "all", label: "All types" },
  { value: "announcement", label: "Announcement" },
  { value: "memo", label: "Memo" },
  { value: "alert", label: "Alert" },
  { value: "reminder", label: "Reminder" },
  { value: "update", label: "Update" },
  { value: "flyer", label: "Flyer" },
  { value: "poster", label: "Poster" },
];

const audienceOptions = [
  { value: "all_staff", label: "All staff" },
  { value: "clinical", label: "Clinical teams" },
  { value: "administration", label: "Administration" },
  { value: "doctors", label: "Doctors" },
  { value: "nurses", label: "Nurses" },
  { value: "lab", label: "Lab team" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "accountants", label: "Accountants" },
  { value: "reception", label: "Reception" },
  { value: "patients", label: "Patients" },
  { value: "guardians", label: "Guardians" },
  { value: "all_users", label: "Everyone in tenant" },
];

function formatDate(value?: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleString();
}

function getTypeIcon(type: string) {
  switch (type) {
    case "alert":
      return <AlertTriangle className="size-4 text-red-600" />;
    case "memo":
      return <FileText className="size-4 text-slate-700" />;
    case "flyer":
    case "poster":
      return <ImageIcon className="size-4 text-pink-600" />;
    case "reminder":
      return <Bell className="size-4 text-orange-600" />;
    case "update":
      return <Info className="size-4 text-green-600" />;
    default:
      return <Megaphone className="size-4 text-blue-600" />;
  }
}

function priorityClass(priority: string) {
  switch (priority) {
    case "urgent":
      return "text-red-700 bg-red-50 border-red-200";
    case "high":
      return "text-orange-700 bg-orange-50 border-orange-200";
    case "normal":
      return "text-blue-700 bg-blue-50 border-blue-200";
    default:
      return "text-gray-700 bg-gray-50 border-gray-200";
  }
}

function statusClass(status: string) {
  switch (status) {
    case "sent":
      return "text-green-700 bg-green-50";
    case "scheduled":
      return "text-blue-700 bg-blue-50";
    case "cancelled":
      return "text-red-700 bg-red-50";
    default:
      return "text-gray-700 bg-gray-50";
  }
}

export default function BroadcastsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Broadcast | null>(null);
  const [form, setForm] = useState<BroadcastForm>(EMPTY_FORM);

  const fetchBroadcasts = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    setError("");
    try {
      const query = new URLSearchParams({ status: activeTab, type: typeFilter });
      const res = await fetch(`/api/tenant/${slug}/broadcasts?${query.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to fetch broadcasts");
      setBroadcasts(Array.isArray(data?.broadcasts) ? data.broadcasts : []);
      setStats(data?.stats || EMPTY_STATS);
    } catch (fetchError: any) {
      setError(fetchError?.message || "Failed to fetch broadcasts");
      setBroadcasts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (slug) fetchBroadcasts();
  }, [slug, activeTab, typeFilter]);

  const filteredBroadcasts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return broadcasts;
    return broadcasts.filter((broadcast) =>
      [broadcast.title, broadcast.message, broadcast.type, broadcast.priority, broadcast.status, ...(broadcast.targetAudience || [])]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [broadcasts, search]);

  const setAudience = (value: string) => {
    setForm((current) => {
      const next = current.targetAudience.includes(value)
        ? current.targetAudience.filter((item) => item !== value)
        : [...current.targetAudience, value];
      return { ...current, targetAudience: next.length ? next : ["all_staff"] };
    });
  };

  const uploadAsset = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      const res = await fetch(`/api/tenant/${slug}/broadcasts/upload`, { method: "POST", body: uploadData });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to upload asset");
      setForm((current) => ({
        ...current,
        attachmentUrl: data.url,
        attachmentName: data.filename,
        attachmentType: data.fileType,
      }));
      setNotice("Attachment uploaded.");
    } catch (uploadError: any) {
      setError(uploadError?.message || "Failed to upload attachment");
    } finally {
      setUploading(false);
    }
  };

  const submitBroadcast = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/tenant/${slug}/broadcasts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to create broadcast");
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      setNotice(form.status === "sent" ? `Broadcast sent to ${data.recipientCount || 0} recipients.` : "Broadcast saved.");
      await fetchBroadcasts(true);
    } catch (submitError: any) {
      setError(submitError?.message || "Failed to create broadcast");
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (broadcast: Broadcast, action: "send" | "cancel" | "delete") => {
    const labels = { send: "send this broadcast", cancel: "cancel this scheduled broadcast", delete: "delete this broadcast" };
    if (!window.confirm(`Are you sure you want to ${labels[action]}?`)) return;
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/tenant/${slug}/broadcasts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ broadcastId: broadcast.id, action }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Action failed");
      setNotice(action === "send" ? `Broadcast sent to ${data.recipientCount || 0} recipients.` : "Broadcast updated.");
      setSelected(null);
      await fetchBroadcasts(true);
    } catch (actionError: any) {
      setError(actionError?.message || "Action failed");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setActiveTab("all");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Communication</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Broadcasts</h1>
          <p className="text-sm text-muted-foreground mt-1">Publish announcements, memos, alerts, posters, and flyers to tenant audiences.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => fetchBroadcasts(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted disabled:opacity-60 transition-all"
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button onClick={clearFilters} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all">
            <Filter className="size-4" />
            Clear Filters
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90"
            style={{ backgroundColor: orange }}
          >
            <Plus className="size-4" />
            New Broadcast
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
          { label: "Total", value: stats.total, icon: Megaphone, tone: "bg-blue-50 text-blue-600" },
          { label: "Sent", value: stats.sent, icon: CheckCircle, tone: "bg-green-50 text-green-600" },
          { label: "Scheduled", value: stats.scheduled, icon: Calendar, tone: "bg-orange-50 text-orange-600" },
          { label: "Reach", value: stats.totalReach.toLocaleString(), icon: Users, tone: "bg-slate-100 text-slate-700" },
          { label: "Read Rate", value: `${stats.readRate}%`, icon: Eye, tone: "bg-purple-50 text-purple-600" },
        ].map((item) => (
          <div key={item.label} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className={`size-10 rounded-xl flex items-center justify-center ${item.tone}`}>
                <item.icon className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-2xl font-bold text-foreground">{item.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
          <input
            type="text"
            placeholder="Search by title, message, audience, priority, or status..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          className="px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
        >
          {typeOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div className="border-b border-border overflow-x-auto">
        <nav className="flex min-w-max space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id ? "border-orange-500 text-orange-600" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="size-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-7 text-orange-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredBroadcasts.length === 0 ? (
            <div className="col-span-full flex items-center justify-center py-16 border border-dashed border-border rounded-2xl">
              <div className="text-center text-muted-foreground">
                <Megaphone className="size-12 mx-auto mb-4 opacity-50" />
                <p className="font-semibold">No broadcasts found</p>
                <p className="text-sm">Create a broadcast or adjust your filters.</p>
              </div>
            </div>
          ) : (
            filteredBroadcasts.map((broadcast) => {
              const readRate = broadcast.recipientCount ? Math.round((broadcast.readCount / broadcast.recipientCount) * 100) : 0;
              return (
                <div key={broadcast.id} className="bg-card border border-border rounded-xl p-6 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {getTypeIcon(broadcast.type)}
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{broadcast.title}</h3>
                        <p className="text-xs text-muted-foreground capitalize">{broadcast.type.replace("_", " ")}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-md text-xs font-medium capitalize ${statusClass(broadcast.status)}`}>{broadcast.status}</span>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-3">{broadcast.message}</p>

                  {broadcast.attachmentUrl && (
                    <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                      <a href={broadcast.attachmentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-medium hover:underline">
                        {broadcast.attachmentType?.startsWith("image") ? <ImageIcon className="size-4" /> : <FileText className="size-4" />}
                        {broadcast.attachmentName || "View attachment"}
                      </a>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Priority</p>
                      <span className={`inline-block mt-1 px-2 py-1 rounded-md border text-xs font-medium capitalize ${priorityClass(broadcast.priority)}`}>{broadcast.priority}</span>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Recipients</p>
                      <p className="font-semibold">{broadcast.recipientCount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Read Rate</p>
                      <p className="font-semibold text-green-700">{readRate}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{broadcast.status === "scheduled" ? "Scheduled" : "Sent/Created"}</p>
                      <p className="font-semibold">{formatDate(broadcast.status === "scheduled" ? broadcast.scheduledFor : broadcast.sentAt || broadcast.createdAt)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-auto">
                    <button onClick={() => setSelected(broadcast)} className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted">
                      <Eye className="size-4" />
                      View
                    </button>
                    {(broadcast.status === "draft" || broadcast.status === "scheduled") && (
                      <button onClick={() => runAction(broadcast, "send")} className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90" style={{ backgroundColor: orange }}>
                        <Send className="size-4" />
                        Send
                      </button>
                    )}
                    {broadcast.status === "scheduled" && (
                      <button onClick={() => runAction(broadcast, "cancel")} className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-50">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 overflow-y-auto">
          <div className="mx-auto max-w-3xl bg-background border border-border rounded-2xl shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="text-xl font-bold">Create Broadcast</h2>
                <p className="text-sm text-muted-foreground">Send now, schedule, or save as draft.</p>
              </div>
              <button onClick={() => setCreateOpen(false)} className="p-2 rounded-lg hover:bg-muted">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={submitBroadcast} className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="space-y-1 md:col-span-2">
                  <span className="text-sm font-medium">Title</span>
                  <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background" />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium">Type</span>
                  <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as BroadcastType })} className="w-full px-3 py-2 rounded-lg border border-border bg-background">
                    {typeOptions.filter((item) => item.value !== "all").map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="space-y-1 block">
                <span className="text-sm font-medium">Message</span>
                <textarea required rows={6} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background resize-y" />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="space-y-1">
                  <span className="text-sm font-medium">Priority</span>
                  <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as BroadcastForm["priority"] })} className="w-full px-3 py-2 rounded-lg border border-border bg-background">
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium">Publish mode</span>
                  <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as BroadcastStatus })} className="w-full px-3 py-2 rounded-lg border border-border bg-background">
                    <option value="draft">Save draft</option>
                    <option value="sent">Send now</option>
                    <option value="scheduled">Schedule</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium">Scheduled for</span>
                  <input type="datetime-local" disabled={form.status !== "scheduled"} required={form.status === "scheduled"} value={form.scheduledFor} onChange={(event) => setForm({ ...form, scheduledFor: event.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background disabled:opacity-50" />
                </label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Target className="size-4" />
                  Target Audience
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {audienceOptions.map((audience) => (
                    <label key={audience.value} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                      <input type="checkbox" checked={form.targetAudience.includes(audience.value)} onChange={() => setAudience(audience.value)} />
                      {audience.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Flyer, poster, or PDF memo</p>
                    <p className="text-xs text-muted-foreground">Supports JPG, PNG, WebP, and PDF. Images are compressed for faster loading.</p>
                  </div>
                  {uploading && <Loader2 className="size-5 animate-spin text-orange-500" />}
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted">
                  <Upload className="size-4" />
                  Upload asset
                  <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(event) => event.target.files?.[0] && uploadAsset(event.target.files[0])} />
                </label>
                {form.attachmentUrl && (
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 p-3 text-sm">
                    <a href={form.attachmentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-medium hover:underline">
                      {form.attachmentType.startsWith("image") ? <ImageIcon className="size-4" /> : <FileText className="size-4" />}
                      {form.attachmentName}
                    </a>
                    <button type="button" onClick={() => setForm({ ...form, attachmentUrl: "", attachmentName: "", attachmentType: "" })} className="text-red-600 hover:underline">Remove</button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted">Cancel</button>
                <button type="submit" disabled={saving || uploading} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60" style={{ backgroundColor: orange }}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {form.status === "sent" ? "Send Broadcast" : form.status === "scheduled" ? "Schedule Broadcast" : "Save Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 overflow-y-auto">
          <div className="mx-auto max-w-2xl bg-background border border-border rounded-2xl shadow-xl">
            <div className="flex items-start justify-between p-5 border-b border-border">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {getTypeIcon(selected.type)}
                  <span className={`px-2 py-1 rounded-md text-xs font-medium capitalize ${statusClass(selected.status)}`}>{selected.status}</span>
                </div>
                <h2 className="text-xl font-bold">{selected.title}</h2>
                <p className="text-sm text-muted-foreground">Created by {selected.createdBy?.name || "Hospital Admin"} on {formatDate(selected.createdAt)}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-muted">
                <X className="size-5" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              <p className="whitespace-pre-wrap text-sm leading-6">{selected.message}</p>
              {selected.attachmentUrl && (
                <div className="rounded-xl border border-border p-4">
                  <p className="text-sm font-semibold mb-3">Attachment</p>
                  {selected.attachmentType?.startsWith("image") ? (
                    <a href={selected.attachmentUrl} target="_blank" rel="noreferrer">
                      <img src={selected.attachmentUrl} alt={selected.attachmentName || selected.title} className="max-h-80 w-full object-contain rounded-lg bg-muted" />
                    </a>
                  ) : (
                    <a href={selected.attachmentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium hover:underline">
                      <FileText className="size-4" />
                      {selected.attachmentName || "Open PDF"}
                    </a>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-muted-foreground">Recipients</p>
                  <p className="font-bold">{selected.recipientCount}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-muted-foreground">Reads</p>
                  <p className="font-bold">{selected.readCount}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-muted-foreground">Priority</p>
                  <p className="font-bold capitalize">{selected.priority}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-bold capitalize">{selected.type}</p>
                </div>
              </div>
              <div className="rounded-lg bg-muted/30 p-3 text-sm">
                <p><strong>Audience:</strong> {(selected.targetAudience || []).join(", ") || "Not set"}</p>
                <p><strong>Scheduled:</strong> {formatDate(selected.scheduledFor)}</p>
                <p><strong>Sent:</strong> {formatDate(selected.sentAt)}</p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {(selected.status === "draft" || selected.status === "scheduled") && (
                  <button onClick={() => runAction(selected, "send")} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ backgroundColor: orange }}>
                    <Send className="size-4" />
                    Send Now
                  </button>
                )}
                {selected.status === "scheduled" && (
                  <button onClick={() => runAction(selected, "cancel")} className="px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-50">Cancel Schedule</button>
                )}
                <button onClick={() => runAction(selected, "delete")} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-50">
                  <Trash2 className="size-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
