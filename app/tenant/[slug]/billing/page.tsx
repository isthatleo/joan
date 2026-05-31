"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, CheckCircle, Clock, CreditCard, Download, Eye, Loader2, Receipt, RefreshCw, Search, Wallet } from "lucide-react";

type Invoice = {
  id: string;
  invoiceNumber: string;
  patientName: string;
  patientEmail?: string;
  totalAmount: number;
  amountDue: number;
  paidAmount: number;
  status: string;
  dueDate?: string;
  description?: string;
  createdAt: string;
};

type Wage = {
  id: string;
  staffName: string;
  description: string;
  amount: number;
  currency: string;
  expenseDate: string;
  status: string;
  reference?: string;
};

type PlatformInvoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  currency: string;
  total: number;
  amountPaid: number;
  amountDue: number;
  issuedAt: string;
  dueAt: string;
  paidAt?: string;
  periodStart?: string;
  periodEnd?: string;
  planName?: string;
  planCode?: string;
  notes?: string;
  lineItems?: Array<{ description?: string; quantity?: number; unitPrice?: number; amount?: number }>;
};

const EMPTY_STATS = {
  totalInvoices: 0,
  paidInvoices: 0,
  pendingInvoices: 0,
  overdueInvoices: 0,
  totalBilled: 0,
  paidRevenue: 0,
  outstanding: 0,
  overdueAmount: 0,
  wageRequests: 0,
  pendingWages: 0,
  approvedWages: 0,
  paidWages: 0,
  wageLiability: 0,
};

