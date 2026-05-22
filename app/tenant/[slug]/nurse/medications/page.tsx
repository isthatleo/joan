"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  PageHeader,
  SectionCard,
  Button,
  Input,
  Badge,
  Skeleton,
} from "@/components/ui";
import {
  Pill,
  Search,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

interface Medication {
  id: string;
  patientName: string;
  patientRoom: string;
  medication: string;
  dosage: string;
  route: string;
  frequency: string;
  dueTime: string;
  status: "pending" | "administered" | "missed" | "skipped";
  prescribedBy: string;
  administeredBy?: string;
  administeredAt?: string;
  notes?: string;
}

export default function NurseMedicationsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [searchTerm, setSearchTerm] = useState("");

  const { data: medications, isLoading } = useQuery({
    queryKey: ["nurse-medications", slug],
    queryFn: async () => {
      const response = await fetch(`/api/nurse/medications?slug=${slug}&search=${searchTerm}`);
      if (!response.ok) throw new Error("Failed to fetch medications");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "administered": return "bg-green-50 text-green-700 border-green-200";
      case "missed": return "bg-red-50 text-red-700 border-red-200";
      case "skipped": return "bg-gray-50 text-gray-700 border-gray-200";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const pendingMeds = medications?.filter((m: Medication) => m.status === "pending") || [];
  const administeredMeds = medications?.filter((m: Medication) => m.status === "administered") || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medication Management"
        subtitle="Track and administer patient medications"
      />

      {/* Pending Medications Alert */}
      {pendingMeds.length > 0 && (
        <div className="p-4 rounded-lg border border-orange-200 bg-orange-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-orange-900">Pending Medications</h3>
              <p className="text-sm text-orange-700 mt-1">
                {pendingMeds.length} medication{pendingMeds.length > 1 ? 's' : ''} due for administration.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search medications..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Medications List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending */}
        <SectionCard title={`Pending (${pendingMeds.length})`}>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {pendingMeds.map((med: Medication) => (
                <div key={med.id} className="p-4 rounded-lg border border-yellow-200 bg-yellow-50">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{med.medication}</p>
                      <p className="text-xs text-gray-600">{med.patientName} - Room {med.patientRoom}</p>
                    </div>
                    <Badge className={getStatusColor(med.status)}>{med.status}</Badge>
                  </div>
                  <p className="text-xs text-gray-700 mb-3">{med.dosage} • {med.route} • {med.frequency}</p>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1">Administer</Button>
                    <Button size="sm" variant="outline">Skip</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Administered Today */}
        <SectionCard title={`Administered Today (${administeredMeds.length})`}>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {administeredMeds.map((med: Medication) => (
                <div key={med.id} className="p-4 rounded-lg border border-green-200 bg-green-50">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{med.medication}</p>
                      <p className="text-xs text-gray-600">{med.patientName} - {med.administeredBy}</p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <p className="text-xs text-gray-700">{med.administeredAt && format(new Date(med.administeredAt), "h:mm a")}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
