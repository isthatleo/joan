"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CreditCard, FileText, Loader2, Plus, Printer, RefreshCw } from "lucide-react";

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  currency: string;
  total: string;
  amountPaid: string;
  dueAt: string;
  issuedAt: string;
  billingEmail?: string | null;
  billingName?: string | null;
  lineItems: Array<{ description: string; quantity: number; unitPrice: string; total: string }>;
  tenant?: { name: string; slug: string; plan: string } | null;
  plan?: { name: string; code: string } | null;
};

const money = (currency: string, value: string | number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value || 0));

export default function SuperAdminBillingPage() {
  const [payload, setPayload] = useState<any>(null);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setRefreshing(true);
    setError("");
    try {
      const res = await fetch("/api/super-admin/billing", { cache: "no-store", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to load billing");
      setPayload(data);
      setSelected((current) => current || data.invoices?.[0] || null);
    } catch (err: any) {
      setError(err?.message || "Failed to load billing");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const invoices: Invoice[] = payload?.invoices || [];
  const stats = payload?.stats || {};
  const totals = useMemo(() => ({
    billed: money("USD", stats.totalBilled || 0),
    paid: money("USD", stats.totalPaid || 0),
  }), [stats]);

  async function updateInvoice(id: string, status: string, total: string) {
    const amountPaid = status === "paid" ? Number(total || 0) : 0;
    const res = await fetch(`/api/super-admin/billing/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status, amountPaid }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data?.error || "Failed to update invoice");
      return;
    }
    await load();
    setSelected(data.invoice);
  }

  return (
    <div className="min-h-screen bg-subtle -m-6 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-semibold text-orange-600">Super Admin</p>
            <h1 className="text-3xl font-bold text-foreground">Billing & Invoices</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage tenant subscriptions, platform invoices, payment status, and printable invoice templates.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/super-admin/billing/new" className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">
              <Plus className="size-4" /> Create Invoice
            </Link>
            <button onClick={load} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-border bg-card"><Loader2 className="size-6 animate-spin text-orange-500" /></div>
        ) : (
          <>
            <div className="mb-6 grid gap-4 md:grid-cols-4">
              <Metric icon={<FileText className="size-5" />} label="Invoices" value={stats.invoices || 0} />
              <Metric icon={<CreditCard className="size-5" />} label="Open" value={stats.open || 0} />
              <Metric icon={<CreditCard className="size-5" />} label="Billed" value={totals.billed} />
              <Metric icon={<CreditCard className="size-5" />} label="Paid" value={totals.paid} />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr><th className="px-4 py-3 text-left">Invoice</th><th className="px-4 py-3 text-left">Tenant</th><th className="px-4 py-3 text-left">Due</th><th className="px-4 py-3 text-left">Total</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-semibold">{invoice.invoiceNumber}</td>
                        <td className="px-4 py-3">{invoice.tenant?.name || invoice.billingName || "Unknown"}</td>
                        <td className="px-4 py-3">{new Date(invoice.dueAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">{money(invoice.currency, invoice.total)}</td>
                        <td className="px-4 py-3"><span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold">{invoice.status}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => setSelected(invoice)} className="text-orange-600 hover:underline">Preview</button>
                            <Link href={`/super-admin/billing/invoices/${invoice.id}`} className="text-blue-600 hover:underline">Details</Link>
                            <button onClick={() => updateInvoice(invoice.id, "paid", invoice.total)} className="text-emerald-600 hover:underline">Mark paid</button>
                            <button onClick={() => updateInvoice(invoice.id, "void", invoice.total)} className="text-red-600 hover:underline">Void</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm print:shadow-none" id="invoice-template">
                {selected ? (
                  <PrintableInvoice invoice={selected} />
                ) : (
                  <p className="text-sm text-muted-foreground">Select an invoice to preview and print.</p>
                )}
                {selected && <button onClick={() => window.print()} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold print:hidden"><Printer className="size-4" /> Print invoice</button>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return <div className="rounded-xl border border-border bg-card p-4"><div className="mb-2 text-orange-500">{icon}</div><p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold text-foreground">{value}</p></div>;
}

function PrintableInvoice({ invoice }: { invoice: Invoice }) {
  return (
    <div className="text-sm">
      <div className="flex items-start justify-between border-b border-border pb-4">
        <div><h2 className="text-2xl font-bold text-foreground">Invoice</h2><p className="text-muted-foreground">{invoice.invoiceNumber}</p></div>
        <div className="text-right"><p className="font-bold">Joan Healthcare OS</p><p className="text-muted-foreground">Platform subscription billing</p></div>
      </div>
      <div className="my-4 grid grid-cols-2 gap-4">
        <div><p className="text-xs font-semibold uppercase text-muted-foreground">Bill to</p><p className="font-semibold">{invoice.tenant?.name || invoice.billingName}</p><p className="text-muted-foreground">{invoice.billingEmail}</p></div>
        <div className="text-right"><p>Issued: {new Date(invoice.issuedAt).toLocaleDateString()}</p><p>Due: {new Date(invoice.dueAt).toLocaleDateString()}</p><p>Status: {invoice.status}</p></div>
      </div>
      <div className="rounded-lg border border-border">
        {(invoice.lineItems || []).map((item, index) => (
          <div key={`${item.description}-${index}`} className="flex justify-between gap-3 border-b border-border p-3 last:border-b-0">
            <div><p className="font-semibold">{item.description}</p><p className="text-xs text-muted-foreground">Qty {item.quantity} × {money(invoice.currency, item.unitPrice)}</p></div>
            <p className="font-bold">{money(invoice.currency, item.total)}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 text-right text-lg font-bold">Total: {money(invoice.currency, invoice.total)}</div>
    </div>
  );
}
