"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function EditInsuranceClaimPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const id = params?.id as string;
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/tenant/${slug}/accountant/insurance-claims/${id}`);
      if (res.ok) setForm(await res.json());
    };
    void load();
  }, [slug, id]);

  if (!form) return <div className="flex h-full items-center justify-center"><Loader2 className="size-5 animate-spin" /></div>;

  const save = async () => {
    const res = await fetch(`/api/tenant/${slug}/accountant/insurance-claims/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success("Claim updated");
      router.push(`/tenant/${slug}/accountant/insurance-claims/${id}`);
    } else {
      toast.error("Failed to update claim");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/tenant/${slug}/accountant/insurance-claims/${id}`} className="rounded-lg border border-border p-2 hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Edit Claim</p><h1 className="text-3xl font-bold">Update claim</h1></div>
      </div>
      <div className="grid gap-4 rounded-xl border border-border bg-card p-6 md:grid-cols-2">
        <input value={form.insuranceProvider || ""} onChange={(e) => setForm({ ...form, insuranceProvider: e.target.value })} className="h-10 rounded-lg border border-border px-3" />
        <input value={form.policyNumber || ""} onChange={(e) => setForm({ ...form, policyNumber: e.target.value })} className="h-10 rounded-lg border border-border px-3" />
        <input value={form.status || ""} onChange={(e) => setForm({ ...form, status: e.target.value })} className="h-10 rounded-lg border border-border px-3" />
        <input type="number" value={form.claimAmount || 0} onChange={(e) => setForm({ ...form, claimAmount: Number(e.target.value) })} className="h-10 rounded-lg border border-border px-3" />
      </div>
      <button onClick={save} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white">Save Claim</button>
    </div>
  );
}
