import { useCan } from "@/hooks/use-can";
import { useAuthStore } from "@/stores/auth";

const sidebarConfigs = {
  super_admin: [
    { label: "Dashboard", path: "/", permission: "dashboard.read" },
    { label: "Tenants", path: "/tenants", permission: "admin.manage" },
    { label: "Global Analytics", path: "/analytics", permission: "analytics.read" },
    { label: "Platform Settings", path: "/settings", permission: "admin.manage" },
    { label: "Compliance", path: "/compliance", permission: "compliance.read" },
  ],
  hospital_admin: [
    { label: "Dashboard", path: "/", permission: "dashboard.read" },
    { label: "Staff Management", path: "/staff-management", permission: "admin.manage" },
    { label: "Departments", path: "/departments", permission: "admin.manage" },
    { label: "Analytics", path: "/analytics", permission: "analytics.read" },
    { label: "Settings", path: "/settings", permission: "admin.manage" },
  ],
  doctor: [
    { label: "Dashboard", path: "/", permission: "dashboard.read" },
    { label: "Patients", path: "/patients", permission: "patient.read" },
    { label: "Appointments", path: "/appointments", permission: "appointment.read" },
    { label: "Queue", path: "/queue", permission: "queue.read" },
    { label: "Lab Orders", path: "/lab-orders", permission: "lab.read" },
    { label: "Prescriptions", path: "/prescriptions", permission: "pharmacy.read" },
    { label: "Messages", path: "/messages", permission: "message.send" },
  ],
  nurse: [
    { label: "Dashboard", path: "/", permission: "dashboard.read" },
    { label: "Vitals", path: "/vitals", permission: "patient.write" },
    { label: "Medications", path: "/medications", permission: "pharmacy.read" },
    { label: "Beds", path: "/beds", permission: "ward.manage" },
    { label: "Patients", path: "/patients", permission: "patient.read" },
    { label: "Queue", path: "/queue", permission: "queue.read" },
  ],
  lab_technician: [
    { label: "Dashboard", path: "/", permission: "dashboard.read" },
    { label: "Lab Orders", path: "/lab-orders", permission: "lab.read" },
    { label: "Results", path: "/lab-results", permission: "lab.write" },
    { label: "Inventory", path: "/lab-inventory", permission: "inventory.read" },
    { label: "Analytics", path: "/analytics", permission: "analytics.read" },
  ],
  pharmacist: [
    { label: "Dashboard", path: "/", permission: "dashboard.read" },
    { label: "Prescriptions", path: "/prescriptions", permission: "pharmacy.read" },
    { label: "Inventory", path: "/pharmacy-inventory", permission: "inventory.read" },
    { label: "Dispensing", path: "/dispensing", permission: "pharmacy.write" },
    { label: "Analytics", path: "/analytics", permission: "analytics.read" },
  ],
  accountant: [
    { label: "Dashboard", path: "/", permission: "dashboard.read" },
    { label: "Billing", path: "/billing", permission: "billing.read" },
    { label: "Payments", path: "/payments", permission: "billing.write" },
    { label: "Insurance Claims", path: "/insurance-claims", permission: "billing.write" },
    { label: "Reports", path: "/reports", permission: "analytics.read" },
  ],
  receptionist: [
    { label: "Dashboard", path: "/", permission: "dashboard.read" },
    { label: "Appointments", path: "/appointments", permission: "appointment.read" },
    { label: "Check-in", path: "/check-in", permission: "patient.write" },
    { label: "Queue", path: "/queue", permission: "queue.read" },
    { label: "Emergency", path: "/emergency", permission: "emergency.access" },
  ],
  patient: [
    { label: "Dashboard", path: "/", permission: "dashboard.read" },
    { label: "My Health", path: "/my-health", permission: "patient.read.own" },
    { label: "Appointments", path: "/appointments", permission: "appointment.read.own" },
    { label: "Prescriptions", path: "/prescriptions", permission: "pharmacy.read.own" },
    { label: "Billing", path: "/billing", permission: "billing.read.own" },
  ],
  guardian: [
    { label: "Dashboard", path: "/", permission: "dashboard.read" },
    { label: "Family", path: "/guardian", permission: "patient.read.own_child" },
    { label: "Appointments", path: "/appointments", permission: "appointment.read.own_child" },
    { label: "Messages", path: "/messages", permission: "message.send" },
  ],
};

export function Sidebar() {
  const { user } = useAuthStore();
  // Assume user has a role field, default to 'doctor' for now
  const role = user?.role || 'doctor';
  const sidebarItems = sidebarConfigs[role as keyof typeof sidebarConfigs] || sidebarConfigs.doctor;

  return (
    <div className="w-64 border-r p-4 overflow-y-auto max-h-screen bg-white dark:bg-slate-900">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Joan</h2>
      {sidebarItems.map((item) => {
        const allowed = useCan(item.permission);
        if (!allowed) return null;

        return (
          <a
            key={item.path}
            href={item.path}
            className="block py-3 px-4 mb-1 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {item.label}
          </a>
        );
      })}
    </div>
  );
}
