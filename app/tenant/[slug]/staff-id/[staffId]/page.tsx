import { notFound } from "next/navigation";
import { eq, and, isNull } from "drizzle-orm";
import { Badge, Building2 } from "lucide-react";
import { db } from "@/lib/db";
import { tenantSettings, tenants } from "@/lib/db/schema";
import { getStaffRows } from "@/lib/tenant-staff";

export const dynamic = "force-dynamic";

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "ST";
}

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleDateString();
}

export default async function StaffIdPublicView({ params, searchParams }: { params: Promise<{ slug: string; staffId: string }>; searchParams: Promise<{ card?: string }> }) {
  const { slug, staffId } = await params;
  const { card } = await searchParams;
  const tenant = await db.query.tenants.findFirst({
    where: and(eq(tenants.slug, slug), isNull(tenants.deletedAt)),
    columns: { id: true, name: true, slug: true, logoUrl: true, isActive: true },
  });
  if (!tenant || !tenant.isActive) notFound();

  const [settingsRow, staff] = await Promise.all([
    db.query.tenantSettings.findFirst({ where: and(eq(tenantSettings.tenantId, tenant.id), eq(tenantSettings.key, "branding")) }).catch(() => null),
    getStaffRows(tenant.id),
  ]);
  const member = staff.find((item) => item.id === staffId);
  if (!member) notFound();

  const branding = settingsRow?.value && typeof settingsRow.value === "object" ? settingsRow.value as Record<string, any> : {};
  const accent = branding.primaryColor || "#F97316";
  const logoUrl = tenant.logoUrl || branding.logoUrl || "";
  const cardNumber = card || `CARD-${member.id.slice(0, 8).toUpperCase()}`;

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white md:p-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          Verified staff ID front view. Confirm the person holding the card matches the profile photo and active status.
        </div>
        <section className="overflow-hidden rounded-[2rem] border border-white/15 bg-slate-900 shadow-2xl">
          <div className="p-7" style={{ background: `linear-gradient(135deg, ${accent}, transparent 58%)` }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {logoUrl ? <img src={logoUrl} alt="" className="size-14 rounded-2xl bg-white/15 object-contain p-2" /> : <div className="flex size-14 items-center justify-center rounded-2xl bg-white/15"><Building2 className="size-7" /></div>}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/75">Official Staff ID</p>
                  <h1 className="mt-1 text-xl font-black">{tenant.name}</h1>
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${member.isActive ? "bg-emerald-400/20 text-emerald-100" : "bg-red-400/20 text-red-100"}`}>{member.isActive ? "ACTIVE" : "INACTIVE"}</span>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-[148px_1fr]">
              {member.avatar ? <img src={member.avatar} alt={`${member.fullName} avatar`} className="size-36 rounded-[1.5rem] border border-white/30 object-cover" /> : <div className="flex size-36 items-center justify-center rounded-[1.5rem] border border-white/30 bg-white/15 text-4xl font-black">{initials(member.fullName)}</div>}
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.2em] text-white/70">Employee</p>
                <h2 className="mt-1 text-4xl font-black leading-tight">{member.fullName}</h2>
                <p className="mt-2 text-lg font-bold text-white/90">{member.title || member.roleLabel}</p>
                <p className="text-sm text-white/75">{member.department || "General Department"}</p>
                <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-white/12 p-3"><p className="text-white/65">Employee No.</p><p className="mt-1 font-mono font-black">{member.employeeId || member.id.slice(0, 8).toUpperCase()}</p></div>
                  <div className="rounded-xl bg-white/12 p-3"><p className="text-white/65">Card No.</p><p className="mt-1 font-mono font-black">{cardNumber}</p></div>
                  <div className="rounded-xl bg-white/12 p-3"><p className="text-white/65">License</p><p className="mt-1 font-mono font-black">{member.licenseNumber || "N/A"}</p></div>
                  <div className="rounded-xl bg-white/12 p-3"><p className="text-white/65">Started</p><p className="mt-1 font-mono font-black">{formatDate(member.startDate || member.createdAt)}</p></div>
                </div>
              </div>
            </div>
          </div>
          <div className="grid gap-3 border-t border-white/15 px-7 py-5 text-sm sm:grid-cols-3">
            <div><p className="text-white/50">Email</p><p className="font-bold">{member.email}</p></div>
            <div><p className="text-white/50">Phone</p><p className="font-bold">{member.phone || "Not recorded"}</p></div>
            <div><p className="text-white/50">Role</p><p className="font-bold">{member.roleLabel}</p></div>
            <div><p className="text-white/50">Emergency</p><p className="font-bold">{member.emergencyContact || "Not recorded"}</p></div>
            <div><p className="text-white/50">Department</p><p className="font-bold">{member.department || "General"}</p></div>
            <div><p className="text-white/50">Address</p><p className="font-bold">{member.address || "Not recorded"}</p></div>
          </div>
        </section>
      </div>
    </main>
  );
}
