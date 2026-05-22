"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Receipt } from "lucide-react";

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
  items?: Array<{ description: string; quantity?: number; unitPrice?: number; category?: string }>;
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const id = params?.id as string;
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/tenant/${slug}/accountant/billing/invoices/${id}`);
      if (res.ok) setInvoice(await res.json());
      setLoading(false);
    };
    void load();
  }, [slug, id]);

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="size-5 animate-spin" /></div>;
  }

  if (!invoice) {
    return <div className="text-sm text-muted-foreground">Invoice not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/tenant/${slug}/accountant/billing/invoices`} className="rounded-lg border border-border p-2 hover:bg-muted">
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Invoice Detail</p>
            <h1 className="text-3xl font-bold">Invoice #{invoice.invoiceNumber || invoice.id}</h1>
          </div>
        </div>
        <Link href={`/tenant/${slug}/accountant/billing/invoices/${id}/edit`} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white">
          Edit Invoice
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2"><Receipt className="size-4" /><h2 className="font-semibold">Invoice Summary</h2></div>
          <div className="grid gap-4 md:grid-cols-2">
            <div><p className="text-xs text-muted-foreground">Patient</p><p className="font-medium">{invoice.patientName}</p></div>
            <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium">{invoice.patientEmail || "-"}</p></div>
            <div><p className="text-xs text-muted-foreground">Due Date</p><p className="font-medium">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "-"}</p></div>
            <div><p className="text-xs text-muted-foreground">Status</p><p className="font-medium capitalize">{invoice.status}</p></div>
          </div>
          <div className="mt-6 space-y-3">
            <p className="text-sm font-semibold">Items</p>
            {(invoice.items?.length ? invoice.items : [{ description: invoice.description || "General billing item" }]).map((item, index) => (
              <div key={`${item.description}-${index}`} className="rounded-lg border border-border p-3">
                <p className="font-medium">{item.description}</p>
                <p className="text-xs text-muted-foreground">{item.category || "Service"}</p>
              </div>
            ))}
          </div>
          {invoice.notes ? <div className="mt-6"><p className="text-sm font-semibold">Notes</p><p className="mt-2 text-sm text-muted-foreground">{invoice.notes}</p></div> : null}
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm font-semibold">Amounts</p>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span>${invoice.totalAmount.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span>${invoice.paidAmount.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Outstanding</span><span>${invoice.amountDue.toFixed(2)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
