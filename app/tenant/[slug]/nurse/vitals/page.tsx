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
} from "@/components/ui";
import {
  HeartPulse,
  Search,
  Plus,
  Thermometer,
  Wind,
  Zap,
  Eye,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

interface VitalReading {
  id: string;
  patientId: string;
  patientName: string;
  patientRoom: string;
  heartRate: number;
  bloodPressure: string;
  temperature: number;
  respiratoryRate: number;
  oxygenSaturation: number;
  recordedAt: string;
  recordedBy: string;
  status: "normal" | "warning" | "critical";
  notes?: string;
}

export default function NurseVitalsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReading, setSelectedReading] = useState<VitalReading | null>(null);
  const [showReadingModal, setShowReadingModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);

  const queryClient = useQueryClient();

  // Fetch vital readings
  const { data: vitals, isLoading } = useQuery({
    queryKey: ["nurse-vitals", slug, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: statusFilter,
        search: searchTerm,
      });
      const response = await fetch(`/api/nurse/vitals?${params}&slug=${slug}`);
      if (!response.ok) throw new Error("Failed to fetch vitals");
      return response.json();
    },
    refetchInterval: 60000,
  });

  // Record vital sign mutation
  const recordVitalMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/nurse/vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, slug }),
      });
      if (!response.ok) throw new Error("Failed to record vital");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nurse-vitals"] });
      setShowRecordModal(false);
    },
  });

  const filteredVitals = vitals?.filter((vital: VitalReading) => {
    const matchesSearch = vital.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vital.patientRoom.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  const getStatusColor = (status: VitalReading["status"]) => {
    switch (status) {
      case "normal": return "bg-green-50 text-green-700 border-green-200";
      case "warning": return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "critical": return "bg-red-50 text-red-700 border-red-200";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const criticalReadings = filteredVitals.filter((v: VitalReading) => v.status === "critical");
  const warningReadings = filteredVitals.filter((v: VitalReading) => v.status === "warning");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vital Signs Monitoring"
        subtitle="Track and record patient vital signs"
      />

      {/* Critical Alerts */}
      {criticalReadings.length > 0 && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-red-900">Critical Alerts</h3>
              <p className="text-sm text-red-700 mt-1">
                {criticalReadings.length} patient{criticalReadings.length > 1 ? 's' : ''} have critical vitals requiring immediate attention.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search patient..."
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
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowRecordModal(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Record Vitals
        </Button>
      </div>

      {/* Vital Readings Grid */}
      <SectionCard>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredVitals.length === 0 ? (
              <div className="text-center py-12">
                <HeartPulse className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No vital readings found</h3>
                <p className="text-gray-500">Record vital signs to get started.</p>
              </div>
            ) : (
              filteredVitals.map((vital: VitalReading) => (
                <div
                  key={vital.id}
                  className={`p-6 rounded-lg border ${getStatusColor(vital.status)}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{vital.patientName}</h3>
                      <p className="text-sm text-gray-600">Room {vital.patientRoom} • Recorded {format(new Date(vital.recordedAt), "h:mm a")}</p>
                    </div>
                    <Badge className={getStatusColor(vital.status)}>
                      {vital.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Zap className="h-4 w-4" />
                        <span className="text-xs text-gray-600">HR</span>
                      </div>
                      <p className="text-xl font-bold text-gray-900">{vital.heartRate}</p>
                      <p className="text-xs text-gray-600">bpm</p>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <HeartPulse className="h-4 w-4" />
                        <span className="text-xs text-gray-600">BP</span>
                      </div>
                      <p className="text-xl font-bold text-gray-900">{vital.bloodPressure}</p>
                      <p className="text-xs text-gray-600">mmHg</p>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Thermometer className="h-4 w-4" />
                        <span className="text-xs text-gray-600">Temp</span>
                      </div>
                      <p className="text-xl font-bold text-gray-900">{vital.temperature}°C</p>
                      <p className="text-xs text-gray-600">Celsius</p>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Wind className="h-4 w-4" />
                        <span className="text-xs text-gray-600">RR</span>
                      </div>
                      <p className="text-xl font-bold text-gray-900">{vital.respiratoryRate}</p>
                      <p className="text-xs text-gray-600">/min</p>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-xs text-gray-600">O2</span>
                      </div>
                      <p className="text-xl font-bold text-gray-900">{vital.oxygenSaturation}%</p>
                      <p className="text-xs text-gray-600">SpO2</p>
                    </div>
                  </div>

                  {vital.notes && (
                    <div className="mb-4 p-3 bg-white/50 rounded-lg">
                      <p className="text-sm text-gray-700">{vital.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedReading(vital);
                        setShowReadingModal(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Button variant="outline" size="sm">
                      <Clock className="h-4 w-4 mr-2" />
                      Trend
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </SectionCard>

      {/* Record Vitals Modal */}
      <Dialog open={showRecordModal} onOpenChange={setShowRecordModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Vital Signs</DialogTitle>
          </DialogHeader>
          <RecordVitalsForm
            onSubmit={(data) => recordVitalMutation.mutate(data)}
            isLoading={recordVitalMutation.isPending}
            onClose={() => setShowRecordModal(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Vital Reading Details Modal */}
      <Dialog open={showReadingModal} onOpenChange={setShowReadingModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vital Reading Details</DialogTitle>
          </DialogHeader>
          {selectedReading && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Patient Name</label>
                  <p className="text-sm text-gray-900">{selectedReading.patientName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Room Number</label>
                  <p className="text-sm text-gray-900">{selectedReading.patientRoom}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Recorded By</label>
                  <p className="text-sm text-gray-900">{selectedReading.recordedBy}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Recorded At</label>
                  <p className="text-sm text-gray-900">{format(new Date(selectedReading.recordedAt), "PPp")}</p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowReadingModal(false)}>
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

function RecordVitalsForm({
  onSubmit,
  isLoading,
  onClose
}: {
  onSubmit: (data: any) => void;
  isLoading: boolean;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    patientId: "",
    heartRate: "",
    systolic: "",
    diastolic: "",
    temperature: "",
    respiratoryRate: "",
    oxygenSaturation: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      patientId: formData.patientId,
      heartRate: parseInt(formData.heartRate),
      bloodPressure: `${formData.systolic}/${formData.diastolic}`,
      temperature: parseFloat(formData.temperature),
      respiratoryRate: parseInt(formData.respiratoryRate),
      oxygenSaturation: parseInt(formData.oxygenSaturation),
      notes: formData.notes,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
        <Input
          type="text"
          value={formData.patientId}
          onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
          placeholder="Select patient"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Heart Rate (bpm)</label>
          <Input
            type="number"
            value={formData.heartRate}
            onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
            placeholder="60-100"
            min="0"
            max="300"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°C)</label>
          <Input
            type="number"
            value={formData.temperature}
            onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
            placeholder="36.5-37.5"
            step="0.1"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Systolic (mmHg)</label>
          <Input
            type="number"
            value={formData.systolic}
            onChange={(e) => setFormData({ ...formData, systolic: e.target.value })}
            placeholder="120"
            min="0"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Diastolic (mmHg)</label>
          <Input
            type="number"
            value={formData.diastolic}
            onChange={(e) => setFormData({ ...formData, diastolic: e.target.value })}
            placeholder="80"
            min="0"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Respiratory Rate (/min)</label>
          <Input
            type="number"
            value={formData.respiratoryRate}
            onChange={(e) => setFormData({ ...formData, respiratoryRate: e.target.value })}
            placeholder="12-20"
            min="0"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Oxygen Saturation (%)</label>
          <Input
            type="number"
            value={formData.oxygenSaturation}
            onChange={(e) => setFormData({ ...formData, oxygenSaturation: e.target.value })}
            placeholder="95-100"
            min="0"
            max="100"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <Input
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional observations..."
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Recording..." : "Record Vitals"}
        </Button>
      </DialogFooter>
    </form>
  );
}