function money(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDate(value?: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleDateString();
}

function statusClass(status: string) {
  switch (status) {
    case "paid":
      return "border-green-200 bg-green-50 text-green-700";
    case "overdue":
    case "rejected":
      return "border-red-200 bg-red-50 text-red-700";
    case "approved":
      return "border-blue-200 bg-blue-50 text-blue-700";
    default:
      return "border-orange-200 bg-orange-50 text-orange-700";
  }
}

function csvEscape(value: unknown) {
  const text = value == null ? "" : String(value);
  return text.includes(",") || text.includes('"') || text.includes("\n") ? `"${text.replace(/"/g, '""')}"` : text;
}

export default function BillingPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [platformInvoices, setPlatformInvoices] = useState<PlatformInvoice[]>([]);
  const [platformStats, setPlatformStats] = useState({ totalInvoices: 0, paidInvoices: 0, outstandingInvoices: 0, totalBilled: 0, totalPaid: 0, totalDue: 0 });
  const [wages, setWages] = useState<Wage[]>([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"invoices" | "platform" | "wages">("invoices");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    setError("");
    try {
      const query = new URLSearchParams({ status: statusFilter });
      const [res, platformRes] = await Promise.all([
        fetch(`/api/tenant/${slug}/billing/admin?${query.toString()}`, { credentials: "include", cache: "no-store" }),
        fetch(`/api/tenant/${slug}/billing/platform-invoices`, { credentials: "include", cache: "no-store" }),
      ]);
      const data = await res.json().catch(() => null);
      const platformData = await platformRes.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to fetch billing data");
      if (!platformRes.ok) throw new Error(platformData?.error || "Failed to fetch platform invoices");
      setInvoices(Array.isArray(data?.invoices) ? data.invoices : []);
      setPlatformInvoices(Array.isArray(platformData?.invoices) ? platformData.invoices : []);
      setPlatformStats(platformData?.stats || { totalInvoices: 0, paidInvoices: 0, outstandingInvoices: 0, totalBilled: 0, totalPaid: 0, totalDue: 0 });
      setWages(Array.isArray(data?.wages) ? data.wages : []);
      setStats(data?.stats || EMPTY_STATS);
    } catch (loadError: any) {
      setError(loadError?.message || "Failed to fetch billing data");
      setInvoices([]);
      setPlatformInvoices([]);
      setWages([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (slug) load();
  }, [slug, statusFilter]);

  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((invoice) => [invoice.invoiceNumber, invoice.patientName, invoice.patientEmail, invoice.description, invoice.id].join(" ").toLowerCase().includes(q));
  }, [invoices, search]);

  const filteredWages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return wages;
    return wages.filter((wage) => [wage.staffName, wage.description, wage.status, wage.reference].join(" ").toLowerCase().includes(q));
  }, [wages, search]);

  const filteredPlatformInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return platformInvoices.filter((invoice) => {
      const matchesSearch = !q || [invoice.invoiceNumber, invoice.planName, invoice.planCode, invoice.status, invoice.notes, invoice.id].join(" ").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [platformInvoices, search, statusFilter]);

  const runWageAction = async (wage: Wage, action: "approve_wage" | "reject_wage" | "mark_wage_paid") => {
    setBusyId(wage.id);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/tenant/${slug}/billing/admin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ wageId: wage.id, action }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Wage update failed");
      setNotice("Wage request updated.");
      await load(true);
    } catch (actionError: any) {
      setError(actionError?.message || "Wage update failed");
    } finally {
      setBusyId("");
    }
  };

  const exportCsv = () => {
    const rows = activeTab === "invoices"
      ? [["Invoice", "Patient", "Total", "Paid", "Due", "Status", "Due Date"], ...filteredInvoices.map((i) => [i.invoiceNumber, i.patientName, i.totalAmount, i.paidAmount, i.amountDue, i.status, i.dueDate || ""])]
      : activeTab === "platform"
        ? [["Invoice", "Plan", "Total", "Paid", "Due", "Status", "Issued", "Due Date"], ...filteredPlatformInvoices.map((i) => [i.invoiceNumber, i.planName || "", i.total, i.amountPaid, i.amountDue, i.status, i.issuedAt, i.dueAt])]
      : [["Staff", "Description", "Amount", "Currency", "Status", "Date"], ...filteredWages.map((w) => [w.staffName, w.description, w.amount, w.currency, w.status, w.expenseDate])];
    const blob = new Blob([rows.map((row) => row.map(csvEscape).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `billing-${activeTab}-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="size-8 animate-spin text-orange-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Financial Management</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">Billing & Finance Oversight</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track invoices, payments, outstanding balances, and wage approvals. Admins can review and update status but cannot create patient invoices.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => load(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60">
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">
            <Download className="size-4" />
            Export CSV
          </button>
        </div>
      </div>

      {(error || notice) && <div className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>{error || notice}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Paid Revenue", value: money(stats.paidRevenue), icon: Wallet, tone: "bg-green-50 text-green-700" },
          { label: "Outstanding", value: money(stats.outstanding), icon: Clock, tone: "bg-orange-50 text-orange-700" },
          { label: "Overdue", value: money(stats.overdueAmount), icon: AlertCircle, tone: "bg-red-50 text-red-700" },
          { label: "Invoices", value: stats.totalInvoices, icon: Receipt, tone: "bg-blue-50 text-blue-700" },
          { label: "Platform Due", value: money(platformStats.totalDue), icon: CreditCard, tone: "bg-slate-100 text-slate-700" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-5">
            <div className={`mb-3 flex size-11 items-center justify-center rounded-xl ${card.tone}`}><card.icon className="size-5" /></div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Collection Rate</p><p className="mt-2 text-3xl font-bold">{stats.totalBilled ? Math.round((stats.paidRevenue / stats.totalBilled) * 100) : 0}%</p></div>
        <div className="rounded-xl border border-border bg-card p-5"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Paid Invoices</p><p className="mt-2 text-3xl font-bold">{stats.paidInvoices}</p></div>
        <div className="rounded-xl border border-border bg-card p-5"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Super Admin Invoices</p><p className="mt-2 text-3xl font-bold">{platformStats.totalInvoices}</p></div>
        <div className="rounded-xl border border-border bg-card p-5"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Wage Liability</p><p className="mt-2 text-3xl font-bold">{money(stats.wageLiability)}</p></div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search invoices, patients, wage requests..." className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-orange-300" />
          </div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
            <option value="all">All invoice status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      <div className="border-b border-border">
        <nav className="flex gap-8">
          <button onClick={() => setActiveTab("invoices")} className={`border-b-2 px-1 py-4 text-sm font-semibold ${activeTab === "invoices" ? "border-orange-500 text-orange-600" : "border-transparent text-muted-foreground"}`}>Invoice Tracking <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">{filteredInvoices.length}</span></button>
          <button onClick={() => setActiveTab("platform")} className={`border-b-2 px-1 py-4 text-sm font-semibold ${activeTab === "platform" ? "border-orange-500 text-orange-600" : "border-transparent text-muted-foreground"}`}>Hospital Invoices <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">{filteredPlatformInvoices.length}</span></button>
          <button onClick={() => setActiveTab("wages")} className={`border-b-2 px-1 py-4 text-sm font-semibold ${activeTab === "wages" ? "border-orange-500 text-orange-600" : "border-transparent text-muted-foreground"}`}>Wage Approvals <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">{filteredWages.length}</span></button>
        </nav>
      </div>

      {activeTab === "invoices" ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-5 py-3">Invoice</th><th className="px-5 py-3">Patient</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Due</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-border">
                {filteredInvoices.length === 0 ? <tr><td colSpan={6} className="py-16 text-center text-muted-foreground">No invoices found.</td></tr> : filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-muted/30">
                    <td className="px-5 py-3"><p className="font-mono font-semibold">#{invoice.invoiceNumber}</p><p className="text-xs text-muted-foreground">{formatDate(invoice.createdAt)}</p></td>
                    <td className="px-5 py-3"><p className="font-semibold">{invoice.patientName}</p><p className="text-xs text-muted-foreground">{invoice.patientEmail || "No email"}</p></td>
                    <td className="px-5 py-3"><p className="font-semibold">{money(invoice.totalAmount)}</p><p className="text-xs text-muted-foreground">Due {money(invoice.amountDue)}</p></td>
                    <td className="px-5 py-3"><span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(invoice.status)}`}>{invoice.status === "paid" && <CheckCircle className="size-3" />}{invoice.status}</span></td>
                    <td className="px-5 py-3">{formatDate(invoice.dueDate)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <Link href={`/tenant/${slug}/billing/invoices/${invoice.id}`} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"><Eye className="size-3" />View</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === "platform" ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-5"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Billed By Platform</p><p className="mt-2 text-2xl font-bold">{money(platformStats.totalBilled)}</p></div>
            <div className="rounded-xl border border-border bg-card p-5"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Paid To Platform</p><p className="mt-2 text-2xl font-bold">{money(platformStats.totalPaid)}</p></div>
            <div className="rounded-xl border border-border bg-card p-5"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Outstanding</p><p className="mt-2 text-2xl font-bold">{money(platformStats.totalDue)}</p></div>
          </div>
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-semibold text-foreground">Invoices From Super Admin</h2>
              <p className="mt-1 text-sm text-muted-foreground">Includes provisioning invoices, subscriptions, prepaid invoices, monthly fees, maintenance, and manual platform charges.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-5 py-3">Invoice</th><th className="px-5 py-3">Plan / Period</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Due</th><th className="px-5 py-3">Items</th></tr></thead>
                <tbody className="divide-y divide-border">
                  {filteredPlatformInvoices.length === 0 ? <tr><td colSpan={6} className="py-16 text-center text-muted-foreground">No hospital invoices found.</td></tr> : filteredPlatformInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-muted/30">
                      <td className="px-5 py-3"><p className="font-mono font-semibold">#{invoice.invoiceNumber}</p><p className="text-xs text-muted-foreground">Issued {formatDate(invoice.issuedAt)}</p></td>
                      <td className="px-5 py-3"><p className="font-semibold">{invoice.planName || "Platform invoice"}</p><p className="text-xs text-muted-foreground">{invoice.periodStart ? `${formatDate(invoice.periodStart)} - ${formatDate(invoice.periodEnd)}` : invoice.planCode || "Manual charge"}</p></td>
                      <td className="px-5 py-3"><p className="font-semibold">{invoice.currency} {invoice.total.toFixed(2)}</p><p className="text-xs text-muted-foreground">Due {invoice.currency} {invoice.amountDue.toFixed(2)}</p></td>
                      <td className="px-5 py-3"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(invoice.status)}`}>{invoice.status}</span></td>
                      <td className="px-5 py-3">{formatDate(invoice.dueAt)}</td>
                      <td className="px-5 py-3"><p className="text-sm">{invoice.lineItems?.length || 0} line items</p><p className="text-xs text-muted-foreground">{invoice.notes || "No notes"}</p></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredWages.length === 0 ? <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground lg:col-span-2">No wage approval requests found.</div> : filteredWages.map((wage) => (
            <div key={wage.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div><p className="font-semibold">{wage.staffName}</p><p className="mt-1 text-sm text-muted-foreground">{wage.description}</p></div>
                <span className={`rounded-full border px-2 py-1 text-xs font-semibold capitalize ${statusClass(wage.status)}`}>{wage.status}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg bg-background p-3"><p className="text-muted-foreground">Amount</p><p className="font-semibold">{wage.currency} {wage.amount.toFixed(2)}</p></div>
                <div className="rounded-lg bg-background p-3"><p className="text-muted-foreground">Date</p><p className="font-semibold">{formatDate(wage.expenseDate)}</p></div>
                <div className="rounded-lg bg-background p-3"><p className="text-muted-foreground">Reference</p><p className="font-semibold">{wage.reference || "-"}</p></div>
              </div>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                {["pending", "open"].includes(wage.status) && <button disabled={busyId === wage.id} onClick={() => runWageAction(wage, "approve_wage")} className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60">Approve</button>}
                {wage.status === "approved" && <button disabled={busyId === wage.id} onClick={() => runWageAction(wage, "mark_wage_paid")} className="rounded-lg border border-green-200 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:opacity-60">Mark paid</button>}
                {!["paid", "rejected"].includes(wage.status) && <button disabled={busyId === wage.id} onClick={() => runWageAction(wage, "reject_wage")} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">Reject</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
