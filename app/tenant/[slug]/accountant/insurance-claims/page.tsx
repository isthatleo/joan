"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ShieldCheck, Search, Plus, AlertCircle, CheckCircle, Loader2,
  Clock, FileText, TrendingUp, Calendar, Download, Filter, Eye,
  Edit, MoreHorizontal, ChevronDown, ArrowUpDown, Receipt,
  DollarSign, Building2, User, Phone, Mail
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useTenantPath } from "@/hooks/useTenantPath";

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

export default function AccountantInsuranceClaimsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const tenantPath = useTenantPath();
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [stats, setStats] = useState<ClaimStats | null>(null);
  const [providers, setProviders] = useState<InsuranceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("submittedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedClaims, setSelectedClaims] = useState<string[]>([]);

  useEffect(() => {
    fetchClaims();
  }, [slug]);

  const fetchClaims = async () => {
    setLoading(true);
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
      toast.error("Failed to load insurance claims");
    } finally {
      setLoading(false);
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

  const submitAppeal = async (claimId: string) => {
    const reason = prompt("Enter appeal reason:");
    if (!reason) return;

    try {
      const res = await fetch(`/api/tenant/${slug}/accountant/insurance-claims/${claimId}/appeal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      if (res.ok) {
        toast.success("Appeal submitted successfully");
        fetchClaims();
      } else {
        toast.error("Failed to submit appeal");
      }
    } catch (error) {
      toast.error("Failed to submit appeal");
    }
  };

  const exportClaims = async (format: 'csv' | 'pdf') => {
    try {
      const res = await fetch(`/api/tenant/${slug}/accountant/insurance-claims/export?format=${format}&ids=${selectedClaims.join(',')}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `insurance-claims.${format}`;
        a.click();
        toast.success(`Exported ${selectedClaims.length} claims`);
      }
    } catch (error) {
      toast.error("Failed to export claims");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Accountant Dashboard</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Insurance Claims</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and track insurance claim submissions and approvals.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportClaims('csv')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all"
          >
            <Download className="size-4" />
            Export
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
          {providers.slice(0, 6).map(provider => (
            <div key={provider.id} className="p-4 border border-border rounded-lg">
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
                  ></div>
                </div>
              </div>
            </div>
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
                  <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
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
                            onClick={() => submitAppeal(claim.id)}
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
    </div>
  );
}
