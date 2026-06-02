"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, Activity, ShieldCheck, Users, Stethoscope,
  HeartPulse, Microscope, Pill, DollarSign, Calendar, BedDouble, ClipboardList,
  FileText, Bell, Settings, BarChart3, FlaskConical, AlertOctagon, Boxes,
  TrendingUp, Receipt, MessageSquare, UserCheck, Baby, History, Wallet, CreditCard,
  Layers, Briefcase, ShieldAlert, ServerCog, ChevronLeft, GraduationCap,
  Megaphone,
  Mail,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui";
import { resolveTenantSlug, withTenantPrefix } from "@/lib/tenant-routing";
import { getTenantSettingsSyncEventName } from "@/lib/hospital-settings-sync";
import { getModuleKeyForPath, isTenantModuleEnabled, normalizeTenantModules } from "@/lib/tenant-modules";

interface SidebarItem {
  label: string;
  path: string;
  icon: LucideIcon;
  category: string;
}

/**
 * Sidebar items per role.
 * Mirrors the existing sidebarConfigs the user is already happy with —
 * we just attach icons and a richer category structure.
 */
const sidebarConfigs: Record<string, SidebarItem[]> = {
  super_admin: [
    { label: "Dashboard", path: "/super-admin", icon: LayoutDashboard, category: "Central Control" },
    { label: "Tenants", path: "/tenants", icon: Building2, category: "Admin" },
    { label: "Tenant Usage", path: "/tenants/usage", icon: Activity, category: "Admin" },
    { label: "Subscription Plans", path: "/tenants/subscription-plans", icon: CreditCard, category: "Admin" },
    { label: "Users", path: "/super-admin/users", icon: Users, category: "Admin" },
    { label: "Billing", path: "/super-admin/billing", icon: Receipt, category: "Admin" },
    { label: "Global Analytics", path: "/global-analytics", icon: BarChart3, category: "Admin" },
    { label: "Roles & Permissions", path: "/roles", icon: ShieldCheck, category: "Admin" },
    { label: "Messages", path: "/messages", icon: MessageSquare, category: "Communication" },
    { label: "Broadcasts", path: "/broadcasts", icon: Megaphone, category: "Communication" },
    { label: "Feedback", path: "/super-admin/feedback", icon: MessageSquare, category: "Communication" },
    { label: "Compliance", path: "/compliance", icon: ShieldAlert, category: "Security" },
    { label: "Audit Logs", path: "/compliance/audit", icon: History, category: "Security" },
    { label: "System Health", path: "/super-admin/system-health", icon: ServerCog, category: "System" },
    { label: "Platform Settings", path: "/super-admin/settings", icon: Settings, category: "System" },
  ],
  hospital_admin: [
    { label: "Dashboard", path: "/admin", icon: LayoutDashboard, category: "Main" },
    { label: "Patients", path: "/patients", icon: Users, category: "Management" },
    { label: "Patient Analytics", path: "/analytics/patients", icon: BarChart3, category: "Management" },
    { label: "Appointments", path: "/appointments", icon: Calendar, category: "Management" },
    { label: "Staff Management", path: "/staff-management", icon: Briefcase, category: "Management" },
    { label: "Departments", path: "/departments", icon: Layers, category: "Management" },
    { label: "Roles & Permissions", path: "/roles", icon: ShieldCheck, category: "Management" },
    { label: "Messages", path: "/messages", icon: MessageSquare, category: "Communication" },
    { label: "Broadcasts", path: "/broadcasts", icon: Megaphone, category: "Communication" },
    { label: "Feedback", path: "/feedback", icon: MessageSquare, category: "Communication" },
    { label: "Lab", path: "/lab", icon: FlaskConical, category: "Services" },
    { label: "Pharmacy", path: "/pharmacy", icon: Pill, category: "Services" },
    { label: "Billing", path: "/billing", icon: Wallet, category: "Finance" },
    { label: "Insurance Claims", path: "/insurance-claims", icon: Receipt, category: "Finance" },
    { label: "Analytics", path: "/analytics", icon: BarChart3, category: "Reports" },
    { label: "Revenue Reports", path: "/analytics/revenue", icon: TrendingUp, category: "Reports" },
    { label: "Audit Logs", path: "/compliance/audit", icon: History, category: "Security" },
    { label: "Settings", path: "/settings", icon: Settings, category: "System" },
  ],
  doctor: [
    { label: "Dashboard", path: "/doctor", icon: LayoutDashboard, category: "Main" },
    { label: "Patients", path: "/doctor/patients", icon: Users, category: "Clinical" },
    { label: "Appointments", path: "/doctor/appointments", icon: Calendar, category: "Clinical" },
    { label: "Queue", path: "/doctor/queue", icon: ClipboardList, category: "Clinical" },
    { label: "Lab Orders", path: "/doctor/lab-orders", icon: FlaskConical, category: "Orders" },
    { label: "Lab Results", path: "/doctor/lab-results", icon: Microscope, category: "Orders" },
    { label: "Prescriptions", path: "/doctor/prescriptions", icon: Pill, category: "Orders" },
    { label: "Patient History", path: "/doctor/analytics/my-patients", icon: History, category: "Analytics" },
    { label: "Messages", path: "/messages", icon: MessageSquare, category: "Communication" },
    { label: "Feedback", path: "/doctor/feedback", icon: MessageSquare, category: "Communication" },
    { label: "User Settings", path: "/doctor/settings", icon: Settings, category: "Account" },
  ],
   nurse: [
     { label: "Dashboard", path: "/nurse", icon: LayoutDashboard, category: "Main" },
     { label: "Patients", path: "/nurse/patients", icon: Users, category: "Care" },
     { label: "Vitals", path: "/nurse/vitals", icon: HeartPulse, category: "Care" },
     { label: "Medications", path: "/nurse/medications", icon: Pill, category: "Care" },
     { label: "Care Plans", path: "/nurse/care-plans", icon: ClipboardList, category: "Care" },
     { label: "Beds", path: "/nurse/beds", icon: BedDouble, category: "Ward" },
     { label: "Queue", path: "/nurse/queue", icon: ClipboardList, category: "Ward" },
     { label: "Messages", path: "/messages", icon: MessageSquare, category: "Communication" },
     { label: "Feedback", path: "/nurse/feedback", icon: MessageSquare, category: "Communication" },
     { label: "Reports", path: "/nurse/analytics/nursing", icon: BarChart3, category: "Reports" },
     { label: "User Settings", path: "/profile/settings", icon: Settings, category: "Account" },
   ],
   lab_technician: [
     { label: "Dashboard", path: "/lab", icon: LayoutDashboard, category: "Main" },
     { label: "Lab Orders", path: "/lab/lab-orders", icon: FlaskConical, category: "Lab" },
     { label: "Results", path: "/lab/lab-results", icon: Microscope, category: "Lab" },
     { label: "Inventory", path: "/lab/lab-inventory", icon: Boxes, category: "Lab" },
     { label: "Quality Control", path: "/lab/lab-qc", icon: ShieldCheck, category: "Lab" },
     { label: "Messages", path: "/messages", icon: MessageSquare, category: "Communication" },
     { label: "Feedback", path: "/lab/feedback", icon: MessageSquare, category: "Communication" },
     { label: "Analytics", path: "/lab/lab-analytics", icon: BarChart3, category: "Reports" },
     { label: "Performance", path: "/lab/performance", icon: TrendingUp, category: "Reports" },
     { label: "User Settings", path: "/profile/settings", icon: Settings, category: "Account" },
   ],
  pharmacist: [
    { label: "Dashboard", path: "/pharmacy", icon: LayoutDashboard, category: "Main" },
    { label: "Prescriptions", path: "/pharmacy/prescriptions", icon: Pill, category: "Pharmacy" },
    { label: "Inventory", path: "/pharmacy/pharmacy-inventory", icon: Boxes, category: "Pharmacy" },
    { label: "Dispensing", path: "/pharmacy/dispensing", icon: ClipboardList, category: "Pharmacy" },
    { label: "Drug Interactions", path: "/pharmacy/drug-interactions", icon: AlertOctagon, category: "Safety" },
    { label: "Stock Alerts", path: "/pharmacy/pharmacy-inventory/alerts", icon: Bell, category: "Inventory" },
    { label: "Suppliers", path: "/pharmacy/pharmacy/suppliers", icon: Building2, category: "Inventory" },
    { label: "Messages", path: "/messages", icon: MessageSquare, category: "Communication" },
    { label: "Feedback", path: "/pharmacy/feedback", icon: MessageSquare, category: "Communication" },
    { label: "Analytics", path: "/pharmacy/analytics", icon: BarChart3, category: "Reports" },
    { label: "Reports", path: "/pharmacy/analytics/pharmacy", icon: FileText, category: "Reports" },
    { label: "User Settings", path: "/profile/settings", icon: Settings, category: "Account" },
  ],
  accountant: [
    { label: "Dashboard", path: "/accountant", icon: LayoutDashboard, category: "Main" },
    { label: "Billing", path: "/accountant/billing", icon: Wallet, category: "Finance" },
    { label: "Invoices", path: "/accountant/billing/invoices", icon: Receipt, category: "Finance" },
    { label: "Pricing Catalog", path: "/accountant/billing/catalog", icon: CreditCard, category: "Finance" },
    { label: "Payments", path: "/accountant/payments", icon: DollarSign, category: "Finance" },
    { label: "Insurance Claims", path: "/accountant/insurance-claims", icon: ShieldCheck, category: "Finance" },
    { label: "Revenue Tracking", path: "/accountant/analytics/revenue", icon: TrendingUp, category: "Reports" },
    { label: "Reports", path: "/accountant/reports", icon: FileText, category: "Reports" },
    { label: "Financial Analysis", path: "/accountant/analytics/financial", icon: BarChart3, category: "Reports" },
    { label: "Messages", path: "/messages", icon: MessageSquare, category: "Communication" },
    { label: "Feedback", path: "/feedback", icon: MessageSquare, category: "Communication" },
    { label: "Email Activity", path: "/accountant/messages", icon: Mail, category: "Communication" },
    { label: "User Settings", path: "/profile/settings", icon: Settings, category: "Account" },
  ],
  receptionist: [
    { label: "Dashboard", path: "/reception", icon: LayoutDashboard, category: "Main" },
    { label: "Appointments", path: "/appointments", icon: Calendar, category: "Front Desk" },
    { label: "Check-in", path: "/check-in", icon: UserCheck, category: "Front Desk" },
    { label: "Queue", path: "/queue", icon: ClipboardList, category: "Front Desk" },
    { label: "Patients", path: "/patients", icon: Users, category: "Front Desk" }, // Added this line
    { label: "Patient Registration", path: "/patients/register", icon: Users, category: "Front Desk" },
    { label: "Waiting Room", path: "/reception/waiting", icon: BedDouble, category: "Front Desk" },
    { label: "Messages", path: "/messages", icon: MessageSquare, category: "Communication" },
    { label: "Feedback", path: "/reception/feedback", icon: MessageSquare, category: "Communication" },
    { label: "Emergency", path: "/emergency", icon: AlertOctagon, category: "Emergency" },
    { label: "User Settings", path: "/reception/settings", icon: Settings, category: "Account" },
  ],
  patient: [
    { label: "Dashboard", path: "/patient", icon: LayoutDashboard, category: "Main" },
    { label: "My Health", path: "/my-health", icon: HeartPulse, category: "Health" },
    { label: "Health Records", path: "/patient-portal/records", icon: FileText, category: "Health" },
    { label: "Appointments", path: "/patient-portal/appointments", icon: Calendar, category: "Health" },
    { label: "Book Appointment", path: "/patient-portal/appointments/book", icon: Calendar, category: "Health" },
    { label: "Prescriptions", path: "/patient-portal/prescriptions", icon: Pill, category: "Health" },
    { label: "Lab Results", path: "/patient-portal/results", icon: Microscope, category: "Health" },
    { label: "Billing", path: "/patient-portal/billing", icon: Wallet, category: "Account" },
    { label: "Messages", path: "/messages", icon: MessageSquare, category: "Account" },
    { label: "Feedback", path: "/feedback", icon: MessageSquare, category: "Account" },
    { label: "User Settings", path: "/profile/settings", icon: Settings, category: "Account" },
  ],
  guardian: [
    { label: "Dashboard", path: "/guardian", icon: LayoutDashboard, category: "Main" },
    { label: "Family", path: "/guardian/family", icon: Baby, category: "Family" },
    { label: "Child Profiles", path: "/guardian/children", icon: Users, category: "Family" },
    { label: "Appointments", path: "/guardian/appointments", icon: Calendar, category: "Family" },
    { label: "Book Appointment", path: "/guardian/book", icon: Calendar, category: "Family" },
    { label: "Health Records", path: "/guardian/records", icon: FileText, category: "Family" },
    { label: "Vaccinations", path: "/guardian/vaccinations", icon: ShieldCheck, category: "Family" },
    { label: "Lab Results", path: "/guardian/lab-results", icon: Microscope, category: "Family" },
    { label: "Alerts & Reminders", path: "/guardian/alerts", icon: Bell, category: "Family" },
    { label: "Messages", path: "/messages", icon: MessageSquare, category: "Communication" },
    { label: "Feedback", path: "/feedback", icon: MessageSquare, category: "Communication" },
    { label: "User Settings", path: "/profile/settings", icon: Settings, category: "Account" },
  ],
};

