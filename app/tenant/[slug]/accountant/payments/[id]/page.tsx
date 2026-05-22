"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function PaymentDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const id = params?.id as string;
  const [payment, setPayment] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/tenant/${slug}/accountant/payments/${id}`);
      if (res.ok) setPayment(await res.json());
    };
    void load();
  }, [slug, id]);

  if (!payment) return <div className="flex h-full items-center justify-center"><Loader2 className="size-5 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/tenant/${slug}/accountant/payments`} className="rounded-lg border border-border p-2 hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Payment Detail</p>
          <h1 className="text-3xl font-bold">Payment #{payment.id}</h1>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6 space-y-3">
          <div className="flex justify-between"><span className="text-muted-foreground">Patient</span><span>{payment.patientName}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Invoice</span><span>{payment.invoiceNumber || payment.invoiceId}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span>{payment.method}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span>{payment.status}</span></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 space-y-3">
          <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span>${Number(payment.amount || 0).toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Fee</span><span>${Number(payment.fee || 0).toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Refunded</span><span>${Number(payment.refundAmount || 0).toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span>{payment.createdAt ? new Date(payment.createdAt).toLocaleString() : "-"}</span></div>
        </div>
      </div>
    </div>
  );
}
