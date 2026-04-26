"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Settings, LogOut, ChevronDown, Menu, X } from "lucide-react";
import { useState } from "react";

interface SidebarItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  badge?: number;
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

interface ModernSidebarProps {
  sections: SidebarSection[];
  logo?: React.ReactNode;
  userRole: string;
}

export function ModernSidebar({ sections, logo, userRole }: ModernSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden max-md:flex fixed top-4 left-4 z-50 p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50"
      >
        {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 transition-all duration-300 z-40 ${
          collapsed ? "w-20 max-md:hidden" : "w-72"
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {logo ? (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg">
                J
              </div>
            ) : null}
            {!collapsed && (
              <div>
                <h2 className="font-bold text-gray-900 text-sm">Joan Health</h2>
                <p className="text-xs text-gray-500 capitalize">{userRole}</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-140px)]">
          {sections.map((section, idx) => (
            <div key={idx}>
              {!collapsed && (
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-3">
                  {section.title}
                </h3>
              )}
              <div className="space-y-1">
                {section.items.map((item, itemIdx) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={itemIdx}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                        isActive
                          ? "bg-gradient-to-r from-orange-500/10 to-orange-500/5 text-orange-600 font-semibold"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                      title={collapsed ? item.label : ""}
                    >
                      <div className="flex-shrink-0">{item.icon}</div>
                      {!collapsed && (
                        <>
                          <span className="flex-1">{item.label}</span>
                          {item.badge && (
                            <span className="flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full bg-orange-500 text-white">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Overlay */}
      {collapsed && (
        <div
          className="hidden max-md:block fixed inset-0 bg-black/30 z-30"
          onClick={() => setCollapsed(false)}
        />
      )}
    </>
  );
}

interface ModernHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function ModernHeader({ title, subtitle, actions }: ModernHeaderProps) {
  return (
    <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200/50">
      <div className="px-8 py-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {actions}

          {/* Header Icons */}
          <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <LogOut className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

