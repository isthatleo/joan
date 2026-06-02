"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Badge, Download, Eye, Loader2, Printer, RefreshCw, Search, ShieldCheck, Sparkles } from "lucide-react";
import { toPng } from "html-to-image";
import { useTenantPath } from "@/hooks/useTenantPath";
import { buildTenantUrl } from "@/lib/tenant-routing";

type StaffMember = {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  address?: string;
  avatar?: string | null;
  role: string;
  roleLabel: string;
  department: string;
  title: string;
  employeeId: string;
  licenseNumber?: string;
  emergencyContact?: string;
  startDate?: string;
  createdAt?: string;
  updatedAt?: string;
  isActive: boolean;
};

type EmployeeIdSettings = {
  codeType: "qr" | "barcode";
  cardTheme: "clinical" | "minimal" | "executive";
};

type DesignState = {
  accent: string;
  background: string;
  textColor: string;
  font: string;
  orientation: "horizontal" | "vertical";
  showEmergency: boolean;
  showLicense: boolean;
  showContact: boolean;
  showSignature: boolean;
  showHologram: boolean;
  showAccessBand: boolean;
  cornerRadius: number;
  pattern: "none" | "grid" | "radial" | "circuit";
  density: "compact" | "balanced" | "spacious";
};

const DEFAULT_ID_SETTINGS: EmployeeIdSettings = {
  codeType: "qr",
  cardTheme: "clinical",
};

const DEFAULT_DESIGN: DesignState = {
  accent: "#F97316",
  background: "#111827",
  textColor: "#FFFFFF",
  font: "ui-sans-serif",
  orientation: "horizontal",
  showEmergency: true,
  showLicense: true,
  showContact: true,
  showSignature: true,
  showHologram: true,
  showAccessBand: true,
  cornerRadius: 28,
  pattern: "circuit",
  density: "balanced",
};

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "ST";
}

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleDateString();
}

function cardPattern(pattern: DesignState["pattern"], accent: string) {
  if (pattern === "grid") return `linear-gradient(${accent}18 1px, transparent 1px), linear-gradient(90deg, ${accent}18 1px, transparent 1px)`;
  if (pattern === "radial") return `radial-gradient(circle at 20% 20%, ${accent}44, transparent 28%), radial-gradient(circle at 80% 5%, ${accent}33, transparent 24%)`;
  if (pattern === "circuit") return `linear-gradient(135deg, ${accent}22 0 1px, transparent 1px 14px), radial-gradient(circle at 84% 18%, ${accent}44, transparent 18%)`;
  return "none";
}

function densityClasses(density: DesignState["density"]) {
  if (density === "compact") return { shell: "p-5", gap: "mt-5", photo: "size-28", name: "text-2xl", footer: "px-5 py-3" };
  if (density === "spacious") return { shell: "p-8", gap: "mt-10", photo: "size-36", name: "text-4xl", footer: "px-8 py-5" };
  return { shell: "p-6", gap: "mt-8", photo: "size-32", name: "text-3xl", footer: "px-6 py-4" };
}

