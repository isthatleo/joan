import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { StatusPill } from "./StatusPill";

/* ----------------------------------------------------------------- *
 * DataCard — supports BOTH:                                         *
 *  (A) Legacy "list container" API used by existing pages:          *
 *      <DataCard title="..." items={DataCardItem[]} onItemClick=.. >*
 *  (B) New "row" API used by new screens:                           *
 *      <DataCard title meta description value status onClick href />*
 * ----------------------------------------------------------------- */

export interface DataCardItem {
  id: string;
  title: string;
  subtitle?: string;
  status?: "completed" | "pending" | "in-progress" | "active" | "inactive" | string;
  value?: string | number;
  meta?: ReactNode;
}

interface DataCardRowProps {
  /** Single row mode */
  title: string;
  meta?: ReactNode;
  description?: ReactNode;
  value?: ReactNode;
  status?: ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  /** Not used in row mode */
  items?: undefined;
  onItemClick?: undefined;
  emptyMessage?: undefined;
}

interface DataCardListProps {
  /** List container mode */
  title?: string;
  items: DataCardItem[];
  onItemClick?: (item: DataCardItem) => void;
  emptyMessage?: string;
  className?: string;
}

export type DataCardProps = DataCardRowProps | DataCardListProps;

/** Map legacy status strings → semantic StatusPill tones */
function toneForStatus(s?: string): "success" | "warning" | "info" | "destructive" | "neutral" {
  switch (s) {
    case "completed":
    case "active":
    case "paid":
    case "success":
      return "success";
    case "pending":
    case "warning":
      return "warning";
    case "in-progress":
    case "scheduled":
    case "info":
      return "info";
    case "cancelled":
    case "failed":
    case "inactive":
    case "error":
      return "destructive";
    default:
      return "neutral";
  }
}

function isListMode(p: DataCardProps): p is DataCardListProps {
  return Array.isArray((p as DataCardListProps).items);
}

export function DataCard(props: DataCardProps) {
  // ----- LIST MODE -----
  if (isListMode(props)) {
    const { title, items, onItemClick, emptyMessage = "No items.", className } = props;
    return (
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-border bg-card shadow-sm",
          className
        )}
      >
        {title && (
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
          </div>
        )}
        <div className="divide-y divide-border">
          {items.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={onItemClick ? () => onItemClick(item) : undefined}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors",
                  onItemClick && "hover:bg-muted/40"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {item.title}
                    </p>
                    {item.meta}
                  </div>
                  {item.subtitle && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {item.subtitle}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {item.value !== undefined && (
                    <span className="text-sm font-semibold text-foreground">
                      {item.value}
                    </span>
                  )}
                  {item.status && (
                    <StatusPill tone={toneForStatus(item.status)} withDot>
                      {item.status}
                    </StatusPill>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // ----- ROW MODE -----
  const { title, meta, description, value, status, onClick, href, className } = props;
  const content = (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          {meta}
        </div>
        {description && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {(value || status) && (
        <div className="flex shrink-0 items-center gap-3">
          {value && <span className="text-sm font-semibold text-foreground">{value}</span>}
          {status}
        </div>
      )}
    </>
  );

  const baseClass = cn(
    "flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors",
    (onClick || href) && "cursor-pointer hover:bg-muted/40",
    className
  );

  if (href) return <a href={href} className={baseClass}>{content}</a>;
  if (onClick) return (
    <button type="button" onClick={onClick} className={cn(baseClass, "w-full text-left")}>
      {content}
    </button>
  );
  return <div className={baseClass}>{content}</div>;
}
