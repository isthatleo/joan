"use client";

import { useParams } from "next/navigation";
import { PageHeader, SectionCard, Button, Badge, Skeleton } from "@/components/ui";
import { ClipboardList, ArrowRight, CheckCircle, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

interface QueueItem {
  id: string;
  patientName: string;
  room: string;
  priority: "low" | "normal" | "high" | "urgent";
  checkInTime: string;
  assignedNurse: string;
  status: "waiting" | "in-progress" | "completed";
}

export default function NurseQueuePage() {
  const params = useParams();
  const slug = params?.slug as string;

  const { data: queue, isLoading } = useQuery({
    queryKey: ["nurse-queue", slug],
    queryFn: async () => {
      const response = await fetch(`/api/nurse/queue?slug=${slug}`);
      return response.json();
    },
    refetchInterval: 30000,
  });

  const waitingPatients = queue?.filter((item: QueueItem) => item.status === "waiting") || [];
  const inProgressPatients = queue?.filter((item: QueueItem) => item.status === "in-progress") || [];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "normal": return "bg-blue-100 text-blue-800";
      case "low": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Care Task Queue"
        subtitle="Manage nursing care tasks and patient queue"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50">
          <p className="text-sm text-yellow-600">Waiting</p>
          <p className="text-2xl font-bold text-yellow-900">{waitingPatients.length}</p>
        </div>
        <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
          <p className="text-sm text-blue-600">In Progress</p>
          <p className="text-2xl font-bold text-blue-900">{inProgressPatients.length}</p>
        </div>
        <div className="p-4 rounded-lg border border-green-200 bg-green-50">
          <p className="text-sm text-green-600">Completed Today</p>
          <p className="text-2xl font-bold text-green-900">
            {queue?.filter((item: QueueItem) => item.status === "completed").length || 0}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Waiting Tasks */}
        <SectionCard title={`Waiting (${waitingPatients.length})`}>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {waitingPatients.map((item: QueueItem, idx: number) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-4 rounded-lg border border-yellow-200 bg-yellow-50"
                >
                  <div className="h-8 w-8 rounded-full bg-yellow-200 flex items-center justify-center text-sm font-semibold text-yellow-900">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.patientName}</p>
                    <p className="text-xs text-gray-600">Room {item.room}</p>
                  </div>
                  <Badge className={getPriorityColor(item.priority)} variant="secondary">
                    {item.priority}
                  </Badge>
                  <Button size="sm">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* In Progress */}
        <SectionCard title={`In Progress (${inProgressPatients.length})`}>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {inProgressPatients.map((item: QueueItem) => (
                <div key={item.id} className="p-4 rounded-lg border border-blue-200 bg-blue-50">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-medium text-gray-900">{item.patientName}</p>
                    <ClipboardList className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-xs text-gray-600 mb-2">Room {item.room}</p>
                  <Button size="sm" className="w-full">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
