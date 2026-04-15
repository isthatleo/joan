"use client";

import { ArrowUp, ArrowDown, TrendingUp } from "lucide-react";
import React from "react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  };
  icon?: React.ComponentType<{ className?: string }>;
  color?: "blue" | "green" | "red" | "yellow" | "purple" | "indigo";
  onClick?: () => void;
  className?: string;
}

const colorClasses = {
  blue: "from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 text-blue-700 dark:text-blue-200",
  green:
    "from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 text-green-700 dark:text-green-200",
  red: "from-red-50 to-red-100 dark:from-red-900 dark:to-red-800 text-red-700 dark:text-red-200",
  yellow:
    "from-yellow-50 to-yellow-100 dark:from-yellow-900 dark:to-yellow-800 text-yellow-700 dark:text-yellow-200",
  purple:
    "from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 text-purple-700 dark:text-purple-200",
  indigo:
    "from-indigo-50 to-indigo-100 dark:from-indigo-900 dark:to-indigo-800 text-indigo-700 dark:text-indigo-200",
};

export function KPICard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  color = "blue",
  onClick,
  className = "",
}: KPICardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:shadow-lg dark:hover:shadow-lg/20 transition-all duration-200 ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {value}
          </h3>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>

        {Icon && (
          <div className={`p-3 rounded-lg bg-gradient-to-br ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-4 flex items-center gap-2">
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              trend.isPositive
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {trend.isPositive ? (
              <ArrowUp className="w-4 h-4" />
            ) : (
              <ArrowDown className="w-4 h-4" />
            )}
            {trend.value}%
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {trend.label}
          </span>
        </div>
      )}
    </div>
  );
}

