"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { withTenantPrefix } from "@/lib/tenant-routing";
import { ArrowLeft, CalendarClock, FileText, Loader2, Microscope, UserRound } from "lucide-react";

export default function LabOrderDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const id = params?.id as string;
  const hostname = typeof window !== "undefined" ? window.location.hostname : null;
  const path = (value: string) => withTenantPrefix(value, slug, hostname);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/lab/orders/${id}?slug=${slug}`, { cache: "no-store" });
      setOrder(res.ok ? await res.json() : null);
      setLoading(false);
    })();
  }, [id, slug]);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!order) return <div className="space-y-4"><Link href={path("/lab/lab-orders")} className="inline-flex items-center gap-2 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" />Back to orders</Link><p className="text-sm text-muted-foreground">Order not found.</p></div>;

  return (
    <div className="space-y-6">
      <Link href={path("/lab/lab-orders")} className="inline-flex items-center gap-2 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" />Back to orders</Link>
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Order detail</p>
            <h1 className="mt-1 text-3xl font-bold text-foreground">{order.testType}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Code {order.testCode || "-"} • {order.status}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {order.resultId ? <Link href={path(`/lab/lab-results/${order.resultId}`)} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"><Microscope className="h-4 w-4" />View Result</Link> : <Link href={path(`/lab/lab-results/upload?orderId=${order.id}`)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"><FileText className="h-4 w-4" />Upload Result</Link>}
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-background p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Patient</p><p className="mt-2 font-medium text-foreground">{order.patientName}</p></div>
          <div className="rounded-xl bg-background p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Doctor</p><p className="mt-2 font-medium text-foreground">{order.doctorName || "-"}</p></div>
          <div className="rounded-xl bg-background p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Priority</p><p className="mt-2 font-medium text-foreground">{order.priority || "routine"}</p></div>
          <div className="rounded-xl bg-background p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Location</p><p className="mt-2 font-medium text-foreground">{order.labLocation || "Main Laboratory"}</p></div>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-background p-4"><div className="mb-3 flex items-center gap-2 font-medium text-foreground"><CalendarClock className="h-4 w-4 text-primary" />Timeline</div><div className="space-y-2 text-sm text-muted-foreground"><p>Ordered: {order.orderedAt ? new Date(order.orderedAt).toLocaleString() : "-"}</p><p>Collected: {order.collectedAt ? new Date(order.collectedAt).toLocaleString() : "-"}</p><p>Completed: {order.completedAt ? new Date(order.completedAt).toLocaleString() : "-"}</p><p>Due: {order.dueDate ? new Date(order.dueDate).toLocaleDateString() : "-"}</p></div></div>
          <div className="rounded-xl border border-border bg-background p-4"><div className="mb-3 flex items-center gap-2 font-medium text-foreground"><UserRound className="h-4 w-4 text-primary" />Notes</div><p className="text-sm text-muted-foreground">{order.notes || "No order notes added."}</p></div>
        </div>
      </div>
    </div>
  );
}
