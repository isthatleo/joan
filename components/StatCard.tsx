import React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  tone?: "primary" | "success" | "warning" | "info" | "destructive" | "neutral";
  trend?: { value: string; direction: "up" | "down" | "neutral" };
  className?: string;
}

const TONE_STYLES = {
  primary: "bg-primary-soft text-primary-soft-foreground",
  success: "bg-success-soft text-success-soft-foreground",
  warning: "bg-warning-soft text-warning-soft-foreground",
  info: "bg-info-soft text-info-soft-foreground",
  destructive: "bg-destructive-soft text-destructive-soft-foreground",
  neutral: "bg-muted text-muted-foreground",
} as const;

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = "neutral",
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {Icon && (
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg",
              TONE_STYLES[tone]
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </h2>

      {(subtitle || trend) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {trend && (
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-xs font-medium",
                trend.direction === "up" && "bg-success-soft text-success-soft-foreground",
                trend.direction === "down" && "bg-destructive-soft text-destructive-soft-foreground",
                trend.direction === "neutral" && "bg-muted text-muted-foreground"
              )}
            >
              {trend.value}
            </span>
          )}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
