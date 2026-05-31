"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useAuthStore } from "@/stores/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertCircle, CheckCircle, Clock, Loader2, Megaphone, Send, Trash2, Users } from "lucide-react";
import { PageHeader, Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, Badge, Skeleton, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

type Broadcast = {
  id: string;
  title: string;
  message: string;
  category: string;
  priority: string;
  audience: string;
  status: string;
  sentAt?: string;
  recipientCount: number;
  readCount: number;
  createdAt: string;
};

export default function BroadcastsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    message: "",
    category: "update",
    priority: "normal",
    audience: "hospital_admins",
    status: "sent",
  });

  const isSuperAdmin = user?.role === "super_admin";
  const { data, isLoading, error } = useQuery({
    queryKey: ["platform-broadcasts"],
    queryFn: async () => {
      const res = await fetch("/api/platform-broadcasts", { cache: "no-store", credentials: "include" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Failed to load broadcasts");
      return payload;
    },
    enabled: isSuperAdmin,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/platform-broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Failed to create broadcast");
      return payload;
    },
    onSuccess: () => {
      setForm({ title: "", message: "", category: "update", priority: "normal", audience: "hospital_admins", status: "sent" });
      queryClient.invalidateQueries({ queryKey: ["platform-broadcasts"] });
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ broadcastId, action }: { broadcastId: string; action: string }) => {
      const res = await fetch("/api/platform-broadcasts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ broadcastId, action }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Failed to update broadcast");
      return payload;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["platform-broadcasts"] }),
  });

  const broadcasts: Broadcast[] = data?.broadcasts || [];
  const stats = data?.stats || {};
  const previewAudience = form.audience === "all_dashboards" ? "All tenant dashboards" : "Hospital admins only";
  const readRate = useMemo(() => {
    const reach = broadcasts.reduce((sum, item) => sum + Number(item.recipientCount || 0), 0);
    const reads = broadcasts.reduce((sum, item) => sum + Number(item.readCount || 0), 0);
    return reach ? Math.round((reads / reach) * 100) : 0;
  }, [broadcasts]);

  if (!user) return <div className="flex h-96 items-center justify-center">Please log in to access broadcasts.</div>;
  if (!isSuperAdmin) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">Access Restricted</h3>
          <p className="text-muted-foreground">Only super admins can send platform broadcasts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Broadcasts" subtitle="Send product updates, bug-fix notices, maintenance alerts, and platform announcements." />
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{(error as Error).message}</div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Total" value={stats.total || 0} icon={<Megaphone className="size-5" />} />
        <Metric label="Sent" value={stats.sent || 0} icon={<CheckCircle className="size-5" />} />
        <Metric label="Drafts" value={stats.drafts || 0} icon={<Clock className="size-5" />} />
        <Metric label="Reach" value={stats.totalReach || 0} icon={<Users className="size-5" />} />
        <Metric label="Read Rate" value={`${stats.readRate ?? readRate}%`} icon={<CheckCircle className="size-5" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader><CardTitle>Compose Broadcast</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={(event) => setForm((state) => ({ ...state, title: event.target.value }))} placeholder="e.g. Pharmacy module update deployed" />
              </div>
              <div className="space-y-2">
                <Label>Audience</Label>
                <Select value={form.audience} onValueChange={(value) => setForm((state) => ({ ...state, audience: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hospital_admins">Hospital admins only</SelectItem>
                    <SelectItem value="all_dashboards">All tenant dashboards</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(value) => setForm((state) => ({ ...state, category: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug_fix">Bug fix</SelectItem>
                    <SelectItem value="update">Product update</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="feature">Feature release</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(value) => setForm((state) => ({ ...state, priority: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Action</Label>
                <Select value={form.status} onValueChange={(value) => setForm((state) => ({ ...state, status: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sent">Send immediately</SelectItem>
                    <SelectItem value="draft">Save as draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea value={form.message} onChange={(event) => setForm((state) => ({ ...state, message: event.target.value }))} rows={7} placeholder="Write the update, release note, bug fix notice, or platform announcement..." />
            </div>
            <Button onClick={() => createMutation.mutate()} disabled={!form.title.trim() || !form.message.trim() || createMutation.isPending} className="inline-flex items-center gap-2">
              {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {form.status === "sent" ? "Send Broadcast" : "Save Draft"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge>{form.category.replace("_", " ")}</Badge>
                <Badge variant={form.priority === "urgent" ? "destructive" : "secondary"}>{form.priority}</Badge>
                <Badge variant="outline">{previewAudience}</Badge>
              </div>
              <h3 className="font-bold">{form.title || "Broadcast title"}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{form.message || "Broadcast message preview will appear here."}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Broadcast History</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-20 w-full" />)}</div>
          ) : broadcasts.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground"><Megaphone className="mx-auto mb-3 h-10 w-10" />No platform broadcasts yet.</div>
          ) : (
            <div className="space-y-3">
              {broadcasts.map((broadcast) => (
                <div key={broadcast.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h3 className="font-bold">{broadcast.title}</h3>
                        <Badge>{broadcast.status}</Badge>
                        <Badge variant="outline">{broadcast.audience === "all_dashboards" ? "All dashboards" : "Hospital admins"}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{broadcast.message}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {broadcast.sentAt ? `Sent ${format(new Date(broadcast.sentAt), "MMM dd, yyyy HH:mm")}` : `Created ${format(new Date(broadcast.createdAt), "MMM dd, yyyy HH:mm")}`} / {broadcast.recipientCount} recipients / {broadcast.readCount} read
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {broadcast.status !== "sent" && (
                        <Button size="sm" onClick={() => actionMutation.mutate({ broadcastId: broadcast.id, action: "send" })} disabled={actionMutation.isPending}>Send</Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => actionMutation.mutate({ broadcastId: broadcast.id, action: "mark_read" })} disabled={actionMutation.isPending}>Mark delivered read</Button>
                      <Button size="sm" variant="destructive" onClick={() => actionMutation.mutate({ broadcastId: broadcast.id, action: "delete" })} disabled={actionMutation.isPending}>
                        <Trash2 className="mr-2 size-4" /> Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return <Card><CardContent className="p-4"><div className="mb-2 text-orange-500">{icon}</div><p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></CardContent></Card>;
}
