"use client";

import { useMemo, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { KPICard } from "@/components/KPICard";
import { DataCard, DataCardItem } from "@/components/DataCard";
import { Activity, AlertTriangle, Building2, Database, DollarSign, ShieldCheck } from "lucide-react";

const tenantStatusSeed: DataCardItem[] = [
  { id: "tn-1", title: "Northside Medical", subtitle: "West Region", status: "normal", value: "99.98%" },
  { id: "tn-2", title: "Cedar Valley Hospital", subtitle: "South Region", status: "pending", value: "99.70%" },
  { id: "tn-3", title: "Grand Lake Clinics", subtitle: "Midwest", status: "normal", value: "99.92%" },
  { id: "tn-4", title: "Harborview Health", subtitle: "East Region", status: "urgent", value: "98.81%" },
];

const incidentsSeed: DataCardItem[] = [
  { id: "inc-1", title: "Billing reconciliation lag", subtitle: "3 tenants impacted", status: "in-progress", value: "Opened 08:35" },
  { id: "inc-2", title: "Lab API timeout spike", subtitle: "Monitoring enabled", status: "pending", value: "Opened 09:10" },
  { id: "inc-3", title: "SAML login outage", subtitle: "Resolved", status: "completed", value: "Closed 07:55" },
];

export default function AdminDashboard() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [tenantStatus, setTenantStatus] = useState(tenantStatusSeed);
  const [incidents, setIncidents] = useState(incidentsSeed);

  const activeIncidents = useMemo(
    () => incidents.filter((item) => item.status !== "completed").length,
    [incidents],
  );

  const acknowledgeIncident = (incident: DataCardItem) => {
    setIncidents((prev) =>
      prev.map((item) =>
        item.id === incident.id ? { ...item, status: "completed", value: "Acknowledged" } : item,
      ),
    );
  };

  const rebalanceTenant = (tenant: DataCardItem) => {
    setTenantStatus((prev) =>
      prev.map((item) =>
        item.id === tenant.id ? { ...item, status: "normal", value: "99.99%" } : item,
      ),
    );
  };

  return (
    <div className="space-y-6">
      <Topbar breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Admin" }]} />

      <section className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Operations Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Cross-tenant health, incidents, and governance controls.</p>
        </div>
        <button
          onClick={() => setMaintenanceMode((current) => !current)}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            maintenanceMode
              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
              : "bg-slate-900 text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900"
          }`}
        >
          {maintenanceMode ? "Disable maintenance mode" : "Enable maintenance mode"}
        </button>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard title="Tenants" value={tenantStatus.length} subtitle="Active organizations" color="blue" icon={Building2} />
        <KPICard title="Open incidents" value={activeIncidents} subtitle="Needs attention" color="red" icon={AlertTriangle} />
        <KPICard title="Data sync health" value="99.94%" subtitle="Across integrations" color="green" icon={Database} />
        <KPICard title="Today revenue" value="$412,780" subtitle="Platform gross" color="indigo" icon={DollarSign} />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <DataCard
          title="Tenant Status"
          items={tenantStatus}
          onItemClick={rebalanceTenant}
          emptyMessage="No tenants available"
        />
        <DataCard
          title="Incident Queue"
          items={incidents}
          onItemClick={acknowledgeIncident}
          emptyMessage="No active incidents"
        />
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
          <ShieldCheck className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Control Plane Actions</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <button className="rounded-lg border border-gray-200 px-4 py-3 text-left hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-700">
            <p className="font-medium">Run compliance audit</p>
            <p className="text-sm text-gray-500">Generate SOC2 + HIPAA snapshot</p>
          </button>
          <button className="rounded-lg border border-gray-200 px-4 py-3 text-left hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-700">
            <p className="font-medium">Force failover drill</p>
            <p className="text-sm text-gray-500">Validate regional redundancy</p>
          </button>
          <button className="rounded-lg border border-gray-200 px-4 py-3 text-left hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-700">
            <p className="font-medium">Broadcast notice</p>
            <p className="text-sm text-gray-500">Send platform-wide operations update</p>
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
          <Activity className="h-4 w-4" />
          {maintenanceMode
            ? "Maintenance mode ON: all write operations should be deferred."
            : "System normal: write operations are available."}
        </div>
      </section>
    </div>
  );
}
