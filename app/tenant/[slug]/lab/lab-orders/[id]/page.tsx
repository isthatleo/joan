"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { withTenantPrefix } from "@/lib/tenant-routing";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Loader2,
  MapPin,
  Microscope,
  RefreshCw,
  Upload, // Import Upload icon
} from "lucide-react";
import { useAuthStore } from "@/stores/auth"; // Import useAuthStore

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function statusClass(status: string) {
  switch (status) {
    case "completed":
      return "border-green-200 bg-green-50 text-green-700";
    case "in-progress":
    case "collected":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "cancelled":
      return "border-slate-200 bg-slate-100 text-slate-700";
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

export default function LabOrderDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const id = params?.id as string;
  const hostname = typeof window !== "undefined" ? window.location.hostname : null;
  const path = (value: string) => withTenantPrefix(value, slug, hostname);
  const { user } = useAuthStore(); // Get user from auth store
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const order = useMemo(() => orders.find((item) => item.id === id) || null, [orders, id]);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    setError("");
    try {
      const res = await fetch(`/api/tenant/${slug}/lab?status=all&limit=250`, { cache: "no-store" });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || "Failed to load lab order");
      setOrders(Array.isArray(payload?.orders) ? payload.orders : []);
    } catch (loadError: any) {
      setError(loadError?.message || "Failed to load lab order");
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (slug && id) load();
  }, [slug, id]);

  const isLabTechnician = user?.role === "lab_technician";
  const isHospitalAdmin = user?.role === "hospital_admin";

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>;
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <Link href={path("/lab")} className="inline-flex items-center gap-2 text-sm text-orange-600 hover:underline"><ArrowLeft className="h-4 w-4" />Back to lab operations</Link>
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <p className="text-sm text-muted-foreground">Lab order not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={path("/lab")} className="inline-flex items-center gap-2 text-sm text-orange-600 hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to lab operations
        </Link>
        <button onClick={() => load(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {isHospitalAdmin ? "Hospital Admin Lab Order Detail" : "Lab Technician Lab Order Detail"}
            </p>
            <h1 className="mt-1 text-3xl font-bold text-foreground">{order.testName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Code {order.testCode || "-"} • {order.category}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {order.result?.id && (
              <Link href={path(`/lab/lab-results/${order.result.id}`)} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">
                <Microscope className="h-4 w-4" />
                View Result
              </Link>
            )}
            {isLabTechnician && !order.result?.id && ( // Show Upload Results button only for Lab Technicians if no result exists
              <Link href={path(`/lab/lab-results/upload?orderId=${order.id}`)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                <Upload className="h-4 w-4" />
                Upload Results
              </Link>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-background p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Patient</p><p className="mt-2 font-medium text-foreground">{order.patientName}</p><p className="text-xs text-muted-foreground">{order.patientPhone || order.patientEmail || "No contact"}</p></div>
          <div className="rounded-xl bg-background p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Doctor</p><p className="mt-2 font-medium text-foreground">{order.doctorName || "-"}</p></div>
          <div className="rounded-xl bg-background p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Status</p><span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-xs font-semibold capitalize ${statusClass(order.status)}`}>{order.status.replace("-", " ")}</span></div>
          <div className="rounded-xl bg-background p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Priority</p><span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-xs font-semibold capitalize ${priorityClass(order.priority)}`}>{order.priority}</span></div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="mb-3 flex items-center gap-2 font-medium text-foreground"><CalendarClock className="h-4 w-4" />Timeline</div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Ordered: {formatDate(order.orderedAt)}</p>
              <p>Collected: {formatDate(order.collectedAt)}</p>
              <p>Completed: {formatDate(order.completedAt)}</p>
              <p className={order.overdue ? "font-semibold text-red-600" : ""}>Due: {formatDate(order.dueDate)}</p>
              {typeof order.turnaroundHours === "number" && <p>Turnaround: {order.turnaroundHours}h</p>}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="mb-3 flex items-center gap-2 font-medium text-foreground"><MapPin className="h-4 w-4" />Location and notes</div>
            <p className="text-sm text-muted-foreground">Location: {order.labLocation || "Main Laboratory"}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{order.notes || "No order notes added."}</p>
          </div>
        </div>

        {order.result ? (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            <div className="mb-2 flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4" />Result available</div>
            <p>{order.result.summary || "A result has been attached to this lab order."}</p>
            {order.result.fileUrl && <a href={order.result.fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex font-semibold hover:underline">Open result file</a>}
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
            <div className="mb-2 flex items-center gap-2 font-semibold"><AlertCircle className="h-4 w-4" />Result pending</div>
            <p>
              {isHospitalAdmin
                ? "Hospital admins can monitor this order, but lab technicians are responsible for uploading results."
                : "Upload results once the lab analysis is complete."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}