export default function StaffIdCardsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = String(params?.slug || "");
  const tenantPath = useTenantPath();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [settings, setSettings] = useState<EmployeeIdSettings>(DEFAULT_ID_SETTINGS);
  const [design, setDesign] = useState<DesignState>(DEFAULT_DESIGN);
  const [tenantName, setTenantName] = useState("Hospital");
  const [tenantLogo, setTenantLogo] = useState("");
  const [selectedId, setSelectedId] = useState(searchParams.get("staffId") || "");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const cardPrintRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [staffRes, settingsRes] = await Promise.all([
        fetch(`/api/tenant/${slug}/staff`, { credentials: "include", cache: "no-store" }),
        fetch(`/api/tenants/${slug}/settings`, { credentials: "include", cache: "no-store" }),
      ]);
      const staffData = await staffRes.json().catch(() => null);
      const settingsData = await settingsRes.json().catch(() => null);
      if (!staffRes.ok) throw new Error(staffData?.error || "Failed to load staff");
      if (!settingsRes.ok) throw new Error(settingsData?.error || "Failed to load tenant settings");
      const nextStaff = Array.isArray(staffData?.staff) ? staffData.staff : [];
      const employeeIds = settingsData?.branding?.employeeIds || {};
      setStaff(nextStaff);
      setSettings({ ...DEFAULT_ID_SETTINGS, ...employeeIds });
      setDesign((current) => ({
        ...current,
        accent: settingsData?.branding?.primaryColor || current.accent,
        background: employeeIds.cardTheme === "minimal" ? "#FFFFFF" : employeeIds.cardTheme === "executive" ? "#0F172A" : "#111827",
        textColor: employeeIds.cardTheme === "minimal" ? "#111827" : "#FFFFFF",
      }));
      setTenantName(settingsData?.branding?.hospitalName || settingsData?.tenant?.name || slug);
      setTenantLogo(settingsData?.branding?.logoUrl || settingsData?.tenant?.logoUrl || "");
      if (!selectedId && nextStaff[0]?.id) setSelectedId(nextStaff[0].id);
    } catch (loadError: any) {
      setError(loadError?.message || "Failed to load ID card data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) void load();
  }, [slug]);

  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((member) => !q || [member.fullName, member.email, member.employeeId, member.department, member.roleLabel, member.title].join(" ").toLowerCase().includes(q));
  }, [staff, search]);

  const selected = staff.find((member) => member.id === selectedId) || filteredStaff[0] || null;
  const cardNumber = selected ? `CARD-${selected.id.slice(0, 8).toUpperCase()}` : "";
  const verificationUrl = selected && typeof window !== "undefined"
    ? buildTenantUrl(String(slug), `/staff-id/${selected.id}?card=${encodeURIComponent(cardNumber)}`)
    : "";
  const codeData = encodeURIComponent(verificationUrl);
  const density = densityClasses(design.density);

  const exportSelected = async () => {
    if (!selected || !cardPrintRef.current) return;
    setExporting(true);
    try {
      const [{ jsPDF }] = await Promise.all([import("jspdf"), document.fonts?.ready ?? Promise.resolve()]);
      const image = await toPng(cardPrintRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        filter: (node) => !(node instanceof HTMLElement && node.dataset.exportIgnore === "true"),
      });
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(image, "PNG", 28, 28, pageWidth - 56, pageHeight - 56, undefined, "FAST");
      pdf.save(`staff-id-${selected.employeeId || selected.id}.pdf`);
    } catch (exportError) {
      console.error("Failed to export staff ID PDF:", exportError);
      alert("Failed to export PDF. Try print and choose Save as PDF.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="size-8 animate-spin text-orange-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Staff Management</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">Staff ID Card Designer</h1>
          <p className="mt-1 text-sm text-muted-foreground">Design printable company-grade front and back ID cards. QR/barcode scans open only the live staff ID front view.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={tenantPath("/staff-management")} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"><ArrowLeft className="size-4" /> Back</Link>
          <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"><RefreshCw className="size-4" /> Refresh</button>
          {verificationUrl ? <a href={verificationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"><Eye className="size-4" /> Scan View</a> : null}
          <button onClick={exportSelected} disabled={!selected || exporting} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60">{exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Export PDF</button>
          <button onClick={() => window.print()} disabled={!selected} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"><Printer className="size-4" /> Print ID</button>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .id-print-area, .id-print-area * { visibility: visible !important; }
          .id-print-area { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; padding: 24px !important; background: white !important; }
          .id-print-area section { break-inside: avoid; page-break-inside: avoid; box-shadow: none !important; }
          @page { size: A4 landscape; margin: 12mm; }
        }
      `}</style>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 print:hidden">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[340px_1fr_300px]">
        <aside className="rounded-2xl border border-border bg-card p-4 print:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search staff..." className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm" />
          </div>
          <div className="mt-4 max-h-[680px] space-y-2 overflow-y-auto pr-1">
            {filteredStaff.map((member) => (
              <button key={member.id} onClick={() => setSelectedId(member.id)} className={`w-full rounded-xl border px-3 py-3 text-left transition ${selected?.id === member.id ? "border-orange-300 bg-orange-50 text-orange-900 dark:bg-orange-500/10 dark:text-orange-100" : "border-border hover:bg-muted"}`}>
                <div className="flex items-center gap-3">
                  {member.avatar ? <img src={member.avatar} alt="" className="size-10 rounded-lg object-cover" /> : <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-xs font-bold">{initials(member.fullName)}</div>}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{member.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">{member.employeeId || "No employee ID"} - {member.roleLabel}</p>
                  </div>
                </div>
              </button>
            ))}
            {filteredStaff.length === 0 ? <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No staff members match your search.</div> : null}
          </div>
        </aside>

        <main className="rounded-2xl border border-border bg-card p-6">
          {!selected ? (
            <div className="py-20 text-center text-muted-foreground">Select a staff member to design an ID card.</div>
          ) : (
            <div ref={cardPrintRef} className="id-print-area mx-auto grid max-w-5xl gap-6 bg-card 2xl:grid-cols-2 print:grid-cols-2">
              <section className="relative overflow-hidden border border-border shadow-2xl print:shadow-none" style={{ fontFamily: design.font, background: design.background, color: design.textColor, borderRadius: design.cornerRadius }}>
                <div className="absolute inset-0 opacity-70" style={{ backgroundImage: cardPattern(design.pattern, design.accent), backgroundSize: design.pattern === "grid" ? "24px 24px" : "auto" }} />
                {design.showHologram ? <div className="absolute right-5 top-20 flex size-20 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white/70 backdrop-blur"><Sparkles className="size-8" /></div> : null}
                <div className={`relative ${density.shell}`} style={{ background: `linear-gradient(135deg, ${design.accent}, transparent 55%)` }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {tenantLogo ? <img src={tenantLogo} alt="" className="size-14 rounded-2xl bg-white/15 object-contain p-2" /> : <div className="flex size-14 items-center justify-center rounded-2xl bg-white/15"><Badge className="size-7" /></div>}
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.28em] opacity-75">Official Staff ID</p>
                        <h2 className="mt-1 text-lg font-black">{tenantName}</h2>
                      </div>
                    </div>
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">{selected.isActive ? "ACTIVE" : "INACTIVE"}</span>
                  </div>

                  <div className={`${density.gap} grid gap-5 ${design.orientation === "horizontal" ? "grid-cols-[132px_1fr]" : "grid-cols-1"}`}>
                    {selected.avatar ? <img src={selected.avatar} alt={`${selected.fullName} avatar`} className={`${density.photo} rounded-[1.5rem] border border-white/30 object-cover`} /> : <div className={`flex ${density.photo} items-center justify-center rounded-[1.5rem] border border-white/30 bg-white/15 text-4xl font-black`}>{initials(selected.fullName)}</div>}
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.2em] opacity-70">Employee</p>
                      <h3 className={`mt-1 ${density.name} font-black leading-tight`}>{selected.fullName}</h3>
                      <p className="mt-2 text-base font-bold opacity-90">{selected.title || selected.roleLabel}</p>
                      <p className="text-sm opacity-80">{selected.department || "General Department"}</p>
                      <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl bg-white/12 p-3"><p className="opacity-70">Employee No.</p><p className="mt-1 font-mono font-black">{selected.employeeId || selected.id.slice(0, 8).toUpperCase()}</p></div>
                        <div className="rounded-xl bg-white/12 p-3"><p className="opacity-70">Card No.</p><p className="mt-1 font-mono font-black">{cardNumber}</p></div>
                        {design.showLicense ? <div className="rounded-xl bg-white/12 p-3"><p className="opacity-70">License</p><p className="mt-1 font-mono font-black">{selected.licenseNumber || "N/A"}</p></div> : null}
                        <div className="rounded-xl bg-white/12 p-3"><p className="opacity-70">Started</p><p className="mt-1 font-mono font-black">{formatDate(selected.startDate || selected.createdAt)}</p></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={`relative flex items-center justify-between gap-4 border-t border-white/15 ${density.footer} text-xs`}>
                  <div>
                    <p className="font-bold">{selected.email}</p>
                    {design.showContact ? <p className="opacity-75">{selected.phone || "Phone not recorded"}</p> : null}
                  </div>
                  {design.showAccessBand ? <div className="h-8 w-24 rounded-full shadow-lg" style={{ background: design.accent }} /> : null}
                </div>
              </section>

              <section className="relative overflow-hidden border border-border bg-white text-slate-950 shadow-2xl print:shadow-none" style={{ borderRadius: design.cornerRadius }}>
                <div className="absolute inset-x-0 top-0 h-2" style={{ background: design.accent }} />
                <div className="grid grid-cols-[1fr_140px] gap-4 p-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Verification & Access</p>
                    <h3 className="mt-2 text-2xl font-black">{tenantName}</h3>
                    <div className="mt-5 space-y-3 text-sm">
                      <div><p className="text-xs uppercase text-slate-500">Name</p><p className="font-bold">{selected.fullName}</p></div>
                      <div><p className="text-xs uppercase text-slate-500">Role / Department</p><p className="font-bold">{selected.roleLabel} - {selected.department || "General"}</p></div>
                      {design.showLicense ? <div><p className="text-xs uppercase text-slate-500">License</p><p className="font-bold">{selected.licenseNumber || "Not recorded"}</p></div> : null}
                      {design.showEmergency ? <div><p className="text-xs uppercase text-slate-500">Emergency Contact</p><p className="font-bold">{selected.emergencyContact || "Not recorded"}</p></div> : null}
                      <div><p className="text-xs uppercase text-slate-500">Issued / Status</p><p className="font-bold">{formatDate(selected.startDate)} - {selected.isActive ? "Active" : "Inactive"}</p></div>
                      <div><p className="text-xs uppercase text-slate-500">Address</p><p className="font-bold">{selected.address || "Not recorded"}</p></div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <img src={`/api/tenant/${slug}/staff/id-card-code?type=${settings.codeType}&data=${codeData}`} alt={`${settings.codeType} code`} className="h-28 w-28 object-contain" />
                    <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">Scan to verify front ID</p>
                    <ShieldCheck className="mt-2 size-6 text-emerald-600" />
                  </div>
                </div>
                <div className="grid gap-4 border-t border-slate-200 bg-slate-950 px-6 py-4 text-xs text-white sm:grid-cols-[1fr_180px]">
                  <p>This card remains property of {tenantName}. If found, return to hospital administration. Verify access through the scan code before granting restricted-area entry.</p>
                  {design.showSignature ? <div className="border-t border-white/50 pt-2 text-center text-[10px] uppercase tracking-widest text-white/70">Authorized Signature</div> : null}
                </div>
              </section>
            </div>
          )}
        </main>

        <aside className="rounded-2xl border border-border bg-card p-4 print:hidden">
          <h2 className="font-semibold text-foreground">Design Controls</h2>
          <div className="mt-4 space-y-4">
            <label className="block text-sm"><span className="font-medium">Accent color</span><input type="color" value={design.accent} onChange={(event) => setDesign({ ...design, accent: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-border bg-background" /></label>
            <label className="block text-sm"><span className="font-medium">Card background</span><input type="color" value={design.background} onChange={(event) => setDesign({ ...design, background: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-border bg-background" /></label>
            <label className="block text-sm"><span className="font-medium">Text color</span><input type="color" value={design.textColor} onChange={(event) => setDesign({ ...design, textColor: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-border bg-background" /></label>
            <label className="block text-sm"><span className="font-medium">Font</span><select value={design.font} onChange={(event) => setDesign({ ...design, font: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3"><option value="ui-sans-serif">Modern Sans</option><option value="Georgia, serif">Executive Serif</option><option value="'Courier New', monospace">Security Mono</option></select></label>
            <label className="block text-sm"><span className="font-medium">Photo layout</span><select value={design.orientation} onChange={(event) => setDesign({ ...design, orientation: event.target.value as DesignState["orientation"] })} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3"><option value="horizontal">Horizontal</option><option value="vertical">Vertical</option></select></label>
            <label className="block text-sm"><span className="font-medium">Visual pattern</span><select value={design.pattern} onChange={(event) => setDesign({ ...design, pattern: event.target.value as DesignState["pattern"] })} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3"><option value="circuit">Circuit</option><option value="radial">Radial glow</option><option value="grid">Grid</option><option value="none">None</option></select></label>
            <label className="block text-sm"><span className="font-medium">Density</span><select value={design.density} onChange={(event) => setDesign({ ...design, density: event.target.value as DesignState["density"] })} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3"><option value="compact">Compact</option><option value="balanced">Balanced</option><option value="spacious">Spacious</option></select></label>
            <label className="block text-sm"><span className="font-medium">Corner radius</span><input type="range" min="8" max="42" value={design.cornerRadius} onChange={(event) => setDesign({ ...design, cornerRadius: Number(event.target.value) })} className="mt-1 w-full accent-orange-500" /></label>
            <div className="space-y-2 border-t border-border pt-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={design.showContact} onChange={(event) => setDesign({ ...design, showContact: event.target.checked })} className="accent-orange-500" /> Show phone</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={design.showLicense} onChange={(event) => setDesign({ ...design, showLicense: event.target.checked })} className="accent-orange-500" /> Show license</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={design.showEmergency} onChange={(event) => setDesign({ ...design, showEmergency: event.target.checked })} className="accent-orange-500" /> Show emergency contact</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={design.showSignature} onChange={(event) => setDesign({ ...design, showSignature: event.target.checked })} className="accent-orange-500" /> Show signature line</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={design.showHologram} onChange={(event) => setDesign({ ...design, showHologram: event.target.checked })} className="accent-orange-500" /> Show hologram mark</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={design.showAccessBand} onChange={(event) => setDesign({ ...design, showAccessBand: event.target.checked })} className="accent-orange-500" /> Show access band</label>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
