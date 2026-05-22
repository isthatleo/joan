"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  PageHeader,
  SectionCard,
  Button,
  StatCard,
  Badge,
  Skeleton,
} from "@/components/ui";
import {
  LayoutDashboard,
  Users,
  HeartPulse,
  Activity,
  Clock,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Pill,
  Thermometer,
  Zap,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

interface NursingMetrics {
  totalPatients: number;
  patientsOnWatchList: number;
  medicationsDue: number;
  vitalsAlerts: number;
  completedTasks: number;
  pendingTasks: number;
  bedsOccupied: number;
  bedsAvailable: number;
}

export default function NurseDashboard() {
  const params = useParams();
  const slug = params?.slug as string;
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["nurse-dashboard", slug],
    queryFn: async () => {
      const [metricsRes, patientsRes, vitalsRes, medicationsRes, tasksRes] = await Promise.all([
        fetch(`/api/nurse/dashboard?slug=${slug}`),
        fetch(`/api/nurse/patients?slug=${slug}&limit=5`),
        fetch(`/api/nurse/vitals/alerts?slug=${slug}`),
        fetch(`/api/nurse/medications/due?slug=${slug}`),
        fetch(`/api/nurse/tasks?slug=${slug}&status=pending`),
      ]);

      return {
        metrics: await metricsRes.json(),
        patients: await patientsRes.json(),
        vitalsAlerts: await vitalsRes.json(),
        medicationsDue: await medicationsRes.json(),
        tasks: await tasksRes.json(),
      };
    },
    refetchInterval: 30000,
  });

  const stats = [
    {
      title: "Assigned Patients",
      value: dashboardData?.metrics?.totalPatients || 0,
      subtitle: `${dashboardData?.metrics?.bedsOccupied || 0} beds occupied`,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Vitals Alerts",
      value: dashboardData?.metrics?.vitalsAlerts || 0,
      subtitle: "Require immediate attention",
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Medications Due",
      value: dashboardData?.metrics?.medicationsDue || 0,
      subtitle: "Next 2 hours",
      icon: Pill,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Pending Tasks",
      value: dashboardData?.metrics?.pendingTasks || 0,
      subtitle: `${dashboardData?.metrics?.completedTasks || 0} completed today`,
      icon: CheckCircle,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good ${currentTime.getHours() < 12 ? 'morning' : currentTime.getHours() < 17 ? 'afternoon' : 'evening'}, Nurse ${currentTime.getHours() < 12 ? '👋' : '🌙'}`}
        subtitle={`Today is ${format(currentTime, 'EEEE, MMMM do, yyyy')} • ${format(currentTime, 'h:mm a')}`}
      />

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <SectionCard key={i}>
              <Skeleton className="h-64 w-full" />
            </SectionCard>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Critical Alerts */}
          {dashboardData?.vitalsAlerts && dashboardData.vitalsAlerts.length > 0 && (
            <SectionCard title="Critical Vitals Alerts" action={<Button size="sm">View All</Button>}>
              <div className="space-y-3">
                {dashboardData.vitalsAlerts.slice(0, 5).map((alert: any) => (
                  <div key={alert.id} className="p-3 rounded-lg border border-red-200 bg-red-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-900">{alert.patientName}</p>
                        <p className="text-xs text-red-700 mt-1">{alert.alertType}: {alert.value} {alert.unit}</p>
                      </div>
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Patients Under Care */}
          <SectionCard title="Patients Under Your Care" action={<Button size="sm">View All</Button>}>
            <div className="space-y-3">
              {dashboardData?.patients?.slice(0, 5).map((patient: any) => (
                <div key={patient.id} className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900">{patient.firstName} {patient.lastName}</h4>
                    <Badge variant="outline">{patient.room}</Badge>
                  </div>
                  <p className="text-xs text-gray-600">{patient.condition}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Medications Due Soon */}
          {dashboardData?.medicationsDue && dashboardData.medicationsDue.length > 0 && (
            <SectionCard title="Medications Due Soon" action={<Button size="sm">View All</Button>}>
              <div className="space-y-3">
                {dashboardData.medicationsDue.slice(0, 5).map((med: any) => (
                  <div key={med.id} className="p-3 rounded-lg border border-blue-100 bg-blue-50">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-blue-900">{med.medication}</p>
                      <span className="text-xs font-semibold text-blue-600">{med.dueTime}</span>
                    </div>
                    <p className="text-xs text-blue-700">{med.patientName} - {med.dosage}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Pending Care Tasks */}
          {dashboardData?.tasks && dashboardData.tasks.length > 0 && (
            <SectionCard title="Care Tasks" action={<Button size="sm">View All</Button>}>
              <div className="space-y-3">
                {dashboardData.tasks.slice(0, 5).map((task: any) => (
                  <div key={task.id} className="p-3 rounded-lg border border-purple-100 bg-purple-50">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-sm font-medium text-purple-900">{task.title}</p>
                      <Badge variant="outline" className="text-xs">{task.priority}</Badge>
                    </div>
                    <p className="text-xs text-purple-700">{task.patientName}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      )}
    </div>
  );
}
