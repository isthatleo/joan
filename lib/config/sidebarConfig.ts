// Sidebar configurations for each role
// Import the specific icon set from lucide-react

import {
  Activity,
  Users,
  Hospital,
  TrendingUp,
  Settings,
  AlertCircle,
  Calendar,
  FileText,
  ShoppingCart,
  BarChart3,
  DollarSign,
  Package,
  TestTube,
  MessageSquare,
  Bell,
} from "lucide-react";

export const ROLE_SIDEBAR_CONFIGS = {
  super_admin: {
    logo: "J",
    productName: "Joan",
    userRole: "Super Admin",
    sections: [
      {
        title: "Central Control",
        items: [
          { label: "Dashboard", href: "/super-admin", icon: Activity },
          { label: "Hospitals", href: "/super-admin/hospitals", icon: Hospital },
          { label: "Users", href: "/super-admin/users", icon: Users },
          { label: "Analytics", href: "/super-admin/analytics", icon: TrendingUp },
        ],
      },
      {
        title: "System",
        items: [
          { label: "Settings", href: "/super-admin/settings", icon: Settings },
          { label: "Audit Logs", href: "/super-admin/audit-logs", icon: AlertCircle },
        ],
      },
    ],
  },

  hospital_admin: {
    logo: "J",
    productName: "Joan",
    userRole: "Hospital Admin",
    sections: [
      {
        title: "Operations",
        items: [
          { label: "Dashboard", href: "/admin", icon: Activity },
          { label: "Departments", href: "/admin/departments", icon: Hospital },
          { label: "Staff", href: "/admin/staff", icon: Users },
          { label: "Patients", href: "/admin/patients", icon: FileText },
        ],
      },
      {
        title: "Clinical",
        items: [
          { label: "Appointments", href: "/admin/appointments", icon: Calendar },
          { label: "Medical Records", href: "/admin/records", icon: FileText },
          { label: "Lab Orders", href: "/admin/lab-orders", icon: TestTube },
        ],
      },
      {
        title: "Management",
        items: [
          { label: "Reports", href: "/admin/reports", icon: BarChart3 },
          { label: "Settings", href: "/admin/settings", icon: Settings },
        ],
      },
    ],
  },

  doctor: {
    logo: "J",
    productName: "Joan",
    userRole: "Doctor",
    sections: [
      {
        title: "Patient Care",
        items: [
          { label: "Dashboard", href: "/doctor", icon: Activity },
          { label: "My Patients", href: "/doctor/patients", icon: Users },
          { label: "Appointments", href: "/doctor/appointments", icon: Calendar },
        ],
      },
      {
        title: "Clinical",
        items: [
          { label: "Medical Records", href: "/doctor/records", icon: FileText },
          { label: "Prescriptions", href: "/doctor/prescriptions", icon: ShoppingCart },
          { label: "Lab Results", href: "/doctor/lab-results", icon: TestTube },
        ],
      },
      {
        title: "Communication",
        items: [
          { label: "Messages", href: "/doctor/messages", icon: MessageSquare },
          { label: "Notifications", href: "/doctor/notifications", icon: Bell },
        ],
      },
    ],
  },

  nurse: {
    logo: "J",
    productName: "Joan",
    userRole: "Nurse",
    sections: [
      {
        title: "Patient Care",
        items: [
          { label: "Dashboard", href: "/nurse", icon: Activity },
          { label: "Assigned Patients", href: "/nurse/patients", icon: Users },
          { label: "Tasks", href: "/nurse/tasks", icon: Calendar },
        ],
      },
      {
        title: "Clinical",
        items: [
          { label: "Vitals", href: "/nurse/vitals", icon: Activity },
          { label: "Patient Records", href: "/nurse/records", icon: FileText },
          { label: "Lab Orders", href: "/nurse/lab-orders", icon: TestTube },
        ],
      },
      {
        title: "Communication",
        items: [
          { label: "Messages", href: "/nurse/messages", icon: MessageSquare },
          { label: "Notifications", href: "/nurse/notifications", icon: Bell },
        ],
      },
    ],
  },

  lab_technician: {
    logo: "J",
    productName: "Joan",
    userRole: "Lab Technician",
    sections: [
      {
        title: "Lab Operations",
        items: [
          { label: "Dashboard", href: "/lab", icon: Activity },
          { label: "Orders", href: "/lab/orders", icon: TestTube },
          { label: "Results", href: "/lab/results", icon: FileText },
        ],
      },
      {
        title: "Inventory",
        items: [
          { label: "Stock", href: "/lab/inventory", icon: Package },
          { label: "Equipment", href: "/lab/equipment", icon: Activity },
        ],
      },
      {
        title: "Documentation",
        items: [
          { label: "Reports", href: "/lab/reports", icon: BarChart3 },
          { label: "Messages", href: "/lab/messages", icon: MessageSquare },
        ],
      },
    ],
  },

  pharmacist: {
    logo: "J",
    productName: "Joan",
    userRole: "Pharmacist",
    sections: [
      {
        title: "Pharmacy",
        items: [
          { label: "Dashboard", href: "/pharmacy", icon: Activity },
          { label: "Prescriptions", href: "/pharmacy/prescriptions", icon: ShoppingCart },
          { label: "Inventory", href: "/pharmacy/inventory", icon: Package },
        ],
      },
      {
        title: "Management",
        items: [
          { label: "Stock Orders", href: "/pharmacy/orders", icon: FileText },
          { label: "Reports", href: "/pharmacy/reports", icon: BarChart3 },
        ],
      },
      {
        title: "Communication",
        items: [
          { label: "Messages", href: "/pharmacy/messages", icon: MessageSquare },
          { label: "Notifications", href: "/pharmacy/notifications", icon: Bell },
        ],
      },
    ],
  },

  accountant: {
    logo: "J",
    productName: "Joan",
    userRole: "Accountant",
    sections: [
      {
        title: "Finance",
        items: [
          { label: "Dashboard", href: "/accounts", icon: Activity },
          { label: "Invoices", href: "/accounts/invoices", icon: FileText },
          { label: "Payments", href: "/accounts/payments", icon: DollarSign },
        ],
      },
      {
        title: "Reports",
        items: [
          { label: "Financial Reports", href: "/accounts/reports", icon: BarChart3 },
          { label: "Billing", href: "/accounts/billing", icon: ShoppingCart },
        ],
      },
      {
        title: "Settings",
        items: [
          { label: "Settings", href: "/accounts/settings", icon: Settings },
        ],
      },
    ],
  },

  receptionist: {
    logo: "J",
    productName: "Joan",
    userRole: "Receptionist",
    sections: [
      {
        title: "Reception",
        items: [
          { label: "Dashboard", href: "/reception", icon: Activity },
          { label: "Appointments", href: "/reception/appointments", icon: Calendar },
          { label: "Check-In", href: "/reception/check-in", icon: Users },
        ],
      },
      {
        title: "Patient Management",
        items: [
          { label: "Patients", href: "/reception/patients", icon: FileText },
          { label: "Visitor Log", href: "/reception/visitors", icon: Users },
        ],
      },
      {
        title: "Communication",
        items: [
          { label: "Messages", href: "/reception/messages", icon: MessageSquare },
          { label: "Notifications", href: "/reception/notifications", icon: Bell },
        ],
      },
    ],
  },

  patient: {
    logo: "J",
    productName: "Joan",
    userRole: "Patient",
    sections: [
      {
        title: "My Health",
        items: [
          { label: "Dashboard", href: "/patient-portal", icon: Activity },
          { label: "Appointments", href: "/patient-portal/appointments", icon: Calendar },
          { label: "Medical Records", href: "/patient-portal/records", icon: FileText },
        ],
      },
      {
        title: "Health Data",
        items: [
          { label: "Lab Results", href: "/patient-portal/lab-results", icon: TestTube },
          { label: "Prescriptions", href: "/patient-portal/prescriptions", icon: ShoppingCart },
        ],
      },
      {
        title: "Support",
        items: [
          { label: "Messages", href: "/patient-portal/messages", icon: MessageSquare },
          { label: "Notifications", href: "/patient-portal/notifications", icon: Bell },
        ],
      },
    ],
  },

  guardian: {
    logo: "J",
    productName: "Joan",
    userRole: "Guardian",
    sections: [
      {
        title: "Care",
        items: [
          { label: "Dashboard", href: "/guardian", icon: Activity },
          { label: "Dependents", href: "/guardian/dependents", icon: Users },
          { label: "Appointments", href: "/guardian/appointments", icon: Calendar },
        ],
      },
      {
        title: "Health Info",
        items: [
          { label: "Medical Records", href: "/guardian/records", icon: FileText },
          { label: "Lab Results", href: "/guardian/lab-results", icon: TestTube },
        ],
      },
      {
        title: "Communication",
        items: [
          { label: "Messages", href: "/guardian/messages", icon: MessageSquare },
          { label: "Notifications", href: "/guardian/notifications", icon: Bell },
        ],
      },
    ],
  },
};

