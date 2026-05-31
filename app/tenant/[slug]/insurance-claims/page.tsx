"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  X,
  XCircle,
} from "lucide-react";

type Claim = {
  id: string;
  claimNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  patient: { id: string; name: string; mrn: string; phone: string; email: string };
  provider: string;
  policyNumber: string;
  service: { type: string; description: string; billedAmount: number; amountDue: number; invoiceStatus: string };
  claimAmount: number;
  approvedAmount: number;
  status: string;
  submittedAt: string;
  processedAt: string;
  denialReason: string;
  appealDeadline: string;
  notes: string;
  documents: any[];
  ageDays: number;
};

type Payload = {
  claims: Claim[];
  stats: {
    totalClaims: number;
    approvedClaims: number;
    deniedClaims: number;
    pendingClaims: number;
    totalClaimed: number;
    totalApproved: number;
    outstandingAmount: number;
    approvalRate: number;
    denialRate: number;
    averageProcessingDays: number;
    averageClaimValue: number;
  };
  providers: Array<{ provider: string; claims: number; approved: number; denied: number; pending: number; claimed: number; approvedAmount: number; approvalRate: number }>;
  trends: Array<{ label: string; submitted: number; approved: number; claimed: number }>;
  aging: { under7: number; days7to30: number; over30: number };
  attention: Claim[];
};

const EMPTY: Payload = {
  claims: [],
  stats: {
    totalClaims: 0,
    approvedClaims: 0,
    deniedClaims: 0,
    pendingClaims: 0,
    totalClaimed: 0,
    totalApproved: 0,
    outstandingAmount: 0,
    approvalRate: 0,
    denialRate: 0,
    averageProcessingDays: 0,
    averageClaimValue: 0,
  },
  providers: [],
  trends: [],
  aging: { under7: 0, days7to30: 0, over30: 0 },
  attention: [],
};

function money(value: number) {
  return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value?: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleDateString();
}

function statusClass(status: string) {
  switch (status) {
    case "paid":
    case "approved":
      return "border-green-200 bg-green-50 text-green-700";
    case "denied":
      return "border-red-200 bg-red-50 text-red-700";
    case "appealed":
    case "under_review":
      return "border-blue-200 bg-blue-50 text-blue-700";
    default:
      return "border-orange-200 bg-orange-50 text-orange-700";
  }
}

function statusIcon(status: string) {
  if (["approved", "paid"].includes(status)) return <CheckCircle className="size-3" />;
  if (status === "denied") return <XCircle className="size-3" />;
  if (status === "appealed") return <AlertTriangle className="size-3" />;
  return <Clock className="size-3" />;
}

function csvEscape(value: unknown) {
  const text = value == null ? "" : String(value);
  return text.includes(",") || text.includes('"') || text.includes("\n") ? `"${text.replace(/"/g, '""')}"` : text;
}

