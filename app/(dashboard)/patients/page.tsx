"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Plus, Search, UserPlus, Users } from "lucide-react";
import { KPICard } from "@/components/KPICard";
import { Topbar } from "@/components/Topbar";

function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export default function PatientsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["doctor-patients", search, status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const response = await fetch(`/api/doctor/patients?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to load patients");
      return response.json();
    },
  });

  const patients = data?.patients ?? [];
  const stats = data?.stats ?? { total: 0, active: 0, inactive: 0, newThisMonth: 0 };

  const hasPatients = patients.length > 0;
  const atRiskCount = useMemo(
    () => patients.filter((patient: any) => !patient.phone || !patient.email).length,
    [patients]
  );

  return (
    <div className="space-y-6">
      <Topbar breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Patients" }]} />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Patients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search, review, and manage your live patient roster.
          </p>
        </div>
        <Link
          href="/patients/register"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          {hasPatients ? "Add Patient" : "Add First Patient"}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard title="Total Patients" value={stats.total} subtitle="Available in your roster" tone="info" icon={Users} />
        <KPICard title="Active Patients" value={stats.active} subtitle="Marked active" tone="success" icon={UserPlus} />
        <KPICard title="New This Month" value={stats.newThisMonth} subtitle="Recently added" tone="primary" icon={Plus} />
        <KPICard title="Needs Follow-up" value={atRiskCount} subtitle="Missing contact details" tone="warning" icon={AlertCircle} />
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, phone, or patient ID"
              className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm text-foreground outline-none ring-0 placeholder:text-muted-foreground"
            />
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {isError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load patients.
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">Patient Registry</h2>
          <p className="text-sm text-muted-foreground">{patients.length} record(s) loaded</p>
        </div>

        {!hasPatients && !isLoading ? (
          <div className="px-5 py-10 text-center">
            <p className="text-base font-medium text-foreground">No patients found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first patient to begin consultation and appointment workflows.
            </p>
            <Link
              href="/patients/register"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              Add First Patient
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Patient</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Patient ID</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Contact</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">DOB</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index} className="border-t border-border">
                      <td className="px-5 py-4 text-muted-foreground" colSpan={6}>Loading patient data...</td>
                    </tr>
                  ))
                ) : (
                  patients.map((patient: any) => (
                    <tr key={patient.id} className="border-t border-border">
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-medium text-foreground">{patient.fullName || `${patient.firstName} ${patient.lastName}`.trim()}</p>
                          <p className="text-xs text-muted-foreground">{patient.gender || "Not specified"}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-foreground">{patient.globalPatientId || patient.id}</td>
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <p className="text-foreground">{patient.phone || "No phone"}</p>
                          <p className="text-xs text-muted-foreground">{patient.email || "No email"}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-foreground">{formatDate(patient.dob)}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs capitalize text-foreground">
                          {patient.status || "active"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <Link
                            href={`/patients/${patient.id}`}
                            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/40"
                          >
                            View
                          </Link>
                          <Link
                            href={`/appointments/book?patientId=${patient.id}`}
                            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/40"
                          >
                            Book
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
