"use client";

import { useEffect, useState } from "react";
import {
  PageHeader,
  StatCard,
  SectionCard,
  StatusPill,
  EmptyState,
} from "@/components/ui";
import {
  Hospital,
  Search,
  Plus,
  Edit,
  MoreVertical,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  DollarSign,
} from "lucide-react";

type Tenant = { id: string; name: string; slug: string; plan: string; isActive: boolean; contactEmail?: string; createdAt?: string };
type Stats = { total: number; active: number; inactive: number };

export default function SuperAdminHospitals() {
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (planFilter) params.set("plan", planFilter);
    if (statusFilter) params.set("status", statusFilter);
    setIsLoading(true);
    fetch(`/api/tenants?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setTenants(Array.isArray(d) ? d : []))
      .catch(() => setTenants([]))
      .finally(() => setIsLoading(false));
  }, [search, planFilter, statusFilter]);

  useEffect(() => {
    fetch("/api/tenants?stats=true").then((r) => r.json()).then(setStats).catch(() => {});
  }, []);

  const list = tenants;
  const total = stats?.total ?? list.length;
  const active = stats?.active ?? list.filter((t) => t.isActive).length;
  const inactive = stats?.inactive ?? list.filter((t) => !t.isActive).length;
  const premium = list.filter((t) => t.plan === "Premium").length;

  return (
    <div>
      <PageHeader
        title="Hospital Management"
        subtitle="Manage all registered hospitals in the network"
        actions={
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition">
            <Plus className="h-4 w-4" />
            Add Hospital
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Hospitals" value={total} subtitle="Across the platform" icon={Building2} tone="primary" />
        <StatCard title="Active" value={active} subtitle="Currently operational" icon={CheckCircle} tone="success" />
        <StatCard title="Inactive" value={inactive} subtitle="Suspended / paused" icon={XCircle} tone="destructive" />
        <StatCard title="Premium Tier" value={premium} subtitle="High-revenue accounts" icon={DollarSign} tone="info" />
      </div>

      {/* Search & Filter */}
      <SectionCard className="mb-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search hospitals..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Plans</option>
            <option value="Premium">Premium</option>
            <option value="Standard">Standard</option>
            <option value="Basic">Basic</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </SectionCard>

      {/* Hospitals Table */}
      <SectionCard
        title="All Hospitals"
        description={`${list.length} result${list.length === 1 ? "" : "s"}`}
        flush
      >
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading hospitals…</div>
        ) : list.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Hospital}
              title="No hospitals yet"
              description="Add your first hospital to start onboarding tenants."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Hospital</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((h: any) => (
                  <tr key={h.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
                          <Hospital className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{h.name}</p>
                          <p className="text-xs text-muted-foreground">{h.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-md bg-info-soft px-2 py-1 text-xs font-medium text-info-soft-foreground">
                        {h.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {h.contactEmail || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <StatusPill tone={h.isActive ? "success" : "destructive"}>
                        {h.isActive ? "Active" : "Inactive"}
                      </StatusPill>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {h.createdAt ? new Date(h.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button className="rounded-lg p-2 hover:bg-muted transition-colors">
                          <Edit className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button className="rounded-lg p-2 hover:bg-muted transition-colors">
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
