"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useTenantPath } from "@/hooks/useTenantPath";

type FinanceResource = "expenses" | "accounts-payable" | "budgets" | "journal" | "tax";
type FinanceMode = "detail" | "edit" | "new";
type FormState = Record<string, string>;

type ResourceConfig = {
  label: string;
  singular: string;
  endpoint: string;
  listPath: string;
  fields: Array<{ name: string; label: string; type?: string; required?: boolean; options?: string[]; full?: boolean }>;
  summary: (record: Record<string, any>) => Array<{ label: string; value: string }>;
};

const today = () => new Date().toISOString().slice(0, 10);

const resourceConfigs: Record<FinanceResource, ResourceConfig> = {
  "expenses": {
    label: "Expenses",
    singular: "Expense",
    endpoint: "expenses",
    listPath: "/accountant/finance?tab=expenses",
    fields: [
      { name: "category", label: "Category", required: true },
      { name: "vendor", label: "Vendor" },
      { name: "amount", label: "Amount", type: "number", required: true },
      { name: "currency", label: "Currency", required: true },
      { name: "expenseDate", label: "Expense Date", type: "date", required: true },
      { name: "paymentMethod", label: "Payment Method" },
      { name: "status", label: "Status", options: ["pending", "approved", "rejected", "paid", "reimbursed"], required: true },
      { name: "reference", label: "Reference" },
      { name: "receiptUrl", label: "Receipt URL" },
      { name: "description", label: "Description", full: true },
    ],
    summary: (record) => [
      { label: "Category", value: record.category || "-" },
      { label: "Vendor", value: record.vendor || "-" },
      { label: "Amount", value: `${record.currency || "USD"} ${Number(record.amount || 0).toLocaleString()}` },
      { label: "Expense Date", value: record.expenseDate || "-" },
      { label: "Payment Method", value: record.paymentMethod || "-" },
      { label: "Status", value: record.status || "-" },
      { label: "Reference", value: record.reference || "-" },
      { label: "Receipt URL", value: record.receiptUrl || "-" },
      { label: "Description", value: record.description || "-" },
    ],
  },
  "accounts-payable": {
    label: "Accounts Payable",
    singular: "Payable Record",
    endpoint: "accounts-payable",
    listPath: "/accountant/finance?tab=payable",
    fields: [
      { name: "vendor", label: "Vendor", required: true },
      { name: "vendorEmail", label: "Vendor Email", type: "email" },
      { name: "invoiceNumber", label: "Invoice Number" },
      { name: "amount", label: "Amount", type: "number", required: true },
      { name: "amountPaid", label: "Amount Paid", type: "number" },
      { name: "currency", label: "Currency", required: true },
      { name: "issueDate", label: "Issue Date", type: "date", required: true },
      { name: "dueDate", label: "Due Date", type: "date" },
      { name: "status", label: "Status", options: ["open", "partial", "paid", "overdue", "cancelled"], required: true },
      { name: "notes", label: "Notes", full: true },
    ],
    summary: (record) => [
      { label: "Vendor", value: record.vendor || "-" },
      { label: "Vendor Email", value: record.vendorEmail || "-" },
      { label: "Invoice Number", value: record.invoiceNumber || "-" },
      { label: "Amount", value: `${record.currency || "USD"} ${Number(record.amount || 0).toLocaleString()}` },
      { label: "Amount Paid", value: `${record.currency || "USD"} ${Number(record.amountPaid || 0).toLocaleString()}` },
      { label: "Issue Date", value: record.issueDate || "-" },
      { label: "Due Date", value: record.dueDate || "-" },
      { label: "Status", value: record.status || "-" },
      { label: "Notes", value: record.notes || "-" },
    ],
  },
  "budgets": {
    label: "Budgets",
    singular: "Budget",
    endpoint: "budgets",
    listPath: "/accountant/finance?tab=budgets",
    fields: [
      { name: "name", label: "Budget Name", required: true },
      { name: "category", label: "Category" },
      { name: "amount", label: "Budget Amount", type: "number", required: true },
      { name: "spent", label: "Spent", type: "number" },
      { name: "currency", label: "Currency", required: true },
      { name: "period", label: "Period", options: ["monthly", "quarterly", "yearly"], required: true },
      { name: "startDate", label: "Start Date", type: "date", required: true },
      { name: "endDate", label: "End Date", type: "date" },
      { name: "status", label: "Status", options: ["active", "inactive", "closed"], required: true },
    ],
    summary: (record) => [
      { label: "Name", value: record.name || "-" },
      { label: "Category", value: record.category || "-" },
      { label: "Budget", value: `${record.currency || "USD"} ${Number(record.amount || 0).toLocaleString()}` },
      { label: "Spent", value: `${record.currency || "USD"} ${Number(record.spent || 0).toLocaleString()}` },
      { label: "Remaining", value: `${record.currency || "USD"} ${Number(record.remaining ?? (Number(record.amount || 0) - Number(record.spent || 0))).toLocaleString()}` },
      { label: "Utilization", value: `${record.utilization ?? 0}%` },
      { label: "Period", value: record.period || "-" },
      { label: "Status", value: record.status || "-" },
      { label: "Range", value: [record.startDate, record.endDate].filter(Boolean).join(" to ") || "-" },
    ],
  },
  "journal": {
    label: "Journal Entries",
    singular: "Journal Entry",
    endpoint: "journal",
    listPath: "/accountant/finance?tab=journal",
    fields: [
      { name: "entryDate", label: "Entry Date", type: "date", required: true },
      { name: "reference", label: "Reference" },
      { name: "debitAccount", label: "Debit Account", required: true },
      { name: "creditAccount", label: "Credit Account", required: true },
      { name: "amount", label: "Amount", type: "number", required: true },
      { name: "currency", label: "Currency", required: true },
      { name: "status", label: "Status", options: ["draft", "posted", "reversed"], required: true },
      { name: "description", label: "Description", full: true },
    ],
    summary: (record) => [
      { label: "Entry Date", value: record.entryDate || "-" },
      { label: "Reference", value: record.reference || "-" },
      { label: "Debit Account", value: record.debitAccount || "-" },
      { label: "Credit Account", value: record.creditAccount || "-" },
      { label: "Amount", value: `${record.currency || "USD"} ${Number(record.amount || 0).toLocaleString()}` },
      { label: "Status", value: record.status || "-" },
      { label: "Description", value: record.description || "-" },
    ],
  },
  "tax": {
    label: "Tax Records",
    singular: "Tax Record",
    endpoint: "tax",
    listPath: "/accountant/finance?tab=tax",
    fields: [
      { name: "period", label: "Period", required: true },
      { name: "taxType", label: "Tax Type", required: true },
      { name: "jurisdiction", label: "Jurisdiction" },
      { name: "taxableAmount", label: "Taxable Amount", type: "number" },
      { name: "taxAmount", label: "Tax Amount", type: "number" },
      { name: "rate", label: "Rate", type: "number" },
      { name: "currency", label: "Currency", required: true },
      { name: "dueDate", label: "Due Date", type: "date" },
      { name: "status", label: "Status", options: ["draft", "filed", "paid", "overdue"], required: true },
      { name: "reference", label: "Reference", full: true },
    ],
    summary: (record) => [
      { label: "Period", value: record.period || "-" },
      { label: "Tax Type", value: record.taxType || "-" },
      { label: "Jurisdiction", value: record.jurisdiction || "-" },
      { label: "Taxable Amount", value: `${record.currency || "USD"} ${Number(record.taxableAmount || 0).toLocaleString()}` },
      { label: "Tax Amount", value: `${record.currency || "USD"} ${Number(record.taxAmount || 0).toLocaleString()}` },
      { label: "Rate", value: record.rate || "-" },
      { label: "Due Date", value: record.dueDate || "-" },
      { label: "Status", value: record.status || "-" },
      { label: "Reference", value: record.reference || "-" },
    ],
  },
};

