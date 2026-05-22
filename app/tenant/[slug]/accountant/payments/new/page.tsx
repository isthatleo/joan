"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  DollarSign, Search, ArrowLeft, Save, Loader2, AlertCircle,
  CheckCircle, CreditCard, Banknote, Wallet, FileText, Building2
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useTenantPath } from "@/hooks/useTenantPath";

const orange = "#F97316";

interface Invoice {
  id: string;
  invoiceNumber?: string;
  patientName: string;
  patientId: string;
  amount?: number;
  totalAmount?: number;
  amountDue?: number;
  status: string;
  dueDate?: string;
}

export default function RecordPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const tenantPath = useTenantPath();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    invoiceId: "",
    amount: "",
    method: "credit_card" as const,
    transactionId: "",
    notes: "",
    fee: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchInvoices();
  }, [slug]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/${slug}/accountant/billing/invoices`);
      if (res.ok) {
        const data = await res.json();
        // Filter to show only pending or partially paid invoices
        const pendingInvoices = (data.invoices || data || []).filter(
          (inv: Invoice) => inv.status !== "paid"
        );
        setInvoices(pendingInvoices);
      } else {
        toast.error("Failed to load invoices");
      }
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.invoiceId) newErrors.invoiceId = "Invoice is required";
    if (!formData.amount) newErrors.amount = "Amount is required";
    if (parseFloat(formData.amount) <= 0) newErrors.amount = "Amount must be greater than 0";

    const selectedInvoice = invoices.find((inv) => inv.id === formData.invoiceId);
    if (selectedInvoice) {
      const amountDue = selectedInvoice.amountDue || selectedInvoice.amount || 0;
      if (parseFloat(formData.amount) > amountDue) {
        newErrors.amount = `Amount cannot exceed invoice balance (${amountDue})`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/tenant/${slug}/accountant/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: formData.invoiceId,
          amount: parseFloat(formData.amount),
          method: formData.method,
          transactionId: formData.transactionId,
          notes: formData.notes,
          fee: formData.fee ? parseFloat(formData.fee) : undefined,
          status: "pending",
        }),
      });

      if (res.ok) {
        const payment = await res.json();
        toast.success("Payment recorded successfully");
        router.push(tenantPath("/accountant/payments"));
      } else {
        const error = await res.json();
        toast.error(error.message || "Failed to record payment");
      }
    } catch (error) {
      console.error("Error recording payment:", error);
      toast.error("Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedInvoice = invoices.find((inv) => inv.id === formData.invoiceId);
  const amountDue = selectedInvoice
    ? selectedInvoice.amountDue || selectedInvoice.totalAmount || selectedInvoice.amount || 0
    : 0;

  const filteredInvoices = invoices.filter((invoice) =>
    searchTerm === ""
      ? true
      : invoice.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading invoices...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href={tenantPath("/accountant/payments")}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="size-5 text-muted-foreground" />
          </Link>
          <div>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Record Payment
            </p>
            <h1 className="text-3xl font-bold text-foreground mt-1">New Payment</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Record a payment for an invoice.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Selection */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="size-5" />
              Select Invoice
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Search Invoice <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by patient name or invoice ID..."
                    className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
                  />
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredInvoices.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <FileText className="size-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No pending invoices found</p>
                  </div>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <label
                      key={invoice.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        formData.invoiceId === invoice.id
                          ? "border-orange-500 bg-orange-50"
                          : "border-border hover:border-orange-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="invoiceId"
                          value={invoice.id}
                          checked={formData.invoiceId === invoice.id}
                          onChange={handleInputChange}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground">
                            {invoice.patientName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Invoice #{invoice.invoiceNumber || invoice.id}
                          </p>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-sm font-medium text-foreground">
                              ${(invoice.amountDue || invoice.totalAmount || invoice.amount || 0).toFixed(2)}
                            </span>
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                                invoice.status === "paid"
                                  ? "bg-green-50 text-green-700"
                                  : "bg-yellow-50 text-yellow-700"
                              }`}
                            >
                              {invoice.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>

              {errors.invoiceId && (
                <p className="text-xs text-red-500">{errors.invoiceId}</p>
              )}
            </div>
          </div>

          {/* Payment Details */}
          {selectedInvoice && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <DollarSign className="size-5" />
                Payment Details
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Amount Due
                    </label>
                    <div className="h-10 px-3 rounded-lg border border-border bg-muted flex items-center">
                      <span className="text-sm font-semibold text-foreground">
                        ${amountDue.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Payment Amount <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        max={amountDue}
                        className={`w-full h-10 pl-6 pr-3 rounded-lg border bg-background text-sm focus:outline-none focus:border-orange-300 ${
                          errors.amount ? "border-red-500" : "border-border"
                        }`}
                      />
                    </div>
                    {errors.amount && (
                      <p className="text-xs text-red-500 mt-1">{errors.amount}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="method"
                    value={formData.method}
                    onChange={handleInputChange}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
                  >
                    <option value="credit_card">Credit Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="insurance">Insurance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Transaction ID / Reference Number
                  </label>
                  <input
                    type="text"
                    name="transactionId"
                    value={formData.transactionId}
                    onChange={handleInputChange}
                    placeholder="e.g., TXN123456..."
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Processing Fee (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <input
                      type="number"
                      name="fee"
                      value={formData.fee}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full h-10 pl-6 pr-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Add any additional notes about this payment..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary */}
          {selectedInvoice && (
            <div className="bg-card border border-border rounded-xl p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Payment Summary</h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Amount Due</span>
                  <span className="text-sm font-medium text-foreground">
                    ${amountDue.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Payment Amount</span>
                  <span className="text-sm font-medium text-foreground">
                    ${formData.amount ? parseFloat(formData.amount).toFixed(2) : "0.00"}
                  </span>
                </div>

                {formData.fee && parseFloat(formData.fee) > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Processing Fee</span>
                    <span className="text-sm font-medium text-foreground">
                      ${parseFloat(formData.fee).toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="border-t border-border pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-foreground">Total</span>
                    <span
                      className="text-2xl font-bold"
                      style={{ color: orange }}
                    >
                      ${(
                        (parseFloat(formData.amount) || 0) +
                        (parseFloat(formData.fee) || 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>

                {parseFloat(formData.amount) < amountDue && formData.amount && (
                  <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-xs text-yellow-800 font-medium">
                      Partial payment: ${(amountDue - parseFloat(formData.amount)).toFixed(2)} remaining
                    </p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || !selectedInvoice}
                className="w-full py-2.5 px-4 rounded-lg text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                style={{ backgroundColor: submitting ? "#ccc" : orange }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Recording...
                  </>
                ) : (
                  <>
                    <CheckCircle className="size-4" />
                    Record Payment
                  </>
                )}
              </button>

              <Link
                href={tenantPath("/accountant/payments")}
                className="w-full py-2 px-4 rounded-lg border border-border hover:bg-muted transition-colors flex items-center justify-center gap-2 text-sm font-medium text-foreground mt-2"
              >
                Cancel
              </Link>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex gap-3">
              <AlertCircle className="size-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">
                  Payment Processing
                </p>
                <p className="text-xs text-blue-700">
                  Payments will be recorded in the system. Ensure you have verified the transaction before submitting.
                </p>
              </div>
            </div>
          </div>

          {/* Payment Methods Legend */}
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">
              Payment Methods
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-foreground">
                <CreditCard className="size-4 text-blue-600" />
                <span>Credit Card</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground">
                <Wallet className="size-4 text-green-600" />
                <span>Bank Transfer</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground">
                <Banknote className="size-4 text-purple-600" />
                <span>Cash</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground">
                <FileText className="size-4 text-orange-600" />
                <span>Check</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground">
                <Building2 className="size-4 text-red-600" />
                <span>Insurance</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

