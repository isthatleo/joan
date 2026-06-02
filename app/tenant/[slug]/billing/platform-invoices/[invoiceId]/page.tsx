"use client";

import Link from "next/link";
import type { Ref } from "react";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Download, FileImage, Loader2, MessageSquareWarning, Printer, RefreshCw, ReceiptText } from "lucide-react";
import { toJpeg, toPng } from "html-to-image";
import jsPDF from "jspdf";

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  billingEmail?: string | null;
  billingName?: string | null;
  issuedAt: string;
  dueAt: string;
  paidAt?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  lineItems: Array<{ description: string; quantity: number; unitPrice: number; amount: number }>;
  notes?: string;
  metadata?: Record<string, any>;
  tenant?: { name?: string | null; slug?: string | null; plan?: string | null; contactEmail?: string | null } | null;
  plan?: { name?: string | null; code?: string | null; supportLevel?: string | null } | null;
};

function money(currency: string, value: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD", maximumFractionDigits: 2 }).format(Number(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleDateString();
}

function statusClass(status: string) {
  switch (status) {
    case "paid":
      return "border-green-200 bg-green-50 text-green-700";
    case "overdue":
      return "border-red-200 bg-red-50 text-red-700";
    case "void":
      return "border-slate-200 bg-slate-50 text-slate-600";
    default:
      return "border-orange-200 bg-orange-50 text-orange-700";
  }
}

export default function HospitalPlatformInvoiceDetailsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const invoiceId = params?.invoiceId as string;
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [disputeMessage, setDisputeMessage] = useState("");

  async function load(silent = false) {
    if (!silent) setLoading(true);
    setRefreshing(true);
    setError("");
    try {
      const res = await fetch(`/api/tenant/${slug}/billing/platform-invoices/${invoiceId}`, { cache: "no-store", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to load invoice");
      setInvoice(data.invoice);
    } catch (loadError: any) {
      setError(loadError?.message || "Failed to load invoice");
      setInvoice(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (slug && invoiceId) void load();
  }, [slug, invoiceId]);

  async function runAction(action: "acknowledge" | "dispute") {
    setBusy(action);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/tenant/${slug}/billing/platform-invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(action === "dispute" ? { action, message: disputeMessage } : { action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Invoice action failed");
      setInvoice(data.invoice);
      setNotice(action === "acknowledge" ? "Invoice marked as reviewed." : "Clarification request sent to the super admin team.");
      if (action === "dispute") setDisputeMessage("");
    } catch (actionError: any) {
      setError(actionError?.message || "Invoice action failed");
    } finally {
      setBusy("");
    }
  }

  async function exportImage(type: "png" | "jpg") {
    if (!invoiceRef.current || !invoice) return;
    const dataUrl = type === "png"
      ? await toPng(invoiceRef.current, { pixelRatio: 2, backgroundColor: "#ffffff" })
      : await toJpeg(invoiceRef.current, { quality: 0.95, pixelRatio: 2, backgroundColor: "#ffffff" });
    download(dataUrl, `${invoice.invoiceNumber}.${type}`);
  }

  async function exportPdf() {
    if (!invoiceRef.current || !invoice) return;
    const dataUrl = await toPng(invoiceRef.current, { pixelRatio: 2, backgroundColor: "#ffffff" });
    const pdf = new jsPDF("p", "pt", "a4");
    const width = pdf.internal.pageSize.getWidth();
    const img = new Image();
    img.src = dataUrl;
    await new Promise((resolve) => { img.onload = resolve; });
    const height = (img.height * width) / img.width;
    pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
    pdf.save(`${invoice.invoiceNumber}.pdf`);
  }

  const tenantReview = invoice?.metadata?.tenantReview || {};
  const disputes = Array.isArray(invoice?.metadata?.disputes) ? invoice?.metadata?.disputes : [];

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #tenant-platform-invoice-print, #tenant-platform-invoice-print * { visibility: visible !important; }
          #tenant-platform-invoice-print { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; }
        }
      `}</style>

      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div>
          <Link href={`/tenant/${slug}/billing`} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Back to billing
          </Link>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Hospital Invoice</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">{invoice?.invoiceNumber || "Invoice details"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">View platform subscription, retainer, provisioning, maintenance, and manual invoices issued by super admin.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => load(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60">
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button onClick={() => window.print()} disabled={!invoice} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60">
            <Printer className="size-4" /> Print
          </button>
          <button onClick={exportPdf} disabled={!invoice} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60">
            <Download className="size-4" /> PDF
          </button>
          <button onClick={() => exportImage("png")} disabled={!invoice} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60">
            <FileImage className="size-4" /> PNG
          </button>
          <button onClick={() => exportImage("jpg")} disabled={!invoice} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60">
            <FileImage className="size-4" /> JPG
          </button>
        </div>
      </div>

      {(error || notice) && <div className={`rounded-xl border px-4 py-3 text-sm print:hidden ${error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>{error || notice}</div>}

      {loading ? (
        <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-border bg-card">
          <Loader2 className="size-7 animate-spin text-orange-500" />
        </div>
      ) : invoice ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4 print:hidden">
              <Metric label="Status" value={invoice.status} icon={ReceiptText} tone={statusClass(invoice.status)} />
              <Metric label="Total" value={money(invoice.currency, invoice.total)} icon={ReceiptText} tone="border-blue-200 bg-blue-50 text-blue-700" />
              <Metric label="Amount Due" value={money(invoice.currency, invoice.amountDue)} icon={AlertTriangle} tone="border-orange-200 bg-orange-50 text-orange-700" />
              <Metric label="Due Date" value={formatDate(invoice.dueAt)} icon={Clock} tone="border-slate-200 bg-slate-50 text-slate-700" />
            </div>

            <InvoiceTemplate invoice={invoice} refEl={invoiceRef} />
          </div>

          <aside className="space-y-4 print:hidden">
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-semibold text-foreground">Admin Actions</h2>
              <p className="mt-1 text-sm text-muted-foreground">These actions do not alter payment state. Payment status remains controlled by super admin billing/payment reconciliation.</p>
              <button onClick={() => runAction("acknowledge")} disabled={busy === "acknowledge"} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
                {busy === "acknowledge" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                Mark reviewed
              </button>
              <div className="mt-4 rounded-lg border border-border bg-background p-3 text-sm">
                <p className="font-semibold">Review status</p>
                <p className="mt-1 text-muted-foreground">{tenantReview.acknowledgedAt ? `Reviewed by ${tenantReview.acknowledgedByName || "hospital admin"} on ${formatDate(tenantReview.acknowledgedAt)}` : "Not reviewed yet."}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-semibold text-foreground">Request Clarification</h2>
              <p className="mt-1 text-sm text-muted-foreground">Send a dispute or clarification request to the super admin billing team.</p>
              <textarea value={disputeMessage} onChange={(event) => setDisputeMessage(event.target.value)} rows={5} placeholder="Explain what needs clarification..." className="mt-4 w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-orange-300" />
              <button onClick={() => runAction("dispute")} disabled={busy === "dispute" || disputeMessage.trim().length < 8} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-60">
                {busy === "dispute" ? <Loader2 className="size-4 animate-spin" /> : <MessageSquareWarning className="size-4" />}
                Send request
              </button>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-semibold text-foreground">Clarification History</h2>
              <div className="mt-3 space-y-3">
                {disputes.length === 0 ? <p className="text-sm text-muted-foreground">No clarification requests for this invoice.</p> : disputes.map((item: any, index: number) => (
                  <div key={`${item.id || "dispute"}-${index}`} className="rounded-lg border border-border bg-background p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{item.createdByName || "Hospital admin"}</p>
                      <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold capitalize text-orange-700">{item.status || "open"}</span>
                    </div>
                    <p className="mt-2 text-muted-foreground">{item.message}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">Invoice not found.</div>
      )}
    </div>
  );
}

function download(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

function Metric({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone: string }) {
  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <Icon className="mb-3 size-5" />
      <p className="text-xs uppercase tracking-[0.18em] opacity-75">{label}</p>
      <p className="mt-1 text-lg font-bold capitalize">{value}</p>
    </div>
  );
}

function InvoiceTemplate({ invoice, refEl }: { invoice: Invoice; refEl: Ref<HTMLDivElement> }) {
  return (
    <div id="tenant-platform-invoice-print" ref={refEl} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white text-slate-950 shadow-xl print:rounded-none print:border-0 print:shadow-none">
      <div className="bg-[radial-gradient(circle_at_top_left,#fb923c,transparent_35%),linear-gradient(135deg,#0f172a,#111827_60%,#ea580c)] p-8 text-white md:p-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-orange-100">Joan Healthcare OS</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">Invoice</h2>
            <p className="mt-2 font-mono text-orange-100">{invoice.invoiceNumber}</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-right backdrop-blur">
            <p className="text-xs uppercase tracking-[0.2em] text-orange-100">Status</p>
            <p className="mt-1 text-2xl font-black capitalize">{invoice.status}</p>
          </div>
        </div>
      </div>
      <div className="p-6 md:p-10">
        <div className="grid gap-5 md:grid-cols-3">
          <Block title="Bill To" lines={[invoice.tenant?.name || invoice.billingName || "Hospital", invoice.billingEmail || invoice.tenant?.contactEmail || "", invoice.tenant?.slug ? `Tenant: ${invoice.tenant.slug}` : ""]} />
          <Block title="Plan / Service" lines={[invoice.plan?.name || invoice.tenant?.plan || "Platform service", invoice.plan?.supportLevel ? `Support: ${invoice.plan.supportLevel}` : "", invoice.periodStart ? `Period: ${formatDate(invoice.periodStart)} - ${formatDate(invoice.periodEnd)}` : ""]} />
          <Block title="Dates" lines={[`Issued: ${formatDate(invoice.issuedAt)}`, `Due: ${formatDate(invoice.dueAt)}`, invoice.paidAt ? `Paid: ${formatDate(invoice.paidAt)}` : ""]} />
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
          <div className="grid grid-cols-[1fr_80px_120px_120px] gap-3 bg-slate-50 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            <span>Description</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Rate</span>
            <span className="text-right">Amount</span>
          </div>
          {invoice.lineItems.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">No line items recorded.</div>
          ) : invoice.lineItems.map((item, index) => (
            <div key={`${item.description}-${index}`} className="grid grid-cols-[1fr_80px_120px_120px] gap-3 border-t border-slate-200 px-5 py-4 text-sm">
              <div>
                <p className="font-bold">{item.description}</p>
                <p className="text-xs text-slate-500">Platform billing item</p>
              </div>
              <p className="text-right font-semibold">{item.quantity}</p>
              <p className="text-right font-semibold">{money(invoice.currency, item.unitPrice)}</p>
              <p className="text-right font-black">{money(invoice.currency, item.amount)}</p>
            </div>
          ))}
        </div>

        {invoice.notes && <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700"><span className="font-bold">Notes: </span>{invoice.notes}</div>}

        <div className="ml-auto mt-8 w-full max-w-sm space-y-3">
          <TotalRow label="Subtotal" value={money(invoice.currency, invoice.subtotal)} />
          <TotalRow label="Tax" value={money(invoice.currency, invoice.tax)} />
          <TotalRow label="Paid" value={money(invoice.currency, invoice.amountPaid)} />
          <div className="flex items-center justify-between rounded-2xl bg-slate-950 px-5 py-4 text-white">
            <span className="font-bold">Total Due</span>
            <span className="text-2xl font-black">{money(invoice.currency, invoice.amountDue)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Block({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-5">
      <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400">{title}</p>
      {lines.filter(Boolean).map((line) => <p key={line} className="text-sm font-semibold text-slate-700">{line}</p>)}
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between px-5 text-sm"><span className="text-slate-500">{label}</span><span className="font-bold">{value}</span></div>;
}
