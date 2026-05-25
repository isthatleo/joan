"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  User, Phone, Mail, MapPin, Calendar, ShieldCheck, CreditCard,
  FileText, Heart, AlertTriangle, CheckCircle2, Loader2, Save,
  ArrowLeft, Upload, Camera
} from "lucide-react";
import { PhoneNumberInput } from "@/components/forms/PhoneNumberInput";

interface PatientFormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  insurance: {
    provider: string;
    policyNumber: string;
    groupNumber: string;
    primaryInsured: string;
  };
  medicalHistory: {
    allergies: string;
    medications: string;
    conditions: string;
    surgeries: string;
  };
  preferences: {
    language: string;
    communicationMethod: string;
  };
}

export default function PatientRegistrationPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PatientFormData>({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    phone: "",
    email: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
    },
    emergencyContact: {
      name: "",
      relationship: "",
      phone: "",
    },
    insurance: {
      provider: "",
      policyNumber: "",
      groupNumber: "",
      primaryInsured: "",
    },
    medicalHistory: {
      allergies: "",
      medications: "",
      conditions: "",
      surgeries: "",
    },
    preferences: {
      language: "English",
      communicationMethod: "phone",
    },
  });

  const steps = [
    { id: 1, title: "Basic Information", icon: User },
    { id: 2, title: "Contact Details", icon: Phone },
    { id: 3, title: "Insurance", icon: ShieldCheck },
    { id: 4, title: "Medical History", icon: Heart },
    { id: 5, title: "Review & Submit", icon: CheckCircle2 },
  ];

  const updateFormData = (section: keyof PatientFormData, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [section]: typeof prev[section] === 'object' && prev[section] !== null
        ? { ...prev[section], [field]: value }
        : value
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.firstName && formData.lastName && formData.dateOfBirth && formData.gender);
      case 2:
        return !!(formData.phone && formData.email && formData.address.street && formData.address.city && formData.address.state && formData.address.zipCode);
      case 3:
        return !!(formData.insurance.provider && formData.insurance.policyNumber);
      case 4:
        return true; // Medical history is optional
      case 5:
        return true; // Review step
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/${slug}/receptionist/patients/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/patients/${data.patientId}?registered=true`);
      } else {
        throw new Error("Failed to register patient");
      }
    } catch (error) {
      console.error("Registration failed:", error);
      alert("Failed to register patient. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Basic Information</h2>
              <p className="text-gray-600">Enter the patient's personal details</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => updateFormData("firstName", "", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                  placeholder="Enter first name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => updateFormData("lastName", "", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                  placeholder="Enter last name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => updateFormData("dateOfBirth", "", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender *
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => updateFormData("gender", "", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>
            </div>

            {/* Photo Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Upload Patient Photo (Optional)</p>
              <p className="text-sm text-gray-400 mb-4">JPG, PNG up to 5MB</p>
              <button className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all">
                Choose File
              </button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Contact Information</h2>
              <p className="text-gray-600">Provide contact details and address</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <PhoneNumberInput
                  value={formData.phone}
                  onChange={(value) => updateFormData("phone", "", value)}
                  className="border-gray-300 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-200"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData("email", "", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                  placeholder="patient@example.com"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address *
                </label>
                <input
                  type="text"
                  value={formData.address.street}
                  onChange={(e) => updateFormData("address", "street", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => updateFormData("address", "city", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                    placeholder="City"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    value={formData.address.state}
                    onChange={(e) => updateFormData("address", "state", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                    placeholder="State"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    value={formData.address.zipCode}
                    onChange={(e) => updateFormData("address", "zipCode", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                    placeholder="12345"
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Emergency Contact
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={formData.emergencyContact.name}
                    onChange={(e) => updateFormData("emergencyContact", "name", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Relationship
                  </label>
                  <select
                    value={formData.emergencyContact.relationship}
                    onChange={(e) => updateFormData("emergencyContact", "relationship", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                  >
                    <option value="">Select relationship</option>
                    <option value="spouse">Spouse</option>
                    <option value="parent">Parent</option>
                    <option value="child">Child</option>
                    <option value="sibling">Sibling</option>
                    <option value="friend">Friend</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <PhoneNumberInput
                    value={formData.emergencyContact.phone}
                    onChange={(value) => updateFormData("emergencyContact", "phone", value)}
                    className="border-gray-300 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-200"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Insurance Information</h2>
              <p className="text-gray-600">Enter insurance details for billing</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Insurance Provider *
                </label>
                <input
                  type="text"
                  value={formData.insurance.provider}
                  onChange={(e) => updateFormData("insurance", "provider", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                  placeholder="Blue Cross Blue Shield"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Policy Number *
                </label>
                <input
                  type="text"
                  value={formData.insurance.policyNumber}
                  onChange={(e) => updateFormData("insurance", "policyNumber", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                  placeholder="ABC123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Number
                </label>
                <input
                  type="text"
                  value={formData.insurance.groupNumber}
                  onChange={(e) => updateFormData("insurance", "groupNumber", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                  placeholder="GRP001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Insured
                </label>
                <input
                  type="text"
                  value={formData.insurance.primaryInsured}
                  onChange={(e) => updateFormData("insurance", "primaryInsured", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                  placeholder="Self or policy holder name"
                />
              </div>
            </div>

            {/* Insurance Card Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Upload Insurance Card (Optional)</p>
                <p className="text-sm text-gray-400 mb-4">Front and back photos, JPG or PNG</p>
                <div className="flex gap-4 justify-center">
                  <button className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all">
                    Front Side
                  </button>
                  <button className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all">
                    Back Side
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Medical History</h2>
              <p className="text-gray-600">Help us provide better care with medical background</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Known Allergies
                </label>
                <textarea
                  value={formData.medicalHistory.allergies}
                  onChange={(e) => updateFormData("medicalHistory", "allergies", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                  rows={3}
                  placeholder="List any known allergies (medications, foods, environmental, etc.)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Medications
                </label>
                <textarea
                  value={formData.medicalHistory.medications}
                  onChange={(e) => updateFormData("medicalHistory", "medications", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                  rows={3}
                  placeholder="List current medications, dosages, and frequency"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medical Conditions
                </label>
                <textarea
                  value={formData.medicalHistory.conditions}
                  onChange={(e) => updateFormData("medicalHistory", "conditions", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                  rows={3}
                  placeholder="List any chronic conditions, diseases, or ongoing health issues"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Previous Surgeries
                </label>
                <textarea
                  value={formData.medicalHistory.surgeries}
                  onChange={(e) => updateFormData("medicalHistory", "surgeries", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                  rows={3}
                  placeholder="List any previous surgeries with dates"
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-blue-900 font-medium">Privacy Notice</p>
                  <p className="text-blue-700 text-sm mt-1">
                    This medical information is protected under HIPAA and will only be used for providing quality healthcare services.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Review & Submit</h2>
              <p className="text-gray-600">Please review all information before submitting</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Personal Information
                </h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Name:</span> {formData.firstName} {formData.lastName}</p>
                  <p><span className="font-medium">DOB:</span> {new Date(formData.dateOfBirth).toLocaleDateString()}</p>
                  <p><span className="font-medium">Gender:</span> {formData.gender}</p>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Contact Information
                </h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Phone:</span> {formData.phone}</p>
                  <p><span className="font-medium">Email:</span> {formData.email}</p>
                  <p><span className="font-medium">Address:</span> {formData.address.street}, {formData.address.city}, {formData.address.state} {formData.address.zipCode}</p>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Insurance
                </h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Provider:</span> {formData.insurance.provider}</p>
                  <p><span className="font-medium">Policy:</span> {formData.insurance.policyNumber}</p>
                  {formData.insurance.groupNumber && <p><span className="font-medium">Group:</span> {formData.insurance.groupNumber}</p>}
                </div>
              </div>

              <div className="p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Medical History
                </h3>
                <div className="space-y-1 text-sm">
                  {formData.medicalHistory.allergies && <p><span className="font-medium">Allergies:</span> {formData.medicalHistory.allergies}</p>}
                  {formData.medicalHistory.medications && <p><span className="font-medium">Medications:</span> {formData.medicalHistory.medications}</p>}
                  {formData.medicalHistory.conditions && <p><span className="font-medium">Conditions:</span> {formData.medicalHistory.conditions}</p>}
                  {formData.medicalHistory.surgeries && <p><span className="font-medium">Surgeries:</span> {formData.medicalHistory.surgeries}</p>}
                  {!formData.medicalHistory.allergies && !formData.medicalHistory.medications && !formData.medicalHistory.conditions && !formData.medicalHistory.surgeries && (
                    <p className="text-gray-500">No medical history provided</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="text-green-900">
                  All required information has been provided. Click submit to complete registration.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Patient Registration
          </p>
          <h1 className="text-3xl font-bold text-foreground mt-1">
            New Patient Registration
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete patient information for seamless healthcare delivery
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      {/* Progress Bar */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                currentStep > step.id
                  ? "border-green-500 bg-green-500 text-white"
                  : currentStep === step.id
                  ? "border-orange-500 bg-orange-50 text-orange-600"
                  : "border-gray-300 text-gray-400"
              }`}>
                {currentStep > step.id ? <CheckCircle2 className="h-4 w-4" /> : <step.icon className="h-4 w-4" />}
              </div>
              <span className={`ml-2 text-sm font-medium ${
                currentStep >= step.id ? "text-gray-900" : "text-gray-400"
              }`}>
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-4 ${
                  currentStep > step.id ? "bg-green-500" : "bg-gray-300"
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white p-8 rounded-2xl border border-gray-200">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
          className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Previous
        </button>

        {currentStep < 5 ? (
          <button
            onClick={() => setCurrentStep(prev => Math.min(5, prev + 1))}
            disabled={!validateStep(currentStep)}
            className="px-6 py-3 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-3 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Complete Registration
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
