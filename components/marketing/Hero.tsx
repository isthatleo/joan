import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  CalendarCheck2,
  Check,
  ChevronRight,
  Clock3,
  DollarSign,
  FlaskConical,
  HeartPulse,
  LayoutDashboard,
  LockKeyhole,
  Pill,
  Receipt,
  Search,
  Settings2,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Users,
} from "lucide-react";
import { Eyebrow } from "./SectionHeading";

const STATS = [
  { label: "Active patients", value: "1,247", note: "+4% this week", icon: Users, tone: "orange" },
  { label: "Today's visits", value: "284", note: "Across all staff", icon: CalendarCheck2, tone: "blue" },
  { label: "Lab results", value: "58", note: "Awaiting review", icon: FlaskConical, tone: "violet" },
  { label: "MTD revenue", value: "$487K", note: "+11% vs. last month", icon: DollarSign, tone: "green" },
] as const;

const TONES = {
  orange: "bg-orange-50 text-orange-600 ring-orange-100",
  blue: "bg-sky-50 text-sky-600 ring-sky-100",
  violet: "bg-violet-50 text-violet-600 ring-violet-100",
  green: "bg-emerald-50 text-emerald-600 ring-emerald-100",
} as const;

const CHART = [46, 62, 54, 78, 68, 92, 81];
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

const QUEUE = [
  { initials: "SJ", name: "Sarah Johnson", reason: "Hypertension follow-up", wait: "22m", dot: "bg-orange-500" },
  { initials: "MC", name: "Michael Chen", reason: "Annual physical", wait: "18m", dot: "bg-sky-500" },
  { initials: "ED", name: "Emma Davis", reason: "Lab review", wait: "14m", dot: "bg-emerald-500" },
  { initials: "JW", name: "James Wilson", reason: "Post-op care", wait: "8m", dot: "bg-violet-500" },
] as const;

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#FBFAF8] pb-20 pt-28 sm:pt-32 lg:pb-28 lg:pt-40 dark:bg-slate-950">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-52 left-1/2 h-[620px] w-[980px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(249,115,22,0.14),transparent_66%)]" />
        <div className="absolute -right-40 top-24 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(0,164,130,0.11),transparent_68%)]" />
        <div className="absolute inset-x-0 top-0 h-[680px] opacity-[0.45] [background-image:linear-gradient(to_right,rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.045)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
      </div>

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10 lg:px-8">
        <div className="animate-fade-up">
          <Eyebrow>Healthcare OS for modern teams</Eyebrow>

          <h1 className="mt-7 text-balance text-[42px] font-semibold leading-[1.06] tracking-[-0.052em] text-slate-950 dark:text-white sm:text-[56px] lg:text-[64px] xl:text-[70px]">
            One operating system for{" "}
            <span className="bg-gradient-to-r from-orange-600 via-orange-500 to-emerald-500 bg-clip-text text-transparent">
              every moment of care.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-[16px] leading-8 text-slate-600 dark:text-slate-400 sm:text-[17px]">
            From the front desk to the final claim, Joan brings appointments, clinical records, labs,
            pharmacy, and finance into a single multi-tenant workspace — so your teams spend less time
            switching systems and more time with patients.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="#platform"
              className="group inline-flex items-center gap-2 rounded-full bg-orange-600 px-6 py-3.5 text-[14px] font-semibold text-white shadow-[0_14px_32px_-14px_rgba(234,88,12,0.9)] transition-all hover:-translate-y-0.5 hover:bg-orange-700 hover:shadow-[0_18px_38px_-14px_rgba(234,88,12,0.95)]"
            >
              Explore the platform
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full border border-slate-300/80 bg-white/80 dark:border-slate-700 dark:bg-slate-900/80 px-6 py-3.5 text-[14px] font-semibold text-slate-800 dark:text-slate-100 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white"
            >
              Contact us
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3 text-[12px] font-medium text-slate-500 dark:text-slate-400">
            {["10 role-specific workspaces", "6 deployment tiers", "Real-time queues"].map((item, index) => (
              <span key={item} className="inline-flex items-center gap-5">
                {index > 0 && <span className="h-1 w-1 rounded-full bg-slate-300" />}
                <span className="inline-flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  {item}
                </span>
              </span>
            ))}
          </div>
        </div>

        <HeroMockup />
      </div>
    </section>
  );
}

