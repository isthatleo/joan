"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Plus, Trash2, DollarSign, User, Calendar, FileText,
  AlertCircle, CheckCircle, Loader2, ArrowLeft, Save
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useTenantPath } from "@/hooks/useTenantPath";

const orange = "#F97316";

interface Patient {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  mrn?: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  category: string;
}

export default function CreateInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const tenantPath = useTenantPath();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    patientId: "",
    dueDate: "",
    description: "",
    notes: "",
    paymentTerms: "Net 30",
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    { id: "1", description: "", quantity: 1, unitPrice: 0, category: "service" },
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPatients();
  }, [slug]);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/${slug}/patients`);
      if (res.ok) {
        const data = await res.json();
        setPatients(data || []);
      } else {
        toast.error("Failed to load patients");
      }
    } catch (error) {
      console.error("Failed to fetch patients:", error);
      toast.error("Failed to load patients");
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

  const handleItemChange = (id: string, field: string, value: any) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: field === "quantity" || field === "unitPrice" ? Number(value) : value } : item
      )
    );
  };

  const addItem = () => {
    const newId = Math.random().toString();
    setItems((prev) => [
      ...prev,
      { id: newId, description: "", quantity: 1, unitPrice: 0, category: "service" },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    } else {
      toast.error("At least one item is required");
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.patientId) newErrors.patientId = "Patient is required";
    if (!formData.dueDate) newErrors.dueDate = "Due date is required";

    const validItems = items.filter((item) => item.description.trim() !== "");
    if (validItems.length === 0) {
      newErrors.items = "At least one item with description is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateTotal = (): number => {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const validItems = items.filter((item) => item.description.trim() !== "");
      const totalAmount = calculateTotal();

      const res = await fetch(`/api/tenant/${slug}/accountant/billing/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: formData.patientId,
          amount: totalAmount,
          amountDue: totalAmount,
          dueDate: formData.dueDate,
          description: formData.description,
          notes: formData.notes,
          paymentTerms: formData.paymentTerms,
          items: validItems,
          status: "draft",
        }),
      });

      if (res.ok) {
        const invoice = await res.json();
        toast.success("Invoice created successfully");
        router.push(tenantPath(`/accountant/billing/invoices/${invoice.id}`));
      } else {
        const error = await res.json();
        toast.error(error.message || "Failed to create invoice");
      }
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast.error("Failed to create invoice");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading patients...
        </div>
      </div>
    );
  }

  const total = calculateTotal();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href={tenantPath("/accountant/billing/invoices")}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="size-5 text-muted-foreground" />
          </Link>
          <div>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Create Invoice
            </p>
            <h1 className="text-3xl font-bold text-foreground mt-1">New Invoice</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create a new invoice for a patient.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Selection */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <User className="size-5" />
              Patient Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Patient <span className="text-red-500">*</span>
                </label>
                <select
                  name="patientId"
                  value={formData.patientId}
                  onChange={handleInputChange}
                  className={`w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:border-orange-300 ${
                    errors.patientId ? "border-red-500" : "border-border"
                  }`}
                >
                  <option value="">Select a patient...</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.full_name} ({patient.mrn || "No MRN"})
                    </option>
                  ))}
                </select>
                {errors.patientId && (
                  <p className="text-xs text-red-500 mt-1">{errors.patientId}</p>
                )}
              </div>

              {formData.patientId && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  {(() => {
                    const patient = patients.find((p) => p.id === formData.patientId);
                    return patient ? (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-blue-900">{patient.full_name}</p>
                        <p className="text-xs text-blue-700">
                          {patient.email}
                          {patient.phone && ` • ${patient.phone}`}
                        </p>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Invoice Details */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="size-5" />
              Invoice Details
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Due Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleInputChange}
                    className={`w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:border-orange-300 ${
                      errors.dueDate ? "border-red-500" : "border-border"
                    }`}
                  />
                  {errors.dueDate && (
                    <p className="text-xs text-red-500 mt-1">{errors.dueDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Payment Terms
                  </label>
                  <select
                    name="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={handleInputChange}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
                  >
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 45">Net 45</option>
                    <option value="Due on receipt">Due on receipt</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Invoice description..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Additional notes or payment instructions..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
                />
              </div>
            </div>
          </div>

          {/* Invoice Items */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="size-5" />
              Invoice Items
            </h2>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id} className="p-4 border border-border rounded-lg space-y-3">
                  <div className="flex gap-2">
                    <span className="text-xs text-muted-foreground font-medium">{index + 1}</span>
                    <div className="flex-1 space-y-3">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                        placeholder="Item description..."
                        className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
                      />

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">
                            Quantity
                          </label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(item.id, "quantity", e.target.value)}
                            min="1"
                            className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">
                            Unit Price
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                              $
                            </span>
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(item.id, "unitPrice", e.target.value)}
                              min="0"
                              step="0.01"
                              className="w-full h-9 pl-6 pr-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">
                            Subtotal
                          </label>
                          <div className="h-9 px-3 rounded-lg border border-border bg-muted flex items-center">
                            <span className="text-sm font-semibold text-foreground">
                              ${(item.quantity * item.unitPrice).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <select
                        value={item.category}
                        onChange={(e) => handleItemChange(item.id, "category", e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
                      >
                        <option value="service">Service</option>
                        <option value="procedure">Procedure</option>
                        <option value="medication">Medication</option>
                        <option value="supplies">Supplies</option>
                        <option value="consultation">Consultation</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors mt-2"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {errors.items && (
                <p className="text-xs text-red-500">{errors.items}</p>
              )}

              <button
                type="button"
                onClick={addItem}
                className="w-full py-2 px-4 rounded-lg border border-dashed border-border hover:bg-muted transition-colors flex items-center justify-center gap-2 text-sm font-medium text-foreground"
              >
                <Plus className="size-4" />
                Add Item
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-card border border-border rounded-xl p-6 sticky top-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Invoice Summary</h3>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-sm font-medium text-foreground">
                  ${total.toFixed(2)}
                </span>
              </div>

              <div className="border-t border-border pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold text-foreground">Total</span>
                  <span
                    className="text-2xl font-bold"
                    style={{ color: orange }}
                  >
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !formData.patientId}
              className="w-full py-2.5 px-4 rounded-lg text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: submitting ? "#ccc" : orange }}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Create Invoice
                </>
              )}
            </button>

            <Link
              href={tenantPath("/accountant/billing/invoices")}
              className="w-full py-2 px-4 rounded-lg border border-border hover:bg-muted transition-colors flex items-center justify-center gap-2 text-sm font-medium text-foreground mt-2"
            >
              Cancel
            </Link>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex gap-3">
              <AlertCircle className="size-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">
                  Invoice Information
                </p>
                <p className="text-xs text-blue-700">
                  The invoice will be saved as a draft. You can review and send it to the patient afterward.
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

