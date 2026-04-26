"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, Activity, ShieldCheck, Users, Stethoscope,
  HeartPulse, Microscope, Pill, DollarSign, Calendar, BedDouble, ClipboardList,
  FileText, Bell, Settings, BarChart3, FlaskConical, AlertOctagon, Boxes,
  TrendingUp, Receipt, MessageSquare, UserCheck, Baby, History, Wallet,
  Layers, Briefcase, ShieldAlert, ServerCog, ChevronLeft, GraduationCap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

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
    { label: "Users", path: "/super-admin/users", icon: Users, category: "Admin" },
    { label: "Global Analytics", path: "/global-analytics", icon: BarChart3, category: "Admin" },
    { label: "Roles & Permissions", path: "/roles", icon: ShieldCheck, category: "Admin" },
    { label: "Compliance", path: "/compliance", icon: ShieldAlert, category: "Security" },
    { label: "Audit Logs", path: "/compliance/audit", icon: History, category: "Security" },
    { label: "System Health", path: "/system-health", icon: ServerCog, category: "System" },
    { label: "Platform Settings", path: "/settings", icon: Settings, category: "System" },
  ],
  hospital_admin: [
    { label: "Dashboard", path: "/", icon: LayoutDashboard, category: "Main" },
    { label: "Patients", path: "/patients", icon: Users, category: "Management" },
    { label: "Patient Analytics", path: "/analytics/patients", icon: BarChart3, category: "Management" },
    { label: "Appointments", path: "/appointments", icon: Calendar, category: "Management" },
    { label: "Staff Management", path: "/staff-management", icon: Briefcase, category: "Management" },
    { label: "Departments", path: "/departments", icon: Layers, category: "Management" },
    { label: "Roles & Permissions", path: "/roles", icon: ShieldCheck, category: "Management" },
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
    { label: "Dashboard", path: "/", icon: LayoutDashboard, category: "Main" },
    { label: "Patients", path: "/patients", icon: Users, category: "Clinical" },
    { label: "Appointments", path: "/appointments", icon: Calendar, category: "Clinical" },
    { label: "Queue", path: "/queue", icon: ClipboardList, category: "Clinical" },
    { label: "Lab Orders", path: "/lab-orders", icon: FlaskConical, category: "Orders" },
    { label: "Lab Results", path: "/lab-results", icon: Microscope, category: "Orders" },
    { label: "Prescriptions", path: "/prescriptions", icon: Pill, category: "Orders" },
    { label: "Patient History", path: "/analytics/my-patients", icon: History, category: "Analytics" },
    { label: "Messages", path: "/messages", icon: MessageSquare, category: "Communication" },
  ],
  nurse: [
    { label: "Dashboard", path: "/", icon: LayoutDashboard, category: "Main" },
    { label: "Patients", path: "/patients", icon: Users, category: "Care" },
    { label: "Vitals", path: "/vitals", icon: HeartPulse, category: "Care" },
    { label: "Medications", path: "/medications", icon: Pill, category: "Care" },
    { label: "Care Plans", path: "/care-plans", icon: ClipboardList, category: "Care" },
    { label: "Beds", path: "/beds", icon: BedDouble, category: "Ward" },
    { label: "Queue", path: "/queue", icon: ClipboardList, category: "Ward" },
    { label: "Reports", path: "/analytics/nursing", icon: BarChart3, category: "Reports" },
  ],
  lab_technician: [
    { label: "Dashboard", path: "/", icon: LayoutDashboard, category: "Main" },
    { label: "Lab Orders", path: "/lab-orders", icon: FlaskConical, category: "Lab" },
    { label: "Results", path: "/lab-results", icon: Microscope, category: "Lab" },
    { label: "Inventory", path: "/lab-inventory", icon: Boxes, category: "Lab" },
    { label: "Quality Control", path: "/lab-qc", icon: ShieldCheck, category: "Lab" },
    { label: "Analytics", path: "/lab-analytics", icon: BarChart3, category: "Reports" },
    { label: "Performance", path: "/analytics/lab-performance", icon: TrendingUp, category: "Reports" },
  ],
  pharmacist: [
    { label: "Dashboard", path: "/", icon: LayoutDashboard, category: "Main" },
    { label: "Prescriptions", path: "/prescriptions", icon: Pill, category: "Pharmacy" },
    { label: "Inventory", path: "/pharmacy-inventory", icon: Boxes, category: "Pharmacy" },
    { label: "Dispensing", path: "/dispensing", icon: ClipboardList, category: "Pharmacy" },
    { label: "Drug Interactions", path: "/drug-interactions", icon: AlertOctagon, category: "Safety" },
    { label: "Stock Alerts", path: "/pharmacy-inventory/alerts", icon: Bell, category: "Inventory" },
    { label: "Suppliers", path: "/pharmacy/suppliers", icon: Building2, category: "Inventory" },
    { label: "Analytics", path: "/analytics", icon: BarChart3, category: "Reports" },
    { label: "Reports", path: "/analytics/pharmacy", icon: FileText, category: "Reports" },
  ],
  accountant: [
    { label: "Dashboard", path: "/", icon: LayoutDashboard, category: "Main" },
    { label: "Billing", path: "/billing", icon: Wallet, category: "Finance" },
    { label: "Invoices", path: "/billing/invoices", icon: Receipt, category: "Finance" },
    { label: "Payments", path: "/payments", icon: DollarSign, category: "Finance" },
    { label: "Insurance Claims", path: "/insurance-claims", icon: ShieldCheck, category: "Finance" },
    { label: "Revenue Tracking", path: "/analytics/revenue", icon: TrendingUp, category: "Reports" },
    { label: "Reports", path: "/reports", icon: FileText, category: "Reports" },
    { label: "Financial Analysis", path: "/analytics/financial", icon: BarChart3, category: "Reports" },
  ],
  receptionist: [
    { label: "Dashboard", path: "/", icon: LayoutDashboard, category: "Main" },
    { label: "Appointments", path: "/appointments", icon: Calendar, category: "Front Desk" },
    { label: "Check-in", path: "/check-in", icon: UserCheck, category: "Front Desk" },
    { label: "Queue", path: "/queue", icon: ClipboardList, category: "Front Desk" },
    { label: "Patient Registration", path: "/patients/register", icon: Users, category: "Front Desk" },
    { label: "Waiting Room", path: "/reception/waiting", icon: BedDouble, category: "Front Desk" },
    { label: "Emergency", path: "/emergency", icon: AlertOctagon, category: "Emergency" },
  ],
  patient: [
    { label: "Dashboard", path: "/", icon: LayoutDashboard, category: "Main" },
    { label: "My Health", path: "/my-health", icon: HeartPulse, category: "Health" },
    { label: "Health Records", path: "/patient-portal/records", icon: FileText, category: "Health" },
    { label: "Appointments", path: "/appointments", icon: Calendar, category: "Health" },
    { label: "Book Appointment", path: "/appointments/book", icon: Calendar, category: "Health" },
    { label: "Prescriptions", path: "/prescriptions", icon: Pill, category: "Health" },
    { label: "Lab Results", path: "/patient-portal/results", icon: Microscope, category: "Health" },
    { label: "Billing", path: "/billing", icon: Wallet, category: "Account" },
    { label: "Messages", path: "/messages", icon: MessageSquare, category: "Account" },
  ],
  guardian: [
    { label: "Dashboard", path: "/", icon: LayoutDashboard, category: "Main" },
    { label: "Family", path: "/guardian", icon: Baby, category: "Family" },
    { label: "Child Profiles", path: "/guardian/children", icon: Users, category: "Family" },
    { label: "Appointments", path: "/appointments", icon: Calendar, category: "Family" },
    { label: "Book Appointment", path: "/guardian/book", icon: Calendar, category: "Family" },
    { label: "Health Records", path: "/guardian/records", icon: FileText, category: "Family" },
    { label: "Vaccinations", path: "/guardian/vaccinations", icon: ShieldCheck, category: "Family" },
    { label: "Alerts & Reminders", path: "/guardian/alerts", icon: Bell, category: "Family" },
    { label: "Messages", path: "/messages", icon: MessageSquare, category: "Communication" },
  ],
};

