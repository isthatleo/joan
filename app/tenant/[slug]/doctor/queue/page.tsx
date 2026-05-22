"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  PageHeader,
  SectionCard,
  Button,
  Badge,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui";
import {
  Users,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  SkipForward,
  Phone,
  MessageSquare,
  FileText,
  Stethoscope,
  Timer,
  ArrowRight,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

interface QueueItem {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  checkInTime: string;
  estimatedWaitTime: number;
  priority: "low" | "normal" | "high" | "urgent";
  status: "waiting" | "called" | "in-progress" | "completed" | "no-show";
  appointmentType: string;
  notes?: string;
  room?: string;
}

export default function DoctorQueuePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [selectedPatient, setSelectedPatient] = useState<QueueItem | null>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);

  const queryClient = useQueryClient();

  // Fetch queue data
  const { data: queueData, isLoading } = useQuery({
    queryKey: ["doctor-queue", slug],
    queryFn: async () => {
      const response = await fetch(`/api/doctor/queue?slug=${slug}`);
      if (!response.ok) throw new Error("Failed to fetch queue");
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Update queue item status mutation
  const updateQueueMutation = useMutation({
    mutationFn: async ({ id, status, room }: { id: string; status: QueueItem["status"]; room?: string }) => {
      const response = await fetch(`/api/doctor/queue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, room, slug }),
      });
      if (!response.ok) throw new Error("Failed to update queue item");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-queue"] });
    },
  });

  const queue = queueData?.queue || [];
  const currentPatient = queue.find((item: QueueItem) => item.status === "in-progress");
  const waitingPatients = queue.filter((item: QueueItem) => item.status === "waiting");

  const getPriorityColor = (priority: QueueItem["priority"]) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800 border-red-200";
      case "high": return "bg-orange-100 text-orange-800 border-orange-200";
      case "normal": return "bg-blue-100 text-blue-800 border-blue-200";
      case "low": return "bg-gray-100 text-gray-800 border-gray-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status: QueueItem["status"]) => {
    switch (status) {
      case "waiting": return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "called": return "bg-purple-50 text-purple-700 border-purple-200";
      case "in-progress": return "bg-blue-50 text-blue-700 border-blue-200";
      case "completed": return "bg-green-50 text-green-700 border-green-200";
      case "no-show": return "bg-red-50 text-red-700 border-red-200";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const handleCallNext = () => {
    if (waitingPatients.length > 0) {
      const nextPatient = waitingPatients[0];
      updateQueueMutation.mutate({ id: nextPatient.id, status: "called" });
    }
  };

  const handleStartConsultation = (patient: QueueItem) => {
    updateQueueMutation.mutate({ id: patient.id, status: "in-progress" });
  };

  const handleCompleteConsultation = (patient: QueueItem) => {
    updateQueueMutation.mutate({ id: patient.id, status: "completed" });
  };

  const handleSkipPatient = (patient: QueueItem) => {
    // Move to end of queue
    updateQueueMutation.mutate({ id: patient.id, status: "waiting" });
  };

  const handleMarkNoShow = (patient: QueueItem) => {
    updateQueueMutation.mutate({ id: patient.id, status: "no-show" });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient Queue"
        subtitle="Manage your patient queue and consultation flow"
      />

      {/* Queue Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-50">
              <Users className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Waiting</p>
              <p className="text-2xl font-bold text-gray-900">{waitingPatients.length}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <Stethoscope className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{currentPatient ? 1 : 0}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Completed Today</p>
              <p className="text-2xl font-bold text-gray-900">
                {queue.filter((item: QueueItem) => item.status === "completed").length}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-50">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Wait Time</p>
              <p className="text-2xl font-bold text-gray-900">
                {waitingPatients.length > 0
                  ? Math.round(waitingPatients.reduce((acc: number, item: QueueItem) => acc + item.estimatedWaitTime, 0) / waitingPatients.length)
                  : 0} min
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Patient */}
        <div className="lg:col-span-1">
          <SectionCard title="Current Patient">
            {currentPatient ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{currentPatient.patientName}</h3>
                      <p className="text-sm text-gray-600">{currentPatient.appointmentType}</p>
                      <Badge className={getPriorityColor(currentPatient.priority)} style={{ marginTop: '8px' }}>
                        {currentPatient.priority}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Check-in: {format(new Date(currentPatient.checkInTime), "h:mm a")}
                    </div>
                    {currentPatient.room && (
                      <div className="flex items-center gap-2">
                        <Stethoscope className="h-4 w-4" />
                        Room: {currentPatient.room}
                      </div>
                    )}
                  </div>

                  {currentPatient.notes && (
                    <div className="p-3 bg-white rounded-lg mb-4">
                      <p className="text-sm text-gray-700">{currentPatient.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleCompleteConsultation(currentPatient)}
                      className="flex-1"
                      disabled={updateQueueMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedPatient(currentPatient)}
                      size="sm"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Stethoscope className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No patient in consultation</h3>
                <p className="text-gray-500 mb-4">Call the next patient to begin consultation.</p>
                <Button onClick={handleCallNext} disabled={waitingPatients.length === 0}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Call Next Patient
                </Button>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Waiting Queue */}
        <div className="lg:col-span-2">
          <SectionCard
            title={`Waiting Patients (${waitingPatients.length})`}
            action={
              <Button onClick={handleCallNext} disabled={waitingPatients.length === 0}>
                <ArrowRight className="h-4 w-4 mr-2" />
                Call Next
              </Button>
            }
          >
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : waitingPatients.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Queue is empty</h3>
                <p className="text-gray-500">No patients are currently waiting.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {waitingPatients.map((patient: QueueItem, index: number) => (
                  <div
                    key={patient.id}
                    className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
                          {index + 1}
                        </div>
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-gray-900">{patient.patientName}</h4>
                          <p className="text-xs text-gray-600">{patient.appointmentType}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Wait: {patient.estimatedWaitTime} min
                            </span>
                            <span className="flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              Check-in: {format(new Date(patient.checkInTime), "h:mm a")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityColor(patient.priority)}>
                          {patient.priority}
                        </Badge>
                        <Badge variant="outline" className={getStatusColor(patient.status)}>
                          {patient.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {patient.patientPhone}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleStartConsultation(patient)}
                          disabled={updateQueueMutation.isPending}
                        >
                          Start
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSkipPatient(patient)}
                          disabled={updateQueueMutation.isPending}
                        >
                          <SkipForward className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPatient(patient)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Quick Actions */}
      <SectionCard title="Quick Actions">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button variant="outline" className="h-20 flex-col gap-2">
            <MessageSquare className="h-6 w-6" />
            <span className="text-sm">Send Message</span>
          </Button>
          <Button variant="outline" className="h-20 flex-col gap-2">
            <FileText className="h-6 w-6" />
            <span className="text-sm">View Records</span>
          </Button>
          <Button variant="outline" className="h-20 flex-col gap-2">
            <Phone className="h-6 w-6" />
            <span className="text-sm">Call Patient</span>
          </Button>
          <Button variant="outline" className="h-20 flex-col gap-2">
            <AlertTriangle className="h-6 w-6" />
            <span className="text-sm">Emergency</span>
          </Button>
        </div>
      </SectionCard>

      {/* Patient Details Modal */}
      <Dialog open={!!selectedPatient} onOpenChange={() => setSelectedPatient(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Patient Details</DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="text-sm text-gray-900">{selectedPatient.patientName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-sm text-gray-900">{selectedPatient.patientPhone}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-sm text-gray-900">{selectedPatient.patientEmail}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Appointment Type</label>
                  <p className="text-sm text-gray-900">{selectedPatient.appointmentType}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Check-in Time</label>
                  <p className="text-sm text-gray-900">
                    {format(new Date(selectedPatient.checkInTime), "MMM dd, yyyy h:mm a")}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Estimated Wait</label>
                  <p className="text-sm text-gray-900">{selectedPatient.estimatedWaitTime} minutes</p>
                </div>
              </div>

              {selectedPatient.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <p className="text-sm text-gray-900 p-3 bg-gray-50 rounded-lg">{selectedPatient.notes}</p>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedPatient(null)}>
                  Close
                </Button>
                {selectedPatient.status === "waiting" && (
                  <Button onClick={() => {
                    handleStartConsultation(selectedPatient);
                    setSelectedPatient(null);
                  }}>
                    Start Consultation
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
