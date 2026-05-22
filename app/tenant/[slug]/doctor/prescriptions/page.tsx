"use client";

import { useState, useEffect } from "react";
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
  Pill,
  Search,
  Plus,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Calendar,
  FileText,
  Edit,
  Eye,
  Download,
  MessageSquare,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  medication: string;
  genericName?: string;
  strength: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  refills: number;
  refillsRemaining: number;
  instructions: string;
  indications: string;
  status: "active" | "completed" | "discontinued" | "expired" | "pending";
  prescribedBy: string;
  prescribedAt: string;
  filledAt?: string;
  expiresAt: string;
  pharmacy?: string;
  notes?: string;
  interactions?: string[];
  sideEffects?: string[];
}

interface Medication {
  name: string;
  genericName: string;
  strength: string;
  form: string;
  category: string;
  requiresMonitoring: boolean;
}

export default function DoctorPrescriptionsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showNewPrescriptionModal, setShowNewPrescriptionModal] = useState(false);

  const queryClient = useQueryClient();

  // Fetch prescriptions
  const { data: prescriptions, isLoading } = useQuery({
    queryKey: ["doctor-prescriptions", slug, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: statusFilter,
        search: searchTerm,
      });
      const response = await fetch(`/api/doctor/prescriptions?${params}&slug=${slug}`);
      if (!response.ok) throw new Error("Failed to fetch prescriptions");
      return response.json();
    },
  });

  // Fetch medications for autocomplete
  const { data: medications } = useQuery({
    queryKey: ["medications", slug],
    queryFn: async () => {
      const response = await fetch(`/api/medications?slug=${slug}`);
      if (!response.ok) throw new Error("Failed to fetch medications");
      return response.json();
    },
  });

  // Fetch patients
  const { data: patients } = useQuery({
    queryKey: ["patients", slug],
    queryFn: async () => {
      const response = await fetch(`/api/patients?slug=${slug}&limit=100`);
      if (!response.ok) throw new Error("Failed to fetch patients");
      return response.json();
    },
  });

  // Create prescription mutation
  const createPrescriptionMutation = useMutation({
    mutationFn: async (prescriptionData: Partial<Prescription>) => {
      const response = await fetch("/api/doctor/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...prescriptionData, slug }),
      });
      if (!response.ok) throw new Error("Failed to create prescription");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-prescriptions"] });
      setShowNewPrescriptionModal(false);
    },
  });

  // Update prescription mutation
  const updatePrescriptionMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Prescription> }) => {
      const response = await fetch(`/api/doctor/prescriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updates, slug }),
      });
      if (!response.ok) throw new Error("Failed to update prescription");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-prescriptions"] });
    },
  });

  const filteredPrescriptions = prescriptions?.filter((prescription: Prescription) => {
    const matchesSearch = prescription.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prescription.medication.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  const getStatusColor = (status: Prescription["status"]) => {
    switch (status) {
      case "active": return "bg-green-50 text-green-700 border-green-200";
      case "completed": return "bg-blue-50 text-blue-700 border-blue-200";
      case "discontinued": return "bg-red-50 text-red-700 border-red-200";
      case "expired": return "bg-gray-50 text-gray-700 border-gray-200";
      case "pending": return "bg-yellow-50 text-yellow-700 border-yellow-200";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const expiringSoon = filteredPrescriptions.filter((rx: Prescription) =>
    rx.status === "active" && new Date(rx.expiresAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  );

  const lowRefills = filteredPrescriptions.filter((rx: Prescription) =>
    rx.status === "active" && rx.refillsRemaining <= 1
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prescriptions"
        subtitle="Manage patient prescriptions and medication orders"
      />

      {/* Alerts */}
      {(expiringSoon.length > 0 || lowRefills.length > 0) && (
        <div className="space-y-2">
          {expiringSoon.length > 0 && (
            <div className="p-4 rounded-lg border border-orange-200 bg-orange-50">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-orange-900">Prescriptions Expiring Soon</h3>
                  <p className="text-sm text-orange-700 mt-1">
                    {expiringSoon.length} prescription{expiringSoon.length > 1 ? 's' : ''} will expire within 7 days.
                  </p>
                </div>
              </div>
            </div>
          )}
          {lowRefills.length > 0 && (
            <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-yellow-900">Low Refills Remaining</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    {lowRefills.length} prescription{lowRefills.length > 1 ? 's' : ''} have 1 or fewer refills remaining.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search prescriptions..."
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
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="discontinued">Discontinued</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowNewPrescriptionModal(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Prescription
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredPrescriptions.filter((rx: Prescription) => rx.status === "active").length}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <Pill className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredPrescriptions.filter((rx: Prescription) =>
                  new Date(rx.prescribedAt).getMonth() === new Date().getMonth()
                ).length}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-50">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-gray-900">{expiringSoon.length}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-50">
              <RefreshCw className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Low Refills</p>
              <p className="text-2xl font-bold text-gray-900">{lowRefills.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Prescriptions List */}
      <SectionCard>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPrescriptions.length === 0 ? (
              <div className="text-center py-12">
                <Pill className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No prescriptions found</h3>
                <p className="text-gray-500">Try adjusting your filters or create a new prescription.</p>
              </div>
            ) : (
              filteredPrescriptions.map((prescription: Prescription) => (
                <div
                  key={prescription.id}
                  className="p-6 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <Pill className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{prescription.medication}</h3>
                        <p className="text-sm text-gray-600">
                          {prescription.strength} • Patient: {prescription.patientName}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {prescription.dosage}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {prescription.frequency}
                          </Badge>
                          <Badge className={getStatusColor(prescription.status)}>
                            {prescription.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Prescribed</p>
                      <p className="text-sm font-medium text-gray-900">
                        {format(new Date(prescription.prescribedAt), "MMM dd, yyyy")}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Expires: {format(new Date(prescription.expiresAt), "MMM dd")}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-gray-500">Quantity</p>
                      <p className="font-medium text-gray-900">{prescription.quantity}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Refills</p>
                      <p className="font-medium text-gray-900">
                        {prescription.refillsRemaining}/{prescription.refills}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Duration</p>
                      <p className="font-medium text-gray-900">{prescription.duration}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Pharmacy</p>
                      <p className="font-medium text-gray-900">{prescription.pharmacy || "Not specified"}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-1">Instructions</p>
                    <p className="text-sm text-gray-900 p-3 bg-gray-50 rounded-lg">{prescription.instructions}</p>
                  </div>

                  {prescription.interactions && prescription.interactions.length > 0 && (
                    <div className="mb-4 p-3 bg-red-50 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-900">Drug Interactions</p>
                          <ul className="text-sm text-red-800 mt-1">
                            {prescription.interactions.map((interaction, index) => (
                              <li key={index}>• {interaction}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {prescription.patientName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(prescription.prescribedAt), "MMM dd")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPrescription(prescription);
                          setShowPrescriptionModal(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      {prescription.status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updatePrescriptionMutation.mutate({
                            id: prescription.id,
                            updates: { status: "discontinued" }
                          })}
                          disabled={updatePrescriptionMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Discontinue
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </SectionCard>

      {/* New Prescription Modal */}
      <Dialog open={showNewPrescriptionModal} onOpenChange={setShowNewPrescriptionModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Prescribe Medication</DialogTitle>
          </DialogHeader>
          <PrescriptionForm
            patients={patients || []}
            medications={medications || []}
            onSubmit={(data) => createPrescriptionMutation.mutate(data)}
            isLoading={createPrescriptionMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Prescription Details Modal */}
      <Dialog open={!!selectedPrescription} onOpenChange={() => setShowPrescriptionModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Prescription Details</DialogTitle>
          </DialogHeader>
          {selectedPrescription && (
            <PrescriptionDetails
              prescription={selectedPrescription}
              onUpdate={(updates) => updatePrescriptionMutation.mutate({
                id: selectedPrescription.id,
                updates
              })}
              isUpdating={updatePrescriptionMutation.isPending}
              onClose={() => setShowPrescriptionModal(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PrescriptionForm({
  patients,
  medications,
  onSubmit,
  isLoading
}: {
  patients: any[];
  medications: Medication[];
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    patientId: "",
    medication: "",
    strength: "",
    dosage: "",
    frequency: "",
    duration: "",
    quantity: 30,
    refills: 0,
    instructions: "",
    indications: "",
    notes: "",
  });

  const selectedMedication = medications.find(med => med.name === formData.medication);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedPatient = patients.find(p => p.id === formData.patientId);

    onSubmit({
      patientId: formData.patientId,
      patientName: selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : "",
      patientEmail: selectedPatient?.email || "",
      patientPhone: selectedPatient?.phone || "",
      medication: formData.medication,
      strength: formData.strength,
      dosage: formData.dosage,
      frequency: formData.frequency,
      duration: formData.duration,
      quantity: formData.quantity,
      refills: formData.refills,
      refillsRemaining: formData.refills,
      instructions: formData.instructions,
      indications: formData.indications,
      status: "active",
      prescribedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
      notes: formData.notes,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
          <Select value={formData.patientId} onValueChange={(value) => setFormData({ ...formData, patientId: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select patient" />
            </SelectTrigger>
            <SelectContent>
              {patients.map((patient) => (
                <SelectItem key={patient.id} value={patient.id}>
                  {patient.firstName} {patient.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Medication</label>
          <Select value={formData.medication} onValueChange={(value) => setFormData({ ...formData, medication: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select medication" />
            </SelectTrigger>
            <SelectContent>
              {medications.map((medication) => (
                <SelectItem key={medication.name} value={medication.name}>
                  {medication.name} ({medication.strength})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedMedication && (
        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Medication Details</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-700">Generic Name:</span>
              <span className="ml-2 text-blue-900">{selectedMedication.genericName}</span>
            </div>
            <div>
              <span className="text-blue-700">Form:</span>
              <span className="ml-2 text-blue-900">{selectedMedication.form}</span>
            </div>
            <div>
              <span className="text-blue-700">Category:</span>
              <span className="ml-2 text-blue-900">{selectedMedication.category}</span>
            </div>
            <div>
              <span className="text-blue-700">Requires Monitoring:</span>
              <span className="ml-2 text-blue-900">{selectedMedication.requiresMonitoring ? "Yes" : "No"}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Strength</label>
          <Input
            value={formData.strength}
            onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
            placeholder="e.g., 500mg"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dosage</label>
          <Input
            value={formData.dosage}
            onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
            placeholder="e.g., 1 tablet"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
          <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="once daily">Once daily</SelectItem>
              <SelectItem value="twice daily">Twice daily</SelectItem>
              <SelectItem value="three times daily">Three times daily</SelectItem>
              <SelectItem value="four times daily">Four times daily</SelectItem>
              <SelectItem value="as needed">As needed</SelectItem>
              <SelectItem value="every 6 hours">Every 6 hours</SelectItem>
              <SelectItem value="every 8 hours">Every 8 hours</SelectItem>
              <SelectItem value="every 12 hours">Every 12 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
          <Input
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            placeholder="e.g., 30 days"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
          <Input
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
            min="1"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Refills</label>
          <Input
            type="number"
            value={formData.refills}
            onChange={(e) => setFormData({ ...formData, refills: parseInt(e.target.value) })}
            min="0"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
        <Textarea
          value={formData.instructions}
          onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
          placeholder="Patient instructions for taking medication..."
          rows={3}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Indications</label>
        <Textarea
          value={formData.indications}
          onChange={(e) => setFormData({ ...formData, indications: e.target.value })}
          placeholder="Reason for prescribing this medication..."
          rows={2}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes for pharmacist or patient..."
          rows={2}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Prescribing..." : "Prescribe Medication"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function PrescriptionDetails({
  prescription,
  onUpdate,
  isUpdating,
  onClose
}: {
  prescription: Prescription;
  onUpdate: (updates: Partial<Prescription>) => void;
  isUpdating: boolean;
  onClose: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Prescription Information</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Medication</label>
              <p className="text-sm text-gray-900">{prescription.medication}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Strength</label>
              <p className="text-sm text-gray-900">{prescription.strength}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Dosage</label>
              <p className="text-sm text-gray-900">{prescription.dosage}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Frequency</label>
              <p className="text-sm text-gray-900">{prescription.frequency}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Duration</label>
              <p className="text-sm text-gray-900">{prescription.duration}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <Badge className="mt-1">{prescription.status}</Badge>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient & Pharmacy</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Patient Name</label>
              <p className="text-sm text-gray-900">{prescription.patientName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Patient Phone</label>
              <p className="text-sm text-gray-900">{prescription.patientPhone}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Quantity</label>
              <p className="text-sm text-gray-900">{prescription.quantity}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Refills Remaining</label>
              <p className="text-sm text-gray-900">{prescription.refillsRemaining}/{prescription.refills}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Pharmacy</label>
              <p className="text-sm text-gray-900">{prescription.pharmacy || "Not specified"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Expires</label>
              <p className="text-sm text-gray-900">{format(new Date(prescription.expiresAt), "MMM dd, yyyy")}</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Instructions & Indications</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Patient Instructions</label>
            <p className="text-sm text-gray-900 p-3 bg-gray-50 rounded-lg">{prescription.instructions}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Indications</label>
            <p className="text-sm text-gray-900 p-3 bg-gray-50 rounded-lg">{prescription.indications}</p>
          </div>
        </div>
      </div>

      {prescription.interactions && prescription.interactions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Drug Interactions</h3>
          <div className="p-4 bg-red-50 rounded-lg">
            <ul className="text-sm text-red-800 space-y-1">
              {prescription.interactions.map((interaction, index) => (
                <li key={index}>• {interaction}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {prescription.sideEffects && prescription.sideEffects.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Side Effects</h3>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <ul className="text-sm text-yellow-800 space-y-1">
              {prescription.sideEffects.map((effect, index) => (
                <li key={index}>• {effect}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {prescription.notes && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes</h3>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-900">{prescription.notes}</p>
          </div>
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          Download Prescription
        </Button>
        {prescription.status === "active" && (
          <Button
            variant="destructive"
            onClick={() => onUpdate({ status: "discontinued" })}
            disabled={isUpdating}
          >
            Discontinue Prescription
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}
