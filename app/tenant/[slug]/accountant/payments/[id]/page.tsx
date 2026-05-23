"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CreditCard, FileText, Loader2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { useTenantPath } from "@/hooks/useTenantPath";

export default function PaymentDetailPage() {
  const params = useParams();
  const tenantPath = useTenantPath();
  const slug = params?.slug as string;
  const id = params?.id as string;
  const [payment, setPayment] = useState<any>(null);
  const [processingRefund, setProcessingRefund] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/tenant/${slug}/accountant/payments/${id}`);
    if (res.ok) setPayment(await res.json());
  };

  useEffect(() => {
    void load();
  }, [slug, id]);

  const refund = async () => {
    const amount = prompt("Enter refund amount", String(payment.amount || 0));
    if (!amount) return;
    setProcessingRefund(true);
    try {
      const res = await fetch(`/api/tenant/${slug}/accountant/payments/${id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount) }),
      });
      if (!res.ok) throw new Error("Failed to refund payment");
      toast.success("Refund processed");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to refund payment");
    } finally {
      setProcessingRefund(false);
    }
  };

  if (!payment) return <div className="flex h-full items-center justify-center"><Loader2 className="size-5 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={tenantPath("/accountant/payments")} className="rounded-lg border border-border p-2 hover:bg-muted"><ArrowLeft className="size-4" /></Link>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Payment Detail</p>
            <h1 className="text-3xl font-bold">Payment #{payment.id}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={tenantPath(`/accountant/payments/${id}/edit`)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">Edit Payment</Link>
          {payment.status === "completed" ? <button onClick={refund} disabled={processingRefund} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{processingRefund ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}Refund</button> : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2 space-y-6">
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><CreditCard className="size-5" />Payment Summary</h2>
            <div className="grid gap-4 md:grid-cols-2 text-sm">
              <div><p className="text-muted-foreground">Patient</p><p className="font-medium">{payment.patientName}</p></div>
              <div><p className="text-muted-foreground">Patient Email</p><p className="font-medium">{payment.patientEmail || "-"}</p></div>
              <div><p className="text-muted-foreground">Invoice</p><p className="font-medium">{payment.invoiceNumber || payment.invoiceId || "-"}</p></div>
              <div><p className="text-muted-foreground">Method</p><p className="font-medium capitalize">{String(payment.method || "").replace(/_/g, " ")}</p></div>
              <div><p className="text-muted-foreground">Status</p><p className="font-medium capitalize">{payment.status}</p></div>
              <div><p className="text-muted-foreground">Transaction ID</p><p className="font-medium">{payment.transactionId || "-"}</p></div>
              <div><p className="text-muted-foreground">Created</p><p className="font-medium">{payment.createdAt ? new Date(payment.createdAt).toLocaleString() : "-"}</p></div>
              <div><p className="text-muted-foreground">Processed</p><p className="font-medium">{payment.processedAt ? new Date(payment.processedAt).toLocaleString() : "-"}</p></div>
            </div>
          </div>

          <div>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><FileText className="size-5" />Notes</h2>
            <div className="rounded-lg border border-border bg-background/50 p-4 text-sm text-muted-foreground">{payment.notes || "No notes recorded for this payment."}</div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm font-semibold">Amounts</p>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span>${Number(payment.amount || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Fee</span><span>${Number(payment.fee || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Refunded</span><span>${Number(payment.refundAmount || 0).toFixed(2)}</span></div>
            <div className="flex justify-between border-t border-border pt-3 font-semibold"><span>Net Captured</span><span>${Math.max(0, Number(payment.amount || 0) - Number(payment.refundAmount || 0)).toFixed(2)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
