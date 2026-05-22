"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  UserCheck, Search, Clock, Calendar, User, Phone, Mail, MapPin,
  CheckCircle2, XCircle, AlertTriangle, Loader2, QrCode, Camera,
  FileText, CreditCard, ShieldCheck, RefreshCw
} from "lucide-react";

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  insurance: {
    provider: string;
    policyNumber: string;
    groupNumber?: string;
  };
  medicalRecordNumber: string;
  lastVisit?: string;
  avatar?: string;
}

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  department: string;
  scheduledAt: string;
  type: string;
  status: "scheduled" | "checked-in" | "in-progress" | "completed" | "cancelled";
  notes?: string;
}

interface CheckInData {
  patient: Patient;
  appointment: Appointment;
  checkInTime: string;
  estimatedWaitTime: string;
  queuePosition: number;
}

export default function CheckInPage() {
  const { slug } = useParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [checkInData, setCheckInData] = useState<CheckInData | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [step, setStep] = useState<"search" | "select-appointment" | "confirm" | "complete">("search");

  // Search patients
  const searchPatients = async (term: string) => {
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/${slug}/receptionist/patients/search?q=${encodeURIComponent(term)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error("Failed to search patients:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchPatients(searchTerm);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  // Get patient's upcoming appointments
  const getPatientAppointments = async (patientId: string) => {
    try {
      const res = await fetch(`/api/tenant/${slug}/receptionist/appointments/patient/${patientId}`);
      if (res.ok) {
        const data = await res.json();
        setUpcomingAppointments(data);
        setStep("select-appointment");
      }
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
    }
  };

  // Check in patient
  const checkInPatient = async () => {
    if (!selectedPatient || !selectedAppointment) return;

    setCheckingIn(true);
    try {
      const res = await fetch(`/api/tenant/${slug}/receptionist/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          appointmentId: selectedAppointment.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCheckInData(data);
        setStep("complete");
      }
    } catch (error) {
      console.error("Failed to check in patient:", error);
    } finally {
      setCheckingIn(false);
    }
  };

  const resetCheckIn = () => {
    setSearchTerm("");
    setSearchResults([]);
    setSelectedPatient(null);
    setUpcomingAppointments([]);
    setSelectedAppointment(null);
    setCheckInData(null);
    setStep("search");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Patient Check-in
          </p>
          <h1 className="text-3xl font-bold text-foreground mt-1">
            Check-in Station
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Streamline patient arrival and appointment management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={resetCheckIn}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
          >
            <RefreshCw className="h-4 w-4" />
            New Check-in
          </button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-4">
          {[
            { step: "search", label: "Find Patient", icon: Search },
            { step: "select-appointment", label: "Select Appointment", icon: Calendar },
            { step: "confirm", label: "Confirm Details", icon: CheckCircle2 },
            { step: "complete", label: "Check-in Complete", icon: UserCheck },
          ].map((item, index) => (
            <div key={item.step} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                step === item.step
                  ? "border-orange-500 bg-orange-50 text-orange-600"
                  : ["complete", "confirm", "select-appointment"].includes(step) && index < ["search", "select-appointment", "confirm", "complete"].indexOf(step)
                  ? "border-green-500 bg-green-50 text-green-600"
                  : "border-gray-300 text-gray-400"
              }`}>
                <item.icon className="h-5 w-5" />
              </div>
              <span className={`ml-2 text-sm font-medium ${
                step === item.step ? "text-orange-600" : "text-gray-500"
              }`}>
                {item.label}
              </span>
              {index < 3 && (
                <div className={`w-12 h-0.5 mx-4 ${
                  ["complete", "confirm", "select-appointment"].includes(step) && index < ["search", "select-appointment", "confirm", "complete"].indexOf(step)
                    ? "bg-green-500"
                    : "bg-gray-300"
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Search Step */}
      {step === "search" && (
        <div className="max-w-2xl mx-auto">
          <div className="p-8 rounded-2xl border border-gray-200 bg-white">
            <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
              Find Patient
            </h2>

            {/* Search Input */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, phone, or medical record number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 animate-spin text-orange-500" />
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-gray-300 text-gray-600 hover:border-orange-300 hover:text-orange-600 transition-all">
                <QrCode className="h-5 w-5" />
                Scan QR Code
              </button>
              <button className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-gray-300 text-gray-600 hover:border-orange-300 hover:text-orange-600 transition-all">
                <Camera className="h-5 w-5" />
                Facial Recognition
              </button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Search Results ({searchResults.length})
                </h3>
                {searchResults.map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => {
                      setSelectedPatient(patient);
                      getPatientAppointments(patient.id);
                    }}
                    className="p-4 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold">
                        {patient.firstName[0]}{patient.lastName[0]}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {patient.firstName} {patient.lastName}
                        </p>
                        <p className="text-sm text-gray-500">
                          MRN: {patient.medicalRecordNumber} • {patient.phone}
                        </p>
                        {patient.lastVisit && (
                          <p className="text-xs text-gray-400">
                            Last visit: {new Date(patient.lastVisit).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <UserCheck className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchTerm && searchResults.length === 0 && !loading && (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No patients found</p>
                <p className="text-sm text-gray-400 mt-1">
                  Try a different search term or register a new patient
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Select Appointment Step */}
      {step === "select-appointment" && selectedPatient && (
        <div className="max-w-4xl mx-auto">
          <div className="p-8 rounded-2xl border border-gray-200 bg-white">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold text-xl">
                {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </h2>
                <p className="text-gray-500">
                  MRN: {selectedPatient.medicalRecordNumber} • DOB: {new Date(selectedPatient.dateOfBirth).toLocaleDateString()}
                </p>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Select Appointment
            </h3>

            {upcomingAppointments.length > 0 ? (
              <div className="space-y-3">
                {upcomingAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    onClick={() => {
                      setSelectedAppointment(appointment);
                      setStep("confirm");
                    }}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedAppointment?.id === appointment.id
                        ? "border-orange-300 bg-orange-50"
                        : "border-gray-200 hover:border-orange-300 hover:bg-orange-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-orange-500" />
                        <div>
                          <p className="font-semibold text-gray-900">
                            {appointment.type} with {appointment.doctorName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(appointment.scheduledAt).toLocaleDateString()} at {new Date(appointment.scheduledAt).toLocaleTimeString()}
                          </p>
                          <p className="text-xs text-gray-400">{appointment.department}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded-md font-semibold ${
                          appointment.status === "scheduled" ? "text-blue-600 bg-blue-50" :
                          appointment.status === "checked-in" ? "text-green-600 bg-green-50" :
                          "text-gray-600 bg-gray-50"
                        }`}>
                          {appointment.status.replace("-", " ").toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No upcoming appointments found</p>
                <p className="text-sm text-gray-400 mt-1">
                  Schedule an appointment first or check walk-in status
                </p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep("search")}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
              >
                Back
              </button>
              <button className="flex-1 px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-all">
                Walk-in Check-in
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Step */}
      {step === "confirm" && selectedPatient && selectedAppointment && (
        <div className="max-w-4xl mx-auto">
          <div className="p-8 rounded-2xl border border-gray-200 bg-white">
            <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
              Confirm Check-in Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Patient Info */}
              <div className="p-4 rounded-lg bg-gray-50">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Patient Information
                </h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Name:</span> {selectedPatient.firstName} {selectedPatient.lastName}</p>
                  <p><span className="font-medium">DOB:</span> {new Date(selectedPatient.dateOfBirth).toLocaleDateString()}</p>
                  <p><span className="font-medium">Phone:</span> {selectedPatient.phone}</p>
                  <p><span className="font-medium">MRN:</span> {selectedPatient.medicalRecordNumber}</p>
                </div>
              </div>

              {/* Appointment Info */}
              <div className="p-4 rounded-lg bg-gray-50">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Appointment Details
                </h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Type:</span> {selectedAppointment.type}</p>
                  <p><span className="font-medium">Doctor:</span> {selectedAppointment.doctorName}</p>
                  <p><span className="font-medium">Department:</span> {selectedAppointment.department}</p>
                  <p><span className="font-medium">Time:</span> {new Date(selectedAppointment.scheduledAt).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Insurance Verification */}
            <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Insurance Verification Required
              </h3>
              <p className="text-sm text-blue-700">
                Please verify insurance before check-in: {selectedPatient.insurance.provider} - Policy #{selectedPatient.insurance.policyNumber}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep("select-appointment")}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
              >
                Back
              </button>
              <button
                onClick={checkInPatient}
                disabled={checkingIn}
                className="flex-1 px-4 py-2 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {checkingIn ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking In...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Complete Check-in
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Step */}
      {step === "complete" && checkInData && (
        <div className="max-w-2xl mx-auto">
          <div className="p-8 rounded-2xl border border-green-200 bg-green-50 text-center">
            <div className="h-16 w-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-green-900 mb-2">
              Check-in Complete!
            </h2>
            <p className="text-green-700 mb-6">
              {checkInData.patient.firstName} {checkInData.patient.lastName} has been successfully checked in.
            </p>

            <div className="bg-white p-4 rounded-lg mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Check-in Time</p>
                  <p className="font-semibold">{new Date(checkInData.checkInTime).toLocaleTimeString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Queue Position</p>
                  <p className="font-semibold">#{checkInData.queuePosition}</p>
                </div>
                <div>
                  <p className="text-gray-500">Estimated Wait</p>
                  <p className="font-semibold">{checkInData.estimatedWaitTime}</p>
                </div>
                <div>
                  <p className="text-gray-500">Appointment</p>
                  <p className="font-semibold">{checkInData.appointment.type}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={resetCheckIn}
                className="flex-1 px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-all"
              >
                New Check-in
              </button>
              <button className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all">
                Print Badge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
