"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { KPICard } from "@/components/KPICard";
import { DataCard, DataCardItem } from "@/components/DataCard";
import {
  ArrowRight,
  CalendarClock,
  CalendarPlus2,
  FileText,
  FlaskConical,
  MessageSquare,
  Pill,
  TestTube2,
} from "lucide-react";

const appointmentsSeed: DataCardItem[] = [
  { id: "apt-1", title: "Cardiology follow-up", subtitle: "Apr 20 · 10:30 AM", status: "pending", value: "Virtual" },
  { id: "apt-2", title: "Lab draw", subtitle: "Apr 23 · 08:10 AM", status: "pending", value: "On-site" },
];

const prescriptionsSeed: DataCardItem[] = [
  { id: "rx-1", title: "Metformin 500mg", subtitle: "1 tablet twice daily", status: "normal", value: "12 refills left" },
  { id: "rx-2", title: "Rosuvastatin 10mg", subtitle: "1 tablet nightly", status: "normal", value: "4 refills left" },
];

const resultsSeed: DataCardItem[] = [
  { id: "lab-1", title: "Comprehensive Metabolic Panel", subtitle: "Updated Apr 15", status: "completed", value: "Normal" },
  { id: "lab-2", title: "A1C", subtitle: "Updated Apr 10", status: "completed", value: "6.8%" },
  { id: "lab-3", title: "Lipid Panel", subtitle: "Awaiting provider review", status: "in-progress", value: "Pending" },
];

const quickActions = [
  {
    label: "Schedule Appointment",
    description: "Book with your doctor",
    href: "/patient-portal/appointments",
    icon: CalendarPlus2,
    tone: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
  },
  {
    label: "Message Doctor",
    description: "Send secure messages",
    href: "/messages",
    icon: MessageSquare,
    tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  {
    label: "View Results",
    description: "Check lab results",
    href: "/patient-portal/results",
    icon: FlaskConical,
    tone: "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300",
  },
  {
    label: "Medical Records",
    description: "Access your history",
    href: "/patient-portal/records",
    icon: FileText,
    tone: "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300",
  },
];

export default function PatientPortal() {
  const [appointments] = useState(appointmentsSeed);
  const [prescriptions, setPrescriptions] = useState(prescriptionsSeed);
  const [labResults] = useState(resultsSeed);

  const requestRefill = (item: DataCardItem) => {
    setPrescriptions((current) =>
      current.map((entry) =>
        entry.id === item.id ? { ...entry, status: "pending", value: "Refill request sent" } : entry,
      ),
    );
  };

  const unreadResults = useMemo(
    () => labResults.filter((item) => item.status === "in-progress").length,
    [labResults],
  );

  return (
    <div className="space-y-6">
      <Topbar breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Patient Portal" }]} />

      <section>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Patient Portal</h1>
        <p className="text-gray-600 dark:text-gray-400">Review upcoming care, request refills, and track lab updates in real time.</p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard title="Upcoming visits" value={appointments.length} subtitle="Next 14 days" icon={CalendarClock} color="blue" />
        <KPICard title="Active prescriptions" value={prescriptions.length} subtitle="With refill access" icon={Pill} color="green" />
        <KPICard title="Unread results" value={unreadResults} subtitle="Provider updates pending" icon={TestTube2} color="yellow" />
        <KPICard title="Care plans" value={3} subtitle="Documents available" icon={FileText} color="purple" />
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">The tasks patients use most often.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map(({ label, description, href, icon: Icon, tone }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-background p-4 transition-colors hover:bg-muted/40 dark:border-slate-700"
            >
              <span className={`rounded-xl p-2 ${tone}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-gray-900 dark:text-white">{label}</span>
                <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">{description}</span>
              </span>
              <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div>
          <DataCard title="Upcoming Appointments" items={appointments} />
        </div>
        <div>
          <DataCard title="Prescriptions" items={prescriptions} onItemClick={requestRefill} />
        </div>
        <div>
          <DataCard title="Recent Lab Results" items={labResults} />
        </div>
      </section>
    </div>
  );
}
