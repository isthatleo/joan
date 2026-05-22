"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Receipt, Plus, Search, Filter, Eye, Edit, CheckCircle,
  XCircle, Clock, AlertTriangle, DollarSign, FileText,
  User, Calendar, Loader2, TrendingUp, TrendingDown
} from "lucide-react";

const orange = "#F97316";

interface InsuranceClaim {
  id: string;
  claimNumber: string;
  patient: {
    id: string;
    name: string;
    insuranceNumber: string;
    provider: string;
  };
  service: {
    type: string;
    description: string;
    dateOfService: string;
    billedAmount: number;
    claimedAmount: number;
  };
  status: "pending" | "submitted" | "approved" | "denied" | "paid" | "appealed";
  submittedAt: string;
  processedAt?: string;
  approvedAmount?: number;
  denialReason?: string;
  payerResponse?: string;
  followUpDate?: string;
  createdBy: {
    id: string;
    name: string;
    role: string;
  };
}

export default function InsuranceClaimsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "approved" | "denied">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchClaims();
  }, [activeTab]);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/${slug}/insurance-claims?status=${activeTab}`);
      if (res.ok) {
        setClaims(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch insurance claims:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "all", label: "All Claims", icon: Receipt },
    { id: "pending", label: "Pending", icon: Clock, count: claims.filter(c => c.status === 'pending' || c.status === 'submitted').length },
    { id: "approved", label: "Approved", icon: CheckCircle, count: claims.filter(c => c.status === 'approved' || c.status === 'paid').length },
    { id: "denied", label: "Denied", icon: XCircle, count: claims.filter(c => c.status === 'denied').length }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "text-green-600 bg-green-50";
      case "approved": return "text-blue-600 bg-blue-50";
      case "submitted": return "text-yellow-600 bg-yellow-50";
      case "pending": return "text-orange-600 bg-orange-50";
      case "denied": return "text-red-600 bg-red-50";
      case "appealed": return "text-purple-600 bg-purple-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid": return <CheckCircle className="size-4 text-green-600" />;
      case "approved": return <CheckCircle className="size-4 text-blue-600" />;
      case "submitted": return <Clock className="size-4 text-yellow-600" />;
      case "pending": return <Clock className="size-4 text-orange-600" />;
      case "denied": return <XCircle className="size-4 text-red-600" />;
      case "appealed": return <AlertTriangle className="size-4 text-purple-600" />;
      default: return <Receipt className="size-4 text-gray-600" />;
    }
  };

  const filteredClaims = claims.filter(claim =>
    claim.claimNumber.toLowerCase().includes(search.toLowerCase()) ||
    claim.patient.name.toLowerCase().includes(search.toLowerCase()) ||
    claim.patient.provider.toLowerCase().includes(search.toLowerCase())
  );

  const totalBilled = claims.reduce((sum, claim) => sum + claim.service.billedAmount, 0);
  const totalApproved = claims.reduce((sum, claim) => sum + (claim.approvedAmount || 0), 0);
  const approvalRate = claims.length > 0 ? Math.round((claims.filter(c => c.status === 'approved' || c.status === 'paid').length / claims.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Finance</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Insurance Claims</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage insurance claims, track approvals, and monitor reimbursements.</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all">
            <Filter className="size-4" />
            Filter
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90" style={{ backgroundColor: orange }}>
            <Plus className="size-4" />
            New Claim
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Claims</p>
              <p className="text-2xl font-bold text-foreground">{claims.length}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">All submitted claims</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Approval Rate</p>
              <p className="text-2xl font-bold text-foreground">{approvalRate}%</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Claims approved</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <DollarSign className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Billed</p>
              <p className="text-2xl font-bold text-foreground">${totalBilled.toLocaleString()}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Amount claimed</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <CheckCircle className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Approved</p>
              <p className="text-2xl font-bold text-foreground">${totalApproved.toLocaleString()}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Amount reimbursed</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
        <input
          type="text"
          placeholder="Search claims..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="size-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full text-xs font-semibold">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 text-orange-500 animate-spin mx-auto" />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Claim</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredClaims.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-muted-foreground">
                      <Receipt className="size-12 mx-auto mb-4 opacity-50" />
                      <p>No insurance claims found</p>
                      <p className="text-sm">Submit your first claim to get started</p>
                    </td>
                  </tr>
                ) : (
                  filteredClaims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-foreground">{claim.claimNumber}</p>
                          <p className="text-sm text-muted-foreground">{claim.patient.provider}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold text-sm">
                            {claim.patient.name.split(" ").map(n => n[0]).join("")}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{claim.patient.name}</p>
                            <p className="text-sm text-muted-foreground">{claim.patient.insuranceNumber}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-foreground">{claim.service.type}</p>
                          <p className="text-sm text-muted-foreground">{claim.service.description}</p>
                          <p className="text-xs text-muted-foreground">{new Date(claim.service.dateOfService).toLocaleDateString()}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-foreground">${claim.service.billedAmount.toLocaleString()}</p>
                          {claim.approvedAmount && (
                            <p className="text-sm text-green-600">Approved: ${claim.approvedAmount.toLocaleString()}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(claim.status)}
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(claim.status)}`}>
                            {claim.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm text-foreground">{new Date(claim.submittedAt).toLocaleDateString()}</p>
                          {claim.processedAt && (
                            <p className="text-xs text-muted-foreground">Processed: {new Date(claim.processedAt).toLocaleDateString()}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button className="size-8 rounded-lg hover:bg-muted flex items-center justify-center">
                            <Eye className="size-4" />
                          </button>
                          <button className="size-8 rounded-lg hover:bg-muted flex items-center justify-center">
                            <Edit className="size-4" />
                          </button>
                          {claim.status === 'denied' && (
                            <button className="size-8 rounded-lg hover:bg-red-50 hover:text-red-600 flex items-center justify-center">
                              <AlertTriangle className="size-4" />
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
      )}
    </div>
  );
}
