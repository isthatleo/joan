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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui";
import {
  Users,
  Search,
  Plus,
  Filter,
  User,
  Phone,
  Mail,
  Calendar,
  FileText,
  Eye,
  Edit,
  Bed,
  AlertCircle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
  admissionDate: string;
  room: string;
  bed: string;
  primaryCondition: string;
  secondaryConditions?: string[];
  allergies?: string[];
  emergencyContact: string;
  emergencyPhone: string;
  insuranceProvider?: string;
  medicalHistory?: string;
  currentStatus: "stable" | "critical" | "improving" | "declining";
  assignedNurse: string;
  doctorName: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function NursePatientsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);

  const queryClient = useQueryClient();

  // Fetch patients
  const { data: patients, isLoading } = useQuery({
    queryKey: ["nurse-patients", slug, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: statusFilter,
        search: searchTerm,
      });
      const response = await fetch(`/api/nurse/patients?${params}&slug=${slug}`);
      if (!response.ok) throw new Error("Failed to fetch patients");
      return response.json();
    },
  });

  const filteredPatients = patients?.filter((patient: Patient) => {
    const matchesSearch = patient.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.room.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  const getStatusColor = (status: Patient["currentStatus"]) => {
    switch (status) {
      case "stable": return "bg-green-50 text-green-700 border-green-200";
      case "critical": return "bg-red-50 text-red-700 border-red-200";
      case "improving": return "bg-blue-50 text-blue-700 border-blue-200";
      case "declining": return "bg-yellow-50 text-yellow-700 border-yellow-200";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assigned Patients"
        subtitle="Manage and monitor all patients under your care"
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="stable">Stable</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="improving">Improving</SelectItem>
              <SelectItem value="declining">Declining</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Patients Grid */}
      <SectionCard>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPatients.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No patients found</h3>
                <p className="text-gray-500">Try adjusting your search filters.</p>
              </div>
            ) : (
              filteredPatients.map((patient: Patient) => (
                <div
                  key={patient.id}
                  className="p-6 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {patient.firstName} {patient.lastName}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {patient.age} years • {patient.gender} • Room {patient.room}, Bed {patient.bed}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {patient.primaryCondition}
                          </Badge>
                          <Badge className={getStatusColor(patient.currentStatus)}>
                            {patient.currentStatus}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Admitted</p>
                      <p className="text-sm font-medium text-gray-900">
                        {format(new Date(patient.admissionDate), "MMM dd")}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-gray-500">Emergency Contact</p>
                      <p className="font-medium text-gray-900">{patient.emergencyContact}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Doctor in Charge</p>
                      <p className="font-medium text-gray-900">{patient.doctorName}</p>
                    </div>
                  </div>

                  {patient.allergies && patient.allergies.length > 0 && (
                    <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-900">Allergies</p>
                          <p className="text-sm text-red-700">{patient.allergies.join(", ")}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedPatient(patient);
                        setShowPatientModal(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Button variant="outline" size="sm">
                      <Bed className="h-4 w-4 mr-2" />
                      Vitals
                    </Button>
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      Notes
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </SectionCard>

      {/* Patient Details Modal */}
      <Dialog open={showPatientModal} onOpenChange={setShowPatientModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Patient Details</DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Full Name</label>
                      <p className="text-sm text-gray-900">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Age & Gender</label>
                      <p className="text-sm text-gray-900">{selectedPatient.age} years • {selectedPatient.gender}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <p className="text-sm text-gray-900">{selectedPatient.phone}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="text-sm text-gray-900">{selectedPatient.email}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Medical Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Primary Condition</label>
                      <p className="text-sm text-gray-900">{selectedPatient.primaryCondition}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Current Status</label>
                      <Badge className="mt-1">{selectedPatient.currentStatus}</Badge>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Doctor in Charge</label>
                      <p className="text-sm text-gray-900">{selectedPatient.doctorName}</p>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPatientModal(false)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
