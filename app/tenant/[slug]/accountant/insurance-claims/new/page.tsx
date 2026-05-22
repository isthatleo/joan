"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function NewInsuranceClaimPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const [form, setForm] = useState({ patientName: "", insuranceProvider: "", policyNumber: "", claimAmount: "" });

  const submit = async () => {
    const res = await fetch(`/api/tenant/${slug}/accountant/insurance-claims`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const claim = await res.json();
      toast.success("Claim created");
      router.push(`/tenant/${slug}/accountant/insurance-claims/${claim.id}`);
    } else {
      toast.error("Failed to create claim");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/tenant/${slug}/accountant/insurance-claims`} className="rounded-lg border border-border p-2 hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <div><p className="text-xs uppercase tracking-wider text-muted-foreground">New Claim</p><h1 className="text-3xl font-bold">Create insurance claim</h1></div>
      </div>
      <div className="grid gap-4 rounded-xl border border-border bg-card p-6 md:grid-cols-2">
        <input placeholder="Patient name" value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} className="h-10 rounded-lg border border-border px-3" />
        <input placeholder="Insurance provider" value={form.insuranceProvider} onChange={(e) => setForm({ ...form, insuranceProvider: e.target.value })} className="h-10 rounded-lg border border-border px-3" />
        <input placeholder="Policy number" value={form.policyNumber} onChange={(e) => setForm({ ...form, policyNumber: e.target.value })} className="h-10 rounded-lg border border-border px-3" />
        <input placeholder="Claim amount" value={form.claimAmount} onChange={(e) => setForm({ ...form, claimAmount: e.target.value })} className="h-10 rounded-lg border border-border px-3" />
      </div>
      <button onClick={submit} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white">Create Claim</button>
    </div>
  );
}
