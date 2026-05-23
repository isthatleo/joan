"use client";

import { ChangeEvent, ReactNode, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Eye,
  ImagePlus,
  LayoutTemplate,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { useTenantPath } from "@/hooks/useTenantPath";

const DATASETS = [
  { value: "financial-summary", label: "Financial Summary" },
  { value: "monthly-close-pack", label: "Monthly Close Pack" },
  { value: "revenue-analysis", label: "Revenue Analysis" },
  { value: "billing-report", label: "Billing & Collections" },
  { value: "invoice-aging", label: "Invoice Aging" },
  { value: "collections-performance", label: "Collections Performance" },
  { value: "insurance-claims", label: "Insurance Claims" },
  { value: "expense-summary", label: "Expense Summary" },
  { value: "vendor-spend-analysis", label: "Vendor Spend Analysis" },
  { value: "budget-vs-actual", label: "Budget vs Actual" },
  { value: "payment-methods", label: "Payment Methods" },
  { value: "patient-financial", label: "Patient Financial" },
  { value: "accounts-payable-aging", label: "Accounts Payable Aging" },
  { value: "tax-summary", label: "Tax Summary" },
  { value: "journal-audit", label: "Journal Audit" },
  { value: "cash-flow-statement", label: "Cash Flow Statement" },
];

const LAYOUTS = [
  { value: "custom-branded", label: "Branded Executive" },
  { value: "executive-pack", label: "Board Pack" },
  { value: "scorecard", label: "Finance Scorecard" },
  { value: "statement", label: "Statement Layout" },
  { value: "operations", label: "Operations Brief" },
];

const AUDIENCES = [
  "Executive leadership",
  "Board finance committee",
  "Department finance leads",
  "External auditors",
  "Revenue cycle operations",
];

const DELIVERY_MODES = ["PDF", "Web view", "Scheduled email", "Print-ready"];

const DEFAULT_FORM = {
  name: "",
  description: "",
  type: "custom",
  category: "Custom",
  frequency: "monthly",
  estimatedTime: "3-5 minutes",
  dataset: "financial-summary",
  accent: "#f97316",
  layout: "custom-branded",
  logoUrl: "",
  letterheadTitle: "Finance & Performance Office",
  letterheadSubtitle: "Strategic reporting pack",
  footerPrimary: "Confidential. For authorized internal use only.",
  footerSecondary: "Prepared by the finance transformation office.",
  watermarkText: "CONFIDENTIAL",
  coverNote: "Purpose-built for finance reviews, audits, and leadership briefings.",
  signoffName: "Chief Financial Officer",
  signoffTitle: "Finance Leadership",
  audience: "Executive leadership",
  deliveryMode: "PDF",
  complianceNote: "Prepared under internal financial controls and reporting governance standards.",
  narrativeFocus: "Revenue integrity, cash visibility, budget adherence, and executive decision support.",
  sectionHighlights: "Executive summary, KPI scorecard, variance analysis, and management sign-off.",
  includeHighlights: true,
  includeSignatureBlock: true,
  includeGeneratedTimestamp: true,
};

type TemplateForm = typeof DEFAULT_FORM;

export default function CustomReportPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const tenantPath = useTenantPath();
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<TemplateForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [refreshingDesigner, setRefreshingDesigner] = useState(false);

  const update = <K extends keyof TemplateForm>(key: K, value: TemplateForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const preview = useMemo(
    () => ({
      title: form.name || "Untitled Executive Finance Template",
      accent: form.accent,
      footerPrimary: form.footerPrimary || DEFAULT_FORM.footerPrimary,
      footerSecondary: form.footerSecondary || DEFAULT_FORM.footerSecondary,
      letterheadTitle: form.letterheadTitle || DEFAULT_FORM.letterheadTitle,
      letterheadSubtitle: form.letterheadSubtitle || DEFAULT_FORM.letterheadSubtitle,
      coverNote: form.coverNote || DEFAULT_FORM.coverNote,
      watermarkText: form.watermarkText || DEFAULT_FORM.watermarkText,
      complianceNote: form.complianceNote || DEFAULT_FORM.complianceNote,
      narrativeFocus: form.narrativeFocus || DEFAULT_FORM.narrativeFocus,
      sectionHighlights: form.sectionHighlights || DEFAULT_FORM.sectionHighlights,
    }),
    [form]
  );

  async function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("type", "logo");

      const response = await fetch(`/api/tenants/${slug}/branding`, {
        method: "POST",
        body,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to upload logo");
      }

      update("logoUrl", payload.url);
      toast.success("Logo uploaded");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload logo";
      toast.error(message);
    } finally {
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
      setUploadingLogo(false);
    }
  }

  function resetDesigner() {
    setRefreshingDesigner(true);
    setForm(DEFAULT_FORM);
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
    toast.success("Template designer reset");
    window.setTimeout(() => setRefreshingDesigner(false), 500);
  }

  async function saveTemplate(generateAfterSave: boolean) {
    setSaving(true);
    try {
      const templateRes = await fetch(`/api/tenant/${slug}/accountant/reports/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          type: form.type,
          category: form.category,
          frequency: form.frequency,
          estimatedTime: form.estimatedTime,
          config: {
            dataset: form.dataset,
            accent: form.accent,
            layout: form.layout,
            audience: form.audience,
            deliveryMode: form.deliveryMode,
            complianceNote: form.complianceNote,
            narrativeFocus: form.narrativeFocus,
            sectionHighlights: form.sectionHighlights,
            includeHighlights: form.includeHighlights,
            includeSignatureBlock: form.includeSignatureBlock,
            includeGeneratedTimestamp: form.includeGeneratedTimestamp,
            branding: {
              logoUrl: form.logoUrl,
              letterheadTitle: form.letterheadTitle,
              letterheadSubtitle: form.letterheadSubtitle,
              footerPrimary: form.footerPrimary,
              footerSecondary: form.footerSecondary,
              watermarkText: form.watermarkText,
              coverNote: form.coverNote,
              signoffName: form.signoffName,
              signoffTitle: form.signoffTitle,
            },
          },
        }),
      });

      const templatePayload = await templateRes.json().catch(() => null);
      if (!templateRes.ok) throw new Error(templatePayload?.error || "Failed to save template");

      if (generateAfterSave) {
        const generateRes = await fetch(`/api/tenant/${slug}/accountant/reports/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: templatePayload.id,
            format: "pdf",
            type: form.type,
            name: form.name,
            description: form.description,
          }),
        });

        const generatePayload = await generateRes.json().catch(() => null);
        if (!generateRes.ok) {
          throw new Error(generatePayload?.error || "Failed to generate report");
        }

        toast.success("Template saved and report generated");
      } else {
        toast.success("Custom template saved");
      }

      router.push(tenantPath("/accountant/reports"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save custom report template";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(tenantPath("/accountant/reports"))}
            className="rounded-lg border border-border p-2 hover:bg-muted"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Custom Template Designer</p>
            <h1 className="text-3xl font-bold text-foreground">Build a finance-grade report template</h1>
          </div>
        </div>
        <button
          type="button"
          onClick={resetDesigner}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
        >
          <RefreshCw className={`size-4 ${refreshingDesigner ? "animate-spin" : ""}`} />
          Refresh Designer
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-5 rounded-xl border border-border bg-card p-6">
          <SectionHeader
            icon={<LayoutTemplate className="size-4 text-orange-600" />}
            title="Template Identity"
            description="Define how this template is classified, who it serves, and how finance teams will reuse it."
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextField label="Template name" value={form.name} onChange={(value) => update("name", value)} placeholder="Executive monthly close pack" />
            <TextField label="Category" value={form.category} onChange={(value) => update("category", value)} placeholder="Board reporting" />
            <SelectField label="Report type" value={form.type} onChange={(value) => update("type", value)} options={["custom", "financial", "billing", "patient", "operational"]} />
            <SelectField label="Frequency" value={form.frequency} onChange={(value) => update("frequency", value)} options={["daily", "weekly", "monthly", "quarterly", "custom"]} />
            <SelectField
              label="Dataset"
              value={form.dataset}
              onChange={(value) => update("dataset", value)}
              options={DATASETS.map((dataset) => ({ value: dataset.value, label: dataset.label }))}
            />
            <SelectField
              label="Layout"
              value={form.layout}
              onChange={(value) => update("layout", value)}
              options={LAYOUTS.map((layout) => ({ value: layout.value, label: layout.label }))}
            />
            <TextField label="Estimated build time" value={form.estimatedTime} onChange={(value) => update("estimatedTime", value)} placeholder="3-5 minutes" />
            <SelectField label="Primary audience" value={form.audience} onChange={(value) => update("audience", value)} options={AUDIENCES} />
            <SelectField label="Delivery mode" value={form.deliveryMode} onChange={(value) => update("deliveryMode", value)} options={DELIVERY_MODES} />
          </div>

          <TextAreaField
            label="Template purpose"
            value={form.description}
            onChange={(value) => update("description", value)}
            placeholder="Describe the report use case, target audience, data narrative, and decision outcome."
          />

          <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-5">
            <SectionHeader
              icon={<Sparkles className="size-4 text-orange-600" />}
              title="Brand System"
              description="Control the visual identity of the report pack, including logo, letterhead, watermark, and footer treatment."
            />
            <div className="rounded-2xl border border-dashed border-border bg-background p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex size-20 items-center justify-center overflow-hidden rounded-2xl border border-border bg-slate-50">
                    {form.logoUrl ? (
                      <img src={form.logoUrl} alt="Template logo" className="h-full w-full object-contain" />
                    ) : (
                      <Building2 className="size-8 text-slate-300" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Logo asset</p>
                    <p className="text-xs text-muted-foreground">SVG, PNG, or JPG. Max 2MB. Stored under tenant branding uploads.</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept=".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg"
                    onChange={uploadLogo}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    <ImagePlus className="size-4" />
                    {uploadingLogo ? "Uploading..." : "Upload Logo"}
                  </button>
                  <button
                    type="button"
                    onClick={() => update("logoUrl", "")}
                    className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <TextField label="Letterhead title" value={form.letterheadTitle} onChange={(value) => update("letterheadTitle", value)} placeholder="Finance & Performance Office" />
              <TextField label="Letterhead subtitle" value={form.letterheadSubtitle} onChange={(value) => update("letterheadSubtitle", value)} placeholder="Strategic reporting pack" />
              <TextField label="Accent color" value={form.accent} onChange={(value) => update("accent", value)} placeholder="#f97316" />
              <TextField label="Watermark text" value={form.watermarkText} onChange={(value) => update("watermarkText", value)} placeholder="CONFIDENTIAL" />
            </div>
            <TextAreaField label="Cover note" value={form.coverNote} onChange={(value) => update("coverNote", value)} placeholder="Executive intro shown at the top of the report." />
            <TextAreaField label="Primary footer note" value={form.footerPrimary} onChange={(value) => update("footerPrimary", value)} placeholder="Confidential notice or ownership statement." />
            <TextAreaField label="Secondary footer note" value={form.footerSecondary} onChange={(value) => update("footerSecondary", value)} placeholder="Prepared by or distribution notice." />
          </div>

          <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-5">
            <SectionHeader
              icon={<ShieldCheck className="size-4 text-orange-600" />}
              title="Narrative, Governance, and Sign-Off"
              description="Make the template operationally useful by defining reporting focus, governance notes, and approval details."
            />
            <TextAreaField
              label="Narrative focus"
              value={form.narrativeFocus}
              onChange={(value) => update("narrativeFocus", value)}
              placeholder="What story should the report consistently tell?"
            />
            <TextAreaField
              label="Section highlights"
              value={form.sectionHighlights}
              onChange={(value) => update("sectionHighlights", value)}
              placeholder="List the core modules and sections expected in this report."
            />
            <TextAreaField
              label="Compliance note"
              value={form.complianceNote}
              onChange={(value) => update("complianceNote", value)}
              placeholder="Internal control, audit, or policy language."
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <TextField label="Sign-off name" value={form.signoffName} onChange={(value) => update("signoffName", value)} placeholder="Chief Financial Officer" />
              <TextField label="Sign-off title" value={form.signoffTitle} onChange={(value) => update("signoffTitle", value)} placeholder="Finance Leadership" />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 text-sm">
              <ToggleCard
                label="Highlights section"
                checked={form.includeHighlights}
                onChange={(checked) => update("includeHighlights", checked)}
              />
              <ToggleCard
                label="Signature block"
                checked={form.includeSignatureBlock}
                onChange={(checked) => update("includeSignatureBlock", checked)}
              />
              <ToggleCard
                label="Generated timestamp"
                checked={form.includeGeneratedTimestamp}
                onChange={(checked) => update("includeGeneratedTimestamp", checked)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Eye className="size-4 text-orange-600" />
              Live Direction Preview
            </div>
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_42%,#eff6ff_100%)] p-5 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
              <div className="rounded-[24px] border border-white/80 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-start justify-between gap-4 border-b pb-4" style={{ borderColor: `${preview.accent}30` }}>
                  <div className="flex items-start gap-4">
                    <div className="flex size-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      {form.logoUrl ? (
                        <img src={form.logoUrl} alt="Template logo preview" className="h-full w-full object-contain" />
                      ) : (
                        <Building2 className="size-6 text-slate-300" />
                      )}
                    </div>
                    <div>
                      <div className="mb-2 inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em]" style={{ backgroundColor: `${preview.accent}18`, color: preview.accent }}>
                        {form.type} report
                      </div>
                      <h2 className="text-xl font-bold text-slate-900">{preview.title}</h2>
                      <p className="mt-1 text-sm text-slate-500">{preview.letterheadTitle}</p>
                      <p className="text-xs text-slate-400">{preview.letterheadSubtitle}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <p>{preview.watermarkText}</p>
                    <p>{LAYOUTS.find((item) => item.value === form.layout)?.label}</p>
                    <p>{form.deliveryMode}</p>
                  </div>
                </div>

                <p className="rounded-2xl px-4 py-3 text-sm text-slate-600" style={{ backgroundColor: `${preview.accent}10` }}>
                  {preview.coverNote}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    { label: "Audience", value: form.audience },
                    { label: "Dataset", value: DATASETS.find((item) => item.value === form.dataset)?.label || form.dataset },
                    { label: "Frequency", value: form.frequency },
                    { label: "Delivery", value: form.deliveryMode },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{item.value}</p>
                    </div>
                  ))}
                </div>

                {form.includeHighlights && (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Highlights</p>
                    <p className="mt-2 text-sm text-slate-700">{preview.sectionHighlights}</p>
                  </div>
                )}

                <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Governance note</p>
                  <p className="mt-2 text-sm text-slate-700">{preview.complianceNote}</p>
                  <p className="mt-3 text-sm text-slate-600">{preview.narrativeFocus}</p>
                </div>

                {form.includeSignatureBlock && (
                  <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Approved by</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{form.signoffName || DEFAULT_FORM.signoffName}</p>
                    <p className="text-xs text-slate-500">{form.signoffTitle || DEFAULT_FORM.signoffTitle}</p>
                  </div>
                )}

                <div className="mt-5 border-t pt-4 text-xs text-slate-500">
                  <p>{preview.footerPrimary}</p>
                  <p className="mt-1">{preview.footerSecondary}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            This template is saved for later reuse in the accountant reports library. The uploaded logo, letterhead, footer notes, and sign-off settings will follow the template when reports are generated.
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          disabled={saving || !form.name.trim()}
          onClick={() => saveTemplate(false)}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-60"
        >
          <Save className="size-4" />
          Save Template
        </button>
        <button
          disabled={saving || !form.name.trim()}
          onClick={() => saveTemplate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          <Wand2 className="size-4" />
          Save And Generate
        </button>
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {title}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-border bg-background px-3"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<string | { value: string; label: string }>;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-border bg-background px-3"
      >
        {options.map((option) => {
          if (typeof option === "string") {
            return (
              <option key={option} value={option}>
                {option}
              </option>
            );
          }

          return (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function ToggleCard({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}
