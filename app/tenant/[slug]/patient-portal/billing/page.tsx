"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CreditCard, RefreshCw, Wallet } from "lucide-react";

type BillingData = {
  invoices: Array<{ id: string; invoiceNumber: string; description: string; status: string; amount: number; amountDue: number; dueDate?: string | null; createdAt?: string | null; notes?: string | null; items: any[]; payments: Array<{ id: string; method: string; amount: number; status: string; processedAt?: string | null }>; claims: Array<{ id: string; status: string; claimAmount: number; approvedAmount: number }> }>;
  paymentMethods: string[];
  policies: Array<{ id: string; provider?: string | null; policyNumber?: string | null }>;
  summary: { totalOutstanding: number; paidInvoices: number; openInvoices: number };
  currency: string;
};

export default function PatientBillingPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [data, setData] = useState<BillingData | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [amount, setAmount] = useState("");
  const [policyId, setPolicyId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function loadData(showSpinner = true) {
    if (showSpinner) setRefreshing(true);
    try {
      const response = await fetch(`/api/tenant/${slug}/patient/billing`, { cache: "no-store", credentials: "include" });
      if (!response.ok) throw new Error("Failed to load billing");
      const payload = await response.json();
      setData(payload);
      if (!selectedInvoice && payload.invoices[0]?.id) {
        setSelectedInvoice(payload.invoices[0].id);
        setAmount(String(payload.invoices[0].amountDue));
      }
      if (!paymentMethod && payload.paymentMethods[0]) {
        setPaymentMethod(payload.paymentMethods[0]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadData(); }, [slug]);

  const formatter = useMemo(() => new Intl.NumberFormat(undefined, { style: "currency", currency: data?.currency || "USD" }), [data?.currency]);
  const activeInvoice = data?.invoices.find((invoice) => invoice.id === selectedInvoice) || null;

  async function submitPayment() {
    if (!selectedInvoice || !paymentMethod || !amount) return;
    setSubmitting(true);
    const response = await fetch(`/api/tenant/${slug}/patient/billing/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ invoiceId: selectedInvoice, method: paymentMethod, amount: Number(amount), policyId: policyId || null, notes: notes || null }),
    });
    setSubmitting(false);
    if (response.ok) {
      setNotes("");
      await loadData(false);
    }
  }

  if (loading || !data) return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading billing workspace...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">Billing</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Visit billing and payment options</h1>
          <p className="mt-2 text-sm text-muted-foreground">Pay with enabled tenant methods here, or settle by cash, card, or insurance with the accountant.</p>
        </div>
        <button onClick={() => loadData()} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"><RefreshCw className={`mr-2 inline h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Outstanding</p><p className="mt-2 text-3xl font-semibold text-foreground">{formatter.format(data.summary.totalOutstanding)}</p></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Open invoices</p><p className="mt-2 text-3xl font-semibold text-foreground">{data.summary.openInvoices}</p></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Paid invoices</p><p className="mt-2 text-3xl font-semibold text-foreground">{data.summary.paidInvoices}</p></div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.95fr]">
        <div className="space-y-4">
          {data.invoices.map((invoice) => (
            <button key={invoice.id} onClick={() => { setSelectedInvoice(invoice.id); setAmount(String(invoice.amountDue)); }} className={`w-full rounded-2xl border p-5 text-left shadow-sm transition ${selectedInvoice === invoice.id ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted"}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-foreground">{invoice.description}</p>
                  <p className="text-sm text-muted-foreground">Invoice #{invoice.invoiceNumber}</p>
                  <p className="mt-2 text-sm text-muted-foreground">Due {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "not set"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold text-foreground">{formatter.format(invoice.amountDue)}</p>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium capitalize text-primary">{invoice.status}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary"><Wallet className="h-5 w-5" /></div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Make a payment</h2>
                <p className="text-sm text-muted-foreground">Submit payment or payment intent for this invoice.</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <select value={selectedInvoice} onChange={(e) => setSelectedInvoice(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
                <option value="">Select invoice</option>
                {data.invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.description} - {formatter.format(invoice.amountDue)}</option>)}
              </select>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
                {data.paymentMethods.map((method) => <option key={method} value={method}>{method.replace(/_/g, " ")}</option>)}
              </select>
              {paymentMethod === "insurance" ? <select value={policyId} onChange={(e) => setPolicyId(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"><option value="">Select insurance policy</option>{data.policies.map((policy) => <option key={policy.id} value={policy.id}>{policy.provider} - {policy.policyNumber}</option>)}</select> : null}
              <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="0" step="0.01" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground" placeholder="Amount" />
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground" placeholder="Payment notes" />
              <button onClick={submitPayment} disabled={submitting} className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"><CreditCard className="mr-2 inline h-4 w-4" />{submitting ? "Submitting..." : "Submit payment"}</button>
            </div>
          </div>

          {activeInvoice ? <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Invoice activity</h2>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              {(activeInvoice.payments.length ? activeInvoice.payments : [{ id: "none", method: "none", amount: 0, status: "No payments yet" }]).map((payment) => (
                <div key={payment.id} className="rounded-xl border border-border bg-background p-3">
                  <p className="font-medium capitalize text-foreground">{payment.status}</p>
                  <p>{payment.method.replace(/_/g, " ")} - {formatter.format(payment.amount)}</p>
                </div>
              ))}
              {activeInvoice.claims.map((claim) => (
                <div key={claim.id} className="rounded-xl border border-border bg-background p-3">
                  <p className="font-medium capitalize text-foreground">Insurance claim {claim.status}</p>
                  <p>Claimed {formatter.format(claim.claimAmount)} � Approved {formatter.format(claim.approvedAmount)}</p>
                </div>
              ))}
            </div>
          </div> : null}
        </div>
      </div>
    </div>
  );
}
