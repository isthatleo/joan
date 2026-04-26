import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "info" | "destructive" | "primary";

interface StatusPillProps {
  children: React.ReactNode;
  tone?: Tone;
  /** Adds a leading dot like the "Active" pill in screenshots */
  withDot?: boolean;
  className?: string;
}

const TONE_STYLES: Record<Tone, string> = {
  neutral: "bg-muted text-foreground",
  success: "bg-success-soft text-success-soft-foreground",
  warning: "bg-warning-soft text-warning-soft-foreground",
  info: "bg-info-soft text-info-soft-foreground",
  destructive: "bg-destructive-soft text-destructive-soft-foreground",
  primary: "bg-primary-soft text-primary-soft-foreground",
};

const DOT_STYLES: Record<Tone, string> = {
  neutral: "bg-foreground/60",
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-info",
  destructive: "bg-destructive",
  primary: "bg-primary",
};

/**
 * Pill-shaped status badge. Matches "Active" / "Pending" pills in the screenshots.
 */
export function StatusPill({ children, tone = "neutral", withDot, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONE_STYLES[tone],
        className
      )}
    >
      {withDot && <span className={cn("h-1.5 w-1.5 rounded-full", DOT_STYLES[tone])} />}
      {children}
    </span>
  );
}
