"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  DollarSign, Search, Plus, CreditCard, AlertCircle,
  CheckCircle, Loader2, Settings, Clock, TrendingUp, Calendar,
  FileText, PieChart, BarChart3, Download, Filter, Eye, Edit,
  MoreHorizontal, ChevronDown, ArrowUpDown, Receipt, Banknote,
  Wallet, TrendingDown, RefreshCw, X
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useTenantPath } from "@/hooks/useTenantPath";
import { exportElementAsPdf, exportElementAsPng } from "@/lib/export/page-export";

const orange = "#F97316";

interface Payment {
  id: string;
  invoiceId: string;
  patientId: string;
  patientName: string;
  amount: number;
  method: "credit_card" | "bank_transfer" | "cash" | "insurance" | "check";
  status: "pending" | "completed" | "failed" | "refunded";
  transactionId?: string;
  processedAt?: string;
  createdAt: string;
  notes?: string;
  fee?: number;
  refundAmount?: number;
}

interface PaymentStats {
  totalPayments: number;
  completedPayments: number;
  pendingPayments: number;
  failedPayments: number;
  totalAmount: number;
  averagePayment: number;
  monthlyRevenue: number;
  refundTotal: number;
}

interface PaymentMethodStats {
  method: string;
  count: number;
  amount: number;
  percentage: number;
}

interface PaymentMethodDetail {
  method: string;
  totalCount: number;
  completedCount: number;
  pendingCount: number;
  failedCount: number;
  refundedCount: number;
  totalAmount: number;
  averageAmount: number;
  totalFees: number;
  refundTotal: number;
  recentPayments: Array<{
    id: string;
    invoiceId: string;
    patientName: string;
    amount: number;
    status: Payment["status"];
    transactionId?: string | null;
    createdAt: string;
    processedAt?: string | null;
  }>;
}

