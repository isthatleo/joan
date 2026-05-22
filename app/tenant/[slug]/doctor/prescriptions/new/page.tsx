"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Plus,
  Minus,
  Search,
  Pill,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Save,
  ArrowLeft
} from "lucide-react";

interface Medication {
  id: string;
  name: string;
  genericName?: string;
  category?: string;
  dosage?: string;
  manufacturer?: string;
  stockInfo: {
    totalQuantity: number;
    minStockLevel: number;
    isLowStock: boolean;
    isOutOfStock: boolean;
    status: "in_stock" | "low_stock" | "out_of_stock";
  };
}

interface PrescriptionItem {
  medicationId?: string;
  drugName: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions?: string;
  refills?: number;
  isPrn?: boolean;
  route?: string;
  strength?: string;
  stockStatus?: "in_stock" | "low_stock" | "out_of_stock";
  availableQuantity?: number;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dob?: string;
  phone?: string;
  email?: string;
}

export default function CreatePrescriptionPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const slug = params?.slug as string;

  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [isEmergency, setIsEmergency] = useState(false);
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([
    {
      drugName: "",
      dosage: "",
      frequency: "",
      duration: "",
      quantity: 1,
      refills: 0,
      isPrn: false,
    }
  ]);

  // Search medications
  useEffect(() => {
    const searchMedications = async () => {
      if (searchTerm.length < 2) {
        setMedications([]);
        return;
      }

      try {
        const response = await fetch(`/api/tenant/${slug}/medications/for-prescription?search=${encodeURIComponent(searchTerm)}`);
        if (response.ok) {
          const data = await response.json();
          setMedications(data.medications);
        }
      } catch (error) {
        console.error("Failed to search medications:", error);
      }
    };

    const debounceTimer = setTimeout(searchMedications, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, slug]);

  // Load patients (you might want to add patient search functionality)
  useEffect(() => {
    // For now, we'll assume patients are passed via URL params or context
    // In a real app, you'd have a patient search component
  }, []);

  const addPrescriptionItem = () => {
    setPrescriptionItems([...prescriptionItems, {
      drugName: "",
      dosage: "",
      frequency: "",
      duration: "",
      quantity: 1,
      refills: 0,
      isPrn: false,
    }]);
  };

  const removePrescriptionItem = (index: number) => {
    setPrescriptionItems(prescriptionItems.filter((_, i) => i !== index));
  };

  const updatePrescriptionItem = (index: number, field: keyof PrescriptionItem, value: any) => {
    const updatedItems = [...prescriptionItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // If medication is selected, update stock status
    if (field === "medicationId" && value) {
      const medication = medications.find(m => m.id === value);
      if (medication) {
        updatedItems[index].stockStatus = medication.stockInfo.status;
        updatedItems[index].availableQuantity = medication.stockInfo.totalQuantity;
        updatedItems[index].drugName = medication.name;
        updatedItems[index].genericName = medication.genericName;
        updatedItems[index].strength = medication.dosage;
      }
    }

    setPrescriptionItems(updatedItems);
  };

  const selectMedication = (index: number, medication: Medication) => {
    updatePrescriptionItem(index, "medicationId", medication.id);
    setSearchTerm(""); // Clear search
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const prescriptionData = {
        patientId: selectedPatient,
        doctorId: user?.id,
        diagnosis,
        notes,
        priority,
        isEmergency,
        items: prescriptionItems.map(item => ({
          medicationId: item.medicationId,
          drugName: item.drugName,
          genericName: item.genericName,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          quantity: item.quantity,
          instructions: item.instructions,
          refills: item.refills,
          isPrn: item.isPrn,
          route: item.route,
          strength: item.strength,
        })),
      };

      const response = await fetch(`/api/tenant/${slug}/prescriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prescriptionData),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/tenant/${slug}/doctor/prescriptions/${data.prescription.id}`);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to create prescription:", error);
      alert("Failed to create prescription");
    } finally {
      setLoading(false);
    }
  };

  const getStockStatusIcon = (status?: string) => {
    switch (status) {
      case "in_stock":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "low_stock":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "out_of_stock":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStockStatusText = (status?: string) => {
    switch (status) {
      case "in_stock":
        return "In Stock";
      case "low_stock":
        return "Low Stock";
      case "out_of_stock":
        return "Out of Stock";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create Prescription</h1>
          <p className="text-muted-foreground">Prescribe medications to patients with stock availability checking</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Information */}
        <Card>
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
            <CardDescription>Select the patient for this prescription</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="patient">Patient *</Label>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a patient" />
                </SelectTrigger>
                <SelectContent>
                  {/* In a real app, you'd populate this with actual patients */}
                  <SelectItem value="patient-1">John Doe (ID: patient-1)</SelectItem>
                  <SelectItem value="patient-2">Jane Smith (ID: patient-2)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="diagnosis">Diagnosis</Label>
              <Input
                id="diagnosis"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="Enter diagnosis or condition"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="emergency"
                  checked={isEmergency}
                  onChange={(e) => setIsEmergency(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="emergency">Emergency Prescription</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes or instructions"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Prescription Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Medications
              <Button type="button" onClick={addPrescriptionItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Medication
              </Button>
            </CardTitle>
            <CardDescription>Add medications to this prescription</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {prescriptionItems.map((item, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Medication {index + 1}</h4>
                  {prescriptionItems.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removePrescriptionItem(index)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Medication Search */}
                <div className="relative">
                  <Label>Medication Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search medications..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {medications.length > 0 && searchTerm && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {medications.map((medication) => (
                        <button
                          key={medication.id}
                          type="button"
                          onClick={() => selectMedication(index, medication)}
                          className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{medication.name}</div>
                              {medication.genericName && (
                                <div className="text-sm text-muted-foreground">{medication.genericName}</div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {getStockStatusIcon(medication.stockInfo.status)}
                              <Badge variant={
                                medication.stockInfo.status === "in_stock" ? "default" :
                                medication.stockInfo.status === "low_stock" ? "secondary" : "destructive"
                              }>
                                {medication.stockInfo.totalQuantity} available
                              </Badge>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Medication Info */}
                {item.medicationId && (
                  <Alert>
                    <Pill className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>
                        <strong>{item.drugName}</strong>
                        {item.genericName && ` (${item.genericName})`}
                      </span>
                      <div className="flex items-center gap-2">
                        {getStockStatusIcon(item.stockStatus)}
                        <span className="text-sm">
                          {getStockStatusText(item.stockStatus)} ({item.availableQuantity} available)
                        </span>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Dosage *</Label>
                    <Input
                      value={item.dosage}
                      onChange={(e) => updatePrescriptionItem(index, "dosage", e.target.value)}
                      placeholder="e.g., 500mg, 10mg/ml"
                      required
                    />
                  </div>

                  <div>
                    <Label>Frequency *</Label>
                    <Input
                      value={item.frequency}
                      onChange={(e) => updatePrescriptionItem(index, "frequency", e.target.value)}
                      placeholder="e.g., twice daily, every 8 hours"
                      required
                    />
                  </div>

                  <div>
                    <Label>Duration *</Label>
                    <Input
                      value={item.duration}
                      onChange={(e) => updatePrescriptionItem(index, "duration", e.target.value)}
                      placeholder="e.g., 7 days, 2 weeks"
                      required
                    />
                  </div>

                  <div>
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updatePrescriptionItem(index, "quantity", parseInt(e.target.value))}
                      required
                    />
                  </div>

                  <div>
                    <Label>Refills</Label>
                    <Input
                      type="number"
                      min="0"
                      value={item.refills || 0}
                      onChange={(e) => updatePrescriptionItem(index, "refills", parseInt(e.target.value))}
                    />
                  </div>

                  <div>
                    <Label>Route</Label>
                    <Select
                      value={item.route || ""}
                      onValueChange={(value) => updatePrescriptionItem(index, "route", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select route" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="oral">Oral</SelectItem>
                        <SelectItem value="intravenous">Intravenous</SelectItem>
                        <SelectItem value="intramuscular">Intramuscular</SelectItem>
                        <SelectItem value="subcutaneous">Subcutaneous</SelectItem>
                        <SelectItem value="topical">Topical</SelectItem>
                        <SelectItem value="inhalation">Inhalation</SelectItem>
                        <SelectItem value="rectal">Rectal</SelectItem>
                        <SelectItem value="ocular">Ocular</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`prn-${index}`}
                    checked={item.isPrn || false}
                    onChange={(e) => updatePrescriptionItem(index, "isPrn", e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor={`prn-${index}`}>PRN (as needed)</Label>
                </div>

                <div>
                  <Label>Instructions</Label>
                  <Textarea
                    value={item.instructions || ""}
                    onChange={(e) => updatePrescriptionItem(index, "instructions", e.target.value)}
                    placeholder="Patient instructions, e.g., 'Take with food', 'Shake well before use'"
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !selectedPatient}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Create Prescription
          </Button>
        </div>
      </form>
    </div>
  );
}
