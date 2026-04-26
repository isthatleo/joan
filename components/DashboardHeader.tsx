"use client";

import React from "react";
import { Badge } from "@/components/ui/badge-new";
import { Button } from "@/components/ui/button-new";
import { Bell, Settings, LogOut } from "lucide-react";

interface DashboardHeaderProps {
  title: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  status?: "active" | "inactive" | "pending";
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary" | "outline";
    icon?: React.ReactNode;
  }>;
}

export function DashboardHeader({
  title,
  breadcrumbs = [],
  status,
  actions = [],
}: DashboardHeaderProps) {
  return (
    <div className="border-b border-gray-200 bg-white sticky top-0 z-40">
      <div className="px-6 py-4">
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {index > 0 && <span className="text-gray-400">→</span>}
                {crumb.href ? (
                  <a href={crumb.href} className="hover:text-gray-900">
                    {crumb.label}
                  </a>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Title and Actions Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {status && (
              <Badge variant={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || "secondary"}
                onClick={action.onClick}
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Top Bar Icons */}
      <div className="absolute top-0 right-0 h-full flex items-center pr-6 gap-4">
        <button className="text-gray-600 hover:text-gray-900 transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <button className="text-gray-600 hover:text-gray-900 transition-colors">
          <Settings className="w-5 h-5" />
        </button>
        <button className="text-gray-600 hover:text-gray-900 transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
