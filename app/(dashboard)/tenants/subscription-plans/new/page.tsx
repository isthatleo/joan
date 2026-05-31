"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { emptyPlan, normalizePlanPayload, PlanForm, type PlanFormValue } from "../plan-form";

export default function NewSubscriptionPlanPage() {
  const router = useRouter();
  const [form, setForm] = useState<PlanFormValue>(emptyPlan);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/subscription-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(normalizePlanPayload(form)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to create plan");
      router.push(`/tenants/subscription-plans/${data.plan.id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to create plan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-subtle -m-6 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/tenants/subscription-plans" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to plans
        </Link>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-foreground">Create Subscription Plan</h1>
          <p className="mt-1 text-sm text-muted-foreground">Define pricing, limits, modules, and feature entitlements for tenant provisioning.</p>
          {error && <div className="my-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <form onSubmit={submit} className="mt-6">
            <PlanForm value={form} onChange={setForm} submitting={submitting} submitLabel="Create Plan" />
          </form>
        </div>
      </div>
    </div>
  );
}
