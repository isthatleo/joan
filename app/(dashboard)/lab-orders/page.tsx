"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, Clock3, FilePlus2, FlaskConical, Loader2, RefreshCw, Search, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Topbar } from "@/components/Topbar";
import { KPICard } from "@/components/KPICard";

type LabOrder = {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string | null;
  patientPhone: string | null;
  globalPatientId: string | null;
  testName: string | null;
  testCode: string | null;
  category: string | null;
  priority: string | null;
  status: string | null;
  orderedAt: string | null;
  completedAt: string | null;
  dueDate: string | null;
  labLocation: string | null;
  notes: string | null;
};

type OrdersResponse = {
  orders: LabOrder[];
  stats: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    critical: number;
  };
};

const priorities = ["all", "routine", "urgent", "critical"];
const statuses = ["all", "ordered", "in_progress", "completed", "cancelled"];

function badgeTone(status: string | null) {
  switch (status) {
    case "completed":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "in_progress":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
    case "cancelled":
      return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
    default:
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
}

function priorityTone(priority: string | null) {
  switch (priority) {
    case "critical":
      return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
    case "urgent":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function LabOrdersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");

  const ordersQuery = useQuery<OrdersResponse>({
    queryKey: ["doctor-lab-orders", search, status, priority],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (status !== "all") params.set("status", status);
      if (priority !== "all") params.set("priority", priority);
      const response = await fetch(`/api/doctor/lab-orders?${params.toString()}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to load lab orders");
      }
      return response.json();
    },
  });

  const orderAction = useMutation({
    mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: string }) => {
      const response = await fetch(`/api/doctor/lab-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to update lab order");
      }
      return response.json();
    },
    onSuccess: async (_, variables) => {
      toast.success(`Lab order updated to ${variables.nextStatus.replace("_", " ")}.`);
      await queryClient.invalidateQueries({ queryKey: ["doctor-lab-orders"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const orders = useMemo(() => ordersQuery.data?.orders ?? [], [ordersQuery.data?.orders]);
  const stats = ordersQuery.data?.stats;

  return (
    <div className="space-y-6">
      <Topbar breadcrumbs={[{ label: "Dashboard", href: "/doctor" }, { label: "Lab Orders" }]} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Lab Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create, monitor, and manage doctor-initiated lab work using live order data.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => ordersQuery.refetch()}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${ordersQuery.isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/lab-orders/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            <FilePlus2 className="h-4 w-4" />
            New Lab Order
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KPICard title="Total Orders" value={stats?.total ?? 0} subtitle="Doctor scoped" tone="info" icon={FlaskConical} />
        <KPICard title="Pending" value={stats?.pending ?? 0} subtitle="Awaiting lab pickup" tone="warning" icon={Clock3} />
        <KPICard title="In Progress" value={stats?.inProgress ?? 0} subtitle="Lab processing" tone="primary" icon={RefreshCw} />
        <KPICard title="Completed" value={stats?.completed ?? 0} subtitle="Results available" tone="success" icon={FlaskConical} />
        <KPICard title="Critical Priority" value={stats?.critical ?? 0} subtitle="Escalated orders" tone="danger" icon={AlertTriangle} />
      </div>

      {ordersQuery.isError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {(ordersQuery.error as Error).message}
        </div>
      )}

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Order Worklist</h2>
            <p className="text-sm text-muted-foreground">Filter by patient, status, priority, or test code.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search patient or test"
                className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none sm:w-72"
              />
            </div>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none"
            >
              {statuses.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All Status" : option.replace("_", " ")}
                </option>
              ))}
            </select>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none"
            >
              {priorities.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All Priority" : option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Patient</th>
                  <th className="px-4 py-3 font-medium">Test</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Ordered</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {ordersQuery.isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <FlaskConical className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-3 text-sm font-medium text-foreground">No lab orders found.</p>
                      <p className="mt-1 text-sm text-muted-foreground">Create a new order or adjust the active filters.</p>
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{order.patientName}</p>
                          <p className="text-xs text-muted-foreground">{order.globalPatientId || "No patient number"}</p>
                          <p className="text-xs text-muted-foreground">{order.patientPhone || order.patientEmail || "No contact on file"}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-foreground">{order.testName || "Unnamed test"}</p>
                          <p className="text-xs text-muted-foreground">{order.testCode || "No code"} · {order.category || "General"}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${priorityTone(order.priority)}`}>
                          {order.priority || "routine"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${badgeTone(order.status)}`}>
                          {(order.status || "ordered").replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        <div>
                          <p>{order.orderedAt ? format(new Date(order.orderedAt), "MMM dd, yyyy") : "-"}</p>
                          <p className="text-xs text-muted-foreground">{order.dueDate ? `Due ${format(new Date(order.dueDate), "MMM dd, h:mm a")}` : "No due date"}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/lab-results?orderId=${order.id}`}
                            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground"
                          >
                            View Results
                          </Link>
                          {order.status === "ordered" && (
                            <button
                              onClick={() => orderAction.mutate({ id: order.id, nextStatus: "cancelled" })}
                              className="rounded-lg border border-destructive/30 px-2.5 py-1.5 text-xs font-medium text-destructive"
                            >
                              Cancel
                            </button>
                          )}
                          {order.priority === "critical" && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-300">
                              <ShieldAlert className="h-3 w-3" />
                              Escalated
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
