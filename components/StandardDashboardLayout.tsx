"use client";

import React from "react";
import { StandardSidebar } from "@/components/StandardSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import type { SidebarSection } from "@/types";

interface StandardDashboardLayoutProps {
  children: React.ReactNode;
  sidebarConfig: {
    logo: string;
    productName: string;
    sections: SidebarSection[];
    userRole: string;
  };
  headerConfig?: {
    title: string;
    breadcrumbs?: Array<{ label: string; href?: string }>;
    status?: "active" | "inactive" | "pending";
    actions?: Array<{
      label: string;
      onClick: () => void;
      variant?: "primary" | "secondary" | "outline";
      icon?: React.ReactNode;
    }>;
  };
}

export function StandardDashboardLayout({
  children,
  sidebarConfig,
  headerConfig,
}: StandardDashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <StandardSidebar {...sidebarConfig} />

      {/* Main Content */}
      <div className="flex-1 ml-64 flex flex-col overflow-hidden">
        {/* Header */}
        {headerConfig && <DashboardHeader {...headerConfig} />}

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
