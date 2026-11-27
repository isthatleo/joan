import type { ReactNode } from "react";

export function Eyebrow({
  children,
  light = false,
  className = "",
}: {
  children: ReactNode;
  light?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${
        light
          ? "border-white/15 bg-white/5 text-orange-300"
          : "border-orange-200/70 bg-orange-50/70 text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300"
      } ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${light ? "bg-orange-400" : "bg-orange-500"}`} />
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  light = false,
  id,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  light?: boolean;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={`${align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-2xl"} scroll-mt-28`}
    >
      <Eyebrow light={light}>{eyebrow}</Eyebrow>
      <h2
        className={`mt-5 text-balance text-3xl font-semibold leading-[1.12] tracking-[-0.04em] sm:text-4xl lg:text-[46px] ${
          light ? "text-white" : "text-slate-950 dark:text-white"
        }`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`mt-5 text-[15px] leading-7 sm:text-base ${
            light ? "text-slate-300/85" : "text-slate-600 dark:text-slate-400"
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}
