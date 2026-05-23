"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, FileText, Loader2, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useTenantPath } from "@/hooks/useTenantPath";

type Patient = { id: string; full_name?: string; fullName?: string };
type Invoice = { id: string; invoiceNumber?: string; amountDue?: number; totalAmount?: number; status?: string };

export default function NewInsuranceClaimPage() {
  const params = useParams();
  const router = useRouter();
  const tenantPath = useTenantPath();
  const slug = params?.slug as string;
  const [patients, setPatients] = useState<Patient[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    patientId: "",
    invoiceId: "",
    insuranceProvider: "",
    policyNumber: "",
    claimAmount: "",
    approvedAmount: "",
    status: "submitted",
    notes: "",
  });

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const response = await fetch(`/api/tenant/${slug}/patients`);
        if (response.ok) {
          const data = await response.json();
          setPatients(Array.isArray(data) ? data : []);
        } else {
          toast.error("Failed to load patients");
        }
      } catch (error) {
        console.error("Failed to load patients for claims:", error);
        toast.error("Failed to load patients");
      } finally {
        setLoading(false);
      }
    };
    void loadPatients();
  }, [slug]);

  useEffect(() => {
    if (!form.patientId) {
      setInvoices([]);
      return;
    }

    const loadInvoices = async () => {
      try {
        const response = await fetch(`/api/tenant/${slug}/accountant/billing/invoices?patientId=${form.patientId}`);
        if (response.ok) {
          const data = await response.json();
          setInvoices((Array.isArray(data) ? data : data.invoices || []).filter((invoice: Invoice) => invoice.status !== "paid"));
        } else {
          toast.error("Failed to load invoices for the selected patient");
        }
      } catch (error) {
        console.error("Failed to load patient invoices for claim:", error);
        toast.error("Failed to load invoices for the selected patient");
      }
    };
    void loadInvoices();
  }, [slug, form.patientId]);

  const selectedInvoice = useMemo(() => invoices.find((invoice) => invoice.id === form.invoiceId), [invoices, form.invoiceId]);

  useEffect(() => {
    if (selectedInvoice && !form.claimAmount) {
      const amount = selectedInvoice.amountDue || selectedInvoice.totalAmount || 0;
      setForm((current) => ({ ...current, claimAmount: String(amount) }));
    }
  }, [selectedInvoice]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.patientId) next.patientId = "Patient is required";
    if (!form.insuranceProvider.trim()) next.insuranceProvider = "Provider is required";
    if (!form.policyNumber.trim()) next.policyNumber = "Policy number is required";
    if (!form.claimAmount || Number(form.claimAmount) <= 0) next.claimAmount = "Claim amount must be greater than 0";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) return toast.error("Complete the required claim fields");
    setSaving(true);
    try {
      const res = await fetch(`/api/tenant/${slug}/accountant/insurance-claims`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          claimAmount: Number(form.claimAmount),
          approvedAmount: form.approvedAmount ? Number(form.approvedAmount) : undefined,
        }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to create claim");
      }
      const claim = await res.json();
      toast.success("Claim created");
      router.push(tenantPath(`/accountant/insurance-claims/${claim.id}`));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create claim");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={tenantPath("/accountant/insurance-claims")} className="rounded-lg border border-border p-2 hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <div><p className="text-xs uppercase tracking-wider text-muted-foreground">New Claim</p><h1 className="text-3xl font-bold">Create insurance claim</h1></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 rounded-xl border border-border bg-card p-6 lg:col-span-2">
          {loading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading patient accounts...</div> : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Patient</label>
                  <select value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value, invoiceId: "", claimAmount: "" })} className="h-10 w-full rounded-lg border border-border px-3">
                    <option value="">Select patient</option>
                    {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.full_name || patient.fullName || "Unnamed patient"}</option>)}
                  </select>
                  {errors.patientId ? <p className="mt-1 text-xs text-red-500">{errors.patientId}</p> : null}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Linked Invoice</label>
                  <select value={form.invoiceId} onChange={(e) => setForm({ ...form, invoiceId: e.target.value })} className="h-10 w-full rounded-lg border border-border px-3">
                    <option value="">Optional invoice</option>
                    {invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoiceNumber || invoice.id} - ${(invoice.amountDue || invoice.totalAmount || 0).toFixed(2)}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div><label className="mb-2 block text-sm font-medium">Insurance Provider</label><input value={form.insuranceProvider} onChange={(e) => setForm({ ...form, insuranceProvider: e.target.value })} className="h-10 w-full rounded-lg border border-border px-3" /></div>
                <div><label className="mb-2 block text-sm font-medium">Policy Number</label><input value={form.policyNumber} onChange={(e) => setForm({ ...form, policyNumber: e.target.value })} className="h-10 w-full rounded-lg border border-border px-3" /></div>
                <div><label className="mb-2 block text-sm font-medium">Claim Amount</label><input type="number" step="0.01" value={form.claimAmount} onChange={(e) => setForm({ ...form, claimAmount: e.target.value })} className="h-10 w-full rounded-lg border border-border px-3" /></div>
                <div><label className="mb-2 block text-sm font-medium">Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="h-10 w-full rounded-lg border border-border px-3"><option value="submitted">Submitted</option><option value="under_review">Under review</option><option value="approved">Approved</option><option value="denied">Denied</option><option value="appealed">Appealed</option></select></div>
              </div>
              <div><label className="mb-2 block text-sm font-medium">Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-24 w-full rounded-lg border border-border px-3 py-2" /></div>
            </>
          )}
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Claim Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Invoice balance</span><span>${Number(selectedInvoice?.amountDue || selectedInvoice?.totalAmount || 0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Claim amount</span><span>${Number(form.claimAmount || 0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="capitalize">{form.status.replace(/_/g, " ")}</span></div>
            </div>
            <button onClick={submit} disabled={saving || loading} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Create Claim</button>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800"><div className="mb-2 flex items-center gap-2 font-semibold"><AlertCircle className="size-4" />Claim Guidance</div>Claims should match the linked invoice balance where possible and include the correct policy metadata for downstream adjudication.</div>
        </div>
      </div>
    </div>
  );
}
