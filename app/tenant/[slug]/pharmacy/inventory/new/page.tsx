"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";

interface Medication {
  id: string;
  name: string;
  genericName?: string;
  category?: string;
  dosage?: string;
}

interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
}

export default function NewStockPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [loading, setLoading] = useState(false);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [formData, setFormData] = useState({
    medicationId: "",
    name: "",
    genericName: "",
    category: "",
    dosage: "",
    batchNumber: "",
    manufacturer: "",
    quantity: "",
    minStockLevel: "10",
    maxStockLevel: "",
    unitPrice: "",
    sellingPrice: "",
    expiryDate: "",
    location: "",
    supplierId: "",
    barcode: "",
    notes: ""
  });

  useEffect(() => {
    fetchMedicationsAndSuppliers();
  }, []);

  const fetchMedicationsAndSuppliers = async () => {
    try {
      const [medicationsRes, suppliersRes] = await Promise.all([
        fetch(`/api/tenant/${slug}/pharmacy/medications`),
        fetch(`/api/tenant/${slug}/pharmacy/suppliers`)
      ]);

      if (medicationsRes.ok) {
        setMedications(await medicationsRes.json());
      }

      if (suppliersRes.ok) {
        setSuppliers(await suppliersRes.json());
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/tenant/${slug}/pharmacy/inventory/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          quantity: Number(formData.quantity),
          minStockLevel: Number(formData.minStockLevel),
          maxStockLevel: formData.maxStockLevel ? Number(formData.maxStockLevel) : undefined,
          unitPrice: Number(formData.unitPrice),
          sellingPrice: Number(formData.sellingPrice),
          expiryDate: new Date(formData.expiryDate)
        })
      });

      if (response.ok) {
        router.push(`/tenant/${slug}/pharmacy/pharmacy-inventory`);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to add stock:", error);
      alert("Failed to add stock");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Auto-fill medication details if medication is selected
    if (field === "medicationId" && value) {
      const selectedMed = medications.find(m => m.id === value);
      if (selectedMed) {
        setFormData(prev => ({
          ...prev,
          medicationId: value,
          name: selectedMed.name,
          genericName: selectedMed.genericName || "",
          category: selectedMed.category || "",
          dosage: selectedMed.dosage || ""
        }));
      }
    }
  };

  const medicationCategories = [
    "analgesics", "antibiotics", "antivirals", "cardiovascular", "dermatological",
    "diabetes", "gastrointestinal", "hormonal", "neurological", "respiratory", "other"
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/tenant/${slug}/pharmacy/pharmacy-inventory`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inventory
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add New Stock</h1>
          <p className="text-muted-foreground">Add new medication stock to inventory</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Medication Information */}
          <Card>
            <CardHeader>
              <CardTitle>Medication Information</CardTitle>
              <CardDescription>Basic medication details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="medicationId">Existing Medication (Optional)</Label>
                <Select value={formData.medicationId} onValueChange={(value) => handleInputChange("medicationId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select existing medication or leave blank" />
                  </SelectTrigger>
                  <SelectContent>
                    {medications.map((med) => (
                      <SelectItem key={med.id} value={med.id}>
                        {med.name} {med.dosage && `(${med.dosage})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="name">Medication Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="e.g., Amoxicillin"
                  required
                />
              </div>

              <div>
                <Label htmlFor="genericName">Generic Name</Label>
                <Input
                  id="genericName"
                  value={formData.genericName}
                  onChange={(e) => handleInputChange("genericName", e.target.value)}
                  placeholder="e.g., Amoxicillin Trihydrate"
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {medicationCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dosage">Dosage</Label>
                <Input
                  id="dosage"
                  value={formData.dosage}
                  onChange={(e) => handleInputChange("dosage", e.target.value)}
                  placeholder="e.g., 500mg"
                />
              </div>
            </CardContent>
          </Card>

          {/* Stock Information */}
          <Card>
            <CardHeader>
              <CardTitle>Stock Information</CardTitle>
              <CardDescription>Inventory and pricing details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="batchNumber">Batch Number *</Label>
                <Input
                  id="batchNumber"
                  value={formData.batchNumber}
                  onChange={(e) => handleInputChange("batchNumber", e.target.value)}
                  placeholder="e.g., BATCH-2024-001"
                  required
                />
              </div>

              <div>
                <Label htmlFor="manufacturer">Manufacturer *</Label>
                <Input
                  id="manufacturer"
                  value={formData.manufacturer}
                  onChange={(e) => handleInputChange("manufacturer", e.target.value)}
                  placeholder="e.g., Pfizer"
                  required
                />
              </div>

              <div>
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange("quantity", e.target.value)}
                  placeholder="e.g., 100"
                  min="0"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minStockLevel">Min Stock Level</Label>
                  <Input
                    id="minStockLevel"
                    type="number"
                    value={formData.minStockLevel}
                    onChange={(e) => handleInputChange("minStockLevel", e.target.value)}
                    placeholder="10"
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="maxStockLevel">Max Stock Level</Label>
                  <Input
                    id="maxStockLevel"
                    type="number"
                    value={formData.maxStockLevel}
                    onChange={(e) => handleInputChange("maxStockLevel", e.target.value)}
                    placeholder="1000"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="unitPrice">Unit Price ($) *</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={(e) => handleInputChange("unitPrice", e.target.value)}
                    placeholder="0.50"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sellingPrice">Selling Price ($) *</Label>
                  <Input
                    id="sellingPrice"
                    type="number"
                    step="0.01"
                    value={formData.sellingPrice}
                    onChange={(e) => handleInputChange("sellingPrice", e.target.value)}
                    placeholder="1.00"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="expiryDate">Expiry Date *</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => handleInputChange("expiryDate", e.target.value)}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
              <CardDescription>Optional details for inventory management</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Storage Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                    placeholder="e.g., Shelf A-1"
                  />
                </div>
                <div>
                  <Label htmlFor="supplierId">Supplier</Label>
                  <Select value={formData.supplierId} onValueChange={(value) => handleInputChange("supplierId", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => handleInputChange("barcode", e.target.value)}
                  placeholder="Scan or enter barcode"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Additional notes about this stock..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4 mt-6">
          <Link href={`/tenant/${slug}/pharmacy/pharmacy-inventory`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding Stock...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Add Stock
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
