"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Building2, ChevronLeft, ChevronRight, Check, Save } from "lucide-react";

const orange = "#F97316";

type Tenant = { id: string; name: string; slug: string };

type RoleDef = {
  id: string;
  name: string;
  description: string;
  badge: string;
};

type PermGroup = {
  title: string;
  perms: string[];
};

const ROLE_TEMPLATES: RoleDef[] = [
  { id: "accountant", name: "Accountant", description: "Access to finance, payroll, and billing modules", badge: "System" },
  { id: "hospital_admin", name: "Hospital Administrator", description: "Full access to all modules and settings", badge: "System" },
  { id: "doctor", name: "Doctor", description: "Patient consultations, prescriptions, lab orders", badge: "System" },
  { id: "nurse", name: "Nurse", description: "Vitals, medication administration, and patient care", badge: "System" },
  { id: "receptionist", name: "Receptionist", description: "Check-in, queue, and appointment management", badge: "System" },
  { id: "lab_technician", name: "Lab Technician", description: "Lab orders, results, and quality control", badge: "System" },
  { id: "pharmacist", name: "Pharmacist", description: "Dispensing, inventory, and drug interactions", badge: "System" },
];

const PERM_GROUPS: PermGroup[] = [
  { title: "General", perms: ["Dashboard", "Calendar", "Analytics", "Settings", "Communication"] },
  { title: "Patient Information", perms: ["Patient Profiles", "Admissions", "Documents", "Discharge", "History"] },
  { title: "Clinical", perms: ["Consultations", "Prescriptions", "Lab Orders", "Vitals"] },
  { title: "Staff Management", perms: ["Staff List", "HR Management", "Leave Management", "Payroll"] },
  { title: "Examinations", perms: ["Assessments", "Results", "Exam Analytics"] },
  { title: "Finance", perms: ["Payments", "Receipts", "Insurance Claims", "Finance Setup"] },
  { title: "Facilities", perms: ["Beds", "Pharmacy", "Lab", "Hostel", "Inventory"] },
];

const DEFAULTS: Record<string, string[]> = {
  accountant: ["Dashboard", "Communication", "Payments", "Receipts", "Insurance Claims", "Finance Setup", "Payroll"],
  hospital_admin: PERM_GROUPS.flatMap(g => g.perms),
  doctor: ["Dashboard", "Calendar", "Patient Profiles", "Admissions", "Consultations", "Prescriptions", "Lab Orders", "Vitals", "History"],
  nurse: ["Dashboard", "Calendar", "Patient Profiles", "Vitals", "Beds"],
  receptionist: ["Dashboard", "Calendar", "Patient Profiles", "Admissions", "Communication"],
  lab_technician: ["Dashboard", "Lab Orders", "Results", "Exam Analytics", "Lab"],
  pharmacist: ["Dashboard", "Pharmacy", "Inventory"],
};

