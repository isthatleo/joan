"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Shield, Users, Wallet } from "lucide-react";
import { ProfileModeToggle } from "@/components/ProfileModeToggle";

type FamilyData = {
  guardian: { fullName: string; email: string };
  familyMembers: Array<{ id: string; name: string; age: number; relationship: string; healthStatus: string; insuranceProvider?: string | null; nextAppointment?: string | null; outstandingAmount: number }>;
  coverage: { activePolicies: number; providers: string[]; outstandingAmount: number; recentPayments: Array<{ id: string; amount: number; method: string; status: string; processedAt?: string | null }> };
  currency: string;
  hasPatientRole?: boolean;
};

export default function GuardianFamilyPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [data, setData] = useState<FamilyData | null>(null);

  useEffect(() => {
    fetch(`/api/tenant/${slug}/guardian/family`, { cache: "no-store", credentials: "include" }).then((res) => res.json()).then(setData);
  }, [slug]);

  if (!data) return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading family workspace...</div>;

  return (
    <div className="space-y-6">
      <ProfileModeToggle currentMode="guardian" hasPatientRole={data.hasPatientRole} hasGuardianRole />
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">Family</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">Family coverage and care overview</h1>
        <p className="mt-2 text-sm text-muted-foreground">Insurance visibility, outstanding balances, and child-level care readiness in one place.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><Users className="h-5 w-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">Family members</p><p className="mt-1 text-3xl font-semibold text-foreground">{data.familyMembers.length}</p></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><Shield className="h-5 w-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">Active policies</p><p className="mt-1 text-3xl font-semibold text-foreground">{data.coverage.activePolicies}</p></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><Wallet className="h-5 w-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">Outstanding</p><p className="mt-1 text-3xl font-semibold text-foreground">{data.currency} {data.coverage.outstandingAmount.toFixed(2)}</p></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Family members</h2>
          <div className="mt-4 space-y-3">
            {data.familyMembers.map((member) => (
              <div key={member.id} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.relationship} • Age {member.age}</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium capitalize text-primary">{member.healthStatus}</span>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                  <p>{member.insuranceProvider || "No insurer"}</p>
                  <p>{member.nextAppointment ? new Date(member.nextAppointment).toLocaleDateString() : "No visit booked"}</p>
                  <p>{data.currency} {member.outstandingAmount.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Coverage providers</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {data.coverage.providers.length ? data.coverage.providers.map((provider) => <span key={provider} className="rounded-full border border-border px-3 py-1 text-sm text-foreground">{provider}</span>) : <p className="text-sm text-muted-foreground">No linked insurance policies.</p>}
          </div>
          <h3 className="mt-6 text-sm font-semibold text-foreground">Recent payments</h3>
          <div className="mt-3 space-y-3">
            {data.coverage.recentPayments.length ? data.coverage.recentPayments.map((payment) => (
              <div key={payment.id} className="rounded-2xl border border-border bg-background p-4 text-sm">
                <p className="font-medium text-foreground">{data.currency} {payment.amount.toFixed(2)}</p>
                <p className="text-muted-foreground">{payment.method.replace(/_/g, " ")} • {payment.status}</p>
              </div>
            )) : <div className="rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground">No recorded payments yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
