"use client";

import { useParams } from "next/navigation";
import { PageHeader, SectionCard, Button, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Download, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function NurseReportsPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const { data: reports, isLoading } = useQuery({
    queryKey: ["nurse-reports", slug],
    queryFn: async () => {
      const response = await fetch(`/api/nurse/analytics?slug=${slug}`);
      return response.json();
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nursing Analytics & Reports"
        subtitle="View performance metrics and patient care analytics"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <p className="text-sm text-gray-600">Patients Cared For</p>
          <p className="text-2xl font-bold text-gray-900">{reports?.totalPatientsCaredFor || 0}</p>
          <p className="text-xs text-gray-500 mt-1">This month</p>
        </div>
        <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
          <p className="text-sm text-blue-600">Tasks Completed</p>
          <p className="text-2xl font-bold text-blue-900">{reports?.tasksCompleted || 0}</p>
          <p className="text-xs text-blue-500 mt-1">This week</p>
        </div>
        <div className="p-4 rounded-lg border border-green-200 bg-green-50">
          <p className="text-sm text-green-600">Average Rating</p>
          <p className="text-2xl font-bold text-green-900">{reports?.averageRating || "4.8"}/5</p>
          <p className="text-xs text-green-500 mt-1">Patient satisfaction</p>
        </div>
        <div className="p-4 rounded-lg border border-purple-200 bg-purple-50">
          <p className="text-sm text-purple-600">On-Time Medications</p>
          <p className="text-2xl font-bold text-purple-900">{reports?.onTimeMedications || "98"}%</p>
          <p className="text-xs text-purple-500 mt-1">This month</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="patients">Patients</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <SectionCard title="Monthly Overview">
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">Chart visualization</p>
                </div>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="patients" className="space-y-6">
          <SectionCard title="Patient Care Statistics">
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-900">Average Patients Per Shift</span>
                  <span className="text-lg font-bold text-blue-600">{reports?.avgPatientsPerShift || 5}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-900">Patient Satisfaction</span>
                  <span className="text-lg font-bold text-green-600">{reports?.patientSatisfaction || "92"}%</span>
                </div>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <SectionCard title="Task Completion Metrics">
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: reports?.taskCompletionRate || "85%" }} />
                </div>
                <p className="text-sm text-gray-600">
                  Task Completion Rate: <span className="font-bold">{reports?.taskCompletionRate || "85"}%</span>
                </p>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <SectionCard title="Performance Metrics">
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <span className="text-sm font-medium">Average Shift Duration</span>
                  <span className="text-sm font-bold text-gray-900">{reports?.avgShiftDuration || "8h 30m"}</span>
                </div>
              </div>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>

      <Button className="flex items-center gap-2">
        <Download className="h-4 w-4" />
        Download Report
      </Button>
    </div>
  );
}
