"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { withTenantPrefix } from "@/lib/tenant-routing";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Boxes,
  CheckCircle2,
  Download,
  Eye,
  Loader2,
  Package2,
  Pill,
  RefreshCw,
  Search,
  ShieldAlert,
  Truck,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth"; // Import useAuthStore

type Prescription = {
  id: string;
  patientName: string;
  patientPhone?: string;
  doctorName: string;
  medication: string;
  genericName?: string;
  strength?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  quantity?: number;
  status: string;
  priority: string;
  prescribedAt?: string;
  filledAt?: string;
  expiresAt?: string;
  pharmacy?: string;
  notes?: string;
  interactions: unknown[];
  isEmergency: boolean;
  medications: Array<{ name: string; strength?: string; dosage?: string; quantity?: number; instructions?: string; route?: string; fulfillment?: string }>;
};

type PharmacyData = {
  stats: Record<string, number>;
  prescriptions: Prescription[];
  inventoryAlerts: Array<Record<string, any>>;
  topMedications: Array<{ name: string; quantity: number }>;
  notifications: Array<Record<string, any>>;
  pharmacyStaff: Array<{ id: string; fullName: string; email: string; isActive: boolean }>;
};

const EMPTY_DATA: PharmacyData = {
  stats: {},
  prescriptions: [],
  inventoryAlerts: [],
  topMedications: [],
  notifications: [],
  pharmacyStaff: [],
};

function formatDate(value?: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleString();
}

function statusClass(status: string) {
  switch (status) {
    case "filled":
    case "dispensed":
      return "border-green-200 bg-green-50 text-green-700";
    case "approved":
    case "review":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "cancelled":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "on_hold":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-orange-200 bg-orange-50 text-orange-700";
  }
}

