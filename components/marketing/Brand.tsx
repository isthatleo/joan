import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  /** Use on dark surfaces. */
  light?: boolean;
  /** Hide the "Healthcare OS" sub-label. */
  compact?: boolean;
  className?: string;
};

export function Logo({ light = false, compact = false, className = "" }: LogoProps) {
  return (
    <Link
      href="/"
      aria-label="Joan Healthcare OS — home"
      className={`group inline-flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-4 focus-visible:ring-offset-transparent ${className}`}
    >
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-white shadow-[0_4px_14px_-4px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105">
        <Image
          src="/assets/icons/logo-icon.svg"
          alt=""
          width={34}
          height={34}
          priority
          className="h-[34px] w-[34px]"
        />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={`text-[23px] font-semibold leading-none tracking-[-0.065em] ${
            light ? "text-white" : "text-slate-950"
          }`}
        >
          joan<span className="text-orange-500">.</span>
        </span>
        {!compact && (
          <span
            className={`mt-[5px] text-[8.5px] font-semibold uppercase leading-none tracking-[0.26em] ${
              light ? "text-white/55" : "text-slate-500"
            }`}
          >
            Healthcare OS
          </span>
        )}
      </span>
    </Link>
  );
}
