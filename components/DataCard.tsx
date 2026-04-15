"use client";

import React from "react";
import { ChevronRight } from "lucide-react";

export interface DataCardItem {
  id: string;
  title: string;
  subtitle?: string;
  value?: string;
  status?: "pending" | "completed" | "in-progress" | "urgent" | "normal";
  avatar?: string;
  badge?: string;
  metadata?: Record<string, string>;
}

interface DataCardProps {
  items: DataCardItem[];
  onItemClick?: (item: DataCardItem) => void;
  title?: string;
  emptyMessage?: string;
  columns?: ("title" | "status" | "value" | "metadata")[];
}

const statusColors = {
  pending: "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200",
  completed:
    "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200",
  "in-progress":
    "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200",
  urgent: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200",
  normal: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200",
};

export function DataCard({
  items,
  onItemClick,
  title,
  emptyMessage = "No items found",
  columns = ["title", "status", "value"],
}: DataCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
      {title && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
        </div>
      )}

      <div className="divide-y divide-gray-200 dark:divide-slate-700">
        {items.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
          </div>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              onClick={() => onItemClick?.(item)}
              className="w-full px-6 py-4 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-left flex items-center justify-between group"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  {item.avatar && (
                    <img
                      src={item.avatar}
                      alt={item.title}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {item.title}
                    </p>
                    {item.subtitle && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {item.status && (
                  <span
                    className={`text-xs font-medium px-3 py-1 rounded-full ${
                      statusColors[item.status]
                    }`}
                  >
                    {item.status.replace("-", " ")}
                  </span>
                )}

                {item.value && (
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {item.value}
                  </span>
                )}

                {onItemClick && (
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