function HeroMockup() {
  return (
    <div className="relative animate-fade-up [animation-delay:140ms]">
      <div
        aria-hidden
        className="absolute -inset-8 rounded-[44px] bg-gradient-to-br from-orange-200/50 via-white/0 to-emerald-200/50 blur-3xl"
      />

      <div className="relative overflow-hidden rounded-[22px] border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-[0_40px_90px_-35px_rgba(15,23,42,0.36),0_4px_16px_-8px_rgba(15,23,42,0.12)]">
        <div className="flex h-11 items-center gap-3 border-b border-slate-200/80 bg-slate-50/90 dark:border-slate-800 dark:bg-slate-800 px-4">
          <div className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF6B6B]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FFC044]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#5CC98A]" />
          </div>
          <div className="ml-2 hidden items-center gap-2 text-[10.5px] text-slate-400 sm:flex">
            <LockKeyhole className="h-3 w-3" />
            app.joan.health / command-center
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-[9.5px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-emerald-500" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
            <span className="hidden h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-[9px] font-bold text-white sm:flex">
              JC
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[72px_minmax(0,1fr)]">
          <aside className="hidden flex-col items-center gap-2 border-r border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-5 sm:flex">
            <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-white">
              <LayoutDashboard className="h-4 w-4" />
            </span>
            {[CalendarCheck2, Users, Stethoscope, FlaskConical, Pill, Receipt, BarChart3].map((Icon, index) => (
              <span
                key={index}
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  index === 1 ? "bg-orange-50 text-orange-600" : "text-slate-400"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
            ))}
            <span className="mt-auto flex h-8 w-8 items-center justify-center rounded-lg text-slate-400">
              <Settings2 className="h-4 w-4" />
            </span>
          </aside>

          <div className="min-w-0 bg-[#FCFCFD] p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Command center
                </p>
                <p className="mt-1 text-[15px] font-semibold tracking-[-0.02em] text-slate-900 dark:text-white">
                  Good morning, Dr. Chen
                </p>
              </div>
              <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-2.5 py-1.5 text-[10px] text-slate-500 dark:text-slate-400 shadow-sm sm:flex">
                <Search className="h-3 w-3" />
                Search anything
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              {STATS.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 p-3 shadow-[0_2px_8px_-6px_rgba(15,23,42,0.25)]"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-lg ring-1 ${TONES[stat.tone]}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                    </div>
                    <p className="mt-3 text-[17px] font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">{stat.value}</p>
                    <p className="text-[9.5px] font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                    <p className="mt-1 text-[8.5px] text-slate-400">{stat.note}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
              <div className="rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-100">Patient volume</p>
                    <p className="text-[9px] text-slate-400">Last 7 days</p>
                  </div>
                  <span className="rounded-md bg-emerald-50 px-1.5 py-1 text-[8.5px] font-semibold text-emerald-700">
                    +12.4%
                  </span>
                </div>
                <div className="relative mt-4 flex h-[86px] items-end justify-between gap-2">
                  <div aria-hidden className="absolute inset-0 flex flex-col justify-between">
                    <span className="border-t border-dashed border-slate-100" />
                    <span className="border-t border-dashed border-slate-100" />
                    <span className="border-t border-dashed border-slate-100" />
                  </div>
                  {CHART.map((height, index) => (
                    <div key={index} className="relative z-10 flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                      <div
                        className={`w-full max-w-6 rounded-t-[4px] ${
                          index === 5
                            ? "bg-gradient-to-t from-orange-500 to-orange-400"
                            : "bg-gradient-to-t from-slate-200 to-slate-100"
                        }`}
                        style={{ height: `${height}%` }}
                      />
                      <span className="text-[8px] font-medium text-slate-400">{DAYS[index]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-100">Live queue</p>
                  <span className="text-[9px] font-medium text-orange-600">View all</span>
                </div>
                <div className="mt-3 space-y-2.5">
                  {QUEUE.map((patient) => (
                    <div key={patient.initials} className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[8px] font-bold dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                        {patient.initials}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[9.5px] font-semibold text-slate-800 dark:text-slate-100">{patient.name}</span>
                        <span className="block truncate text-[8px] text-slate-400">{patient.reason}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-1.5 dark:bg-slate-800 py-1 text-[8px] font-medium text-slate-500 dark:text-slate-400">
                        <span className={`h-1 w-1 rounded-full ${patient.dot}`} />
                        {patient.wait}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-xl border border-orange-100 bg-orange-50/60 px-3 py-2.5">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-orange-600" />
              <p className="text-[9.5px] text-orange-900/80">
                <span className="font-semibold">Copilot:</span> 3 lab results and 2 prescription refills need your review.
              </p>
              <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-orange-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -left-4 bottom-8 hidden w-[218px] animate-float rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900/95 dark:border-slate-800 dark:bg-slate-900/95 p-3.5 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.4)] backdrop-blur md:block lg:-left-10">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-[10px] font-semibold text-slate-900 dark:text-white">AI Copilot</p>
            <p className="text-[8px] text-slate-400">Clinical intelligence</p>
          </div>
        </div>
        <p className="mt-2.5 text-[9.5px] leading-4 text-slate-600 dark:text-slate-400">
          &ldquo;Summarize today&apos;s high-priority cases for handoff.&rdquo;
        </p>
        <div className="mt-2 flex items-center gap-1.5 text-[8.5px] font-semibold text-orange-600">
          <Activity className="h-3 w-3" />
          Summary ready in 4s
        </div>
      </div>

      <div className="absolute -right-3 top-20 hidden w-[190px] animate-float rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900/95 dark:border-slate-800 dark:bg-slate-900/95 p-3 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.4)] backdrop-blur [animation-delay:1.2s] md:block lg:-right-8">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <HeartPulse className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-[9.5px] font-semibold text-slate-900 dark:text-white">Vitals updated</p>
            <p className="text-[8px] text-slate-400">Bed 12 · 2 min ago</p>
          </div>
          <Bell className="ml-auto h-3 w-3 text-slate-300" />
        </div>
        <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-slate-50 px-2 dark:bg-slate-800 py-1.5 text-[8.5px] text-slate-600 dark:text-slate-400">
          <Clock3 className="h-3 w-3 text-orange-500" />
          BP 118/76 · HR 72 bpm
        </div>
      </div>
    </div>
  );
}
