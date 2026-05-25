"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Mail, Phone, RefreshCw } from "lucide-react";
import { Badge, Button, PageHeader, SectionCard, Skeleton } from "@/components/ui";

export default function NurseQueuePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);

  const queueQuery = useQuery({
    queryKey: ["tenant-nurse-queue", slug],
    queryFn: async () => {
      const response = await fetch(`/api/nurse/queue?slug=${slug}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load queue");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const actionMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await fetch("/api/nurse/queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, ...payload }),
      });
      if (!response.ok) throw new Error("Failed to update queue");
      return response.json();
    },
    onMutate: (payload) => setActiveId(String(payload.id || "call-next")),
    onSettled: () => {
      setActiveId(null);
      queryClient.invalidateQueries({ queryKey: ["tenant-nurse-queue"] });
    },
  });

  const data = queueQuery.data?.queue || [];
  const stats = queueQuery.data?.stats;
  const waiting = data.filter((item: any) => item.status === "waiting");
  const inProgress = data.filter((item: any) => item.status === "in-progress");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nursing Queue"
        subtitle="Prepare patients for care tasks, move the ward queue forward, and close completed steps."
        actions={<div className="flex gap-2"><Button variant="outline" onClick={() => queueQuery.refetch()} disabled={queueQuery.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${queueQuery.isFetching ? "animate-spin" : ""}`} />Refresh</Button><Button onClick={() => actionMutation.mutate({ action: "call-next" })} disabled={actionMutation.isPending}><ArrowRight className="mr-2 h-4 w-4" />Call Next</Button></div>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {queueQuery.isLoading ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 w-full" />) : (
          <>
            <Tile title="Waiting" value={stats?.waiting ?? 0} hint="Patients waiting for nursing action." />
            <Tile title="In Progress" value={stats?.inProgress ?? 0} hint="Currently being handled by a nurse." />
            <Tile title="Completed Today" value={stats?.completed ?? 0} hint="Queue items already closed out." />
            <Tile title="Urgent or High" value={stats?.urgent ?? 0} hint="Priorities to pull forward before standard cases." />
          </>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Waiting Queue" description="Prioritized bedside work waiting for nursing pickup.">
          {queueQuery.isLoading ? <div className="space-y-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-36 w-full" />)}</div> : (
            <div className="space-y-4">
              {waiting.length ? waiting.map((item: any, index: number) => (
                <div key={item.id} className="rounded-2xl border border-border bg-background p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <h3 className="text-lg font-semibold text-foreground">{item.patientName}</h3>
                        <Badge variant={item.priority === "urgent" ? "destructive" : "outline"}>{item.priority || "normal"}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">Room {item.room || "-"} | Queue {item.queueNumber || item.position || "-"}</p>
                    </div>
                    <Button onClick={() => actionMutation.mutate({ id: item.id, status: "in-progress", patientId: item.patientId })} disabled={actionMutation.isPending && activeId === item.id}>Start</Button>
                  </div>
                </div>
              )) : <p className="text-sm text-muted-foreground">No waiting patients in the nursing queue.</p>}
            </div>
          )}
        </SectionCard>

        <SectionCard title="In Progress" description="Active queue items with bedside communication shortcuts.">
          {queueQuery.isLoading ? <div className="space-y-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-36 w-full" />)}</div> : (
            <div className="space-y-4">
              {inProgress.length ? inProgress.map((item: any) => (
                <div key={item.id} className="rounded-2xl border border-border bg-background p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-foreground">{item.patientName}</h3>
                        <Badge variant="secondary">in progress</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">Room {item.room || "-"} | Priority {item.priority || "normal"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      {item.patientEmail ? <a href={`mailto:${item.patientEmail}?subject=${encodeURIComponent(`Nursing update for ${item.patientName}`)}`} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground"><Mail className="h-4 w-4" />Email</a> : null}
                      {item.patientPhone ? <a href={`tel:${item.patientPhone}`} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground"><Phone className="h-4 w-4" />Call</a> : null}
                      <Button onClick={() => actionMutation.mutate({ id: item.id, status: "completed", patientId: item.patientId })} disabled={actionMutation.isPending && activeId === item.id}><CheckCircle2 className="mr-2 h-4 w-4" />Complete</Button>
                    </div>
                  </div>
                </div>
              )) : <p className="text-sm text-muted-foreground">No queue items are currently in progress.</p>}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function Tile({ title, value, hint }: { title: string; value: number; hint: string }) {
  return <div className="rounded-2xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">{title}</p><p className="mt-2 text-3xl font-semibold text-foreground">{value}</p><p className="mt-2 text-xs text-muted-foreground">{hint}</p></div>;
}
