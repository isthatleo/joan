"use client";

import { useParams } from "next/navigation";
import { PageHeader, SectionCard, Button, Badge, Skeleton } from "@/components/ui";
import { BedDouble, Plus, Eye, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Bed {
  id: string;
  bedNumber: string;
  floor: string;
  room: string;
  status: "available" | "occupied" | "maintenance";
  patientName?: string;
  patientId?: string;
  checkedInDate?: string;
  condition?: string;
}

export default function NurseBedsPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const { data: beds, isLoading } = useQuery({
    queryKey: ["nurse-beds", slug],
    queryFn: async () => {
      const response = await fetch(`/api/nurse/beds?slug=${slug}`);
      return response.json();
    },
    refetchInterval: 60000,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available": return "bg-green-100 text-green-800";
      case "occupied": return "bg-blue-100 text-blue-800";
      case "maintenance": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const occupiedBeds = beds?.filter((b: Bed) => b.status === "occupied").length || 0;
  const availableBeds = beds?.filter((b: Bed) => b.status === "available").length || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bed Management"
        subtitle="Track and manage patient beds"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <p className="text-sm text-gray-600">Total Beds</p>
          <p className="text-2xl font-bold text-gray-900">{beds?.length || 0}</p>
        </div>
        <div className="p-4 rounded-lg border border-green-200 bg-green-50">
          <p className="text-sm text-green-600">Available</p>
          <p className="text-2xl font-bold text-green-900">{availableBeds}</p>
        </div>
        <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
          <p className="text-sm text-blue-600">Occupied</p>
          <p className="text-2xl font-bold text-blue-900">{occupiedBeds}</p>
        </div>
      </div>

      <SectionCard>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {beds?.map((bed: Bed) => (
              <div
                key={bed.id}
                className={`p-4 rounded-lg border-2 ${
                  bed.status === "available"
                    ? "border-green-200 bg-green-50"
                    : bed.status === "occupied"
                    ? "border-blue-200 bg-blue-50"
                    : "border-yellow-200 bg-yellow-50"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Room {bed.room} - Bed {bed.bedNumber}
                    </h3>
                    <p className="text-sm text-gray-600">Floor {bed.floor}</p>
                  </div>
                  <Badge className={getStatusColor(bed.status)}>
                    {bed.status}
                  </Badge>
                </div>

                {bed.status === "occupied" && bed.patientName && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-900">{bed.patientName}</p>
                    <p className="text-xs text-gray-600">{bed.condition}</p>
                  </div>
                )}

                <Button variant="outline" size="sm" className="w-full">
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
