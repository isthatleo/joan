"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  ShieldCheck, Search, Plus, AlertCircle, CheckCircle, Loader2,
  Clock, FileText, TrendingUp, Calendar, Download, Filter, Eye,
  Edit, MoreHorizontal, ChevronDown, ArrowUpDown, Receipt,
  DollarSign, Building2, User, Phone, Mail, RefreshCw, X
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useTenantPath } from "@/hooks/useTenantPath";
import { exportElementAsPdf, exportElementAsPng } from "@/lib/export/page-export";

const orange = "#F97316";

interface InsuranceClaim {
  id: string;
  patientId: string;
  patientName: string;
  invoiceId: string;
  insuranceProvider: string;
  policyNumber: string;
  claimAmount: number;
  approvedAmount?: number;
  status: "submitted" | "under_review" | "approved" | "denied" | "paid" | "appealed";
  submittedAt: string;
  processedAt?: string;
  denialReason?: string;
  appealDeadline?: string;
  notes?: string;
  documents: Array<{
    id: string;
    name: string;
    type: string;
    uploadedAt: string;
  }>;
}

interface ClaimStats {
  totalClaims: number;
  approvedClaims: number;
  deniedClaims: number;
  pendingClaims: number;
  totalClaimed: number;
  totalApproved: number;
  averageApprovalRate: number;
  averageProcessingTime: number;
}

interface InsuranceProvider {
  id: string;
  name: string;
  claimsCount: number;
  approvalRate: number;
  averageProcessingDays: number;
}

interface InsuranceProviderDetail {
  provider: string;
  totalClaims: number;
  approvedClaims: number;
  deniedClaims: number;
  pendingClaims: number;
  totalClaimed: number;
  totalApproved: number;
  averageProcessingDays: number;
  recentClaims: Array<{
    id: string;
    invoiceId: string | null;
    policyNumber: string;
    patientName: string;
    claimAmount: number;
    approvedAmount: number | null;
    status: InsuranceClaim["status"];
    submittedAt: string;
    processedAt: string | null;
    denialReason: string | null;
  }>;
}

export default function AccountantInsuranceClaimsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const tenantPath = useTenantPath();
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [stats, setStats] = useState<ClaimStats | null>(null);
  const [providers, setProviders] = useState<InsuranceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("submittedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedClaims, setSelectedClaims] = useState<string[]>([]);
  const [appealTarget, setAppealTarget] = useState<InsuranceClaim | null>(null);
  const [appealReason, setAppealReason] = useState("");
  const [submittingAppeal, setSubmittingAppeal] = useState(false);
  const [activeProvider, setActiveProvider] = useState<InsuranceProvider | null>(null);
  const [providerDetail, setProviderDetail] = useState<InsuranceProviderDetail | null>(null);
  const [loadingProviderDetail, setLoadingProviderDetail] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchClaims();
  }, [slug]);

  const fetchClaims = async () => {
    setLoading((current) => current && !refreshing);
    setRefreshing(true);
    setErrorMessage(null);
    try {
      const [claimsRes, statsRes, providersRes] = await Promise.all([
        fetch(`/api/tenant/${slug}/accountant/insurance-claims`),
        fetch(`/api/tenant/${slug}/accountant/insurance-claims/stats`),
        fetch(`/api/tenant/${slug}/accountant/insurance-claims/providers`)
      ]);

      if (claimsRes.ok) setClaims(await claimsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (providersRes.ok) setProviders(await providersRes.json());
    } catch (error) {
      console.error('Failed to fetch insurance claims:', error);
      setErrorMessage("Failed to load insurance claims. Check the claims endpoints and try again.");
      toast.error("Failed to load insurance claims");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredClaims = claims
    .filter(claim => {
      const matchesSearch = claim.patientName.toLowerCase().includes(search.toLowerCase()) ||
                           claim.id.toLowerCase().includes(search.toLowerCase()) ||
                           claim.policyNumber.toLowerCase().includes(search.toLowerCase()) ||
                           claim.insuranceProvider.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || claim.status === statusFilter;
      const matchesProvider = providerFilter === "all" || claim.insuranceProvider === providerFilter;

      let matchesDate = true;
      if (dateFilter !== "all") {
        const claimDate = new Date(claim.submittedAt);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - claimDate.getTime()) / (1000 * 3600 * 24));

        switch (dateFilter) {
          case "today": matchesDate = daysDiff === 0; break;
          case "week": matchesDate = daysDiff <= 7; break;
          case "month": matchesDate = daysDiff <= 30; break;
          case "quarter": matchesDate = daysDiff <= 90; break;
        }
      }

      return matchesSearch && matchesStatus && matchesProvider && matchesDate;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "amount": aValue = a.claimAmount; bValue = b.claimAmount; break;
        case "approvedAmount": aValue = a.approvedAmount || 0; bValue = b.approvedAmount || 0; break;
        case "patientName": aValue = a.patientName; bValue = b.patientName; break;
        case "provider": aValue = a.insuranceProvider; bValue = b.insuranceProvider; break;
        case "status": aValue = a.status; bValue = b.status; break;
        default: aValue = new Date(a.submittedAt); bValue = new Date(b.submittedAt);
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-50 text-green-700 border-green-200";
      case "paid": return "bg-blue-50 text-blue-700 border-blue-200";
      case "submitted": return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "under_review": return "bg-purple-50 text-purple-700 border-purple-200";
      case "denied": return "bg-red-50 text-red-700 border-red-200";
      case "appealed": return "bg-orange-50 text-orange-700 border-orange-200";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle className="size-3" />;
      case "paid": return <DollarSign className="size-3" />;
      case "submitted": return <FileText className="size-3" />;
      case "under_review": return <Clock className="size-3" />;
      case "denied": return <AlertCircle className="size-3" />;
      case "appealed": return <TrendingUp className="size-3" />;
      default: return null;
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedClaims.length === 0) return;

    try {
      const res = await fetch(`/api/tenant/${slug}/accountant/insurance-claims/bulk-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, claimIds: selectedClaims })
      });

      if (res.ok) {
        toast.success(`${action} applied to ${selectedClaims.length} claims`);
        fetchClaims();
        setSelectedClaims([]);
      } else {
        toast.error(`Failed to ${action} claims`);
      }
    } catch (error) {
      toast.error(`Failed to ${action} claims`);
    }
  };

  const submitAppeal = async () => {
    if (!appealTarget) return;
    if (!appealReason.trim()) {
      toast.error("Appeal reason is required");
      return;
    }
    setSubmittingAppeal(true);
    try {
      const res = await fetch(`/api/tenant/${slug}/accountant/insurance-claims/${appealTarget.id}/appeal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: appealReason.trim() })
      });

      if (res.ok) {
        toast.success("Appeal submitted successfully");
        setAppealTarget(null);
        setAppealReason("");
        fetchClaims();
      } else {
        toast.error("Failed to submit appeal");
      }
    } catch (error) {
      toast.error("Failed to submit appeal");
    } finally {
      setSubmittingAppeal(false);
    }
  };

  const exportClaims = async (format: "csv" | "pdf" | "png") => {
    try {
      if (format === "csv") {
        const res = await fetch(`/api/tenant/${slug}/accountant/insurance-claims/export?format=${format}&ids=${selectedClaims.join(",")}`);
        if (!res.ok) throw new Error("Failed to export claims");
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "insurance-claims.csv";
        a.click();
      } else {
        if (!exportRef.current) throw new Error("Nothing to export");
        const filename = `insurance-claims-${selectedClaims.length ? "selected" : "all"}.${format}`;
        if (format === "pdf") {
          await exportElementAsPdf(exportRef.current, filename);
        } else {
          await exportElementAsPng(exportRef.current, filename);
        }
      }
      toast.success(`Exported insurance claims as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error("Failed to export claims");
    }
  };

  const openProviderDetail = async (provider: InsuranceProvider) => {
    setActiveProvider(provider);
    setProviderDetail(null);
    setLoadingProviderDetail(true);
    try {
      const response = await fetch(`/api/tenant/${slug}/accountant/insurance-claims/providers/${encodeURIComponent(provider.id)}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load insurer detail");
      }
      setProviderDetail(payload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load insurer detail");
    } finally {
      setLoadingProviderDetail(false);
    }
  };

  return (
    <div ref={exportRef} className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Accountant Dashboard</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Insurance Claims</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and track insurance claim submissions and approvals.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchClaims()}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => exportClaims("pdf")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all"
          >
            <Download className="size-4" />
            Export PDF
          </button>
          <button
            onClick={() => exportClaims("png")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all"
          >
            <Eye className="size-4" />
            Export PNG
          </button>
          <button
            onClick={() => exportClaims("csv")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all"
          >
            <FileText className="size-4" />
            Export CSV
          </button>
          <Link
            href={tenantPath("/accountant/insurance-claims/new")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90"
            style={{ backgroundColor: orange }}
          >
            <Plus className="size-4" />
            New Claim
          </Link>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Claims Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Claims</p>
              <p className="text-2xl font-bold text-foreground">
                {stats?.totalClaims || 0}
              </p>
            </div>
            <div className="size-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <ShieldCheck className="size-6" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Approved</p>
              <p className="text-2xl font-bold text-foreground">
                {stats?.approvedClaims || 0}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {stats?.averageApprovalRate || 0}% approval rate
              </p>
            </div>
            <div className="size-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
              <CheckCircle className="size-6" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Claimed</p>
              <p className="text-2xl font-bold text-foreground">
                ${stats?.totalClaimed?.toLocaleString() || '0'}
              </p>
              <p className="text-xs text-blue-600 mt-1">Amount submitted</p>
            </div>
            <div className="size-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <DollarSign className="size-6" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Avg Processing</p>
              <p className="text-2xl font-bold text-foreground">
                {stats?.averageProcessingTime || 0}
              </p>
              <p className="text-xs text-purple-600 mt-1">Days to process</p>
            </div>
            <div className="size-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
              <Clock className="size-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Insurance Providers Performance */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Insurance Providers</h3>
          <Building2 className="size-5 text-muted-foreground" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No insurer performance data available yet.
            </div>
          ) : providers.slice(0, 6).map(provider => (
            <button
              key={provider.id}
              type="button"
              onClick={() => openProviderDetail(provider)}
              className="rounded-lg border border-border p-4 text-left transition hover:border-orange-300 hover:bg-orange-500/5"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-foreground">{provider.name}</p>
                <span className="text-sm text-muted-foreground">{provider.claimsCount} claims</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Approval Rate</span>
                  <span className="font-medium">{provider.approvalRate}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Avg Processing</span>
                  <span className="font-medium">{provider.averageProcessingDays} days</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${provider.approvalRate}%` }}
                  />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by patient name, claim ID, policy number, or provider..."
              className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
            >
              <option value="all">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
              <option value="paid">Paid</option>
              <option value="appealed">Appealed</option>
            </select>

            <select
              value={providerFilter}
              onChange={e => setProviderFilter(e.target.value)}
              className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
            >
              <option value="all">All Providers</option>
              {providers.map(provider => (
                <option key={provider.id} value={provider.name}>{provider.name}</option>
              ))}
            </select>

            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
            >
              <option value="submittedAt">Submitted Date</option>
              <option value="amount">Claim Amount</option>
              <option value="approvedAmount">Approved Amount</option>
              <option value="patientName">Patient</option>
              <option value="provider">Provider</option>
              <option value="status">Status</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="h-10 px-3 rounded-lg border border-border bg-background hover:bg-muted"
            >
              <ArrowUpDown className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedClaims.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-blue-800">
              {selectedClaims.length} claim{selectedClaims.length !== 1 ? 's' : ''} selected
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction('submit_selected')}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                Submit Selected
              </button>
              <button
                onClick={() => exportClaims('pdf')}
                className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-muted"
              >
                Export PDFs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Claims Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedClaims.length === filteredClaims.length && filteredClaims.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedClaims(filteredClaims.map(c => c.id));
                      } else {
                        setSelectedClaims([]);
                      }
                    }}
                    className="rounded border-border"
                  />
                </th>
                <th className="text-left px-4 py-3">Claim</th>
                <th className="text-left px-4 py-3">Patient</th>
                <th className="text-left px-4 py-3">Provider</th>
                <th className="text-left px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Submitted</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={8} className="py-16 text-center">
                  <Loader2 className="size-6 text-orange-500 animate-spin mx-auto" />
                </td></tr>
              ) : filteredClaims.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center">
                  <ShieldCheck className="size-10 text-muted mx-auto mb-2" />
                  <p className="text-muted-foreground font-medium">No insurance claims found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {search || statusFilter !== "all" || providerFilter !== "all" || dateFilter !== "all"
                      ? "Try adjusting your filters"
                      : "Create the first claim to start tracking insurer collections"}
                  </p>
                  {!search && statusFilter === "all" && providerFilter === "all" && dateFilter === "all" && (
                    <Link
                      href={tenantPath("/accountant/insurance-claims/new")}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white"
                    >
                      <Plus className="size-4" />
                      New Claim
                    </Link>
                  )}
                </td></tr>
              ) : (
                filteredClaims.map(claim => (
                  <tr key={claim.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedClaims.includes(claim.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedClaims([...selectedClaims, claim.id]);
                          } else {
                            setSelectedClaims(selectedClaims.filter(id => id !== claim.id));
                          }
                        }}
                        className="rounded border-border"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground border border-border">
                          <ShieldCheck className="size-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground font-mono">#{claim.id}</p>
                          <p className="text-xs text-muted-foreground">
                            Policy: {claim.policyNumber}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{claim.patientName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-foreground">{claim.insuranceProvider}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-lg font-semibold text-foreground">
                          ${claim.claimAmount.toFixed(2)}
                        </p>
                        {claim.approvedAmount && (
                          <p className="text-xs text-green-600">
                            Approved: ${claim.approvedAmount.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(claim.status)}`}>
                        {getStatusIcon(claim.status)}
                        {claim.status.split('_').map(word =>
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-foreground">
                        {new Date(claim.submittedAt).toLocaleDateString()}
                      </p>
                      {claim.processedAt && (
                        <p className="text-xs text-muted-foreground">
                          Processed: {new Date(claim.processedAt).toLocaleDateString()}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={tenantPath(`/accountant/insurance-claims/${claim.id}`)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 font-medium text-xs transition-colors"
                        >
                          <Eye className="size-3" />
                          View
                        </Link>
                        <Link
                          href={tenantPath(`/accountant/insurance-claims/${claim.id}/edit`)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-50 font-medium text-xs transition-colors"
                        >
                          <Edit className="size-3" />
                          Edit
                        </Link>
                        {claim.status === 'denied' && (
                          <button
                            onClick={() => {
                              setAppealTarget(claim);
                              setAppealReason(claim.denialReason ? `Reconsider denial: ${claim.denialReason}` : "");
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-orange-600 hover:bg-orange-50 font-medium text-xs transition-colors"
                          >
                            <TrendingUp className="size-3" />
                            Appeal
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {appealTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Submit Appeal</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Appeal denied claim for {appealTarget.patientName}.
                </p>
              </div>
              <button
                onClick={() => {
                  setAppealTarget(null);
                  setAppealReason("");
                }}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-background/60 p-3 text-sm">
                <p className="font-medium text-foreground">Claim #{appealTarget.id}</p>
                <p className="text-muted-foreground">Provider: {appealTarget.insuranceProvider}</p>
              </div>
              <label className="block text-sm font-medium text-foreground">
                Appeal reason
                <textarea
                  value={appealReason}
                  onChange={(event) => setAppealReason(event.target.value)}
                  rows={5}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
                  placeholder="Describe the justification, supporting corrections, or missing documentation."
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setAppealTarget(null);
                  setAppealReason("");
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => submitAppeal()}
                disabled={submittingAppeal}
                className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submittingAppeal && <Loader2 className="size-4 animate-spin" />}
                Submit Appeal
              </button>
            </div>
          </div>
        </div>
      )}

      {activeProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{activeProvider.name} Performance</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Claim outcomes, throughput, and recent submissions for this insurer.
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveProvider(null);
                  setProviderDetail(null);
                }}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            {loadingProviderDetail ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="size-6 animate-spin text-orange-500" />
              </div>
            ) : providerDetail ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <MetricTile label="Claims" value={String(providerDetail.totalClaims)} />
                  <MetricTile label="Approved" value={String(providerDetail.approvedClaims)} />
                  <MetricTile label="Denied" value={String(providerDetail.deniedClaims)} />
                  <MetricTile label="Pending" value={String(providerDetail.pendingClaims)} />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <MetricTile label="Total Claimed" value={`$${providerDetail.totalClaimed.toFixed(2)}`} />
                  <MetricTile label="Total Approved" value={`$${providerDetail.totalApproved.toFixed(2)}`} />
                  <MetricTile label="Avg Processing" value={`${providerDetail.averageProcessingDays} days`} />
                </div>

                <div className="rounded-xl border border-border">
                  <div className="border-b border-border px-4 py-3">
                    <p className="font-medium text-foreground">Recent Claims</p>
                  </div>
                  <div className="divide-y divide-border">
                    {providerDetail.recentClaims.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No claims recorded for this insurer yet.
                      </div>
                    ) : providerDetail.recentClaims.map((claim) => (
                      <div key={claim.id} className="flex items-center justify-between gap-4 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{claim.patientName}</p>
                          <p className="text-xs text-muted-foreground">Policy {claim.policyNumber}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">${claim.claimAmount.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">{new Date(claim.submittedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setProviderFilter(activeProvider.name);
                      setActiveProvider(null);
                    }}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                  >
                    Filter Table By Provider
                  </button>
                  <button
                    onClick={() => {
                      setActiveProvider(null);
                      setProviderDetail(null);
                    }}
                    className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">No detail available for this provider.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