export default function AccountantPaymentsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const tenantPath = useTenantPath();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [methodStats, setMethodStats] = useState<PaymentMethodStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [activeMethod, setActiveMethod] = useState<string | null>(null);
  const [methodDetail, setMethodDetail] = useState<PaymentMethodDetail | null>(null);
  const [loadingMethodDetail, setLoadingMethodDetail] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchPayments();
  }, [slug]);

  const fetchPayments = async () => {
    setLoading((current) => current && !refreshing);
    setRefreshing(true);
    setErrorMessage(null);
    try {
      const [paymentsRes, statsRes, methodsRes] = await Promise.all([
        fetch(`/api/tenant/${slug}/accountant/payments`),
        fetch(`/api/tenant/${slug}/accountant/payments/stats`),
        fetch(`/api/tenant/${slug}/accountant/payments/method-stats`)
      ]);

      if (paymentsRes.ok) setPayments(await paymentsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (methodsRes.ok) setMethodStats(await methodsRes.json());
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      setErrorMessage("Failed to load payments. Check the accountant payment endpoints and try again.");
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredPayments = payments
    .filter(payment => {
      const matchesSearch = payment.patientName.toLowerCase().includes(search.toLowerCase()) ||
                           payment.id.toLowerCase().includes(search.toLowerCase()) ||
                           payment.invoiceId.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
      const matchesMethod = methodFilter === "all" || payment.method === methodFilter;

      let matchesDate = true;
      if (dateFilter !== "all") {
        const paymentDate = new Date(payment.createdAt);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - paymentDate.getTime()) / (1000 * 3600 * 24));

        switch (dateFilter) {
          case "today": matchesDate = daysDiff === 0; break;
          case "week": matchesDate = daysDiff <= 7; break;
          case "month": matchesDate = daysDiff <= 30; break;
          case "quarter": matchesDate = daysDiff <= 90; break;
        }
      }

      return matchesSearch && matchesStatus && matchesMethod && matchesDate;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "amount": aValue = a.amount; bValue = b.amount; break;
        case "method": aValue = a.method; bValue = b.method; break;
        case "patientName": aValue = a.patientName; bValue = b.patientName; break;
        case "status": aValue = a.status; bValue = b.status; break;
        default: aValue = new Date(a.createdAt); bValue = new Date(b.createdAt);
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-50 text-green-700 border-green-200";
      case "pending": return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "failed": return "bg-red-50 text-red-700 border-red-200";
      case "refunded": return "bg-purple-50 text-purple-700 border-purple-200";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="size-3" />;
      case "pending": return <Clock className="size-3" />;
      case "failed": return <AlertCircle className="size-3" />;
      case "refunded": return <TrendingDown className="size-3" />;
      default: return null;
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case "credit_card": return <CreditCard className="size-4" />;
      case "bank_transfer": return <Wallet className="size-4" />;
      case "cash": return <Banknote className="size-4" />;
      case "insurance": return <Receipt className="size-4" />;
      case "check": return <FileText className="size-4" />;
      default: return <DollarSign className="size-4" />;
    }
  };

  const getMethodLabel = (method: string) => {
    return method.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const handleBulkAction = async (action: string) => {
    if (selectedPayments.length === 0) return;

    try {
      const res = await fetch(`/api/tenant/${slug}/accountant/payments/bulk-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, paymentIds: selectedPayments })
      });

      if (res.ok) {
        toast.success(`${action} applied to ${selectedPayments.length} payments`);
        fetchPayments();
        setSelectedPayments([]);
      } else {
        toast.error(`Failed to ${action} payments`);
      }
    } catch (error) {
      toast.error(`Failed to ${action} payments`);
    }
  };

  const processRefund = async () => {
    if (!refundTarget) return;
    const normalizedAmount = Number(refundAmount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      toast.error("Enter a valid refund amount");
      return;
    }
    setSubmittingRefund(true);
    try {
      const res = await fetch(`/api/tenant/${slug}/accountant/payments/${refundTarget.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: normalizedAmount })
      });

      if (res.ok) {
        toast.success("Refund processed successfully");
        setRefundTarget(null);
        setRefundAmount("");
        fetchPayments();
      } else {
        toast.error("Failed to process refund");
      }
    } catch (error) {
      toast.error("Failed to process refund");
    } finally {
      setSubmittingRefund(false);
    }
  };

  const retryFailedPayment = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/tenant/${slug}/accountant/payments/bulk-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry_failed', paymentIds: [paymentId] })
      });

      if (res.ok) {
        toast.success("Payment moved back to pending");
        fetchPayments();
      } else {
        toast.error("Failed to retry payment");
      }
    } catch (error) {
      toast.error("Failed to retry payment");
    }
  };

  const openMethodDetail = async (method: string) => {
    setActiveMethod(method);
    setMethodDetail(null);
    setLoadingMethodDetail(true);
    try {
      const response = await fetch(`/api/tenant/${slug}/accountant/payments/method-stats/${encodeURIComponent(method)}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load payment method detail");
      }
      setMethodDetail(payload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load payment method detail");
    } finally {
      setLoadingMethodDetail(false);
    }
  };

  const exportPayments = async (format: "csv" | "pdf" | "png") => {
    try {
      if (format === "csv") {
        const res = await fetch(`/api/tenant/${slug}/accountant/payments/export?format=${format}&ids=${selectedPayments.join(",")}`);
        if (!res.ok) throw new Error("Failed to export payments");
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "payments.csv";
        a.click();
      } else {
        if (!exportRef.current) throw new Error("Nothing to export");
        const filename = `payments-${selectedPayments.length ? "selected" : "all"}.${format}`;
        if (format === "pdf") {
          await exportElementAsPdf(exportRef.current, filename);
        } else {
          await exportElementAsPng(exportRef.current, filename);
        }
      }
      toast.success(`Exported payments as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error("Failed to export payments");
    }
  };

  return (
    <div ref={exportRef} className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Accountant Dashboard</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Payment Processing</h1>
          <p className="text-sm text-muted-foreground mt-1">Track and manage all payment transactions.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchPayments()}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => exportPayments("pdf")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all"
          >
            <Download className="size-4" />
            Export PDF
          </button>
          <button
            onClick={() => exportPayments("png")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all"
          >
            <Eye className="size-4" />
            Export PNG
          </button>
          <button
            onClick={() => exportPayments("csv")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all"
          >
            <FileText className="size-4" />
            Export CSV
          </button>
          <Link
            href={tenantPath("/accountant/payments/new")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90"
            style={{ backgroundColor: orange }}
          >
            <Plus className="size-4" />
            Record Payment
          </Link>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Payment Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Payments</p>
              <p className="text-2xl font-bold text-foreground">
                {stats?.totalPayments || 0}
              </p>
            </div>
            <div className="size-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <DollarSign className="size-6" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Completed</p>
              <p className="text-2xl font-bold text-foreground">
                {stats?.completedPayments || 0}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {stats?.totalPayments ? Math.round((stats.completedPayments / stats.totalPayments) * 100) : 0}% success rate
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
              <p className="text-sm text-muted-foreground font-medium">Total Revenue</p>
              <p className="text-2xl font-bold text-foreground">
                ${stats?.totalAmount?.toLocaleString() || '0'}
              </p>
              <p className="text-xs text-blue-600 mt-1">This month</p>
            </div>
            <div className="size-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <TrendingUp className="size-6" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Failed Payments</p>
              <p className="text-2xl font-bold text-foreground">
                {stats?.failedPayments || 0}
              </p>
              <p className="text-xs text-red-600 mt-1">Require attention</p>
            </div>
            <div className="size-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
              <AlertCircle className="size-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods Breakdown */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Payment Methods</h3>
          <BarChart3 className="size-5 text-muted-foreground" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {methodStats.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No processed payment method mix yet.
            </div>
          ) : methodStats.map(method => (
            <button
              key={method.method}
              type="button"
              onClick={() => openMethodDetail(method.method)}
              className="rounded-xl border border-border px-3 py-4 text-center transition hover:border-orange-300 hover:bg-orange-500/5"
            >
              <div className="flex items-center justify-center mb-2">
                {getMethodIcon(method.method)}
              </div>
              <p className="text-sm font-medium text-foreground">{getMethodLabel(method.method)}</p>
              <p className="text-lg font-bold text-foreground">${method.amount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{method.count} transactions</p>
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div
                  className="bg-orange-500 h-2 rounded-full"
                  style={{ width: `${method.percentage}%` }}
                ></div>
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
              placeholder="Search by patient name, payment ID, or invoice ID..."
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
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>

            <select
              value={methodFilter}
              onChange={e => setMethodFilter(e.target.value)}
              className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
            >
              <option value="all">All Methods</option>
              <option value="credit_card">Credit Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="insurance">Insurance</option>
              <option value="check">Check</option>
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
              <option value="createdAt">Date</option>
              <option value="amount">Amount</option>
              <option value="method">Method</option>
              <option value="patientName">Patient</option>
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
      {selectedPayments.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-blue-800">
              {selectedPayments.length} payment{selectedPayments.length !== 1 ? 's' : ''} selected
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction('retry_failed')}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                Retry Failed
              </button>
              <button
                onClick={() => exportPayments('pdf')}
                className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-muted"
              >
                Export Receipts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payments Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedPayments.length === filteredPayments.length && filteredPayments.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPayments(filteredPayments.map(p => p.id));
                      } else {
                        setSelectedPayments([]);
                      }
                    }}
                    className="rounded border-border"
                  />
                </th>
                <th className="text-left px-4 py-3">Payment</th>
                <th className="text-left px-4 py-3">Patient</th>
                <th className="text-left px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Method</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={8} className="py-16 text-center">
                  <Loader2 className="size-6 text-orange-500 animate-spin mx-auto" />
                </td></tr>
              ) : filteredPayments.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center">
                  <DollarSign className="size-10 text-muted mx-auto mb-2" />
                  <p className="text-muted-foreground font-medium">No payments found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {search || statusFilter !== "all" || methodFilter !== "all" || dateFilter !== "all"
                      ? "Try adjusting your filters"
                      : "Record the first payment to start your ledger"}
                  </p>
                  {!search && statusFilter === "all" && methodFilter === "all" && dateFilter === "all" && (
                    <Link
                      href={tenantPath("/accountant/payments/new")}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white"
                    >
                      <Plus className="size-4" />
                      Record Payment
                    </Link>
                  )}
                </td></tr>
              ) : (
                filteredPayments.map(payment => (
                  <tr key={payment.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedPayments.includes(payment.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPayments([...selectedPayments, payment.id]);
                          } else {
                            setSelectedPayments(selectedPayments.filter(id => id !== payment.id));
                          }
                        }}
                        className="rounded border-border"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground border border-border">
                          <DollarSign className="size-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground font-mono">#{payment.id}</p>
                          <p className="text-xs text-muted-foreground">
                            Invoice #{payment.invoiceId}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{payment.patientName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-lg font-semibold text-foreground">
                          ${payment.amount.toFixed(2)}
                        </p>
                        {payment.fee && (
                          <p className="text-xs text-muted-foreground">
                            Fee: ${payment.fee.toFixed(2)}
                          </p>
                        )}
                        {payment.refundAmount && (
                          <p className="text-xs text-red-600">
                            Refunded: ${payment.refundAmount.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getMethodIcon(payment.method)}
                        <span className="text-sm text-foreground">
                          {getMethodLabel(payment.method)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(payment.status)}`}>
                        {getStatusIcon(payment.status)}
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-foreground">
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </p>
                      {payment.processedAt && (
                        <p className="text-xs text-muted-foreground">
                          Processed: {new Date(payment.processedAt).toLocaleTimeString()}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={tenantPath(`/accountant/payments/${payment.id}`)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 font-medium text-xs transition-colors"
                        >
                          <Eye className="size-3" />
                          View
                        </Link>
                        {payment.status === 'completed' && (
                          <button
                            onClick={() => {
                              setRefundTarget(payment);
                              setRefundAmount(payment.amount.toFixed(2));
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 font-medium text-xs transition-colors"
                          >
                            <TrendingDown className="size-3" />
                            Refund
                          </button>
                        )}
                        {payment.status === 'failed' && (
                          <button
                            onClick={() => retryFailedPayment(payment.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-50 font-medium text-xs transition-colors"
                          >
                            <CheckCircle className="size-3" />
                            Retry
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

      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Process Refund</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Refund payment for {refundTarget.patientName}.
                </p>
              </div>
              <button
                onClick={() => {
                  setRefundTarget(null);
                  setRefundAmount("");
                }}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-background/60 p-3 text-sm">
                <p className="font-medium text-foreground">Payment #{refundTarget.id}</p>
                <p className="text-muted-foreground">Original amount: ${refundTarget.amount.toFixed(2)}</p>
              </div>
              <label className="block text-sm font-medium text-foreground">
                Refund amount
                <input
                  value={refundAmount}
                  onChange={(event) => setRefundAmount(event.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setRefundTarget(null);
                  setRefundAmount("");
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => processRefund()}
                disabled={submittingRefund}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submittingRefund && <Loader2 className="size-4 animate-spin" />}
                Confirm Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {activeMethod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{getMethodLabel(activeMethod)} Details</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Payment-method performance and recent transactions.
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveMethod(null);
                  setMethodDetail(null);
                }}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            {loadingMethodDetail ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="size-6 animate-spin text-orange-500" />
              </div>
            ) : methodDetail ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <MetricTile label="Transactions" value={String(methodDetail.totalCount)} />
                  <MetricTile label="Completed" value={String(methodDetail.completedCount)} />
                  <MetricTile label="Average" value={`$${methodDetail.averageAmount.toFixed(2)}`} />
                  <MetricTile label="Fees" value={`$${methodDetail.totalFees.toFixed(2)}`} />
                </div>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <MetricTile label="Pending" value={String(methodDetail.pendingCount)} />
                  <MetricTile label="Failed" value={String(methodDetail.failedCount)} />
                  <MetricTile label="Refunded" value={String(methodDetail.refundedCount)} />
                  <MetricTile label="Refund Total" value={`$${methodDetail.refundTotal.toFixed(2)}`} />
                </div>

                <div className="rounded-xl border border-border">
                  <div className="border-b border-border px-4 py-3">
                    <p className="font-medium text-foreground">Recent Transactions</p>
                  </div>
                  <div className="divide-y divide-border">
                    {methodDetail.recentPayments.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No transactions recorded for this payment method yet.
                      </div>
                    ) : methodDetail.recentPayments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between gap-4 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{payment.patientName}</p>
                          <p className="text-xs text-muted-foreground">Invoice #{payment.invoiceId}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">${payment.amount.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">{new Date(payment.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setMethodFilter(activeMethod);
                      setActiveMethod(null);
                    }}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                  >
                    Filter Table By Method
                  </button>
                  <button
                    onClick={() => {
                      setActiveMethod(null);
                      setMethodDetail(null);
                    }}
                    className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">No detail available for this method.</div>
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
