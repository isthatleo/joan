"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useTenantPath } from "@/hooks/useTenantPath";

export default function EditInsuranceClaimPage() {
  const params = useParams();
  const router = useRouter();
  const tenantPath = useTenantPath();
  const slug = params?.slug as string;
  const id = params?.id as string;
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/tenant/${slug}/accountant/insurance-claims/${id}`);
      if (res.ok) setForm(await res.json());
    };
    void load();
  }, [slug, id]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/tenant/${slug}/accountant/insurance-claims/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: form.invoiceId || undefined,
          insuranceProvider: form.insuranceProvider,
          policyNumber: form.policyNumber,
          claimAmount: Number(form.claimAmount || 0),
          approvedAmount: form.approvedAmount ? Number(form.approvedAmount) : undefined,
          status: form.status,
          denialReason: form.denialReason,
          notes: form.notes,
          processedAt: form.processedAt || undefined,
          appealDeadline: form.appealDeadline || undefined,
          patientId: form.patientId,
        }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to update claim");
      }
      toast.success("Claim updated");
      router.push(tenantPath(`/accountant/insurance-claims/${id}`));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update claim");
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <div className="flex h-full items-center justify-center"><Loader2 className="size-5 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={tenantPath(`/accountant/insurance-claims/${id}`)} className="rounded-lg border border-border p-2 hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Edit Claim</p><h1 className="text-3xl font-bold">Update claim</h1></div>
      </div>
      <div className="grid gap-4 rounded-xl border border-border bg-card p-6 md:grid-cols-2">
        <label className="space-y-2 text-sm"><span>Insurance Provider</span><input value={form.insuranceProvider || ""} onChange={(e) => setForm({ ...form, insuranceProvider: e.target.value })} className="h-10 rounded-lg border border-border px-3" /></label>
        <label className="space-y-2 text-sm"><span>Policy Number</span><input value={form.policyNumber || ""} onChange={(e) => setForm({ ...form, policyNumber: e.target.value })} className="h-10 rounded-lg border border-border px-3" /></label>
        <label className="space-y-2 text-sm"><span>Status</span><select value={form.status || "submitted"} onChange={(e) => setForm({ ...form, status: e.target.value })} className="h-10 rounded-lg border border-border px-3"><option value="submitted">Submitted</option><option value="under_review">Under review</option><option value="approved">Approved</option><option value="denied">Denied</option><option value="paid">Paid</option><option value="appealed">Appealed</option></select></label>
        <label className="space-y-2 text-sm"><span>Claim Amount</span><input type="number" step="0.01" value={form.claimAmount || 0} onChange={(e) => setForm({ ...form, claimAmount: e.target.value })} className="h-10 rounded-lg border border-border px-3" /></label>
        <label className="space-y-2 text-sm"><span>Approved Amount</span><input type="number" step="0.01" value={form.approvedAmount || 0} onChange={(e) => setForm({ ...form, approvedAmount: e.target.value })} className="h-10 rounded-lg border border-border px-3" /></label>
        <label className="space-y-2 text-sm"><span>Appeal Deadline</span><input type="datetime-local" value={form.appealDeadline ? new Date(form.appealDeadline).toISOString().slice(0, 16) : ""} onChange={(e) => setForm({ ...form, appealDeadline: e.target.value ? new Date(e.target.value).toISOString() : "" })} className="h-10 rounded-lg border border-border px-3" /></label>
        <label className="space-y-2 text-sm md:col-span-2"><span>Denial Reason</span><textarea value={form.denialReason || ""} onChange={(e) => setForm({ ...form, denialReason: e.target.value })} className="min-h-20 w-full rounded-lg border border-border px-3 py-2" /></label>
        <label className="space-y-2 text-sm md:col-span-2"><span>Notes</span><textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-24 w-full rounded-lg border border-border px-3 py-2" /></label>
      </div>
      <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Save Claim</button>
    </div>
  );
}