function defaultFormState(resource: FinanceResource): FormState {
  switch (resource) {
    case "expenses":
      return { currency: "USD", expenseDate: today(), status: "pending" };
    case "accounts-payable":
      return { currency: "USD", issueDate: today(), amountPaid: "0", status: "open" };
    case "budgets":
      return { currency: "USD", startDate: today(), period: "monthly", status: "active", spent: "0" };
    case "journal":
      return { currency: "USD", entryDate: today(), status: "posted" };
    case "tax":
      return { currency: "USD", status: "draft", taxableAmount: "0", taxAmount: "0", rate: "0" };
  }
}

function toFormState(resource: FinanceResource, record: Record<string, any>): FormState {
  const config = resourceConfigs[resource];
  return Object.fromEntries(
    config.fields.map((field) => [field.name, record[field.name] == null ? "" : String(record[field.name])])
  );
}

function cleanPayload(formState: FormState) {
  return Object.fromEntries(Object.entries(formState).filter(([, value]) => value !== undefined));
}

function inputClass() {
  return "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-200/50";
}

export function FinanceRecordPage({ resource, mode }: { resource: FinanceResource; mode: FinanceMode }) {
  const params = useParams();
  const router = useRouter();
  const tenantPath = useTenantPath();
  const slug = params?.slug as string;
  const id = params?.id as string | undefined;
  const config = resourceConfigs[resource];
  const [record, setRecord] = useState<Record<string, any> | null>(null);
  const [formState, setFormState] = useState<FormState>(defaultFormState(resource));
  const [loading, setLoading] = useState(mode !== "new");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "new") {
      setLoading(false);
      setFormState(defaultFormState(resource));
      return;
    }
    if (!slug || !id) return;

    let cancelled = false;
    const loadRecord = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/tenant/${slug}/accountant/${config.endpoint}/${id}`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || `Failed to load ${config.singular.toLowerCase()}`);
        if (cancelled) return;
        setRecord(payload);
        setFormState(toFormState(resource, payload));
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : `Failed to load ${config.singular.toLowerCase()}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadRecord();
    return () => {
      cancelled = true;
    };
  }, [config.endpoint, config.singular, id, mode, resource, slug]);

  const title = mode === "new" ? `New ${config.singular}` : mode === "edit" ? `Edit ${config.singular}` : config.singular;
  const subtitle = mode === "new"
    ? `Create a new ${config.singular.toLowerCase()} record.`
    : mode === "edit"
      ? `Update this ${config.singular.toLowerCase()} record.`
      : `Review ${config.singular.toLowerCase()} details and related actions.`;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormState((current) => ({ ...current, [name]: value }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!slug) return;
    setSaving(true);
    setError(null);
    try {
      const url = mode === "new"
        ? `/api/tenant/${slug}/accountant/${config.endpoint}`
        : `/api/tenant/${slug}/accountant/${config.endpoint}/${id}`;
      const response = await fetch(url, {
        method: mode === "new" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanPayload(formState)),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `Failed to save ${config.singular.toLowerCase()}`);
      toast.success(mode === "new" ? `${config.singular} created` : `${config.singular} updated`);
      const nextId = payload.id || id;
      router.push(tenantPath(`/accountant/finance/${resource}/${nextId}`));
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : `Failed to save ${config.singular.toLowerCase()}`;
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!slug || !id) return;
    const confirmed = window.confirm(
      `Delete this ${config.singular.toLowerCase()} record?\n\nThis action removes it from active finance records and cannot be undone from this screen.`
    );
    if (!confirmed) return;
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/tenant/${slug}/accountant/${config.endpoint}/${id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `Failed to delete ${config.singular.toLowerCase()}`);
      toast.success(`${config.singular} deleted`);
      router.push(tenantPath(config.listPath));
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : `Failed to delete ${config.singular.toLowerCase()}`;
      setError(message);
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Finance Operations</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={tenantPath(config.listPath)} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted">
            <ArrowLeft className="size-4" />Back to {config.label}
          </Link>
          {mode === "detail" && id && (
            <>
              <Link href={tenantPath(`/accountant/finance/${resource}/${id}/edit`)} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted">
                <Pencil className="size-4" />Edit
              </Link>
              <button onClick={handleDelete} disabled={deleting} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60">
                {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}Delete
              </button>
            </>
          )}
          {mode === "detail" && (
            <Link href={tenantPath(`/accountant/finance/${resource}/new`)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
              <Plus className="size-4" />New {config.singular}
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : mode === "detail" ? (
        !record ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
            <p className="font-medium text-foreground">{config.singular} not found.</p>
            <p className="mt-1 text-sm text-muted-foreground">The record may have been deleted or is no longer available.</p>
            <Link href={tenantPath(config.listPath)} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted">
              <ArrowLeft className="size-4" />
              Back to {config.label}
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {config.summary(record).map((item) => (
              <div key={item.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-sm font-medium text-foreground break-words">{item.value}</p>
              </div>
            ))}
          </div>
        )
      ) : (
        <form onSubmit={handleSave} className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {config.fields.map((field) => (
              <label key={field.name} className={field.full ? "space-y-2 md:col-span-2" : "space-y-2"}>
                <span className="block text-sm font-medium text-foreground">{field.label}</span>
                {field.options ? (
                  <select name={field.name} value={formState[field.name] || ""} onChange={handleChange} className={inputClass()} required={field.required}>
                    {field.options.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                ) : field.full ? (
                  <textarea name={field.name} value={formState[field.name] || ""} onChange={handleChange} className={`${inputClass()} min-h-28 py-3`} required={field.required} />
                ) : (
                  <input name={field.name} type={field.type || "text"} value={formState[field.name] || ""} onChange={handleChange} className={inputClass()} required={field.required} step={field.type === "number" ? "0.01" : undefined} />
                )}
              </label>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Link href={tenantPath(mode === "new" ? config.listPath : `/accountant/finance/${resource}/${id}`)} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted">
              Cancel
            </Link>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {mode === "new" ? "Create record" : "Save changes"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
