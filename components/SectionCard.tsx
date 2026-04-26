import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface SectionCardProps {
  title?: string;
  description?: string;
  /** Right-aligned area in the header (e.g. "View All" link, filter dropdown) */
  actions?: ReactNode;
  /** Optional emoji/icon string rendered before title (e.g. "📋", "💰") */
  leadIcon?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** Removes default padding for tables / lists that handle their own spacing */
  flush?: boolean;
}

/**
 * Multi-purpose content panel used for tables, lists, charts, etc.
 * Matches CampusSphere "Recent Invoices", "Plan Distribution", etc.
 */
export function SectionCard({
  title,
  description,
  actions,
  leadIcon,
  children,
  className,
  contentClassName,
  flush = false,
}: SectionCardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        className
      )}
    >
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
              {leadIcon && <span className="text-muted-foreground">{leadIcon}</span>}
              {title}
            </h3>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn(!flush && "p-5", contentClassName)}>{children}</div>
    </div>
  );
}
