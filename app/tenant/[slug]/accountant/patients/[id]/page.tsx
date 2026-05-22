"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function AccountantPatientDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const id = params?.id as string;
  const [patients, setPatients] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [patientsRes, invoicesRes, paymentsRes] = await Promise.all([
        fetch(`/api/tenant/${slug}/accountant/patients`),
        fetch(`/api/tenant/${slug}/accountant/billing/invoices`),
        fetch(`/api/tenant/${slug}/accountant/payments`),
      ]);
      if (patientsRes.ok) setPatients(await patientsRes.json());
      if (invoicesRes.ok) setInvoices(await invoicesRes.json());
      if (paymentsRes.ok) setPayments(await paymentsRes.json());
      setLoading(false);
    };
    void load();
  }, [slug]);

  const patient = useMemo(() => patients.find((item) => item.id === id), [patients, id]);
  const patientInvoices = invoices.filter((item) => item.patientId === id);
  const patientPayments = payments.filter((item) => item.patientId === id);

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="size-5 animate-spin" /></div>;
  if (!patient) return <div className="text-sm text-muted-foreground">Patient account not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/tenant/${slug}/accountant/patients`} className="rounded-lg border border-border p-2 hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Patient Billing Detail</p>
          <h1 className="text-3xl font-bold">{patient.full_name}</h1>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="font-semibold">Account Summary</p>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{patient.email}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{patient.phone || "-"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Outstanding</span><span>${patient.totalOutstanding.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span>${patient.totalPaid.toFixed(2)}</span></div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <p className="font-semibold">Recent Invoices</p>
          <div className="mt-4 space-y-3">
            {patientInvoices.length ? patientInvoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div><p className="font-medium">{invoice.invoiceNumber || invoice.id}</p><p className="text-xs text-muted-foreground">{invoice.status}</p></div>
                <span>${Number(invoice.totalAmount || 0).toFixed(2)}</span>
              </div>
            )) : <p className="text-sm text-muted-foreground">No invoices found for this patient.</p>}
          </div>
          <p className="mt-6 font-semibold">Recent Payments</p>
          <div className="mt-4 space-y-3">
            {patientPayments.length ? patientPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div><p className="font-medium">{payment.id}</p><p className="text-xs text-muted-foreground">{payment.method}</p></div>
                <span>${Number(payment.amount || 0).toFixed(2)}</span>
              </div>
            )) : <p className="text-sm text-muted-foreground">No payments found for this patient.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
