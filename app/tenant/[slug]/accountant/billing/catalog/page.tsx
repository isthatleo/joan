"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import { AlertTriangle, CheckCircle2, CreditCard, Loader2, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { resolveTenantSlug } from "@/lib/tenant-routing";

type LabTariff = { key: string; price: string };
type MedicationOverride = { key: string; price: string };

type CoverageData = {
  currency: string;
  missingLabTariffs: Array<{ testCode: string; testName: string; orderCount: number }>;
  missingMedicationPrices: Array<{ medicationId: string; medicationName: string; source: "inventory" | "prescription"; occurrenceCount: number }>;
};

type CatalogResponse = {
  currency: string;
  consultationFee: number;
  labDefaultFee: number;
  medicationDefaultUnitPrice: number;
  labTests?: Record<string, number>;
  medicationPrices?: Record<string, number>;
  coverage?: CoverageData;
};

const moneyPattern = /^\d+(\.\d{0,2})?$/;

export default function AccountantPricingCatalogPage() {
  const params = useParams();
  const pathname = usePathname();
  const hostname = typeof window !== "undefined" ? window.location.hostname : null;
  const fallbackSlug = typeof window !== "undefined" ? sessionStorage.getItem("active_tenant_slug") : null;
  const slug = String(resolveTenantSlug(pathname, hostname, (params?.slug as string | undefined) || fallbackSlug || undefined) || "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [consultationFee, setConsultationFee] = useState("0.00");
  const [labDefaultFee, setLabDefaultFee] = useState("0.00");
  const [medicationDefaultUnitPrice, setMedicationDefaultUnitPrice] = useState("0.00");
  const [labTariffs, setLabTariffs] = useState<LabTariff[]>([]);
  const [medicationOverrides, setMedicationOverrides] = useState<MedicationOverride[]>([]);
  const [coverage, setCoverage] = useState<CoverageData | null>(null);

  const hasInvalidRows = useMemo(
    () =>
      labTariffs.some((row) => !row.key.trim() || !moneyPattern.test(row.price)) ||
      medicationOverrides.some((row) => !row.key.trim() || !moneyPattern.test(row.price)) ||
      !moneyPattern.test(consultationFee) ||
      !moneyPattern.test(labDefaultFee) ||
      !moneyPattern.test(medicationDefaultUnitPrice),
    [consultationFee, labDefaultFee, labTariffs, medicationDefaultUnitPrice, medicationOverrides]
  );

  const fetchCatalog = async (silent = false) => {
    if (!slug) return;
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const res = await fetch(`/api/tenant/${slug}/accountant/billing/catalog`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load pricing catalog");
      const data = (await res.json()) as CatalogResponse;
      setCurrency(data.currency || "USD");
      setConsultationFee(Number(data.consultationFee || 0).toFixed(2));
      setLabDefaultFee(Number(data.labDefaultFee || 0).toFixed(2));
      setMedicationDefaultUnitPrice(Number(data.medicationDefaultUnitPrice || 0).toFixed(2));
      setLabTariffs(
        Object.entries(data.labTests || {}).map(([key, price]) => ({
          key,
          price: Number(price || 0).toFixed(2),
        }))
      );
      setMedicationOverrides(
        Object.entries(data.medicationPrices || {}).map(([key, price]) => ({
          key,
          price: Number(price || 0).toFixed(2),
        }))
      );
      setCoverage(data.coverage || null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load pricing catalog");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [slug]);

  const saveCatalog = async () => {
    if (!slug || hasInvalidRows) return;
    setSaving(true);
    try {
      const labTests = Object.fromEntries(labTariffs.filter((row) => row.key.trim()).map((row) => [row.key.trim(), Number(row.price)]));
      const medicationPrices = Object.fromEntries(
        medicationOverrides.filter((row) => row.key.trim()).map((row) => [row.key.trim(), Number(row.price)])
      );

      const res = await fetch(`/api/tenant/${slug}/accountant/billing/catalog`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultationFee: Number(consultationFee),
          labDefaultFee: Number(labDefaultFee),
          medicationDefaultUnitPrice: Number(medicationDefaultUnitPrice),
          labTests,
          medicationPrices,
        }),
      });
      if (!res.ok) throw new Error("Failed to save pricing catalog");
      toast.success("Pricing catalog updated");
      await fetchCatalog(true);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save pricing catalog");
    } finally {
      setSaving(false);
    }
  };

  const moneyLabel = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground">Accountant Billing Control</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Pricing Catalog</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Set consultation fees, lab tariffs, and medication overrides. Currency is inherited from hospital admin tenant settings.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fetchCatalog(true)} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            disabled={saving || hasInvalidRows}
            onClick={saveCatalog}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Pricing
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Tenant Currency</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">{currency}</p>
          <p className="mt-2 text-xs text-muted-foreground">Managed by hospital admin system settings.</p>
        </div>
        <MetricCard label="Consultation Fee" value={moneyLabel(Number(consultationFee))} />
        <MetricCard label="Lab Default" value={moneyLabel(Number(labDefaultFee))} />
        <MetricCard label="Medication Default" value={moneyLabel(Number(medicationDefaultUnitPrice))} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Core Service Pricing</h2>
                <p className="text-sm text-muted-foreground">These values drive patient-care ledger totals before payment and dispensing clearance.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <MoneyField label="Consultation Fee" value={consultationFee} onChange={setConsultationFee} currency={currency} />
              <MoneyField label="Lab Default Fee" value={labDefaultFee} onChange={setLabDefaultFee} currency={currency} />
              <MoneyField label="Medication Default Unit Price" value={medicationDefaultUnitPrice} onChange={setMedicationDefaultUnitPrice} currency={currency} />
            </div>
          </section>

          <CatalogEditor
            title="Per-Test Lab Tariffs"
            description="Override lab pricing by test code or exact test name."
            rows={labTariffs}
            setRows={setLabTariffs}
            keyPlaceholder="CBC or Complete Blood Count"
            currency={currency}
          />

          <CatalogEditor
            title="Medication Price Overrides"
            description="Override medication pricing when inventory metadata lacks a unit price."
            rows={medicationOverrides}
            setRows={setMedicationOverrides}
            keyPlaceholder="inventory-item-id or medication name"
            currency={currency}
          />
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Coverage Review</h2>
                <p className="text-sm text-muted-foreground">Open gaps that still rely on default pricing.</p>
              </div>
            </div>
            <div className="space-y-4">
              <CoverageList
                title="Missing Lab Tariffs"
                emptyLabel="All lab orders have explicit tariffs."
                items={(coverage?.missingLabTariffs || []).map((item) => ({
                  id: item.testCode || item.testName,
                  title: item.testCode ? `${item.testName} (${item.testCode})` : item.testName,
                  meta: `${item.orderCount} order(s) using default lab fee`,
                }))}
              />
              <CoverageList
                title="Missing Medication Prices"
                emptyLabel="All billed medications have a concrete unit price."
                items={(coverage?.missingMedicationPrices || []).map((item) => ({
                  id: item.medicationId,
                  title: item.medicationName,
                  meta: `${item.occurrenceCount} occurrence(s) • source: ${item.source}`,
                }))}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Validation Rules</h2>
                <p className="text-sm text-muted-foreground">These controls keep pricing stable across pharmacist and accountant workflows.</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>- Currency is read-only here and comes from tenant system settings.</li>
              <li>- All amounts accept up to 2 decimal places.</li>
              <li>- Test tariffs match on exact test code or exact test name.</li>
              <li>- Medication overrides can target inventory item id or medication name.</li>
            </ul>
          </section>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function MoneyField({
  label,
  value,
  onChange,
  currency,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  currency: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex h-11 items-center rounded-lg border border-border bg-background px-3">
        <span className="mr-2 text-xs font-semibold uppercase text-muted-foreground">{currency}</span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-transparent text-sm text-foreground outline-none"
          inputMode="decimal"
        />
      </div>
    </label>
  );
}

function CatalogEditor({
  title,
  description,
  rows,
  setRows,
  keyPlaceholder,
  currency,
}: {
  title: string;
  description: string;
  rows: Array<{ key: string; price: string }>;
  setRows: React.Dispatch<React.SetStateAction<Array<{ key: string; price: string }>>>;
  keyPlaceholder: string;
  currency: string;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <button
          onClick={() => setRows((current) => [...current, { key: "", price: "0.00" }])}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No overrides yet.</p> : null}
        {rows.map((row, index) => (
          <div key={`${title}-${index}`} className="grid gap-3 rounded-xl border border-border bg-background p-3 md:grid-cols-[1fr_180px_44px]">
            <input
              value={row.key}
              onChange={(event) =>
                setRows((current) => current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, key: event.target.value } : entry)))
              }
              placeholder={keyPlaceholder}
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none"
            />
            <div className="flex h-11 items-center rounded-lg border border-border bg-background px-3">
              <span className="mr-2 text-xs font-semibold uppercase text-muted-foreground">{currency}</span>
              <input
                value={row.price}
                onChange={(event) =>
                  setRows((current) => current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, price: event.target.value } : entry)))
                }
                inputMode="decimal"
                className="w-full bg-transparent text-sm text-foreground outline-none"
              />
            </div>
            <button
              onClick={() => setRows((current) => current.filter((_, entryIndex) => entryIndex !== index))}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-600 hover:bg-red-500/15"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function CoverageList({
  title,
  emptyLabel,
  items,
}: {
  title: string;
  emptyLabel: string;
  items: Array<{ id: string; title: string; meta: string }>;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {items.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">{emptyLabel}</p> : null}
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-border px-3 py-2">
            <p className="text-sm font-medium text-foreground">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.meta}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