export default function InsuranceClaimsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [payload, setPayload] = useState<Payload>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    setError("");
    try {
      const res = await fetch(`/api/tenant/${slug}/insurance-claims`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to load insurance claims");
      setPayload({ ...EMPTY, ...data });
    } catch (loadError: any) {
      setError(loadError?.message || "Failed to load insurance claims");
      setPayload(EMPTY);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (slug) load();
  }, [slug]);

  const filteredClaims = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payload.claims.filter((claim) => {
      const matchesSearch = !q || [
        claim.claimNumber,
        claim.invoiceNumber,
        claim.patient.name,
        claim.patient.mrn,
        claim.provider,
        claim.policyNumber,
        claim.status,
      ].join(" ").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || claim.status === statusFilter;
      const matchesProvider = providerFilter === "all" || claim.provider === providerFilter;
      const submitted = claim.submittedAt ? new Date(claim.submittedAt) : null;
      const days = submitted ? Math.floor((Date.now() - submitted.getTime()) / 86400000) : 0;
      const matchesDate = dateFilter === "all" || (dateFilter === "week" && days <= 7) || (dateFilter === "month" && days <= 30) || (dateFilter === "quarter" && days <= 90);
      return matchesSearch && matchesStatus && matchesProvider && matchesDate;
    });
  }, [payload.claims, search, statusFilter, providerFilter, dateFilter]);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setProviderFilter("all");
    setDateFilter("all");
  };

  const exportCsv = () => {
    const rows = [
      ["Claim", "Patient", "Provider", "Policy", "Status", "Claimed", "Approved", "Submitted", "Processed"],
      ...filteredClaims.map((claim) => [
        claim.claimNumber,
        claim.patient.name,
        claim.provider,
        claim.policyNumber,
        claim.status,
        claim.claimAmount,
        claim.approvedAmount,
        claim.submittedAt,
        claim.processedAt,
      ]),
    ];
    const blob = new Blob([rows.map((row) => row.map(csvEscape).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `insurance-claims-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
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
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Finance Analytics</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">Insurance Claims</h1>
          <p className="mt-1 text-sm text-muted-foreground">Read-only claim oversight for reimbursements, payer performance, denials, aging, and reimbursement exposure.</p>
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
          <button onClick={resetFilters} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">
            <Filter className="size-4" />
            Reset filters
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Total Claims", value: payload.stats.totalClaims, icon: ShieldCheck, tone: "bg-blue-50 text-blue-700" },
          { label: "Approval Rate", value: `${payload.stats.approvalRate}%`, icon: TrendingUp, tone: "bg-green-50 text-green-700" },
          { label: "Total Claimed", value: money(payload.stats.totalClaimed), icon: FileText, tone: "bg-orange-50 text-orange-700" },
          { label: "Approved", value: money(payload.stats.totalApproved), icon: CheckCircle, tone: "bg-emerald-50 text-emerald-700" },
          { label: "Outstanding", value: money(payload.stats.outstandingAmount), icon: Clock, tone: "bg-slate-100 text-slate-700" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-5">
            <div className={`mb-3 flex size-11 items-center justify-center rounded-xl ${card.tone}`}><card.icon className="size-5" /></div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Pending Claims</p><p className="mt-2 text-3xl font-bold">{payload.stats.pendingClaims}</p></div>
        <div className="rounded-xl border border-border bg-card p-5"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Denied Claims</p><p className="mt-2 text-3xl font-bold">{payload.stats.deniedClaims}</p></div>
        <div className="rounded-xl border border-border bg-card p-5"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Denial Rate</p><p className="mt-2 text-3xl font-bold">{payload.stats.denialRate}%</p></div>
        <div className="rounded-xl border border-border bg-card p-5"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Avg Processing</p><p className="mt-2 text-3xl font-bold">{payload.stats.averageProcessingDays}d</p></div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_170px_220px_170px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search claims, patients, providers, policies..." className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-orange-300" />
          </div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
            <option value="all">All status</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under review</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
            <option value="denied">Denied</option>
            <option value="appealed">Appealed</option>
          </select>
          <select value={providerFilter} onChange={(event) => setProviderFilter(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
            <option value="all">All providers</option>
            {payload.providers.map((provider) => <option key={provider.provider} value={provider.provider}>{provider.provider}</option>)}
          </select>
          <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
            <option value="all">Any date</option>
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
            <option value="quarter">Last 90 days</option>
          </select>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold text-foreground">Claims Worklist</h2>
            <p className="mt-1 text-sm text-muted-foreground">{filteredClaims.length} claims match the current filters.</p>
          </div>
          <div className="overflow-visible">
            <table className="w-full table-auto text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="px-5 py-3">Claim</th><th className="px-5 py-3">Patient</th><th className="px-5 py-3">Provider</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Aging</th><th className="px-5 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredClaims.length === 0 ? (
                  <tr><td colSpan={7} className="py-16 text-center text-muted-foreground">No insurance claims found for these filters.</td></tr>
                ) : filteredClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-muted/30">
                    <td className="px-5 py-3"><p className="font-mono font-semibold">{claim.claimNumber}</p><p className="text-xs text-muted-foreground">{claim.invoiceNumber || "No invoice number"}</p></td>
                    <td className="px-5 py-3"><p className="font-semibold">{claim.patient.name}</p><p className="text-xs text-muted-foreground">{claim.patient.mrn || claim.patient.email || "No patient identifier"}</p></td>
                    <td className="px-5 py-3"><p className="font-semibold">{claim.provider}</p><p className="text-xs text-muted-foreground">{claim.policyNumber || "No policy number"}</p></td>
                    <td className="px-5 py-3"><p className="font-semibold">{money(claim.claimAmount)}</p><p className="text-xs text-muted-foreground">Approved {money(claim.approvedAmount)}</p></td>
                    <td className="px-5 py-3"><span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(claim.status)}`}>{statusIcon(claim.status)}{claim.status.replace(/_/g, " ")}</span></td>
                    <td className="px-5 py-3"><p className="font-medium">{claim.ageDays} days</p><p className="text-xs text-muted-foreground">{formatDate(claim.submittedAt)}</p></td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => setSelectedClaim(claim)} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"><Eye className="size-3" />View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between"><h2 className="font-semibold">Payer Performance</h2><BarChart3 className="size-4 text-muted-foreground" /></div>
            <div className="mt-4 space-y-3">
              {payload.providers.length === 0 ? <p className="text-sm text-muted-foreground">No provider data available.</p> : payload.providers.slice(0, 6).map((provider) => (
                <div key={provider.provider} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-3"><p className="font-semibold">{provider.provider}</p><p className="text-sm text-muted-foreground">{provider.approvalRate}% approved</p></div>
                  <div className="mt-2 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-orange-500" style={{ width: `${Math.min(100, provider.approvalRate)}%` }} /></div>
                  <p className="mt-2 text-xs text-muted-foreground">{provider.claims} claims - {money(provider.claimed)} claimed</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold">Claim Aging</h2>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-lg bg-background p-3"><p className="text-2xl font-bold">{payload.aging.under7}</p><p className="text-muted-foreground">&lt; 7 days</p></div>
              <div className="rounded-lg bg-background p-3"><p className="text-2xl font-bold">{payload.aging.days7to30}</p><p className="text-muted-foreground">7-30 days</p></div>
              <div className="rounded-lg bg-background p-3"><p className="text-2xl font-bold">{payload.aging.over30}</p><p className="text-muted-foreground">&gt; 30 days</p></div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold">Six Month Trend</h2>
            <div className="mt-4 space-y-3">
              {payload.trends.map((item, index) => (
                <div key={`${item.label}-${index}`} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <span className="font-semibold">{item.label}</span>
                  <span className="text-muted-foreground">{item.submitted} submitted / {item.approved} approved / {money(item.claimed)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">Attention Queue</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {payload.attention.length === 0 ? <p className="text-sm text-muted-foreground">No high-risk claims currently need admin attention.</p> : payload.attention.map((claim) => (
            <button key={claim.id} onClick={() => setSelectedClaim(claim)} className="rounded-lg border border-border bg-background p-4 text-left hover:bg-muted/50">
              <div className="flex items-center justify-between gap-3"><p className="font-semibold">{claim.claimNumber}</p><span className={`rounded-full border px-2 py-1 text-xs capitalize ${statusClass(claim.status)}`}>{claim.status.replace(/_/g, " ")}</span></div>
              <p className="mt-1 text-sm text-muted-foreground">{claim.patient.name} - {claim.provider} - {claim.ageDays} days old</p>
            </button>
          ))}
        </div>
      </div>

      {selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Claim detail</p>
                <h2 className="mt-1 text-2xl font-bold">{selectedClaim.claimNumber}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{selectedClaim.patient.name} - {selectedClaim.provider}</p>
              </div>
              <button onClick={() => setSelectedClaim(null)} className="rounded-lg border border-border p-2 hover:bg-muted"><X className="size-4" /></button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-background p-4"><p className="text-xs uppercase text-muted-foreground">Claimed</p><p className="mt-2 text-xl font-semibold">{money(selectedClaim.claimAmount)}</p></div>
              <div className="rounded-xl bg-background p-4"><p className="text-xs uppercase text-muted-foreground">Approved</p><p className="mt-2 text-xl font-semibold">{money(selectedClaim.approvedAmount)}</p></div>
              <div className="rounded-xl bg-background p-4"><p className="text-xs uppercase text-muted-foreground">Status</p><span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-xs capitalize ${statusClass(selectedClaim.status)}`}>{selectedClaim.status.replace(/_/g, " ")}</span></div>
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="font-semibold">Patient and policy</p>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <p>MRN: {selectedClaim.patient.mrn || "Not set"}</p>
                  <p>Email: {selectedClaim.patient.email || "Not set"}</p>
                  <p>Phone: {selectedClaim.patient.phone || "Not set"}</p>
                  <p>Policy: {selectedClaim.policyNumber || "Not set"}</p>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="font-semibold">Timeline</p>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <p>Submitted: {formatDate(selectedClaim.submittedAt)}</p>
                  <p>Processed: {formatDate(selectedClaim.processedAt)}</p>
                  <p>Appeal deadline: {formatDate(selectedClaim.appealDeadline)}</p>
                  <p>Age: {selectedClaim.ageDays} days</p>
                </div>
              </div>
            </div>
            <div className="mt-6 rounded-xl border border-border bg-background p-4">
              <p className="font-semibold">Service and payer notes</p>
              <p className="mt-3 text-sm text-muted-foreground">{selectedClaim.service.description}</p>
              {selectedClaim.denialReason && <p className="mt-3 text-sm text-red-700">Denial reason: {selectedClaim.denialReason}</p>}
              {selectedClaim.notes && <p className="mt-3 text-sm text-muted-foreground">{selectedClaim.notes}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
