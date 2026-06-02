"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Loader2, RotateCcw, Search, Trash2, XCircle } from "lucide-react";

type DeletedTenant = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  contactEmail?: string | null;
  logoUrl?: string | null;
  deletedAt?: string | null;
  scheduledPurgeAt?: string | null;
};

type ConfirmationDialog = {
  title: string;
  description: string;
  expectedText: string;
  actionLabel: string;
  actionTone: "restore" | "danger";
  onConfirm: () => Promise<void>;
};

function daysUntil(date?: string | null) {
  if (!date) return null;
  return Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 86400000));
}

export default function DeletedTenantsPage() {
  const [tenants, setTenants] = useState<DeletedTenant[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<"restore" | "purge" | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationDialog | null>(null);
  const [confirmationText, setConfirmationText] = useState("");
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function loadDeletedTenants() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ deleted: "true" });
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(`/api/tenants?${params.toString()}`, { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Failed to load deleted tenants");
      setTenants(Array.isArray(data) ? data : data?.tenants || []);
      setSelected(new Set());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load deleted tenants");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDeletedTenants();
  }, []);

  const stats = useMemo(() => {
    const stillInGrace = tenants.filter((tenant) => (daysUntil(tenant.scheduledPurgeAt) || 0) > 0).length;
    return { total: tenants.length, purgeReady: tenants.length, inGrace: stillInGrace };
  }, [tenants]);

  const selectedTenants = useMemo(
    () => tenants.filter((tenant) => selected.has(tenant.id)),
    [selected, tenants],
  );

  function toggleTenant(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((current) => {
      if (current.size === tenants.length) return new Set();
      return new Set(tenants.map((tenant) => tenant.id));
    });
  }

  function requestConfirmation(dialog: ConfirmationDialog) {
    setConfirmation(dialog);
    setConfirmationText("");
    setConfirmationError(null);
  }

  async function runConfirmedAction() {
    if (!confirmation) return;
    if (confirmationText !== confirmation.expectedText) {
      setConfirmationError(`Type "${confirmation.expectedText}" exactly to continue.`);
      return;
    }

    setConfirming(true);
    setConfirmationError(null);
    try {
      await confirmation.onConfirm();
      setConfirmation(null);
      setConfirmationText("");
    } catch (actionError) {
      setConfirmationError(actionError instanceof Error ? actionError.message : "Action failed");
    } finally {
      setConfirming(false);
    }
  }

  async function performRestoreTenant(tenant: DeletedTenant) {
    setActionId(tenant.id);
    try {
      await restoreOne(tenant);
      setTenants((current) => current.filter((item) => item.id !== tenant.id));
      setSelected((current) => {
        const next = new Set(current);
        next.delete(tenant.id);
        return next;
      });
    } finally {
      setActionId(null);
    }
  }

  function restoreTenant(tenant: DeletedTenant) {
    requestConfirmation({
      title: `Restore ${tenant.name}`,
      description: `Restore this tenant and make it available again. Type the tenant slug to confirm.`,
      expectedText: tenant.slug,
      actionLabel: "Restore Tenant",
      actionTone: "restore",
      onConfirm: () => performRestoreTenant(tenant),
    });
  }

  async function performPurgeTenant(tenant: DeletedTenant) {
    setActionId(tenant.id);
    try {
      await purgeOne(tenant);
      setTenants((current) => current.filter((item) => item.id !== tenant.id));
      setSelected((current) => {
        const next = new Set(current);
        next.delete(tenant.id);
        return next;
      });
    } finally {
      setActionId(null);
    }
  }

  function purgeTenant(tenant: DeletedTenant) {
    requestConfirmation({
      title: `Permanently delete ${tenant.name}`,
      description: `This cannot be undone. Type the deletion phrase to confirm permanent deletion.`,
      expectedText: `DELETE ${tenant.slug}`,
      actionLabel: "Permanently Delete",
      actionTone: "danger",
      onConfirm: () => performPurgeTenant(tenant),
    });
  }

  async function performRestoreSelected() {
    if (!selectedTenants.length) return;
    setBulkAction("restore");
    try {
      const results = await Promise.allSettled(selectedTenants.map(restoreOne));
      const failed = results.filter((result) => result.status === "rejected").length;
      if (failed) throw new Error(`${failed} tenant(s) failed to restore.`);
      const ids = new Set(selectedTenants.map((tenant) => tenant.id));
      setTenants((current) => current.filter((tenant) => !ids.has(tenant.id)));
      setSelected(new Set());
    } finally {
      setBulkAction(null);
    }
  }

  function restoreSelected() {
    if (!selectedTenants.length) return;
    requestConfirmation({
      title: `Restore ${selectedTenants.length} tenant(s)`,
      description: "Restore all selected tenants and make them available again.",
      expectedText: `RESTORE ${selectedTenants.length}`,
      actionLabel: "Restore Selected",
      actionTone: "restore",
      onConfirm: performRestoreSelected,
    });
  }

  async function performPurgeSelected() {
    if (!selectedTenants.length) return;
    setBulkAction("purge");
    try {
      const results = await Promise.allSettled(selectedTenants.map(purgeOne));
      const failed = results.filter((result) => result.status === "rejected").length;
      if (failed) throw new Error(`${failed} tenant(s) failed to permanently delete.`);
      const ids = new Set(selectedTenants.map((tenant) => tenant.id));
      setTenants((current) => current.filter((tenant) => !ids.has(tenant.id)));
      setSelected(new Set());
    } finally {
      setBulkAction(null);
    }
  }

  function purgeSelected() {
    if (!selectedTenants.length) return;
    requestConfirmation({
      title: `Permanently delete ${selectedTenants.length} tenant(s)`,
      description: "This cannot be undone. Type the deletion phrase to confirm permanent deletion.",
      expectedText: `DELETE ${selectedTenants.length}`,
      actionLabel: "Permanently Delete Selected",
      actionTone: "danger",
      onConfirm: performPurgeSelected,
    });
  }

  return (
    <div className="min-h-screen bg-subtle -m-6 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/tenants" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" /> Back to tenants
            </Link>
            <h1 className="text-3xl font-bold text-foreground">Deleted Tenants</h1>
            <p className="mt-1 text-sm text-muted-foreground">Archived tenants can be restored during the grace period or permanently deleted immediately by a super admin.</p>
          </div>
          <button onClick={loadDeletedTenants} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted">
            <RotateCcw className="size-4" /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Stat label="Archived" value={stats.total} />
          <Stat label="Still Restorable" value={stats.inGrace} />
          <Stat label="Permanent Delete Available" value={stats.purgeReady} />
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="space-y-3 border-b border-border p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void loadDeletedTenants();
                }}
                placeholder="Search deleted tenants..."
                className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm text-foreground focus:border-orange-300 focus:outline-none"
              />
            </div>

            {selected.size > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-sm font-semibold text-foreground">{selected.size} tenant(s) selected</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={restoreSelected} disabled={!!bulkAction} className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-background px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
                    {bulkAction === "restore" ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />} Restore Selected
                  </button>
                  <button onClick={purgeSelected} disabled={!!bulkAction} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-background px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
                    {bulkAction === "purge" ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Permanently Delete Selected
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={tenants.length > 0 && selected.size === tenants.length}
                      onChange={toggleAll}
                      className="size-4 rounded border border-border bg-background"
                    />
                  </th>
                  <th className="px-5 py-3 text-left">Tenant</th>
                  <th className="px-5 py-3 text-left">Deleted</th>
                  <th className="px-5 py-3 text-left">Purge Window</th>
                  <th className="px-5 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading && (
                  <tr>
                    <td colSpan={5} className="py-16 text-center"><Loader2 className="mx-auto size-6 animate-spin text-orange-500" /></td>
                  </tr>
                )}
                {!loading && tenants.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-muted-foreground">
                      <Trash2 className="mx-auto mb-2 size-10 opacity-50" />
                      No deleted tenants found.
                    </td>
                  </tr>
                )}
                {tenants.map((tenant) => {
                  const remainingDays = daysUntil(tenant.scheduledPurgeAt);
                  return (
                    <tr key={tenant.id} className="hover:bg-muted/30">
                      <td className="px-5 py-4">
                        <input
                          type="checkbox"
                          checked={selected.has(tenant.id)}
                          onChange={() => toggleTenant(tenant.id)}
                          className="size-4 rounded border border-border bg-background"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <Link href={`/tenants/${tenant.slug}`} className="flex items-center gap-3">
                          <span className="flex size-10 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                            {tenant.logoUrl ? <img src={tenant.logoUrl} alt={`${tenant.name} logo`} className="h-full w-full object-cover" /> : <Building2 className="size-5 text-muted-foreground" />}
                          </span>
                          <span>
                            <span className="block font-semibold text-foreground">{tenant.name}</span>
                            <span className="font-mono text-xs text-muted-foreground">{tenant.slug}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{tenant.deletedAt ? new Date(tenant.deletedAt).toLocaleString() : "Archived"}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${remainingDays === 0 ? "bg-red-50 text-red-700" : "bg-orange-50 text-orange-700"}`}>
                          <XCircle className="size-3" />
                          {remainingDays === 0 ? "Grace expired" : `${remainingDays} day(s) restorable`}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => restoreTenant(tenant)} disabled={actionId === tenant.id || !!bulkAction} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
                            {actionId === tenant.id ? <Loader2 className="size-3 animate-spin" /> : <RotateCcw className="size-3" />} Restore
                          </button>
                          <button onClick={() => purgeTenant(tenant)} disabled={actionId === tenant.id || !!bulkAction} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
                            {actionId === tenant.id ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />} Permanently Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {confirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h2 className="text-xl font-bold text-foreground">{confirmation.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{confirmation.description}</p>
            <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Required confirmation</p>
              <p className="mt-1 font-mono text-sm font-semibold text-foreground">{confirmation.expectedText}</p>
            </div>
            <label className="mt-4 block text-sm font-semibold text-foreground">
              Type confirmation text
              <input
                value={confirmationText}
                onChange={(event) => {
                  setConfirmationText(event.target.value);
                  setConfirmationError(null);
                }}
                className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-orange-300 focus:outline-none"
                autoFocus
              />
            </label>
            {confirmationError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {confirmationError}
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmation(null)}
                disabled={confirming}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={runConfirmedAction}
                disabled={confirming || confirmationText !== confirmation.expectedText}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                  confirmation.actionTone === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {confirming && <Loader2 className="size-4 animate-spin" />}
                {confirmation.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

async function restoreOne(tenant: DeletedTenant) {
  const response = await fetch(`/api/tenants/${tenant.slug}/restore`, { method: "POST" });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.details || data?.error || `Failed to restore ${tenant.name}`);
}

async function purgeOne(tenant: DeletedTenant) {
  const response = await fetch(`/api/tenants/${tenant.slug}?purge=true&force=true`, { method: "DELETE" });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.details || data?.error || `Failed to permanently delete ${tenant.name}`);
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
