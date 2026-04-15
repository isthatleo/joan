"use client";

import { useCan } from "@/hooks/use-can";
import { useAuthStore } from "@/stores/auth";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Activity,
  Pill,
  Microscope,
  DollarSign,
  Settings,
  BarChart3,
  Building2,
  TestTube,
  MessageSquare,
  Lock,
  Heart,
  Boxes,
  Truck,
  AlertCircle,
  UserCheck,
  PlusCircle,
  FileText,
  TrendingUp,
  Bell,
  CheckCircle,
} from "lucide-react";

interface SidebarItem {
  label: string;
  path: string;
  permission: string;
  icon: React.ComponentType<{ className?: string }>;
  category?: string;
}

const sidebarConfigs = {
  super_admin: [
    { label: "Dashboard", path: "/", permission: "dashboard.read", icon: LayoutDashboard, category: "Main" },
    { label: "Tenants", path: "/tenants", permission: "admin.manage", icon: Building2, category: "Admin" },
    { label: "Tenant Usage", path: "/tenants/usage", permission: "admin.manage", icon: BarChart3, category: "Admin" },
    { label: "Global Analytics", path: "/global-analytics", permission: "analytics.read", icon: BarChart3, category: "Admin" },
    { label: "Roles & Permissions", path: "/roles", permission: "admin.manage", icon: Lock, category: "Admin" },
    { label: "Compliance", path: "/compliance", permission: "compliance.read", icon: Lock, category: "Security" },
    { label: "Audit Logs", path: "/compliance/audit", permission: "compliance.read", icon: Activity, category: "Security" },
    { label: "System Health", path: "/system-health", permission: "admin.manage", icon: Activity, category: "System" },
    { label: "Platform Settings", path: "/settings", permission: "admin.manage", icon: Settings, category: "System" },
  ],
  hospital_admin: [
    { label: "Dashboard", path: "/", permission: "dashboard.read", icon: LayoutDashboard, category: "Main" },
    { label: "Patients", path: "/patients", permission: "patient.read", icon: Users, category: "Management" },
    { label: "Patient Analytics", path: "/analytics/patients", permission: "analytics.read", icon: BarChart3, category: "Management" },
    { label: "Appointments", path: "/appointments", permission: "appointment.read", icon: Calendar, category: "Management" },
    { label: "Staff Management", path: "/staff-management", permission: "admin.manage", icon: UserCheck, category: "Management" },
    { label: "Departments", path: "/departments", permission: "admin.manage", icon: Building2, category: "Management" },
    { label: "Roles & Permissions", path: "/roles", permission: "admin.manage", icon: Lock, category: "Management" },
    { label: "Lab", path: "/lab", permission: "lab.read", icon: Microscope, category: "Services" },
    { label: "Pharmacy", path: "/pharmacy", permission: "pharmacy.read", icon: Pill, category: "Services" },
    { label: "Billing", path: "/billing", permission: "billing.read", icon: DollarSign, category: "Finance" },
    { label: "Insurance Claims", path: "/insurance-claims", permission: "billing.read", icon: FileText, category: "Finance" },
    { label: "Analytics", path: "/analytics", permission: "analytics.read", icon: BarChart3, category: "Reports" },
    { label: "Revenue Reports", path: "/analytics/revenue", permission: "analytics.read", icon: TrendingUp, category: "Reports" },
    { label: "Audit Logs", path: "/compliance/audit", permission: "compliance.read", icon: Activity, category: "Security" },
    { label: "Settings", path: "/settings", permission: "admin.manage", icon: Settings, category: "System" },
  ],
  doctor: [
    { label: "Dashboard", path: "/", permission: "dashboard.read", icon: LayoutDashboard, category: "Main" },
    { label: "Patients", path: "/patients", permission: "patient.read", icon: Users, category: "Clinical" },
    { label: "Appointments", path: "/appointments", permission: "appointment.read", icon: Calendar, category: "Clinical" },
    { label: "Queue", path: "/queue", permission: "queue.read", icon: Activity, category: "Clinical" },
    { label: "Lab Orders", path: "/lab-orders", permission: "lab.read", icon: TestTube, category: "Orders" },
    { label: "Lab Results", path: "/lab-results", permission: "lab.read", icon: Microscope, category: "Orders" },
    { label: "Prescriptions", path: "/prescriptions", permission: "pharmacy.read", icon: Pill, category: "Orders" },
    { label: "Patient History", path: "/analytics/my-patients", permission: "patient.read", icon: BarChart3, category: "Analytics" },
    { label: "Messages", path: "/messages", permission: "message.send", icon: MessageSquare, category: "Communication" },
  ],
  nurse: [
    { label: "Dashboard", path: "/", permission: "dashboard.read", icon: LayoutDashboard, category: "Main" },
    { label: "Patients", path: "/patients", permission: "patient.read", icon: Users, category: "Care" },
    { label: "Vitals", path: "/vitals", permission: "patient.write", icon: Heart, category: "Care" },
    { label: "Medications", path: "/medications", permission: "pharmacy.read", icon: Pill, category: "Care" },
    { label: "Care Plans", path: "/care-plans", permission: "patient.write", icon: FileText, category: "Care" },
    { label: "Beds", path: "/beds", permission: "ward.manage", icon: Activity, category: "Ward" },
    { label: "Queue", path: "/queue", permission: "queue.read", icon: Activity, category: "Ward" },
    { label: "Reports", path: "/analytics/nursing", permission: "analytics.read", icon: BarChart3, category: "Reports" },
  ],
  lab_technician: [
    { label: "Dashboard", path: "/", permission: "dashboard.read", icon: LayoutDashboard, category: "Main" },
    { label: "Lab Orders", path: "/lab-orders", permission: "lab.read", icon: TestTube, category: "Lab" },
    { label: "Results", path: "/lab-results", permission: "lab.write", icon: Microscope, category: "Lab" },
    { label: "Inventory", path: "/lab-inventory", permission: "inventory.read", icon: Boxes, category: "Lab" },
    { label: "Quality Control", path: "/lab-qc", permission: "lab.write", icon: CheckCircle, category: "Lab" },
    { label: "Analytics", path: "/lab-analytics", permission: "analytics.read", icon: BarChart3, category: "Reports" },
    { label: "Performance", path: "/analytics/lab-performance", permission: "analytics.read", icon: TrendingUp, category: "Reports" },
  ],
  pharmacist: [
    { label: "Dashboard", path: "/", permission: "dashboard.read", icon: LayoutDashboard, category: "Main" },
    { label: "Prescriptions", path: "/prescriptions", permission: "pharmacy.read", icon: Pill, category: "Pharmacy" },
    { label: "Inventory", path: "/pharmacy-inventory", permission: "inventory.read", icon: Boxes, category: "Pharmacy" },
    { label: "Dispensing", path: "/dispensing", permission: "pharmacy.write", icon: Truck, category: "Pharmacy" },
    { label: "Drug Interactions", path: "/drug-interactions", permission: "pharmacy.read", icon: AlertCircle, category: "Safety" },
    { label: "Stock Alerts", path: "/pharmacy-inventory/alerts", permission: "inventory.read", icon: Bell, category: "Inventory" },
    { label: "Suppliers", path: "/pharmacy/suppliers", permission: "pharmacy.write", icon: Building2, category: "Inventory" },
    { label: "Analytics", path: "/analytics", permission: "analytics.read", icon: BarChart3, category: "Reports" },
    { label: "Reports", path: "/analytics/pharmacy", permission: "analytics.read", icon: TrendingUp, category: "Reports" },
  ],
  accountant: [
    { label: "Dashboard", path: "/", permission: "dashboard.read", icon: LayoutDashboard, category: "Main" },
    { label: "Billing", path: "/billing", permission: "billing.read", icon: DollarSign, category: "Finance" },
    { label: "Invoices", path: "/billing/invoices", permission: "billing.read", icon: FileText, category: "Finance" },
    { label: "Payments", path: "/payments", permission: "billing.write", icon: DollarSign, category: "Finance" },
    { label: "Insurance Claims", path: "/insurance-claims", permission: "billing.write", icon: FileText, category: "Finance" },
    { label: "Revenue Tracking", path: "/analytics/revenue", permission: "analytics.read", icon: TrendingUp, category: "Reports" },
    { label: "Reports", path: "/reports", permission: "analytics.read", icon: BarChart3, category: "Reports" },
    { label: "Financial Analysis", path: "/analytics/financial", permission: "analytics.read", icon: Activity, category: "Reports" },
  ],
  receptionist: [
    { label: "Dashboard", path: "/", permission: "dashboard.read", icon: LayoutDashboard, category: "Main" },
    { label: "Appointments", path: "/appointments", permission: "appointment.read", icon: Calendar, category: "Front Desk" },
    { label: "Check-in", path: "/check-in", permission: "patient.write", icon: UserCheck, category: "Front Desk" },
    { label: "Queue", path: "/queue", permission: "queue.read", icon: Activity, category: "Front Desk" },
    { label: "Patient Registration", path: "/patients/register", permission: "patient.write", icon: Users, category: "Front Desk" },
    { label: "Waiting Room", path: "/reception/waiting", permission: "queue.read", icon: Clock, category: "Front Desk" },
    { label: "Emergency", path: "/emergency", permission: "emergency.access", icon: AlertCircle, category: "Emergency" },
  ],
  patient: [
    { label: "Dashboard", path: "/", permission: "dashboard.read", icon: LayoutDashboard, category: "Main" },
    { label: "My Health", path: "/my-health", permission: "patient.read.own", icon: Heart, category: "Health" },
    { label: "Health Records", path: "/patient-portal/records", permission: "patient.read.own", icon: FileText, category: "Health" },
    { label: "Appointments", path: "/appointments", permission: "appointment.read.own", icon: Calendar, category: "Health" },
    { label: "Book Appointment", path: "/appointments/book", permission: "appointment.read.own", icon: PlusCircle, category: "Health" },
    { label: "Prescriptions", path: "/prescriptions", permission: "pharmacy.read.own", icon: Pill, category: "Health" },
    { label: "Lab Results", path: "/patient-portal/results", permission: "patient.read.own", icon: TestTube, category: "Health" },
    { label: "Billing", path: "/billing", permission: "billing.read.own", icon: DollarSign, category: "Account" },
    { label: "Messages", path: "/messages", permission: "message.send", icon: MessageSquare, category: "Account" },
  ],
  guardian: [
    { label: "Dashboard", path: "/", permission: "dashboard.read", icon: LayoutDashboard, category: "Main" },
    { label: "Family", path: "/guardian", permission: "patient.read.own_child", icon: Users, category: "Family" },
    { label: "Child Profiles", path: "/guardian/children", permission: "patient.read.own_child", icon: Users, category: "Family" },
    { label: "Appointments", path: "/appointments", permission: "appointment.read.own_child", icon: Calendar, category: "Family" },
    { label: "Book Appointment", path: "/guardian/book", permission: "appointment.read.own_child", icon: PlusCircle, category: "Family" },
    { label: "Health Records", path: "/guardian/records", permission: "patient.read.own_child", icon: FileText, category: "Family" },
    { label: "Vaccinations", path: "/guardian/vaccinations", permission: "patient.read.own_child", icon: Heart, category: "Family" },
    { label: "Alerts & Reminders", path: "/guardian/alerts", permission: "patient.read.own_child", icon: Bell, category: "Family" },
    { label: "Messages", path: "/messages", permission: "message.send", icon: MessageSquare, category: "Communication" },
  ],
};

export function Sidebar() {
  const { user } = useAuthStore();
  const pathname = usePathname();
  const role = user?.role || "doctor";
  const sidebarItems = (sidebarConfigs[role as keyof typeof sidebarConfigs] || sidebarConfigs.doctor) as SidebarItem[];

  const groupedItems = sidebarItems.reduce((acc, item) => {
    const category = item.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, SidebarItem[]>);

  return (
    <aside className="w-64 border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-y-auto max-h-screen">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-slate-700">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Joan
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Healthcare OS</p>
      </div>

      {/* Navigation Groups */}
      <nav className="p-4 space-y-6">
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category}>
            <h3 className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              {category}
            </h3>
            <div className="space-y-1">
              {items.map((item) => {
                const allowed = useCan(item.permission);
                if (!allowed) return null;

                const isActive = pathname === item.path || pathname.startsWith(item.path + "/");
                const Icon = item.icon;

                return (
                  <a
                    key={item.path}
                    href={item.path}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                      isActive
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-medium"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{item.label}</span>
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}


