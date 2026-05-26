"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CalendarDays, FileText, Search, TestTube2, UserPlus } from "lucide-react";

type Child = {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  dob?: string | null;
  gender: string;
  allergies: string[];
  conditions: string[];
  nextAppointment?: string | null;
  healthStatus: string;
  vaccinationStatus: string;
  permissions: {
    canViewRecords: boolean;
    canSchedule: boolean;
    emergencyContact: boolean;
  };
};

type Payload = {
  children: Child[];
  stats: {
    totalChildren: number;
    activeChildren: number;
    childrenWithAppointments: number;
    childrenNeedingVaccinations: number;
  };
};

function ageLabel(dob?: string | null) {
  if (!dob) return "Age not set";
  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return "Age not set";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return `${Math.max(0, age)}y`;
}

export default function GuardianChildrenPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [data, setData] = useState<Payload | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    fetch(`/api/tenant/${slug}/guardian/children`, { cache: "no-store", credentials: "include" })
      .then((res) => res.json())
      .then(setData);
  }, [slug]);

  const children = useMemo(
    () =>
      (data?.children || []).filter((item) => {
        const matchesSearch = [
          item.fullName,
          item.firstName,
          item.lastName,
          item.gender,
          ...item.allergies,
          ...item.conditions,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search.toLowerCase()));
        const matchesStatus = status === "all" || item.healthStatus === status;
        return matchesSearch && matchesStatus;
      }),
    [data?.children, search, status],
  );

  if (!data) return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading child profiles...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">Child Profiles</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Children in your care network</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Profile-level allergies, conditions, appointments, permissions, and health status from the tenant care workflows.
          </p>
        </div>
        <Link href={`/tenant/${slug}/guardian/children/add`} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
          <UserPlus className="mr-2 inline h-4 w-4" />
          Add Child
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Total</p><p className="mt-2 text-3xl font-semibold text-foreground">{data.stats.totalChildren}</p></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Active</p><p className="mt-2 text-3xl font-semibold text-foreground">{data.stats.activeChildren}</p></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">With appointments</p><p className="mt-2 text-3xl font-semibold text-foreground">{data.stats.childrenWithAppointments}</p></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Vaccination follow-up</p><p className="mt-2 text-3xl font-semibold text-foreground">{data.stats.childrenNeedingVaccinations}</p></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search child profiles" className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-3 text-sm text-foreground" />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
            <option value="all">All health states</option>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {children.map((child) => (
          <div key={child.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">{child.fullName}</p>
                <p className="text-sm text-muted-foreground">{child.gender} - {ageLabel(child.dob)}</p>
              </div>
              <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium capitalize text-primary">{child.healthStatus}</span>
            </div>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p>Allergies: {child.allergies.length ? child.allergies.join(", ") : "None recorded"}</p>
              <p>Conditions: {child.conditions.length ? child.conditions.join(", ") : "None recorded"}</p>
              <p>Next appointment: {child.nextAppointment ? new Date(child.nextAppointment).toLocaleDateString() : "None"}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-border px-2 py-1 text-muted-foreground">{child.permissions.canViewRecords ? "Records access" : "Records blocked"}</span>
              <span className="rounded-full border border-border px-2 py-1 text-muted-foreground">{child.permissions.canSchedule ? "Scheduling enabled" : "Scheduling blocked"}</span>
              {child.permissions.emergencyContact ? <span className="rounded-full border border-border px-2 py-1 text-muted-foreground">Emergency contact</span> : null}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href={`/tenant/${slug}/guardian/children/${child.id}`} className="rounded-xl border border-border px-3 py-2 text-center text-sm font-medium text-foreground hover:bg-muted">View</Link>
              <Link href={`/tenant/${slug}/guardian/book?child=${child.id}`} className="rounded-xl bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground hover:opacity-90">
                <CalendarDays className="mr-2 inline h-4 w-4" />
                Book
              </Link>
              <Link href={`/tenant/${slug}/guardian/records?childId=${child.id}`} className="rounded-xl border border-border px-3 py-2 text-center text-sm font-medium text-foreground hover:bg-muted">
                <FileText className="mr-2 inline h-4 w-4" />
                Records
              </Link>
              <Link href={`/tenant/${slug}/guardian/lab-results?childId=${child.id}`} className="rounded-xl border border-border px-3 py-2 text-center text-sm font-medium text-foreground hover:bg-muted">
                <TestTube2 className="mr-2 inline h-4 w-4" />
                Results
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
