"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function InsuranceClaimDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const id = params?.id as string;
  const [claim, setClaim] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/tenant/${slug}/accountant/insurance-claims/${id}`);
      if (res.ok) setClaim(await res.json());
    };
    void load();
  }, [slug, id]);

  if (!claim) return <div className="flex h-full items-center justify-center"><Loader2 className="size-5 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/tenant/${slug}/accountant/insurance-claims`} className="rounded-lg border border-border p-2 hover:bg-muted"><ArrowLeft className="size-4" /></Link>
          <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Claim Detail</p><h1 className="text-3xl font-bold">Claim {claim.id}</h1></div>
        </div>
        <Link href={`/tenant/${slug}/accountant/insurance-claims/${id}/edit`} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white">Edit Claim</Link>
      </div>
      <div className="rounded-xl border border-border bg-card p-6 space-y-3 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Patient</span><span>{claim.patientName}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Provider</span><span>{claim.insuranceProvider}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Policy</span><span>{claim.policyNumber}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span>${Number(claim.claimAmount || 0).toFixed(2)}</span></div>
      </div>
    </div>
  );
}
