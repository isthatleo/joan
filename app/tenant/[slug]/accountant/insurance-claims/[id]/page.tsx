"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, ArrowLeft, FileText, Loader2, Pencil, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useTenantPath } from "@/hooks/useTenantPath";

export default function InsuranceClaimDetailPage() {
  const params = useParams();
  const tenantPath = useTenantPath();
  const slug = params?.slug as string;
  const id = params?.id as string;
  const [claim, setClaim] = useState<any>(null);

  const load = async () => {
    const res = await fetch(`/api/tenant/${slug}/accountant/insurance-claims/${id}`);
    if (res.ok) setClaim(await res.json());
  };

  useEffect(() => {
    void load();
  }, [slug, id]);

  const appeal = async () => {
    const reason = prompt("Enter appeal reason");
    if (!reason) return;
    const res = await fetch(`/api/tenant/${slug}/accountant/insurance-claims/${id}/appeal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      toast.success("Appeal submitted");
      await load();
    } else {
      toast.error("Failed to submit appeal");
    }
  };

  if (!claim) return <div className="flex h-full items-center justify-center"><Loader2 className="size-5 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={tenantPath("/accountant/insurance-claims")} className="rounded-lg border border-border p-2 hover:bg-muted"><ArrowLeft className="size-4" /></Link>
          <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Claim Detail</p><h1 className="text-3xl font-bold">Claim {claim.id}</h1></div>
        </div>
        <div className="flex gap-2">
          {claim.status === "denied" ? <button onClick={appeal} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white"><TrendingUp className="size-4" />Appeal</button> : null}
          <Link href={tenantPath(`/accountant/insurance-claims/${id}/edit`)} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"><Pencil className="size-4" />Edit Claim</Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            <div><p className="text-muted-foreground">Patient</p><p className="font-medium">{claim.patientName}</p></div>
            <div><p className="text-muted-foreground">Linked Invoice</p><p className="font-medium">{claim.invoiceId || "-"}</p></div>
            <div><p className="text-muted-foreground">Provider</p><p className="font-medium">{claim.insuranceProvider}</p></div>
            <div><p className="text-muted-foreground">Policy</p><p className="font-medium">{claim.policyNumber}</p></div>
            <div><p className="text-muted-foreground">Submitted</p><p className="font-medium">{claim.submittedAt ? new Date(claim.submittedAt).toLocaleString() : "-"}</p></div>
            <div><p className="text-muted-foreground">Processed</p><p className="font-medium">{claim.processedAt ? new Date(claim.processedAt).toLocaleString() : "-"}</p></div>
            <div><p className="text-muted-foreground">Status</p><p className="font-medium capitalize">{String(claim.status).replace(/_/g, " ")}</p></div>
            <div><p className="text-muted-foreground">Appeal Deadline</p><p className="font-medium">{claim.appealDeadline ? new Date(claim.appealDeadline).toLocaleDateString() : "-"}</p></div>
          </div>
          {claim.denialReason ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><div className="mb-2 flex items-center gap-2 font-semibold"><AlertCircle className="size-4" />Denial Reason</div>{claim.denialReason}</div> : null}
          <div>
            <div className="mb-3 flex items-center gap-2 text-lg font-semibold"><FileText className="size-5" />Notes</div>
            <div className="rounded-lg border border-border bg-background/50 p-4 text-sm text-muted-foreground">{claim.notes || "No notes recorded for this claim."}</div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Financial Summary</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Claim Amount</span><span>${Number(claim.claimAmount || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Approved Amount</span><span>${Number(claim.approvedAmount || 0).toFixed(2)}</span></div>
            <div className="flex justify-between border-t border-border pt-3 font-semibold"><span>Open Value</span><span>${Math.max(0, Number(claim.claimAmount || 0) - Number(claim.approvedAmount || 0)).toFixed(2)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
