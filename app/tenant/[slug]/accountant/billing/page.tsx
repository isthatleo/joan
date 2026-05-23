"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Wallet, Search, Plus, DollarSign, Receipt, CreditCard, AlertCircle,
  CheckCircle, Loader2, Settings, Clock, TrendingUp, Calendar,
  FileText, PieChart, BarChart3, Download, Filter, Eye, Edit,
  MoreHorizontal, ChevronDown, ArrowUpDown
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { withTenantPrefix } from "@/lib/tenant-routing";
import { useTenantPath } from "@/hooks/useTenantPath";

const orange = "#F97316";

interface Invoice {
  id: string;
  patientId: string;
  patientName: string;
  totalAmount: number;
  status: "paid" | "pending" | "overdue" | "partial";
  createdAt: string;
  dueDate: string;
  paidAmount?: number;
  services: Array<{
    description: string;
    amount: number;
    date: string;
  }>;
}

interface BillingMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  pendingInvoices: number;
  overdueInvoices: number;
  averageInvoiceValue: number;
  collectionRate: number;
}

interface PaymentMethod {
  id: string;
  name: string;
  enabled: boolean;
  fee?: number;
}

type InvoiceListPayload = Invoice[] | { invoices?: Invoice[] };

export default function AccountantBillingPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const tenantPath = useTenantPath();
  const hostname = typeof window !== "undefined" ? window.location.hostname : null;
  const createInvoiceHref = withTenantPrefix("/accountant/billing/invoices/new", slug, hostname);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [metrics, setMetrics] = useState<BillingMetrics | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  useEffect(() => {
    fetchBillingData();
  }, [slug]);

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const [invoicesRes, metricsRes, methodsRes] = await Promise.all([
        fetch(`/api/tenant/${slug}/accountant/billing/invoices`),
        fetch(`/api/tenant/${slug}/accountant/billing/metrics`),
        fetch(`/api/tenant/${slug}/accountant/payments/method-stats`)
      ]);

      if (invoicesRes.ok) {
        const payload = (await invoicesRes.json()) as InvoiceListPayload;
        setInvoices(Array.isArray(payload) ? payload : payload.invoices || []);
      }
      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (methodsRes.ok) {
        const payload = (await methodsRes.json()) as Array<{ method: string; count?: number; percentage?: number }>;
        const defaults: PaymentMethod[] = [
          { id: "credit_card", name: "Credit Card", enabled: false },
          { id: "bank_transfer", name: "Bank Transfer", enabled: false },
          { id: "cash", name: "Cash", enabled: false },
          { id: "insurance", name: "Insurance", enabled: false },
          { id: "mobile_money", name: "Mobile Money", enabled: false },
        ];
        const byMethod = new Map(payload.map((entry) => [entry.method, entry]));
        setPaymentMethods(
          defaults.map((method) => {
            const stats = byMethod.get(method.id);
            return {
              ...method,
              enabled: Boolean(stats && Number(stats.count || 0) > 0),
              fee: stats?.percentage,
            };
          })
        );
      }
    } catch (error) {
      console.error('Failed to fetch billing data:', error);
      toast.error("Failed to load billing data");
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices
    .filter(invoice => {
      const matchesSearch = invoice.patientName.toLowerCase().includes(search.toLowerCase()) ||
                           invoice.id.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;

      let matchesDate = true;
      if (dateFilter !== "all") {
        const invoiceDate = new Date(invoice.createdAt);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - invoiceDate.getTime()) / (1000 * 3600 * 24));

        switch (dateFilter) {
          case "today": matchesDate = daysDiff === 0; break;
          case "week": matchesDate = daysDiff <= 7; break;
          case "month": matchesDate = daysDiff <= 30; break;
          case "quarter": matchesDate = daysDiff <= 90; break;
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "amount": aValue = a.totalAmount; bValue = b.totalAmount; break;
        case "dueDate": aValue = new Date(a.dueDate); bValue = new Date(b.dueDate); break;
        case "patientName": aValue = a.patientName; bValue = b.patientName; break;
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
      case "paid": return "bg-green-50 text-green-700 border-green-200";
      case "pending": return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "overdue": return "bg-red-50 text-red-700 border-red-200";
      case "partial": return "bg-blue-50 text-blue-700 border-blue-200";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid": return <CheckCircle className="size-3" />;
      case "pending": return <Clock className="size-3" />;
      case "overdue": return <AlertCircle className="size-3" />;
      case "partial": return <PieChart className="size-3" />;
      default: return null;
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedInvoices.length === 0) return;

    try {
      const res = await fetch(`/api/tenant/${slug}/accountant/billing/invoices/bulk-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, invoiceIds: selectedInvoices })
      });

      if (res.ok) {
        toast.success(`${action} applied to ${selectedInvoices.length} invoices`);
        fetchBillingData();
        setSelectedInvoices([]);
      } else {
        toast.error(`Failed to ${action} invoices`);
      }
    } catch (error) {
      toast.error(`Failed to ${action} invoices`);
    }
  };

  const exportInvoices = async (format: 'csv' | 'pdf') => {
    try {
      const res = await fetch(`/api/tenant/${slug}/accountant/billing/invoices/export?format=${format}&ids=${selectedInvoices.join(',')}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoices.${format}`;
        a.click();
        toast.success(`Exported ${selectedInvoices.length} invoices`);
      }
    } catch (error) {
      toast.error("Failed to export invoices");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Accountant Dashboard</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Billing Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Comprehensive billing oversight and financial tracking.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportInvoices('csv')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all"
          >
            <Download className="size-4" />
            Export CSV
          </button>
          <Link
            href={createInvoiceHref}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90"
            style={{ backgroundColor: orange }}
          >
            <Plus className="size-4" />
            Create Invoice
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Revenue</p>
              <p className="text-2xl font-bold text-foreground">
                ${metrics?.totalRevenue?.toLocaleString() || '0'}
              </p>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <TrendingUp className="size-3" />
                ${metrics?.monthlyRevenue?.toLocaleString() || '0'} collected this month
              </p>
            </div>
            <div className="size-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
              <DollarSign className="size-6" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Pending Invoices</p>
              <p className="text-2xl font-bold text-foreground">
                {metrics?.pendingInvoices || 0}
              </p>
              <p className="text-xs text-yellow-600 mt-1">Requiring attention</p>
            </div>
            <div className="size-12 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600">
              <Clock className="size-6" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Collection Rate</p>
              <p className="text-2xl font-bold text-foreground">
                {metrics?.collectionRate || 0}%
              </p>
              <p className="text-xs text-blue-600 mt-1">Based on current collectible invoices</p>
            </div>
            <div className="size-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <BarChart3 className="size-6" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Avg Invoice Value</p>
              <p className="text-2xl font-bold text-foreground">
                ${metrics?.averageInvoiceValue?.toFixed(2) || '0.00'}
              </p>
              <p className="text-xs text-purple-600 mt-1">Per transaction</p>
            </div>
            <div className="size-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
              <Receipt className="size-6" />
            </div>
          </div>
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
              placeholder="Search by patient name or invoice ID..."
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
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="partial">Partial</option>
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
              <option value="createdAt">Date Created</option>
              <option value="dueDate">Due Date</option>
              <option value="amount">Amount</option>
              <option value="patientName">Patient Name</option>
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
      {selectedInvoices.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-blue-800">
              {selectedInvoices.length} invoice{selectedInvoices.length !== 1 ? 's' : ''} selected
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction('mark_paid')}
                className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"
              >
                Mark as Paid
              </button>
              <button
                onClick={() => handleBulkAction('send_reminder')}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                Send Reminder
              </button>
              <button
                onClick={() => exportInvoices('pdf')}
                className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-muted"
              >
                Export PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoices Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedInvoices.length === filteredInvoices.length && filteredInvoices.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedInvoices(filteredInvoices.map(i => i.id));
                      } else {
                        setSelectedInvoices([]);
                      }
                    }}
                    className="rounded border-border"
                  />
                </th>
                <th className="text-left px-4 py-3">Invoice</th>
                <th className="text-left px-4 py-3">Patient</th>
                <th className="text-left px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Due Date</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={7} className="py-16 text-center">
                  <Loader2 className="size-6 text-orange-500 animate-spin mx-auto" />
                </td></tr>
              ) : filteredInvoices.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center">
                  <Receipt className="size-10 text-muted mx-auto mb-2" />
                  <p className="text-muted-foreground font-medium">No invoices found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
                </td></tr>
              ) : (
                filteredInvoices.map(invoice => (
                  <tr key={invoice.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedInvoices.includes(invoice.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedInvoices([...selectedInvoices, invoice.id]);
                          } else {
                            setSelectedInvoices(selectedInvoices.filter(id => id !== invoice.id));
                          }
                        }}
                        className="rounded border-border"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground border border-border">
                          <Receipt className="size-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground font-mono">#{invoice.id}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(invoice.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{invoice.patientName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-lg font-semibold text-foreground">
                          ${invoice.totalAmount.toFixed(2)}
                        </p>
                        {invoice.paidAmount && invoice.paidAmount > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Paid: ${invoice.paidAmount.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(invoice.status)}`}>
                        {getStatusIcon(invoice.status)}
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-foreground">
                        {new Date(invoice.dueDate).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={tenantPath(`/accountant/billing/invoices/${invoice.id}`)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 font-medium text-xs transition-colors"
                        >
                          <Eye className="size-3" />
                          View
                        </Link>
                        <Link
                          href={tenantPath(`/accountant/billing/invoices/${invoice.id}/edit`)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-50 font-medium text-xs transition-colors"
                        >
                          <Edit className="size-3" />
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Methods Configuration */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Settings className="size-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">Payment Methods</h3>
          </div>
          <span className="text-sm text-muted-foreground">Managed by hospital admin</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {paymentMethods.map(method => (
            <div key={method.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
              <div className={`size-3 rounded-full ${method.enabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <div>
                <p className="text-sm font-medium">{method.name}</p>
                {method.fee && <p className="text-xs text-muted-foreground">{method.fee}% fee</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
