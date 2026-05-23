"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, Eye, Loader2, Mail, Pencil, Receipt, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useTenantPath } from "@/hooks/useTenantPath";
import { exportElementAsPdf, exportElementAsPng } from "@/lib/export/page-export";

const orange = "#F97316";

type InvoiceItem = { description: string; quantity?: number; unitPrice?: number; amount?: number; category?: string };
type InvoiceDetail = {
  id: string;
  invoiceNumber?: string;
  patientName: string;
  patientEmail?: string;
  totalAmount: number;
  amountDue: number;
  paidAmount: number;
  status: string;
  dueDate?: string;
  createdAt?: string;
  description?: string;
  notes?: string;
  paymentTerms?: string;
  items?: InvoiceItem[];
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const tenantPath = useTenantPath();
  const slug = params?.slug as string;
  const id = params?.id as string;
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const exportRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    const res = await fetch(`/api/tenant/${slug}/accountant/billing/invoices/${id}`);
    if (res.ok) setInvoice(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [slug, id]);

  const sendReminder = async () => {
    const res = await fetch(`/api/tenant/${slug}/accountant/billing/invoices/${id}/reminder`, { method: "POST" });
    if (res.ok) toast.success("Reminder sent");
    else toast.error("Failed to send reminder");
  };

  const markPaid = async () => {
    const res = await fetch(`/api/tenant/${slug}/accountant/billing/invoices/${id}/mark-paid`, { method: "POST" });
    if (res.ok) {
      toast.success("Invoice marked as paid");
      await load();
    } else {
      toast.error("Failed to mark invoice as paid");
    }
  };

  const exportInvoice = async (format: "pdf" | "png") => {
    if (!exportRef.current) return;
    try {
      const filename = `invoice-${invoice?.invoiceNumber || invoice?.id}.${format}`;
      if (format === "pdf") await exportElementAsPdf(exportRef.current, filename);
      else await exportElementAsPng(exportRef.current, filename);
      toast.success(`Invoice exported as ${format.toUpperCase()}`);
    } catch {
      toast.error("Failed to export invoice");
    }
  };

  const items = useMemo(() => {
    if (!invoice) return [] as InvoiceItem[];
    if (invoice.items?.length) return invoice.items;
    return invoice.description ? [{ description: invoice.description, quantity: 1, unitPrice: invoice.totalAmount, amount: invoice.totalAmount, category: "service" }] : [];
  }, [invoice]);

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="size-5 animate-spin" /></div>;
  if (!invoice) return <div className="text-sm text-muted-foreground">Invoice not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={tenantPath("/accountant/billing/invoices")} className="rounded-lg border border-border p-2 hover:bg-muted"><ArrowLeft className="size-4" /></Link>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Invoice Detail</p>
            <h1 className="text-3xl font-bold">Invoice #{invoice.invoiceNumber || invoice.id}</h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => exportInvoice("pdf")} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"><Download className="size-4" />PDF</button>
          <button onClick={() => exportInvoice("png")} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"><Eye className="size-4" />PNG</button>
          <button onClick={sendReminder} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"><Mail className="size-4" />Reminder</button>
          {invoice.status !== "paid" ? <button onClick={markPaid} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white"><CheckCircle className="size-4" />Mark Paid</button> : null}
          <Link href={tenantPath(`/accountant/billing/invoices/${id}/edit`)} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"><Pencil className="size-4" />Edit</Link>
        </div>
      </div>

      <div ref={exportRef} className="rounded-2xl border border-border bg-card p-8 shadow-sm space-y-8">
        <div className="flex flex-col gap-6 border-b border-border pb-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">Hospital Invoice</p>
            <h2 className="mt-2 text-2xl font-bold text-foreground">Billing Statement</h2>
            <p className="mt-2 text-sm text-muted-foreground">Prepared for {invoice.patientName}</p>
          </div>
          <div className="grid gap-2 text-sm md:text-right">
            <p><span className="text-muted-foreground">Invoice No:</span> <span className="font-semibold">{invoice.invoiceNumber || invoice.id}</span></p>
            <p><span className="text-muted-foreground">Issue Date:</span> <span className="font-semibold">{invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : "-"}</span></p>
            <p><span className="text-muted-foreground">Due Date:</span> <span className="font-semibold">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "-"}</span></p>
            <p><span className="text-muted-foreground">Status:</span> <span className="font-semibold uppercase">{invoice.status}</span></p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bill To</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{invoice.patientName}</p>
            <p className="text-sm text-muted-foreground">{invoice.patientEmail || "No email on file"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Terms</p>
            <p className="mt-2 text-sm text-foreground">{invoice.paymentTerms || "Standard hospital billing terms"}</p>
            {invoice.notes ? <p className="mt-3 text-sm text-muted-foreground">{invoice.notes}</p> : null}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const qty = Number(item.quantity || 1);
                const unitPrice = Number(item.unitPrice ?? item.amount ?? 0);
                const lineTotal = Number(item.amount ?? qty * unitPrice);
                return (
                  <tr key={`${item.description}-${index}`} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{item.description}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{item.category || "service"}</td>
                    <td className="px-4 py-3 text-right">{qty}</td>
                    <td className="px-4 py-3 text-right">${unitPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-semibold">${lineTotal.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="ml-auto max-w-sm space-y-3 rounded-xl border border-border bg-background/50 p-5 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${invoice.totalAmount.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span>${invoice.paidAmount.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Outstanding</span><span>${invoice.amountDue.toFixed(2)}</span></div>
          <div className="flex justify-between border-t border-border pt-3 text-base font-bold"><span>Total Due</span><span style={{ color: orange }}>${invoice.amountDue.toFixed(2)}</span></div>
        </div>

        <div className="rounded-xl bg-orange-500/5 p-4 text-sm text-muted-foreground">
          <div className="mb-2 flex items-center gap-2 font-semibold text-foreground"><Receipt className="size-4 text-orange-500" />Hospital Billing Notice</div>
          Please retain this invoice for your records. Prescription, procedure, and service charges shown above are generated from the live billing ledger for this patient account.
        </div>
      </div>
    </div>
  );
}
