import React from "react";
import { LucideIcon } from "lucide-react";

interface PremiumMetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  change?: {
    value: number;
    isPositive: boolean;
  };
  gradient: "orange" | "blue" | "green" | "purple" | "red";
}

export function PremiumMetricCard({
  icon: Icon,
  label,
  value,
  unit,
  change,
  gradient,
}: PremiumMetricCardProps) {
  const gradients = {
    orange: "from-orange-500 to-orange-600",
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600",
    red: "from-red-500 to-red-600",
  };

  const lightGradients = {
    orange: "from-orange-500/10 to-orange-500/5 text-orange-600",
    blue: "from-blue-500/10 to-blue-500/5 text-blue-600",
    green: "from-green-500/10 to-green-500/5 text-green-600",
    purple: "from-purple-500/10 to-purple-500/5 text-purple-600",
    red: "from-red-500/10 to-red-500/5 text-red-600",
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-lg">
      {/* Animated Background Gradient */}
      <div
        className={`absolute inset-0 opacity-0 group-hover:opacity-5 bg-gradient-to-br ${gradients[gradient]} transition-opacity duration-300`}
      ></div>

      <div className="relative p-6">
        {/* Icon */}
        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${lightGradients[gradient]} flex items-center justify-center mb-4`}>
          <Icon className="w-7 h-7" />
        </div>

        {/* Content */}
        <p className="text-sm text-gray-600 mb-2">{label}</p>
        <div className="flex items-baseline gap-2 mb-4">
          <p className="text-4xl font-bold text-gray-900">{value}</p>
          {unit && <p className="text-sm text-gray-500">{unit}</p>}
        </div>

        {/* Change Indicator */}
        {change && (
          <div
            className={`flex items-center gap-1 text-sm font-semibold ${
              change.isPositive ? "text-green-600" : "text-red-600"
            }`}
          >
            <span>{change.isPositive ? "↑" : "↓"}</span>
            <span>{Math.abs(change.value)}%</span>
            <span className="text-gray-500 font-normal">vs last month</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface PremiumCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PremiumCard({
  title,
  subtitle,
  action,
  children,
  className = "",
}: PremiumCardProps) {
  return (
    <div className={`rounded-2xl bg-white border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-lg ${className}`}>
      {/* Header */}
      {(title || action) && (
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}

      {/* Content */}
      <div className="p-8">{children}</div>
    </div>
  );
}

interface DataRowProps {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  status?: "success" | "warning" | "pending" | "error";
  action?: React.ReactNode;
}

export function DataRow({ icon, label, value, status, action }: DataRowProps) {
  const statusColors = {
    success: "bg-green-500/10 text-green-700",
    warning: "bg-yellow-500/10 text-yellow-700",
    pending: "bg-orange-500/10 text-orange-700",
    error: "bg-red-500/10 text-red-700",
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200">
      <div className="flex items-center gap-4 flex-1">
        {icon && <div className="text-gray-400">{icon}</div>}
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{label}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {status && (
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[status]}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        )}
        <p className="text-sm font-semibold text-gray-900">{value}</p>
        {action}
      </div>
    </div>
  );
}