export default function PermissionsManagerPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [search, setSearch] = useState("");
  const [perms, setPerms] = useState<Record<string, Set<string>>>({});
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/tenants");
        const data = await res.json();
        setTenants(Array.isArray(data) ? data : data.tenants || []);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (activeTenant) {
      (async () => {
        try {
          const res = await fetch(`/api/roles/permissions?tenantId=${activeTenant.id}`);
          if (res.ok) {
            const data = await res.json();
            // Merge with defaults for any missing roles
            const merged: Record<string, Set<string>> = {};
            ROLE_TEMPLATES.forEach(r => {
              merged[r.id] = new Set(data[r.id] || DEFAULTS[r.id] || []);
            });
            setPerms(merged);
          } else {
            // Fallback to defaults
            const init: Record<string, Set<string>> = {};
            ROLE_TEMPLATES.forEach(r => { init[r.id] = new Set(DEFAULTS[r.id] || []); });
            setPerms(init);
          }
        } catch {
          const init: Record<string, Set<string>> = {};
          ROLE_TEMPLATES.forEach(r => { init[r.id] = new Set(DEFAULTS[r.id] || []); });
          setPerms(init);
        }
      })();
    } else {
      // hydrate defaults
      const init: Record<string, Set<string>> = {};
      ROLE_TEMPLATES.forEach(r => { init[r.id] = new Set(DEFAULTS[r.id] || []); });
      setPerms(init);
    }
  }, [activeTenant]);

  const filteredTenants = useMemo(() => {
    if (!search.trim()) return tenants;
    const q = search.toLowerCase();
    return tenants.filter(t => t.name.toLowerCase().includes(q));
  }, [tenants, search]);

  const togglePerm = (roleId: string, perm: string) => {
    setPerms(p => {
      const next = { ...p };
      const s = new Set(next[roleId] || []);
      if (s.has(perm)) s.delete(perm); else s.add(perm);
      next[roleId] = s;
      return next;
    });
  };

  const toggleAll = (roleId: string) => {
    setPerms(p => {
      const next = { ...p };
      const all = PERM_GROUPS.flatMap(g => g.perms);
      const cur = new Set(next[roleId] || []);
      next[roleId] = cur.size === all.length ? new Set() : new Set(all);
      return next;
    });
  };

  const save = async (roleId: string) => {
    if (!activeTenant) return;
    setSavingRole(roleId);
    try {
      const permsToSave: Record<string, string[]> = {};
      Object.entries(perms).forEach(([id, set]) => {
        permsToSave[id] = Array.from(set);
      });

      await fetch("/api/roles/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: activeTenant.id,
          permissions: permsToSave
        })
      });
    } catch (error) {
      console.error("Failed to save permissions:", error);
    } finally {
      setSavingRole(null);
    }
  };

  const saveAllTenants = async () => {
    setSavingAll(true);
    try {
      const permsToSave: Record<string, string[]> = {};
      Object.entries(perms).forEach(([id, set]) => {
        permsToSave[id] = Array.from(set);
      });
      const response = await fetch("/api/roles/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applyToAllTenants: true, permissions: permsToSave }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Failed to apply permissions");
      alert(`Permissions applied to ${data.appliedTenants || 0} tenant dashboard(s).`);
    } catch (error: any) {
      alert(error?.message || "Failed to apply permissions to all tenants");
    } finally {
      setSavingAll(false);
    }
  };

  // Tenant picker
  if (!activeTenant) {
    return (
      <div className="min-h-screen bg-subtle -m-6 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground">Permissions Manager</h1>
          <p className="text-muted-foreground text-sm mt-1 mb-6">Select a tenant to customize role permissions.</p>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tenants..."
              className="w-full h-11 pl-10 pr-3 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredTenants.map(t => (
              <button key={t.id} onClick={() => setActiveTenant(t)}
                className="text-left bg-card border border-border rounded-xl p-4 hover:border-orange-300 hover:shadow-sm transition-all flex items-center gap-3">
                <div className="size-10 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-500 dark:text-orange-400 flex items-center justify-center"><Building2 className="size-5" /></div>
                <div>
                  <p className="font-medium text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{t.slug}</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground ml-auto" />
              </button>
            ))}
            {filteredTenants.length === 0 && (
              <p className="col-span-full text-center text-muted-foreground py-12">No tenants found.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Permissions editor
  return (
    <div className="min-h-screen bg-subtle -m-6 p-8">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => setActiveTenant(null)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ChevronLeft className="size-4" /> Back to tenants
        </button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <span>Admin</span><ChevronRight className="size-3" /><span>Tenants</span><ChevronRight className="size-3" /><span className="text-foreground">{activeTenant.name}</span><ChevronRight className="size-3" /><span className="text-foreground">Permissions</span>
        </div>
        <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground inline-flex items-center gap-2">
              <span className="text-orange-500">○</span> Permissions Manager
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Customize which pages each role can access in this tenant.</p>
          </div>
          <button onClick={saveAllTenants} disabled={savingAll} className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-100 disabled:opacity-60">
            {savingAll ? "Applying..." : "Apply Current Matrix To All Tenants"}
          </button>
        </div>

        <div className="space-y-5">
          {ROLE_TEMPLATES.map(role => {
            const selected = perms[role.id] || new Set<string>();
            const all = PERM_GROUPS.flatMap(g => g.perms);
            const allSelected = selected.size === all.length;
            return (
              <div key={role.id} className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full border-2 border-orange-200 dark:border-orange-900/30 flex items-center justify-center text-orange-500">
                      <Check className="size-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{role.name}</h3>
                        <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{role.badge}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleAll(role.id)} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
                      <span className={`size-4 rounded-full border ${allSelected ? "bg-orange-500 border-orange-500" : "border-muted-foreground/30"}`}>
                        {allSelected && <Check className="size-3 text-white" />}
                      </span>
                      Select All
                    </button>
                    <button onClick={() => save(role.id)} className="px-3 h-9 rounded-lg text-white text-sm font-medium inline-flex items-center gap-1.5" style={{ backgroundColor: orange }}>
                      <Save className="size-3.5" /> {savingRole === role.id ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                  {PERM_GROUPS.map(group => {
                    const groupAll = group.perms.every(p => selected.has(p));
                    return (
                      <div key={group.title} className="bg-muted/30 border border-border/50 rounded-lg p-3">
                        <button onClick={() => {
                          setPerms(p => {
                            const next = { ...p };
                            const s = new Set(next[role.id] || []);
                            if (groupAll) group.perms.forEach(x => s.delete(x));
                            else group.perms.forEach(x => s.add(x));
                            next[role.id] = s;
                            return next;
                          });
                        }} className="flex items-center gap-2 text-xs uppercase font-semibold text-muted-foreground mb-2 hover:text-foreground w-full">
                          <span className={`size-3.5 rounded-full border ${groupAll ? "bg-orange-500 border-orange-500" : "border-muted-foreground/30"}`}>
                            {groupAll && <Check className="size-2.5 text-white" />}
                          </span>
                          {group.title}
                        </button>
                        <div className="space-y-1.5">
                          {group.perms.map(p => {
                            const on = selected.has(p);
                            return (
                              <button key={p} onClick={() => togglePerm(role.id, p)} className="flex items-center gap-2 text-sm text-foreground/80 w-full text-left hover:text-foreground">
                                <span className={`size-3.5 rounded-full border shrink-0 inline-flex items-center justify-center ${on ? "bg-orange-500 border-orange-500" : "border-muted-foreground/30"}`}>
                                  {on && <Check className="size-2.5 text-white" />}
                                </span>
                                {p}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
