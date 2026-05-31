"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, FileImage, Loader2, Printer } from "lucide-react";
import { toPng, toJpeg } from "html-to-image";
import jsPDF from "jspdf";

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  currency: string;
  subtotal: string;
  tax: string;
  total: string;
  amountPaid: string;
  billingEmail?: string | null;
  billingName?: string | null;
  issuedAt: string;
  dueAt: string;
  paidAt?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  lineItems: Array<{ description: string; quantity: number; unitPrice: string; total: string }>;
  tenant?: { name: string; slug: string; plan: string; contactEmail?: string | null } | null;
  plan?: { name: string; code: string; supportLevel: string } | null;
};

const money = (currency: string, value: string | number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value || 0));

export default function PlatformInvoiceDetailsPage() {
  const params = useParams();
  const id = params?.id as string;
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/super-admin/billing/invoices/${id}`, { cache: "no-store", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to load invoice");
      setInvoice(data.invoice);
    } catch (err: any) {
      setError(err?.message || "Failed to load invoice");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (id) void load(); }, [id]);

  async function downloadPng() {
    if (!invoiceRef.current || !invoice) return;
    const dataUrl = await toPng(invoiceRef.current, { pixelRatio: 2, backgroundColor: "#ffffff" });
    download(dataUrl, `${invoice.invoiceNumber}.png`);
  }

  async function downloadJpg() {
    if (!invoiceRef.current || !invoice) return;
    const dataUrl = await toJpeg(invoiceRef.current, { quality: 0.95, pixelRatio: 2, backgroundColor: "#ffffff" });
    download(dataUrl, `${invoice.invoiceNumber}.jpg`);
  }

  async function downloadPdf() {
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

  return (
    <div className="min-h-screen bg-subtle -m-6 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/super-admin/billing" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground print:hidden">
          <ArrowLeft className="size-4" /> Back to billing
        </Link>
        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-border bg-card"><Loader2 className="size-6 animate-spin text-orange-500" /></div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : invoice ? (
          <>
            <div className="mb-4 flex flex-wrap justify-end gap-2 print:hidden">
              <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold"><Printer className="size-4" /> Print</button>
              <button onClick={downloadPdf} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold"><Download className="size-4" /> PDF</button>
              <button onClick={downloadPng} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold"><FileImage className="size-4" /> PNG</button>
              <button onClick={downloadJpg} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold"><FileImage className="size-4" /> JPG</button>
            </div>
            <InvoiceTemplate refEl={invoiceRef} invoice={invoice} />
          </>
        ) : null}
      </div>
    </div>
  );
}

function download(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

function InvoiceTemplate({ invoice, refEl }: { invoice: Invoice; refEl: React.RefObject<HTMLDivElement> }) {
  return (
    <div ref={refEl} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white text-slate-950 shadow-2xl print:rounded-none print:border-0 print:shadow-none">
      <div className="bg-[radial-gradient(circle_at_top_left,#fb923c,transparent_32%),linear-gradient(135deg,#0f172a,#111827_55%,#fb923c)] p-10 text-white">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-orange-100">Joan Healthcare OS</p>
            <h1 className="mt-4 text-5xl font-black tracking-tight">Invoice</h1>
            <p className="mt-2 text-orange-100">{invoice.invoiceNumber}</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-right backdrop-blur">
            <p className="text-xs uppercase tracking-[0.2em] text-orange-100">Status</p>
            <p className="mt-1 text-2xl font-black capitalize">{invoice.status}</p>
          </div>
        </div>
      </div>
      <div className="p-10">
        <div className="grid gap-6 md:grid-cols-3">
          <Block title="Bill To" lines={[invoice.tenant?.name || invoice.billingName || "Tenant", invoice.billingEmail || invoice.tenant?.contactEmail || "", invoice.tenant?.slug ? `Slug: ${invoice.tenant.slug}` : ""]} />
          <Block title="Plan" lines={[invoice.plan?.name || invoice.tenant?.plan || "Subscription", invoice.plan?.supportLevel ? `Support: ${invoice.plan.supportLevel}` : "", invoice.periodEnd ? `Period ends: ${new Date(invoice.periodEnd).toLocaleDateString()}` : ""]} />
          <Block title="Dates" lines={[`Issued: ${new Date(invoice.issuedAt).toLocaleDateString()}`, `Due: ${new Date(invoice.dueAt).toLocaleDateString()}`, invoice.paidAt ? `Paid: ${new Date(invoice.paidAt).toLocaleDateString()}` : ""]} />
        </div>
        <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200">
          {(invoice.lineItems || []).map((item, index) => (
            <div key={`${item.description}-${index}`} className="grid grid-cols-[1fr_90px_120px] gap-4 border-b border-slate-200 p-5 last:border-b-0">
              <div><p className="font-bold">{item.description}</p><p className="text-sm text-slate-500">Platform subscription service</p></div>
              <p className="text-right font-semibold">{item.quantity}</p>
              <p className="text-right font-black">{money(invoice.currency, item.total)}</p>
            </div>
          ))}
        </div>
        <div className="ml-auto mt-8 w-full max-w-sm space-y-3">
          <TotalRow label="Subtotal" value={money(invoice.currency, invoice.subtotal)} />
          <TotalRow label="Tax" value={money(invoice.currency, invoice.tax)} />
          <TotalRow label="Paid" value={money(invoice.currency, invoice.amountPaid)} />
          <div className="flex items-center justify-between rounded-2xl bg-slate-950 px-5 py-4 text-white">
            <span className="font-bold">Total Due</span>
            <span className="text-2xl font-black">{money(invoice.currency, Number(invoice.total) - Number(invoice.amountPaid || 0))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Block({ title, lines }: { title: string; lines: string[] }) {
  return <div className="rounded-2xl border border-slate-200 p-5"><p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400">{title}</p>{lines.filter(Boolean).map((line) => <p key={line} className="text-sm font-semibold text-slate-700">{line}</p>)}</div>;
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between px-5 text-sm"><span className="text-slate-500">{label}</span><span className="font-bold">{value}</span></div>;
}
