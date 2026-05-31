"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { DollarSign, FileText, Loader2, Pencil, Plus, Receipt, Trash2, TrendingDown, Wallet } from "lucide-react";
import { CurrencySelect } from "@/components/forms/CurrencySelect";

type Tab = "expenses" | "payable" | "budgets" | "journal" | "tax";

type Expense = {
  id: string;
  category: string;
  vendor?: string | null;
  description?: string | null;
  amount: string;
  currency: string;
  expenseDate: string;
  paymentMethod?: string | null;
  reference?: string | null;
  status: string;
  receiptUrl?: string | null;
};

type Payable = {
  id: string;
  vendor: string;
  vendorEmail?: string | null;
  invoiceNumber?: string | null;
  amount: string;
  amountPaid: string;
  currency: string;
  issueDate: string;
  dueDate?: string | null;
  status: string;
  notes?: string | null;
};

type Budget = {
  id: string;
  name: string;
  category?: string | null;
  period: string;
  amount: string;
  spent: number;
  remaining: number;
  utilization: number;
  currency: string;
  startDate: string;
  endDate?: string | null;
  status: string;
};

type Journal = {
  id: string;
  entryDate: string;
  reference?: string | null;
  description?: string | null;
  debitAccount: string;
  creditAccount: string;
  amount: string;
  currency: string;
  status: string;
};

type TaxRecord = {
  id: string;
  period: string;
  taxType: string;
  jurisdiction?: string | null;
  taxableAmount: string;
  taxAmount: string;
  rate: string;
  currency: string;
  status: string;
  dueDate?: string | null;
  reference?: string | null;
};

type FormState = Record<string, string>;

const today = () => new Date().toISOString().slice(0, 10);