const STORAGE_KEY = "joan-sidebar-collapsed";

export function Sidebar() {
  const { user } = useAuthStore();
  const pathname = usePathname();
  const role = (user?.role || "doctor") as keyof typeof sidebarConfigs;
  const sidebarItems = sidebarConfigs[role] || sidebarConfigs.doctor;
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

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
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-[width]",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand */}
      <div className={cn(
        "flex items-center gap-3 border-b border-sidebar-border px-4 py-4",
        collapsed && "justify-center px-2"
      )}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <GraduationCap className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-sidebar-foreground">Joan</p>
            <p className="truncate text-xs text-sidebar-muted">Healthcare OS</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 scrollbar-thin">
        {ordered.map((group) => (
          <div key={group.category} className="mb-3">
            {!collapsed && (
              <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-sidebar-muted">
                {group.category}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.path ||
                  (item.path !== "/" && pathname.startsWith(item.path + "/"));
                const Icon = item.icon;
                return (
                  <li key={item.path}>
                    <Link
                      href={item.path}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-active text-sidebar-active-foreground"
                          : "text-sidebar-foreground hover:bg-muted/60",
                        collapsed && "justify-center px-0"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
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
            "mb-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-sidebar-muted transition-colors hover:bg-muted/60",
            collapsed && "justify-center px-0"
          )}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          {!collapsed && "Collapse"}
        </button>
        <div className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2",
          collapsed && "justify-center px-0"
        )}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {(user?.fullName || user?.email || "U").charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
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
  );
}
