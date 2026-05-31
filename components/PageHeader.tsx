import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  /** Right-side actions (buttons, filters, etc.) */
  actions?: ReactNode;
  className?: string;
}

/**
 * Standard page header used across every dashboard.
 * Matches CampusSphere screenshots: large bold title, muted subtitle,
 * optional action area on the right.
 */
export function PageHeader({ title, subtitle, description, actions, className }: PageHeaderProps) {
  const supportingText = subtitle ?? description;

  return (
    <div className={cn("mb-6 flex flex-wrap items-start justify-between gap-4", className)}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {supportingText && (
          <p className="mt-1 text-sm text-muted-foreground">{supportingText}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
