"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle, Loader2, RefreshCw } from "lucide-react";

function money(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDate(value?: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleString();
}

function statusClass(status: string) {
  switch (status) {
    case "paid":
      return "border-green-200 bg-green-50 text-green-700";
    case "overdue":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-orange-200 bg-orange-50 text-orange-700";
  }
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const id = params?.id as string;
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    setError("");
    try {
      const res = await fetch(`/api/tenant/${slug}/billing/admin?invoiceId=${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to load invoice");
      setInvoice(data.invoice);
    } catch (loadError: any) {
      setError(loadError?.message || "Failed to load invoice");
      setInvoice(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (slug && id) load();
  }, [slug, id]);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="size-8 animate-spin text-orange-500" /></div>;

  if (!invoice) {
    return (
      <div className="space-y-4">
        <Link href={`/tenant/${slug}/billing`} className="inline-flex items-center gap-2 text-sm text-orange-600 hover:underline"><ArrowLeft className="size-4" />Back to billing</Link>
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <p className="text-sm text-muted-foreground">Invoice not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/tenant/${slug}/billing`} className="inline-flex items-center gap-2 text-sm text-orange-600 hover:underline"><ArrowLeft className="size-4" />Back to billing</Link>
        <button onClick={() => load(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"><RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Invoice detail</p>
            <h1 className="mt-1 text-3xl font-bold">#{invoice.invoiceNumber}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{invoice.patientName} - {invoice.patientEmail || "No email"}</p>
          </div>
          <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold capitalize ${statusClass(invoice.status)}`}>{invoice.status}</span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-background p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total</p><p className="mt-2 text-xl font-semibold">{money(invoice.totalAmount)}</p></div>
          <div className="rounded-xl bg-background p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Paid</p><p className="mt-2 text-xl font-semibold">{money(invoice.paidAmount)}</p></div>
          <div className="rounded-xl bg-background p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Due</p><p className="mt-2 text-xl font-semibold">{money(invoice.amountDue)}</p></div>
          <div className="rounded-xl bg-background p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Status</p><span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-xs font-semibold capitalize ${statusClass(invoice.status)}`}>{invoice.status === "paid" && <CheckCircle className="mr-1 size-3" />}{invoice.status}</span></div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="font-semibold">Invoice metadata</p>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <p>Created: {formatDate(invoice.createdAt)}</p>
              <p>Updated: {formatDate(invoice.updatedAt)}</p>
              <p>Due date: {formatDate(invoice.dueDate)}</p>
              <p>Terms: {invoice.paymentTerms || "Not set"}</p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="font-semibold">Description and notes</p>
            <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{invoice.description || "No description."}</p>
            {invoice.notes && <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{invoice.notes}</p>}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-background p-4">
          <p className="font-semibold">Payment history</p>
          <div className="mt-3 space-y-2">
            {invoice.payments?.length ? invoice.payments.map((payment: any) => (
              <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                <div><p className="font-medium">{payment.method}</p><p className="text-xs text-muted-foreground">{formatDate(payment.processedAt)} - {payment.status}</p></div>
                <p className="font-semibold">{money(payment.amount)}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No payments recorded.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
