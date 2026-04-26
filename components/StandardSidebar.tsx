"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";

interface SidebarItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

interface StandardSidebarProps {
  logo: string;
  productName: string;
  sections: SidebarSection[];
  userRole: string;
}

export function StandardSidebar({
  logo,
  productName,
  sections,
  userRole,
}: StandardSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="w-64 h-screen bg-white border-r border-gray-200 overflow-y-auto fixed left-0 top-0">
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold">
            {logo.charAt(0)}
          </div>
          <div>
            <h2 className="font-bold text-gray-900">{productName}</h2>
            <p className="text-xs text-gray-600 capitalize">{userRole}</p>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="p-4 space-y-6">
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider px-3 mb-3">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item, itemIndex) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={itemIndex}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "text-orange-600 bg-orange-50"
                        : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
