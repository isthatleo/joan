"use client";

import { useParams } from "next/navigation";
import { PageHeader, SectionCard, Button, Badge, Skeleton } from "@/components/ui";
import { ClipboardList, Plus, Eye, Edit, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";

interface CarePlan {
  id: string;
  patientId: string;
  patientName: string;
  startDate: string;
  endDate?: string;
  status: "active" | "completed" | "paused";
  goals: string[];
  interventions: { description: string; frequency: string; completed: boolean }[];
  assignedNurse: string;
}

export default function NureCarePlansPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [searchTerm, setSearchTerm] = useState("");

  const { data: carePlans, isLoading } = useQuery({
    queryKey: ["nurse-care-plans", slug],
    queryFn: async () => {
      const response = await fetch(`/api/nurse/care-plans?slug=${slug}`);
      return response.json();
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient Care Plans"
        subtitle="Manage care plans for assigned patients"
      />

      <Button className="flex items-center gap-2">
        <Plus className="h-4 w-4" />
        New Care Plan
      </Button>

      <SectionCard>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {carePlans?.map((plan: CarePlan) => (
              <div key={plan.id} className="p-6 rounded-lg border border-gray-200 hover:border-gray-300">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{plan.patientName}</h3>
                    <p className="text-sm text-gray-600">Started {format(new Date(plan.startDate), "MMM dd, yyyy")}</p>
                  </div>
                  <Badge>{plan.status}</Badge>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Goals</h4>
                  <ul className="space-y-1">
                    {plan.goals.map((goal, idx) => (
                      <li key={idx} className="text-sm text-gray-700">• {goal}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
