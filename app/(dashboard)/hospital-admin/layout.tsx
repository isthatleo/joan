import { ReactNode } from "react";
import { BarChart3, Zap, TrendingUp, Users, AlertTriangle, FileText } from "lucide-react";
import Link from "next/link";

const navItems = [
  { href: "/hospital-admin", label: "Dashboard", icon: BarChart3 },
  { href: "/hospital-admin/analytics", label: "Analytics", icon: TrendingUp },
  { href: "/hospital-admin/financial", label: "Financial", icon: Users },
  { href: "/hospital-admin/operations", label: "Operations", icon: Zap },
  { href: "/hospital-admin/resources", label: "Resources", icon: AlertTriangle },
  { href: "/hospital-admin/quality", label: "Quality", icon: Users },
  { href: "/hospital-admin/reports", label: "Reports", icon: FileText },
];

export default function HospitalAdminLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      {/* Navigation Tabs */}
      <div className="mb-6 border-b border-gray-200 -mx-6 px-6">
        <div className="flex items-center gap-1 overflow-x-auto pb-0">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-600 hover:text-orange-600 border-b-2 border-transparent hover:border-orange-300 transition-all whitespace-nowrap"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Page Content */}
      <div>{children}</div>
    </div>
  );
}

