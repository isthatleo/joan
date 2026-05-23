import { ReactNode } from "react";
import { BarChart3, Zap, TrendingUp, Users, AlertTriangle, FileText } from "lucide-react";
import Link from "next/link";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/analytics", label: "Analytics", icon: TrendingUp },
  { href: "/admin/financial", label: "Financial", icon: Users },
  { href: "/admin/operations", label: "Operations", icon: Zap },
  { href: "/admin/resources", label: "Resources", icon: AlertTriangle },
  { href: "/admin/quality", label: "Quality", icon: Users },
  { href: "/admin/reports", label: "Reports", icon: FileText },
];

export default function HospitalAdminLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      {/* Navigation Tabs */}
      <div className="-mx-6 mb-6 border-b border-border px-6">
        <div className="flex items-center gap-1 overflow-x-auto pb-0">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:border-orange-300 hover:text-orange-600"
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

