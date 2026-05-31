"use client";

import { useState } from "react";

export type PlanFormValue = {
  name: string;
  code: string;
  description: string;
  currency: string;
  monthlyPrice: string;
  yearlyPrice: string;
  staffLimit: string;
  clientLimit: string;
  storageGb: string;
  supportLevel: string;
  billingCycle: "monthly" | "yearly";
  isActive: boolean;
  isDefault: boolean;
  features: string[];
  modules: string[];
};

export const emptyPlan: PlanFormValue = {
  name: "",
  code: "",
  description: "",
  currency: "USD",
  monthlyPrice: "0",
  yearlyPrice: "0",
  staffLimit: "0",
  clientLimit: "0",
  storageGb: "0",
  supportLevel: "standard",
  billingCycle: "monthly",
  isActive: true,
  isDefault: false,
  features: [],
  modules: [],
};

export function normalizePlanPayload(form: PlanFormValue) {
  return {
    ...form,
    monthlyPrice: Number(form.monthlyPrice || 0),
    yearlyPrice: Number(form.yearlyPrice || 0),
    staffLimit: Number(form.staffLimit || 0),
    clientLimit: Number(form.clientLimit || 0),
    storageGb: Number(form.storageGb || 0),
  };
}

export function PlanForm({ value, onChange, submitting, submitLabel }: {
  value: PlanFormValue;
  onChange: (value: PlanFormValue) => void;
  submitting?: boolean;
  submitLabel: string;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Plan name" value={value.name} onChange={(name) => onChange({ ...value, name, code: value.code || name.toLowerCase().replace(/[\s-]+/g, "_") })} required />
        <Field label="Code" value={value.code} onChange={(code) => onChange({ ...value, code })} required />
        <Field label="Currency" value={value.currency} onChange={(currency) => onChange({ ...value, currency: currency.toUpperCase().slice(0, 3) })} required />
        <Select label="Billing cycle" value={value.billingCycle} onChange={(billingCycle) => onChange({ ...value, billingCycle: billingCycle as "monthly" | "yearly" })} options={["monthly", "yearly"]} />
        <Field label="Monthly price" value={value.monthlyPrice} onChange={(monthlyPrice) => onChange({ ...value, monthlyPrice })} type="number" />
        <Field label="Yearly price" value={value.yearlyPrice} onChange={(yearlyPrice) => onChange({ ...value, yearlyPrice })} type="number" />
        <Field label="Staff limit" value={value.staffLimit} onChange={(staffLimit) => onChange({ ...value, staffLimit })} type="number" />
        <Field label="Client/patient limit" value={value.clientLimit} onChange={(clientLimit) => onChange({ ...value, clientLimit })} type="number" />
        <Field label="Storage GB" value={value.storageGb} onChange={(storageGb) => onChange({ ...value, storageGb })} type="number" />
        <Field label="Support level" value={value.supportLevel} onChange={(supportLevel) => onChange({ ...value, supportLevel })} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-foreground">Description</label>
        <textarea value={value.description} onChange={(event) => onChange({ ...value, description: event.target.value })} className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-orange-300" />
      </div>
      <ChipEditor label="Features" items={value.features} onChange={(features) => onChange({ ...value, features })} placeholder="Add feature and press Enter" />
      <ChipEditor label="Modules" items={value.modules} onChange={(modules) => onChange({ ...value, modules })} placeholder="Add module and press Enter" />
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground"><input type="checkbox" checked={value.isActive} onChange={(e) => onChange({ ...value, isActive: e.target.checked })} /> Active</label>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground"><input type="checkbox" checked={value.isDefault} onChange={(e) => onChange({ ...value, isDefault: e.target.checked })} /> Default plan</label>
      </div>
      <button disabled={submitting} className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {submitting ? "Saving..." : submitLabel}
      </button>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-semibold text-foreground">{label}{required ? " *" : ""}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-orange-300" /></label>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-semibold text-foreground">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-orange-300">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function ChipEditor({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (items: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  function add() {
    const next = draft.trim();
    if (!next || items.includes(next)) return;
    onChange([...items, next]);
    setDraft("");
  }
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-foreground">{label}</label>
      <div className="flex gap-2">
        <input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add(); } }} placeholder={placeholder} className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-orange-300" />
        <button type="button" onClick={add} className="rounded-lg border border-border px-3 text-sm font-semibold">Add</button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => <button key={item} type="button" onClick={() => onChange(items.filter((x) => x !== item))} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{item} ×</button>)}
      </div>
    </div>
  );
}