const STORAGE_KEY = "joan-sidebar-collapsed";

export function Sidebar({
  mobileEnabled = false,
  mobileOpen = false,
  onMobileClose,
}: {
  mobileEnabled?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const { user } = useAuthStore();
  const pathname = usePathname();
  const role = (user?.role || "doctor") as keyof typeof sidebarConfigs;
  const sidebarItems = sidebarConfigs[role] || sidebarConfigs.doctor;
  const hostname = typeof window !== "undefined" ? window.location.hostname : null;
  const tenantSlug =
    typeof window !== "undefined"
      ? resolveTenantSlug(pathname, hostname, sessionStorage.getItem("active_tenant_slug"))
      : null;
  const [collapsed, setCollapsed] = useState(false);
  const [tenantName, setTenantName] = useState<string>("Healthcare OS");
  const [tenantLogo, setTenantLogo] = useState<string | null>(null);
  const [tenantModules, setTenantModules] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");

    const applyBranding = (updates: { name?: string; logoUrl?: string | null; modules?: Record<string, boolean> }) => {
      if (typeof updates.name === "string") {
        setTenantName(updates.name);
        sessionStorage.setItem("active_tenant_name", updates.name);
      }
      if ("logoUrl" in updates) {
        const nextLogo = updates.logoUrl || null;
        setTenantLogo(nextLogo);
        if (nextLogo) {
          sessionStorage.setItem("active_tenant_logo", nextLogo);
        } else {
          sessionStorage.removeItem("active_tenant_logo");
        }
      }
      if (updates.modules) {
        const normalized = normalizeTenantModules(updates.modules);
        setTenantModules(normalized);
        sessionStorage.setItem("active_tenant_modules", JSON.stringify(normalized));
      }
    };

    // Get tenant name from sessionStorage or cookies
    const name = sessionStorage.getItem("active_tenant_name");
    if (name) {
      setTenantName(name);
    }

    // Get tenant logo from sessionStorage
    const logo = sessionStorage.getItem("active_tenant_logo");
    if (logo) {
      setTenantLogo(logo);
    }

    const syncFromStorage = () => {
      const nextName = sessionStorage.getItem("active_tenant_name");
      const nextLogo = sessionStorage.getItem("active_tenant_logo");
      const nextModulesRaw = sessionStorage.getItem("active_tenant_modules");
      if (nextName) setTenantName(nextName);
      setTenantLogo(nextLogo || null);
      if (nextModulesRaw) {
        try {
          setTenantModules(normalizeTenantModules(JSON.parse(nextModulesRaw)));
        } catch {}
      }
    };

    const syncFromEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ name?: string; logoUrl?: string | null }>).detail;
      applyBranding(detail || {});
      syncFromStorage();
    };

    const bc =
      tenantSlug && typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel(`hospital_settings_${user?.hospitalId || tenantSlug}`)
        : null;

    const syncFromBroadcast = (message: MessageEvent<any>) => {
      const data = message.data?.data || {};
      applyBranding({
        name: data.name,
        logoUrl: Object.prototype.hasOwnProperty.call(data, "logoUrl") ? data.logoUrl : undefined,
        modules: data.modules,
      });
    };

    const syncFromLocalStorageEvent = (event: StorageEvent) => {
      if (event.key && event.key !== `hospital_settings_${user?.hospitalId || tenantSlug}`) return;
      if (!event.newValue) return;
      try {
        const data = JSON.parse(event.newValue);
        applyBranding({
          name: data?.name,
          logoUrl: Object.prototype.hasOwnProperty.call(data || {}, "logoUrl") ? data.logoUrl : undefined,
          modules: data?.modules,
        });
      } catch {}
    };

    const hasCachedBranding = Boolean(name || logo);
    const hasCachedModules = Boolean(sessionStorage.getItem("active_tenant_modules"));

    const fetchLatestBranding = async () => {
      if (!tenantSlug) return;
      try {
        const response = await fetch(`/api/tenants/${tenantSlug}/branding`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = await response.json();
        applyBranding({
          name: data?.hospitalName,
          logoUrl: Object.prototype.hasOwnProperty.call(data || {}, "logoUrl") ? data.logoUrl || null : undefined,
        });
      } catch {}
    };

    const fetchLatestModules = async () => {
      if (!tenantSlug) return;
      try {
        const response = await fetch(`/api/tenants/${tenantSlug}/settings`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = await response.json();
        applyBranding({ modules: data?.modules });
      } catch {}
    };

    bc?.addEventListener("message", syncFromBroadcast);
    window.addEventListener("storage", syncFromLocalStorageEvent);
    window.addEventListener(getTenantSettingsSyncEventName(), syncFromEvent as EventListener);
    const scheduleRefresh = (task: () => Promise<void>) => {
      const run = () => void task();
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(run, { timeout: 2000 });
      } else {
        globalThis.setTimeout(run, 0);
      }
    };

    if (tenantSlug) {
      scheduleRefresh(fetchLatestBranding);
      if (!hasCachedModules) {
        scheduleRefresh(fetchLatestModules);
      }
      return () => {
        bc?.close();
        window.removeEventListener("storage", syncFromLocalStorageEvent);
        window.removeEventListener(getTenantSettingsSyncEventName(), syncFromEvent as EventListener);
      };
    }

    return () => {
      bc?.close();
      window.removeEventListener("storage", syncFromLocalStorageEvent);
      window.removeEventListener(getTenantSettingsSyncEventName(), syncFromEvent as EventListener);
    };
  }, [tenantSlug, user?.hospitalId]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  // Group by category in the order they first appear
  const ordered: { category: string; items: SidebarItem[] }[] = [];
  for (const item of sidebarItems) {
    let group = ordered.find((g) => g.category === item.category);
    if (!group) {
      group = { category: item.category, items: [] };
      ordered.push(group);
    }
    group.items.push(item);
  }

  return (
    <>
      {mobileEnabled ? (
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/45 backdrop-blur-sm transition-opacity lg:hidden",
            mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
          )}
          onClick={onMobileClose}
        />
      ) : null}
    <aside
      className={cn(
        "flex flex-col border-r border-sidebar-border bg-sidebar",
        mobileEnabled
          ? "fixed inset-y-0 left-0 z-50 h-dvh w-72 shadow-2xl transition-transform duration-200 lg:static lg:z-auto lg:h-screen lg:shadow-none lg:transition-[width]"
          : "h-screen transition-[width]",
        mobileEnabled && (mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"),
        collapsed ? (mobileEnabled ? "lg:w-16" : "w-16") : (mobileEnabled ? "lg:w-64" : "w-64")
      )}
    >
      {/* Brand */}
      <div className={cn(
        "flex items-center gap-3 border-b border-sidebar-border px-4 py-4",
        collapsed && (mobileEnabled ? "lg:justify-center lg:px-2" : "justify-center px-2")
      )}>
        {tenantLogo ? (
          <img data-hospital-logo src={tenantLogo} alt="Logo" className="h-9 w-9 shrink-0 rounded-xl object-cover border border-sidebar-border" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <GraduationCap className="h-5 w-5" />
          </div>
        )}
        {(!collapsed || (mobileEnabled && mobileOpen)) && (
          <div className="min-w-0 flex-1">
            <p data-hospital-name className="truncate text-base font-semibold text-sidebar-foreground">{tenantName}</p>
            <p className="truncate text-xs text-sidebar-muted">Healthcare OS</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 scrollbar-thin">
        {ordered.map((group) => (
          <div key={group.category} className="mb-3">
            {(!collapsed || (mobileEnabled && mobileOpen)) && (
              <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-sidebar-muted">
                {group.category}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.filter((item) => isTenantModuleEnabled(tenantModules, getModuleKeyForPath(item.path))).map((item) => {
                const resolvedPath = role === "super_admin" ? item.path : withTenantPrefix(item.path, tenantSlug, hostname);
                const isActive =
                  pathname === resolvedPath ||
                  (resolvedPath !== "/" && pathname.startsWith(resolvedPath + "/"));
                const Icon = item.icon;
                return (
                  <li key={resolvedPath}>
                    <Link
                      href={resolvedPath}
                      title={collapsed ? item.label : undefined}
                      onClick={mobileEnabled ? onMobileClose : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-active text-sidebar-active-foreground"
                          : "text-sidebar-foreground hover:bg-muted/60",
                        collapsed && (mobileEnabled ? "lg:justify-center lg:px-0" : "justify-center px-0")
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {(!collapsed || (mobileEnabled && mobileOpen)) && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer: collapse toggle + user */}
      <div className="border-t border-sidebar-border p-2">
        <button
          type="button"
          onClick={toggleCollapsed}
          className={cn(
            "mb-2 w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-sidebar-muted transition-colors hover:bg-muted/60",
            mobileEnabled ? "hidden lg:flex" : "flex",
            collapsed && "justify-center px-0"
          )}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          {!collapsed && "Collapse"}
        </button>
        <div className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2",
          collapsed && (mobileEnabled ? "lg:justify-center lg:px-0" : "justify-center px-0")
        )}>
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={user?.avatar || undefined} alt={user?.fullName || "User"} />
            <AvatarFallback className="text-xs font-semibold">
              {(user?.fullName || user?.email || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {(!collapsed || (mobileEnabled && mobileOpen)) && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-sidebar-foreground">
                {user?.fullName || "User"}
              </p>
              <p className="truncate text-[11px] text-sidebar-muted">
                {user?.email || (user?.role || "Staff").replace(/_/g, " ")}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
    </>
  );
}