export default function AccountantFinancePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [tab, setTab] = useState<Tab>("expenses");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>({});

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesTotal, setExpensesTotal] = useState(0);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [payablesOutstanding, setPayablesOutstanding] = useState(0);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [journal, setJournal] = useState<Journal[]>([]);
  const [taxes, setTaxes] = useState<TaxRecord[]>([]);
  const [taxDue, setTaxDue] = useState(0);

  const base = `/api/tenant/${slug}/accountant`;

  const tabs = useMemo(
    () =>
      [
        { id: "expenses", label: "Expenses", icon: Receipt, endpoint: "expenses" },
        { id: "payable", label: "Accounts Payable", icon: Wallet, endpoint: "accounts-payable" },
        { id: "budgets", label: "Budgets", icon: TrendingDown, endpoint: "budgets" },
        { id: "journal", label: "Journal Entries", icon: FileText, endpoint: "journal" },
        { id: "tax", label: "Tax Records", icon: DollarSign, endpoint: "tax" },
      ] as const,
    []
  );

  const activeEndpoint = tabs.find((item) => item.id === tab)?.endpoint || "expenses";

  function resetForm(nextTab: Tab = tab) {
    setEditingId(null);
    setShowForm(false);
    setFormState(defaultFormState(nextTab));
  }

  async function load() {
    if (!slug) return;
    setLoading(true);
    setError(null);

    try {
      if (tab === "expenses") {
        const response = await fetch(`${base}/expenses`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Failed to load expenses");
        setExpenses(payload.items || []);
        setExpensesTotal(payload.total || 0);
      } else if (tab === "payable") {
        const response = await fetch(`${base}/accounts-payable`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Failed to load accounts payable");
        setPayables(payload.items || []);
        setPayablesOutstanding(payload.outstanding || 0);
      } else if (tab === "budgets") {
        const response = await fetch(`${base}/budgets`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Failed to load budgets");
        setBudgets(payload.items || []);
      } else if (tab === "journal") {
        const response = await fetch(`${base}/journal`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Failed to load journal entries");
        setJournal(payload.items || []);
      } else if (tab === "tax") {
        const response = await fetch(`${base}/tax`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Failed to load tax records");
        setTaxes(payload.items || []);
        setTaxDue(payload.totalDue || 0);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load finance data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setFormState(defaultFormState(tab));
    setShowForm(false);
    setEditingId(null);
  }, [tab]);

  useEffect(() => {
    load();
  }, [tab, slug]);

  function onFormChange(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    setFormState((current) => ({ ...current, [name]: value }));
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const method = editingId ? "PATCH" : "POST";
      const url = editingId
        ? `${base}/${activeEndpoint}/${editingId}`
        : `${base}/${activeEndpoint}`;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanPayload(formState)),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save record");
      }

      resetForm();
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save record");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(id: string) {
    const confirmed = window.confirm("Delete this record? This action can be reversed only from the database.");
    if (!confirmed) return;

    setError(null);

    try {
      const response = await fetch(`${base}/${activeEndpoint}/${id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to delete record");
      }
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete record");
    }
  }

  function startCreate() {
    setEditingId(null);
    setFormState(defaultFormState(tab));
    setShowForm(true);
  }

  function startEdit(record: Expense | Payable | Budget | Journal | TaxRecord) {
    setEditingId(record.id);
    setFormState(toFormState(tab, record));
    setShowForm(true);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Finance Operations</h1>
          <p className="text-sm text-muted-foreground">
            Manage expenses, payables, budgets, ledger, and tax records with live tenant data.
          </p>
        </div>
        <button
          onClick={startCreate}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          New {tabs.find((item) => item.id === tab)?.label}
        </button>
      </header>

      <nav className="flex flex-wrap gap-2 border-b">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium ${
                tab === item.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={submitForm} className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-3">
          <FinanceFormFields tab={tab} formState={formState} onChange={onFormChange} setFormState={setFormState} />
          <div className="flex justify-end gap-2 sm:col-span-3">
            <button
              type="button"
              onClick={() => resetForm()}
              className="rounded border px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Save changes" : "Create record"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          {tab === "expenses" && (
            <DataTable
              summary={`Total expenses: $${expensesTotal.toLocaleString()}`}
              headers={["Date", "Category", "Vendor", "Description", "Status", "Amount", "Actions"]}
              rows={expenses.map((item) => ({
                id: item.id,
                values: [
                  item.expenseDate,
                  item.category,
                  item.vendor || "-",
                  item.description || "-",
                  item.status,
                  `${item.currency} ${Number(item.amount).toLocaleString()}`,
                ],
                onEdit: () => startEdit(item),
                onDelete: () => deleteRecord(item.id),
              }))}
            />
          )}
          {tab === "payable" && (
            <DataTable
              summary={`Outstanding: $${payablesOutstanding.toLocaleString()}`}
              headers={["Vendor", "Invoice #", "Amount", "Paid", "Due", "Status", "Actions"]}
              rows={payables.map((item) => ({
                id: item.id,
                values: [
                  item.vendor,
                  item.invoiceNumber || "-",
                  `${item.currency} ${Number(item.amount).toLocaleString()}`,
                  `${item.currency} ${Number(item.amountPaid).toLocaleString()}`,
                  item.dueDate || "-",
                  item.status,
                ],
                onEdit: () => startEdit(item),
                onDelete: () => deleteRecord(item.id),
              }))}
            />
          )}
          {tab === "budgets" && (
            <DataTable
              headers={["Name", "Category", "Budget", "Spent", "Remaining", "Utilization", "Actions"]}
              rows={budgets.map((item) => ({
                id: item.id,
                values: [
                  item.name,
                  item.category || "-",
                  `${item.currency} ${Number(item.amount).toLocaleString()}`,
                  `${item.currency} ${item.spent.toLocaleString()}`,
                  `${item.currency} ${item.remaining.toLocaleString()}`,
                  `${item.utilization}%`,
                ],
                onEdit: () => startEdit(item),
                onDelete: () => deleteRecord(item.id),
              }))}
            />
          )}
          {tab === "journal" && (
            <DataTable
              headers={["Date", "Ref", "Debit", "Credit", "Amount", "Status", "Actions"]}
              rows={journal.map((item) => ({
                id: item.id,
                values: [
                  item.entryDate,
                  item.reference || "-",
                  item.debitAccount,
                  item.creditAccount,
                  `${item.currency} ${Number(item.amount).toLocaleString()}`,
                  item.status,
                ],
                onEdit: () => startEdit(item),
                onDelete: () => deleteRecord(item.id),
              }))}
            />
          )}
          {tab === "tax" && (
            <DataTable
              summary={`Total due: $${taxDue.toLocaleString()}`}
              headers={["Period", "Type", "Jurisdiction", "Due Date", "Amount", "Status", "Actions"]}
              rows={taxes.map((item) => ({
                id: item.id,
                values: [
                  item.period,
                  item.taxType,
                  item.jurisdiction || "-",
                  item.dueDate || "-",
                  `${item.currency} ${Number(item.taxAmount).toLocaleString()}`,
                  item.status,
                ],
                onEdit: () => startEdit(item),
                onDelete: () => deleteRecord(item.id),
              }))}
            />
          )}
        </div>
      )}
    </div>
  );
}

function FinanceFormFields({
  tab,
  formState,
  onChange,
  setFormState,
}: {
  tab: Tab;
  formState: FormState;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  setFormState: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  if (tab === "expenses") {
    return (
      <>
        <input name="category" required value={formState.category || ""} onChange={onChange} placeholder="Category" className="rounded border px-3 py-2 text-sm" />
        <input name="vendor" value={formState.vendor || ""} onChange={onChange} placeholder="Vendor" className="rounded border px-3 py-2 text-sm" />
        <input name="amount" required value={formState.amount || ""} onChange={onChange} type="number" step="0.01" placeholder="Amount" className="rounded border px-3 py-2 text-sm" />
        <input name="expenseDate" value={formState.expenseDate || ""} onChange={onChange} type="date" className="rounded border px-3 py-2 text-sm" />
        <input name="paymentMethod" value={formState.paymentMethod || ""} onChange={onChange} placeholder="Payment method" className="rounded border px-3 py-2 text-sm" />
        <select name="status" value={formState.status || "pending"} onChange={onChange} className="rounded border px-3 py-2 text-sm">
          {["pending", "approved", "rejected", "paid", "reimbursed"].map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <input name="reference" value={formState.reference || ""} onChange={onChange} placeholder="Reference" className="rounded border px-3 py-2 text-sm" />
        <input name="receiptUrl" value={formState.receiptUrl || ""} onChange={onChange} placeholder="Receipt URL" className="rounded border px-3 py-2 text-sm" />
        <CurrencySelect value={formState.currency || ""} onChange={(value) => setFormState((current) => ({ ...current, currency: value }))} />
        <input name="description" value={formState.description || ""} onChange={onChange} placeholder="Description" className="rounded border px-3 py-2 text-sm sm:col-span-3" />
      </>
    );
  }

  if (tab === "payable") {
    return (
      <>
        <input name="vendor" required value={formState.vendor || ""} onChange={onChange} placeholder="Vendor" className="rounded border px-3 py-2 text-sm" />
        <input name="vendorEmail" value={formState.vendorEmail || ""} onChange={onChange} type="email" placeholder="Vendor email" className="rounded border px-3 py-2 text-sm" />
        <input name="invoiceNumber" value={formState.invoiceNumber || ""} onChange={onChange} placeholder="Invoice number" className="rounded border px-3 py-2 text-sm" />
        <input name="amount" required value={formState.amount || ""} onChange={onChange} type="number" step="0.01" placeholder="Amount" className="rounded border px-3 py-2 text-sm" />
        <input name="amountPaid" value={formState.amountPaid || ""} onChange={onChange} type="number" step="0.01" placeholder="Amount paid" className="rounded border px-3 py-2 text-sm" />
        <CurrencySelect value={formState.currency || ""} onChange={(value) => setFormState((current) => ({ ...current, currency: value }))} />
        <input name="issueDate" value={formState.issueDate || ""} onChange={onChange} type="date" className="rounded border px-3 py-2 text-sm" />
        <input name="dueDate" value={formState.dueDate || ""} onChange={onChange} type="date" className="rounded border px-3 py-2 text-sm" />
        <select name="status" value={formState.status || "open"} onChange={onChange} className="rounded border px-3 py-2 text-sm">
          {["open", "partial", "paid", "overdue", "cancelled"].map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <input name="notes" value={formState.notes || ""} onChange={onChange} placeholder="Notes" className="rounded border px-3 py-2 text-sm sm:col-span-3" />
      </>
    );
  }

  if (tab === "budgets") {
    return (
      <>
        <input name="name" required value={formState.name || ""} onChange={onChange} placeholder="Budget name" className="rounded border px-3 py-2 text-sm" />
        <input name="category" value={formState.category || ""} onChange={onChange} placeholder="Category" className="rounded border px-3 py-2 text-sm" />
        <input name="amount" required value={formState.amount || ""} onChange={onChange} type="number" step="0.01" placeholder="Amount" className="rounded border px-3 py-2 text-sm" />
        <input name="spent" value={formState.spent || ""} onChange={onChange} type="number" step="0.01" placeholder="Spent" className="rounded border px-3 py-2 text-sm" />
        <CurrencySelect value={formState.currency || ""} onChange={(value) => setFormState((current) => ({ ...current, currency: value }))} />
        <select name="period" value={formState.period || "monthly"} onChange={onChange} className="rounded border px-3 py-2 text-sm">
          {["monthly", "quarterly", "yearly"].map((period) => (
            <option key={period} value={period}>
              {period}
            </option>
          ))}
        </select>
        <input name="startDate" value={formState.startDate || ""} onChange={onChange} type="date" className="rounded border px-3 py-2 text-sm" />
        <input name="endDate" value={formState.endDate || ""} onChange={onChange} type="date" className="rounded border px-3 py-2 text-sm" />
        <select name="status" value={formState.status || "active"} onChange={onChange} className="rounded border px-3 py-2 text-sm">
          {["active", "inactive", "closed"].map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </>
    );
  }

  if (tab === "journal") {
    return (
      <>
        <input name="entryDate" value={formState.entryDate || ""} onChange={onChange} type="date" className="rounded border px-3 py-2 text-sm" />
        <input name="reference" value={formState.reference || ""} onChange={onChange} placeholder="Reference" className="rounded border px-3 py-2 text-sm" />
        <input name="amount" required value={formState.amount || ""} onChange={onChange} type="number" step="0.01" placeholder="Amount" className="rounded border px-3 py-2 text-sm" />
        <input name="debitAccount" required value={formState.debitAccount || ""} onChange={onChange} placeholder="Debit account" className="rounded border px-3 py-2 text-sm" />
        <input name="creditAccount" required value={formState.creditAccount || ""} onChange={onChange} placeholder="Credit account" className="rounded border px-3 py-2 text-sm" />
        <CurrencySelect value={formState.currency || ""} onChange={(value) => setFormState((current) => ({ ...current, currency: value }))} />
        <select name="status" value={formState.status || "posted"} onChange={onChange} className="rounded border px-3 py-2 text-sm">
          {["draft", "posted", "reversed"].map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <input name="description" value={formState.description || ""} onChange={onChange} placeholder="Description" className="rounded border px-3 py-2 text-sm sm:col-span-2" />
      </>
    );
  }

  return (
    <>
      <input name="period" required value={formState.period || ""} onChange={onChange} placeholder="Period" className="rounded border px-3 py-2 text-sm" />
      <input name="taxType" required value={formState.taxType || ""} onChange={onChange} placeholder="Tax type" className="rounded border px-3 py-2 text-sm" />
      <input name="jurisdiction" value={formState.jurisdiction || ""} onChange={onChange} placeholder="Jurisdiction" className="rounded border px-3 py-2 text-sm" />
      <input name="taxableAmount" value={formState.taxableAmount || ""} onChange={onChange} type="number" step="0.01" placeholder="Taxable amount" className="rounded border px-3 py-2 text-sm" />
      <input name="taxAmount" value={formState.taxAmount || ""} onChange={onChange} type="number" step="0.01" placeholder="Tax amount" className="rounded border px-3 py-2 text-sm" />
      <input name="rate" value={formState.rate || ""} onChange={onChange} type="number" step="0.0001" placeholder="Rate" className="rounded border px-3 py-2 text-sm" />
      <CurrencySelect value={formState.currency || ""} onChange={(value) => setFormState((current) => ({ ...current, currency: value }))} />
      <input name="dueDate" value={formState.dueDate || ""} onChange={onChange} type="date" className="rounded border px-3 py-2 text-sm" />
      <select name="status" value={formState.status || "draft"} onChange={onChange} className="rounded border px-3 py-2 text-sm">
        {["draft", "filed", "paid", "overdue"].map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <input name="reference" value={formState.reference || ""} onChange={onChange} placeholder="Reference" className="rounded border px-3 py-2 text-sm sm:col-span-3" />
    </>
  );
}

function DataTable({
  headers,
  rows,
  summary,
}: {
  headers: string[];
  rows: Array<{
    id: string;
    values: Array<string | number>;
    onEdit: () => void;
    onDelete: () => void;
  }>;
  summary?: string;
}) {
  return (
    <div>
      {summary && <div className="border-b px-4 py-3 text-sm font-medium">{summary}</div>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-2 text-left font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-4 py-8 text-center text-muted-foreground">
                  No records yet
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t">
                  {row.values.map((value, index) => (
                    <td key={`${row.id}-${index}`} className="px-4 py-2">
                      {value}
                    </td>
                  ))}
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button onClick={row.onEdit} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium hover:bg-muted">
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button onClick={row.onDelete} className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function defaultFormState(tab: Tab): FormState {
  switch (tab) {
    case "expenses":
      return { currency: "USD", expenseDate: today(), status: "pending" };
    case "payable":
      return { currency: "USD", issueDate: today(), amountPaid: "0", status: "open" };
    case "budgets":
      return { currency: "USD", startDate: today(), period: "monthly", status: "active", spent: "0" };
    case "journal":
      return { currency: "USD", entryDate: today(), status: "posted" };
    case "tax":
      return { currency: "USD", status: "draft", taxableAmount: "0", taxAmount: "0", rate: "0" };
  }
}

function cleanPayload(formState: FormState) {
  return Object.fromEntries(
    Object.entries(formState).filter(([, value]) => value !== undefined)
  );
}

function toFormState(tab: Tab, record: Expense | Payable | Budget | Journal | TaxRecord): FormState {
  switch (tab) {
    case "expenses": {
      const item = record as Expense;
      return {
        category: item.category,
        vendor: item.vendor || "",
        description: item.description || "",
        amount: item.amount,
        currency: item.currency,
        expenseDate: item.expenseDate,
        paymentMethod: item.paymentMethod || "",
        reference: item.reference || "",
        status: item.status,
        receiptUrl: item.receiptUrl || "",
      };
    }
    case "payable": {
      const item = record as Payable;
      return {
        vendor: item.vendor,
        vendorEmail: item.vendorEmail || "",
        invoiceNumber: item.invoiceNumber || "",
        amount: item.amount,
        amountPaid: item.amountPaid,
        currency: item.currency,
        issueDate: item.issueDate,
        dueDate: item.dueDate || "",
        status: item.status,
        notes: item.notes || "",
      };
    }
    case "budgets": {
      const item = record as Budget;
      return {
        name: item.name,
        category: item.category || "",
        period: item.period,
        amount: item.amount,
        spent: String(item.spent),
        currency: item.currency,
        startDate: item.startDate,
        endDate: item.endDate || "",
        status: item.status,
      };
    }
    case "journal": {
      const item = record as Journal;
      return {
        entryDate: item.entryDate,
        reference: item.reference || "",
        description: item.description || "",
        debitAccount: item.debitAccount,
        creditAccount: item.creditAccount,
        amount: item.amount,
        currency: item.currency,
        status: item.status,
      };
    }
    case "tax": {
      const item = record as TaxRecord;
      return {
        period: item.period,
        taxType: item.taxType,
        jurisdiction: item.jurisdiction || "",
        taxableAmount: item.taxableAmount,
        taxAmount: item.taxAmount,
        rate: item.rate,
        currency: item.currency,
        dueDate: item.dueDate || "",
        status: item.status,
        reference: item.reference || "",
      };
    }
  }
}
