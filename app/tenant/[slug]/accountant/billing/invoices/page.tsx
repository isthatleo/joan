"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Receipt, Search, Plus, DollarSign, CreditCard, AlertCircle,
  CheckCircle, Loader2, Settings, Clock, TrendingUp, Calendar,
  FileText, PieChart, BarChart3, Download, Filter, Eye, Edit,
  MoreHorizontal, ChevronDown, ArrowUpDown, Mail, Printer
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const orange = "#F97316";

interface Invoice {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  totalAmount: number;
  status: "paid" | "pending" | "overdue" | "partial" | "sent" | "viewed";
  createdAt: string;
  dueDate: string;
  paidAmount?: number;
  paidDate?: string;
  services: Array<{
    id: string;
    description: string;
    amount: number;
    date: string;
    category: string;
  }>;
  notes?: string;
  paymentTerms: string;
}

interface InvoiceStats {
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  totalRevenue: number;
  averageInvoiceValue: number;
}

export default function AccountantInvoicesPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, [slug]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const [invoicesRes, statsRes] = await Promise.all([
        fetch(`/api/tenant/${slug}/accountant/billing/invoices`),
        fetch(`/api/tenant/${slug}/accountant/billing/invoices/stats`)
      ]);

      if (invoicesRes.ok) setInvoices(await invoicesRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices
    .filter(invoice => {
      const matchesSearch = invoice.patientName.toLowerCase().includes(search.toLowerCase()) ||
                           invoice.id.toLowerCase().includes(search.toLowerCase()) ||
                           invoice.patientEmail.toLowerCase().includes(search.toLowerCase());
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
      case "paid": return "bg-green-50 text-green-700 border-green-200";
      case "pending": return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "overdue": return "bg-red-50 text-red-700 border-red-200";
      case "partial": return "bg-blue-50 text-blue-700 border-blue-200";
      case "sent": return "bg-purple-50 text-purple-700 border-purple-200";
      case "viewed": return "bg-indigo-50 text-indigo-700 border-indigo-200";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid": return <CheckCircle className="size-3" />;
      case "pending": return <Clock className="size-3" />;
      case "overdue": return <AlertCircle className="size-3" />;
      case "partial": return <PieChart className="size-3" />;
      case "sent": return <Mail className="size-3" />;
      case "viewed": return <Eye className="size-3" />;
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
        fetchInvoices();
        setSelectedInvoices([]);
      } else {
        toast.error(`Failed to ${action} invoices`);
      }
    } catch (error) {
      toast.error(`Failed to ${action} invoices`);
    }
  };

  const sendInvoiceReminder = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/tenant/${slug}/accountant/billing/invoices/${invoiceId}/reminder`, {
        method: 'POST'
      });

      if (res.ok) {
        toast.success("Reminder sent successfully");
      } else {
        toast.error("Failed to send reminder");
      }
    } catch (error) {
      toast.error("Failed to send reminder");
    }
  };

  const markAsPaid = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/tenant/${slug}/accountant/billing/invoices/${invoiceId}/mark-paid`, {
        method: 'POST'
      });

      if (res.ok) {
        toast.success("Invoice marked as paid");
        fetchInvoices();
      } else {
        toast.error("Failed to mark as paid");
      }
    } catch (error) {
      toast.error("Failed to mark as paid");
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
          <h1 className="text-3xl font-bold text-foreground mt-1">Invoice Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Create, track, and manage all patient invoices.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportInvoices('csv')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all"
          >
            <Download className="size-4" />
            Export
          </button>
          <Link
            href={`/tenant/${slug}/accountant/billing/invoices/new`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90"
            style={{ backgroundColor: orange }}
          >
            <Plus className="size-4" />
            New Invoice
          </Link>
        </div>
      </div>

      {/* Invoice Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Invoices</p>
              <p className="text-2xl font-bold text-foreground">
                {stats?.totalInvoices || 0}
              </p>
            </div>
            <div className="size-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Receipt className="size-6" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Paid Invoices</p>
              <p className="text-2xl font-bold text-foreground">
                {stats?.paidInvoices || 0}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {stats?.totalInvoices ? Math.round((stats.paidInvoices / stats.totalInvoices) * 100) : 0}% of total
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
              <p className="text-sm text-muted-foreground font-medium">Pending Payment</p>
              <p className="text-2xl font-bold text-foreground">
                {stats?.pendingInvoices || 0}
              </p>
              <p className="text-xs text-yellow-600 mt-1">Awaiting payment</p>
            </div>
            <div className="size-12 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600">
              <Clock className="size-6" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Overdue</p>
              <p className="text-2xl font-bold text-foreground">
                {stats?.overdueInvoices || 0}
              </p>
              <p className="text-xs text-red-600 mt-1">Require attention</p>
            </div>
            <div className="size-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
              <AlertCircle className="size-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Revenue Summary</h3>
            <TrendingUp className="size-5 text-green-600" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Revenue</span>
              <span className="text-lg font-bold text-foreground">
                ${stats?.totalRevenue?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Average Invoice</span>
              <span className="text-sm font-medium text-foreground">
                ${stats?.averageInvoiceValue?.toFixed(2) || '0.00'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
            <Settings className="size-5 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/tenant/${slug}/accountant/billing/invoices/new`}
              className="p-3 rounded-lg border border-border hover:bg-muted transition-colors text-center"
            >
              <Plus className="size-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs font-medium">New Invoice</p>
            </Link>
            <button
              onClick={() => exportInvoices('pdf')}
              className="p-3 rounded-lg border border-border hover:bg-muted transition-colors text-center"
            >
              <Printer className="size-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs font-medium">Print Batch</p>
            </button>
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
              placeholder="Search by patient name, email, or invoice ID..."
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
              <option value="sent">Sent</option>
              <option value="viewed">Viewed</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
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
      {selectedInvoices.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-blue-800">
              {selectedInvoices.length} invoice{selectedInvoices.length !== 1 ? 's' : ''} selected
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction('send_reminders')}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                Send Reminders
              </button>
              <button
                onClick={() => handleBulkAction('mark_paid')}
                className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"
              >
                Mark as Paid
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
                      <div>
                        <p className="font-semibold text-foreground">{invoice.patientName}</p>
                        <p className="text-xs text-muted-foreground">{invoice.patientEmail}</p>
                      </div>
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
                      {new Date(invoice.dueDate) < new Date() && invoice.status !== 'paid' && (
                        <p className="text-xs text-red-600 font-medium">Overdue</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/tenant/${slug}/accountant/billing/invoices/${invoice.id}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 font-medium text-xs transition-colors"
                        >
                          <Eye className="size-3" />
                          View
                        </Link>
                        <Link
                          href={`/tenant/${slug}/accountant/billing/invoices/${invoice.id}/edit`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-50 font-medium text-xs transition-colors"
                        >
                          <Edit className="size-3" />
                          Edit
                        </Link>
                        {invoice.status !== 'paid' && (
                          <>
                            <button
                              onClick={() => sendInvoiceReminder(invoice.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-purple-600 hover:bg-purple-50 font-medium text-xs transition-colors"
                            >
                              <Mail className="size-3" />
                              Remind
                            </button>
                            <button
                              onClick={() => markAsPaid(invoice.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-50 font-medium text-xs transition-colors"
                            >
                              <CheckCircle className="size-3" />
                              Mark Paid
                            </button>
                          </>
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
