import React from "react";

interface SimpleChartProps {
  title: string;
  data: Array<{
    label: string;
    value: number;
    maxValue?: number;
  }>;
  type?: "bar" | "progress";
}

export function SimpleChart({ title, data, type = "bar" }: SimpleChartProps) {
  const max = Math.max(...data.map((d) => d.maxValue || 100));

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 mb-6">{title}</h4>
      <div className="space-y-6">
        {data.map((item, idx) => (
          <div key={idx}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-700">{item.label}</p>
              <p className="text-sm font-semibold text-gray-900">{item.value}%</p>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-500"
                style={{ width: `${(item.value / max) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TimelineItem {
  id: string;
  title: string;
  description: string;
  time: string;
  icon: React.ReactNode;
  status: "completed" | "pending" | "failed";
}

interface TimelineProps {
  items: TimelineItem[];
}

export function Timeline({ items }: TimelineProps) {
  const statusColors = {
    completed: "bg-green-500 border-green-200",
    pending: "bg-orange-500 border-orange-200",
    failed: "bg-red-500 border-red-200",
  };

  return (
    <div className="space-y-6">
      {items.map((item, idx) => (
        <div key={item.id} className="flex gap-6">
          {/* Timeline dot and line */}
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${statusColors[item.status]} border-2`}
            >
              {item.icon}
            </div>
            {idx < items.length - 1 && (
              <div className="w-1 h-20 bg-gray-200 mt-4"></div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pt-1">
            <p className="font-semibold text-gray-900">{item.title}</p>
            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
            <p className="text-xs text-gray-500 mt-2">{item.time}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

interface StatGridProps {
  items: Array<{
    label: string;
    value: string | number;
    subtext?: string;
  }>;
}

export function StatGrid({ items }: StatGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200"
        >
          <p className="text-xs text-gray-600 mb-2">{item.label}</p>
          <p className="text-2xl font-bold text-gray-900">{item.value}</p>
          {item.subtext && <p className="text-xs text-gray-500 mt-1">{item.subtext}</p>}
        </div>
      ))}
    </div>
  );
}