function priorityClass(priority: string) {
  switch (priority) {
    case "critical":
    case "stat":
      return "border-red-200 bg-red-50 text-red-700";
    case "urgent":
      return "border-orange-200 bg-orange-50 text-orange-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function csvEscape(value: unknown) {
  const text = value == null ? "" : String(value);
  return text.includes(",") || text.includes('"') || text.includes("\n") ? `"${text.replace(/"/g, '""')}"` : text;
}

export default function PharmacyAdminPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const hostname = typeof window !== "undefined" ? window.location.hostname : null;
  const path = (value: string) => withTenantPrefix(value, slug, hostname);
  const { user } = useAuthStore(); // Get user from auth store
  const [data, setData] = useState<PharmacyData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selected, setSelected] = useState<Prescription | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    setError("");
    try {
      const query = new URLSearchParams({ status: statusFilter, priority: priorityFilter, limit: "250" });
      const res = await fetch(`/api/tenant/${slug}/pharmacy?${query.toString()}`, { cache: "no-store" });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || "Failed to load pharmacy dashboard");
      setData({
        stats: payload?.stats || {},
        prescriptions: Array.isArray(payload?.prescriptions) ? payload.prescriptions : [],
        inventoryAlerts: Array.isArray(payload?.inventoryAlerts) ? payload.inventoryAlerts : [],
        topMedications: Array.isArray(payload?.topMedications) ? payload.topMedications : [],
        notifications: Array.isArray(payload?.notifications) ? payload.notifications : [],
        pharmacyStaff: Array.isArray(payload?.pharmacyStaff) ? payload.pharmacyStaff : [],
      });
    } catch (loadError: any) {
      setError(loadError?.message || "Failed to load pharmacy dashboard");
      setData(EMPTY_DATA);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (slug) load();
  }, [slug, statusFilter, priorityFilter]);

  const filteredPrescriptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.prescriptions;
    return data.prescriptions.filter((item) =>
      [
        item.patientName,
        item.patientPhone,
        item.doctorName,
        item.medication,
        item.genericName,
        item.strength,
        item.status,
        item.priority,
        item.pharmacy,
      ].join(" ").toLowerCase().includes(q),
    );
  }, [data.prescriptions, search]);

  const runAction = async (prescription: Prescription, action: string, extra: Record<string, any> = {}) => {
    if (action === "cancel" && !window.confirm("Cancel this prescription?")) return;
    setBusyId(prescription.id);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/tenant/${slug}/pharmacy`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prescriptionId: prescription.id, action, ...extra }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || "Pharmacy action failed");
      setNotice("Prescription updated.");
      setSelected(null);
      await load(true);
    } catch (actionError: any) {
      setError(actionError?.message || "Pharmacy action failed");
    } finally {
      setBusyId("");
    }
  };

  const exportCsv = () => {
    const rows = [
      ["Prescription ID", "Patient", "Doctor", "Medication", "Priority", "Status", "Pharmacy", "Prescribed", "Filled"],
      ...filteredPrescriptions.map((item) => [
        item.id,
        item.patientName,
        item.doctorName,
        item.medication,
        item.priority,
        item.status,
        item.pharmacy,
        formatDate(item.prescribedAt),
        formatDate(item.filledAt),
      ]),
    ];
    const blob = new Blob([rows.map((row) => row.map(csvEscape).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pharmacy-operations-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
  };

  const stats = data.stats || {};
  const cards = [
    { label: "Total Prescriptions", value: stats.totalPrescriptions || 0, icon: Pill, tone: "bg-blue-50 text-blue-700" },
    { label: "Pending Review", value: stats.pending || 0, icon: AlertTriangle, tone: "bg-orange-50 text-orange-700" },
    { label: "Filled Today", value: stats.filledToday || 0, icon: CheckCircle2, tone: "bg-green-50 text-green-700" },
    { label: "Stock Risk", value: (stats.lowStock || 0) + (stats.outOfStock || 0), icon: Boxes, tone: "bg-red-50 text-red-700" },
    { label: "Pharmacists", value: stats.pharmacistCount || 0, icon: UserRound, tone: "bg-slate-100 text-slate-700" },
    { label: "Nurse Admin", value: stats.nurseAdministration || 0, icon: ShieldAlert, tone: "bg-cyan-50 text-cyan-700" },
  ];

  const isHospitalAdmin = user?.role === "hospital_admin";
  const isPharmacist = user?.role === "pharmacist";

  const pageTitle = isHospitalAdmin ? "Pharmacy Operations" : "Pharmacist Dashboard";
  const pageDescription = isHospitalAdmin
    ? "Administrative oversight for prescriptions, medication safety, stock risk, replenishment, and pharmacy staff coverage."
    : "Manage prescriptions, review medication safety, and monitor pharmacy inventory.";
  const worklistTitle = isHospitalAdmin ? "Admin Prescription Worklist" : "Prescription Worklist";
  const worklistDescription = isHospitalAdmin
    ? "Oversight actions do not replace pharmacist dispensing."
    : "Current prescriptions for review and dispensing.";

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
            {isHospitalAdmin ? "Hospital Admin" : "Pharmacist"}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">{pageTitle}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{pageDescription}</p>
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
            <Link href={path("/pharmacy/analytics")} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">
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
        <div className="rounded-xl border border-border bg-card p-5"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Filled/Dispensed</p><p className="mt-2 text-3xl font-bold">{stats.filled || 0}</p></div>
        <div className="rounded-xl border border-border bg-card p-5"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Out of Stock</p><p className="mt-2 text-3xl font-bold text-red-600">{stats.outOfStock || 0}</p></div>
        <div className="rounded-xl border border-border bg-card p-5"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Expiring Soon</p><p className="mt-2 text-3xl font-bold">{stats.expiringSoon || 0}</p></div>
        <div className="rounded-xl border border-border bg-card p-5"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Safety Risks</p><p className="mt-2 text-3xl font-bold">{stats.criticalInteractions || 0}</p></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Link href={path("/pharmacy/prescriptions")} className="rounded-2xl border border-border bg-card p-5 hover:bg-muted/40">
          <Pill className="mb-3 h-6 w-6 text-orange-600" />
          <h3 className="font-semibold">Prescription Registry</h3>
          <p className="mt-1 text-sm text-muted-foreground">Review prescription queues and pharmacist workload.</p>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orange-600">Open registry <ArrowRight className="h-4 w-4" /></span>
        </Link>
        <Link href={path("/pharmacy/inventory")} className="rounded-2xl border border-border bg-card p-5 hover:bg-muted/40">
          <Boxes className="mb-3 h-6 w-6 text-orange-600" />
          <h3 className="font-semibold">Inventory</h3>
          <p className="mt-1 text-sm text-muted-foreground">Monitor medicine stock, expiry, and shortages.</p>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orange-600">Open inventory <ArrowRight className="h-4 w-4" /></span>
        </Link>
        <Link href={path("/pharmacy/suppliers")} className="rounded-2xl border border-border bg-card p-5 hover:bg-muted/40">
          <Truck className="mb-3 h-6 w-6 text-orange-600" />
          <h3 className="font-semibold">Suppliers</h3>
          <p className="mt-1 text-sm text-muted-foreground">Track supplier coverage and replenishment readiness.</p>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orange-600">Open suppliers <ArrowRight className="h-4 w-4" /></span>
        </Link>
        <Link href={path("/pharmacy/drug-interactions")} className="rounded-2xl border border-border bg-card p-5 hover:bg-muted/40">
          <ShieldAlert className="mb-3 h-6 w-6 text-orange-600" />
          <h3 className="font-semibold">Safety Review</h3>
          <p className="mt-1 text-sm text-muted-foreground">View drug interaction and medication safety risks.</p>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orange-600">Open safety <ArrowRight className="h-4 w-4" /></span>
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_170px_170px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patient, doctor, medication, status..." className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-orange-300" />
          </div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
            <option value="all">All status</option>
            <option value="pending">Pending</option>
            <option value="review">Review</option>
            <option value="approved">Approved</option>
            <option value="filled">Filled</option>
            <option value="dispensed">Dispensed</option>
            <option value="on_hold">On hold</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
            <option value="all">All priority</option>
            <option value="normal">Normal</option>
            <option value="routine">Routine</option>
            <option value="urgent">Urgent</option>
            <option value="critical">Critical</option>
            <option value="stat">STAT</option>
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
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">{filteredPrescriptions.length} visible</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">Prescription</th>
                  <th className="px-4 py-3 font-semibold">Patient</th>
                  <th className="px-4 py-3 font-semibold">Doctor</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                  <th className="px-4 py-3 font-semibold">Prescribed</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPrescriptions.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No prescriptions match the current filters.</td></tr>
                ) : filteredPrescriptions.map((item) => (
                  <tr key={item.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-4">
                      <p className="font-semibold">{item.medication}</p>
                      <p className="text-xs text-muted-foreground">{[item.genericName, item.strength, item.dosage].filter(Boolean).join(" • ") || "No medication detail"}</p>
                      <p className="mt-1 text-xs font-medium text-muted-foreground">
                        {(item.medications || []).some((medication) => medication.fulfillment === "nurse_administration")
                          ? "Includes nurse-administered IV/injection item(s)"
                          : "Pharmacy / dispensary pickup"}
                      </p>
                    </td>
                    <td className="px-4 py-4"><p className="font-medium">{item.patientName}</p><p className="text-xs text-muted-foreground">{item.patientPhone || "No contact"}</p></td>
                    <td className="px-4 py-4">{item.doctorName}</td>
                    <td className="px-4 py-4"><span className={`rounded-full border px-2 py-1 text-xs font-semibold capitalize ${statusClass(item.status)}`}>{item.status.replace("_", " ")}</span></td>
                    <td className="px-4 py-4"><span className={`rounded-full border px-2 py-1 text-xs font-semibold capitalize ${priorityClass(item.priority)}`}>{item.priority}</span></td>
                    <td className="px-4 py-4 text-muted-foreground">{formatDate(item.prescribedAt)}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setSelected(item)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 font-semibold hover:bg-muted"><Eye className="h-4 w-4" />View</button>
                        {isHospitalAdmin && !["filled", "dispensed", "cancelled"].includes(item.status) && ( // Only show Flag review for Hospital Admin
                          <button disabled={busyId === item.id} onClick={() => runAction(item, "flag_review")} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60">Flag review</button>
                        )}
                        {isHospitalAdmin && !["filled", "dispensed", "cancelled"].includes(item.status) && ( // Only show Escalate for Hospital Admin
                          <button disabled={busyId === item.id} onClick={() => runAction(item, "escalate")} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"><Zap className="h-4 w-4" />Escalate</button>
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
            <h2 className="text-lg font-semibold">Inventory Risk</h2>
            <p className="text-sm text-muted-foreground">Low stock, out-of-stock, and expiry exposure.</p>
            <div className="mt-4 space-y-3">
              {data.inventoryAlerts.length === 0 ? <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">No inventory risks found.</p> : data.inventoryAlerts.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-4">
                  <div><p className="font-semibold">{item.name}</p><p className="text-sm text-muted-foreground">{item.outOfStock ? "Out of stock" : item.expiringSoon ? `Expires ${formatDate(item.expiryDate)}` : "Low stock"}</p></div>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.outOfStock ? "bg-red-50 text-red-700" : "bg-muted text-muted-foreground"}`}>{item.stock} left</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">Top Medications</h2>
            <p className="text-sm text-muted-foreground">Medication volume from visible prescriptions.</p>
            <div className="mt-4 space-y-3">
              {data.topMedications.length === 0 ? <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">No medication volume data.</p> : data.topMedications.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
                  <span className="text-sm font-semibold">{item.name}</span>
                  <span className="text-xs text-muted-foreground">{item.quantity} units</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-600" />
              <h2 className="text-lg font-semibold">Notifications</h2>
            </div>
            <div className="space-y-3">
              {data.notifications.length === 0 ? <p className="text-sm text-muted-foreground">No unread pharmacy notifications.</p> : data.notifications.map((note) => (
                <div key={note.id} className="rounded-xl border border-border bg-background p-4">
                  <p className="text-sm font-semibold">{note.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{note.message}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Pharmacy Staff Coverage</h2>
            <p className="text-sm text-muted-foreground">Active pharmacist accounts for this tenant.</p>
          </div>
          {isHospitalAdmin && ( // Only show Manage staff link for Hospital Admin
            <Link href={path("/staff-management")} className="text-sm font-semibold text-orange-600 hover:underline">Manage staff</Link>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {data.pharmacyStaff.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground md:col-span-2 xl:col-span-4">No active pharmacists found.</p>
          ) : data.pharmacyStaff.map((member) => (
            <div key={member.id} className="rounded-xl border border-border bg-background p-4">
              <p className="font-semibold">{member.fullName}</p>
              <p className="text-sm text-muted-foreground">{member.email}</p>
              <span className="mt-3 inline-flex rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">Active</span>
            </div>
          ))}
        </div>
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
          <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-background shadow-xl">
            <div className="flex items-start justify-between border-b border-border p-5">
              <div>
                <h2 className="text-xl font-bold">{selected.medication}</h2>
                <p className="text-sm text-muted-foreground">{selected.patientName} • {selected.doctorName}</p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg p-2 hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-5 p-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-border p-3"><p className="text-muted-foreground">Status</p><p className="font-semibold capitalize">{selected.status.replace("_", " ")}</p></div>
                <div className="rounded-lg border border-border p-3"><p className="text-muted-foreground">Priority</p><p className="font-semibold capitalize">{selected.priority}</p></div>
                <div className="rounded-lg border border-border p-3"><p className="text-muted-foreground">Pharmacy</p><p className="font-semibold">{selected.pharmacy || "Main Pharmacy"}</p></div>
                <div className="rounded-lg border border-border p-3"><p className="text-muted-foreground">Prescribed</p><p className="font-semibold">{formatDate(selected.prescribedAt)}</p></div>
              </div>
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="font-semibold">Medication instructions</p>
                <p className="mt-1 text-sm text-muted-foreground">{selected.dosage || "No dosage"} • {selected.frequency || "No frequency"} • {selected.duration || "No duration"}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{selected.notes || selected.medications[0]?.instructions || "No additional notes."}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="font-semibold">Fulfillment routing</p>
                <div className="mt-3 space-y-2">
                  {(selected.medications || []).map((medication) => (
                    <div key={`${medication.name}-${medication.route || "route"}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                      <span>{medication.name} {medication.route ? `(${medication.route})` : ""}</span>
                      <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                        {medication.fulfillment === "nurse_administration" ? "Nurse administration queue" : "Pharmacy pickup / dispensary"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {selected.interactions.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  <p className="font-semibold">Interaction / safety flags</p>
                  <p className="mt-1">{selected.interactions.length} interaction record(s) require pharmacist review.</p>
                </div>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                {isPharmacist && !["filled", "dispensed", "cancelled"].includes(selected.status) && ( // Only show Flag review for Pharmacist
                  <button disabled={busyId === selected.id} onClick={() => runAction(selected, "flag_review")} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60">Flag review</button>
                )}
                {isHospitalAdmin && !["filled", "dispensed", "cancelled"].includes(selected.status) && ( // Only show Escalate for Hospital Admin
                  <button disabled={busyId === selected.id} onClick={() => runAction(selected, "escalate")} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">Escalate</button>
                )}
                {isHospitalAdmin && !["filled", "dispensed", "cancelled"].includes(selected.status) && ( // Only show Cancel for Hospital Admin
                  <button disabled={busyId === selected.id} onClick={() => runAction(selected, "cancel", { reason: "Administrative cancellation" })} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60">Cancel</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
