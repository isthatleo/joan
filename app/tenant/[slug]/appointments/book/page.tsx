"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Calendar, Clock, User, MapPin, Video, Stethoscope, Search,
  ChevronRight, ChevronLeft, CheckCircle2, AlertTriangle, RefreshCw,
  Phone, MessageSquare, Info
} from "lucide-react";

interface Provider {
  id: string;
  name: string;
  specialty: string;
  avatar?: string;
  rating: number;
  experience: number;
  languages: string[];
  bio: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
  type: "clinic" | "telehealth";
}

interface AvailableDate {
  date: string;
  dayName: string;
  slots: TimeSlot[];
}

interface AppointmentType {
  id: string;
  name: string;
  duration: number;
  description: string;
  price?: number;
}

interface BookingData {
  appointmentType: string;
  providerId: string;
  date: string;
  time: string;
  type: "clinic" | "telehealth";
  reason: string;
  notes?: string;
}

export default function BookAppointmentPage() {
  const { slug } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rescheduleId = searchParams.get("reschedule");

  const [currentStep, setCurrentStep] = useState(1);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [selectedAppointmentType, setSelectedAppointmentType] = useState<string>("");
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedType, setSelectedType] = useState<"clinic" | "telehealth">("clinic");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);

  const steps = [
    { id: 1, title: "Appointment Type", description: "Choose service type" },
    { id: 2, title: "Select Provider", description: "Choose healthcare provider" },
    { id: 3, title: "Choose Date & Time", description: "Pick available slot" },
    { id: 4, title: "Confirm Details", description: "Review and book" },
  ];

  // Fetch initial data
  useEffect(() => {
    fetchAppointmentTypes();
    fetchProviders();
  }, []);

  // Fetch available dates when provider is selected
  useEffect(() => {
    if (selectedProvider) {
      fetchAvailableDates();
    }
  }, [selectedProvider]);

  const fetchAppointmentTypes = async () => {
    try {
      const res = await fetch(`/api/tenant/${slug}/patient/appointments/types`);
      if (res.ok) {
        setAppointmentTypes(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch appointment types:", error);
    }
  };

  const fetchProviders = async () => {
    try {
      const res = await fetch(`/api/tenant/${slug}/patient/providers`);
      if (res.ok) {
        setProviders(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch providers:", error);
    }
  };

  const fetchAvailableDates = async () => {
    if (!selectedProvider) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/${slug}/patient/providers/${selectedProvider.id}/availability`);
      if (res.ok) {
        setAvailableDates(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch availability:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!selectedAppointmentType || !selectedProvider || !selectedDate || !selectedTime || !reason) {
      alert("Please fill in all required fields");
      return;
    }

    setBooking(true);
    try {
      const bookingData: BookingData = {
        appointmentType: selectedAppointmentType,
        providerId: selectedProvider.id,
        date: selectedDate,
        time: selectedTime,
        type: selectedType,
        reason,
        notes,
      };

      const res = await fetch(`/api/tenant/${slug}/patient/appointments/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      });

      if (res.ok) {
        const result = await res.json();
        router.push(`/appointments?booked=${result.appointmentId}`);
      } else {
        throw new Error("Failed to book appointment");
      }
    } catch (error) {
      console.error("Booking failed:", error);
      alert("Failed to book appointment. Please try again.");
    } finally {
      setBooking(false);
    }
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1: return !!selectedAppointmentType;
      case 2: return !!selectedProvider;
      case 3: return !!selectedDate && !!selectedTime;
      case 4: return !!reason.trim();
      default: return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Appointment Type</h2>
              <p className="text-gray-600">Select the type of healthcare service you need</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {appointmentTypes.map((type) => (
                <div
                  key={type.id}
                  onClick={() => setSelectedAppointmentType(type.id)}
                  className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                    selectedAppointmentType === type.id
                      ? "border-orange-300 bg-orange-50"
                      : "border-gray-200 bg-white hover:border-orange-300"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                      <Stethoscope className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{type.name}</h3>
                      <p className="text-sm text-gray-500">{type.duration} minutes</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{type.description}</p>
                  {type.price && (
                    <p className="text-sm font-semibold text-orange-600">${type.price}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Healthcare Provider</h2>
              <p className="text-gray-600">Choose your preferred doctor or specialist</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  onClick={() => setSelectedProvider(provider)}
                  className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                    selectedProvider?.id === provider.id
                      ? "border-orange-300 bg-orange-50"
                      : "border-gray-200 bg-white hover:border-orange-300"
                  }`}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold text-xl">
                      {provider.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{provider.name}</h3>
                      <p className="text-sm text-gray-600">{provider.specialty}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">★</span>
                          <span className="text-xs text-gray-600">{provider.rating}</span>
                        </div>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-600">{provider.experience} years exp.</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{provider.bio}</p>
                  <div className="flex flex-wrap gap-1">
                    {provider.languages.map((lang) => (
                      <span key={lang} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Date & Time</h2>
              <p className="text-gray-600">Select your preferred appointment slot</p>
            </div>

            {selectedProvider && (
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold">
                    {selectedProvider.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <p className="font-semibold text-blue-900">Selected: {selectedProvider.name}</p>
                    <p className="text-sm text-blue-700">{selectedProvider.specialty}</p>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-4" />
                <p className="text-gray-600">Loading available times...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Date Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Date</h3>
                  <div className="space-y-2">
                    {availableDates.slice(0, 7).map((dateOption) => (
                      <button
                        key={dateOption.date}
                        onClick={() => {
                          setSelectedDate(dateOption.date);
                          setSelectedTime("");
                        }}
                        className={`w-full p-3 rounded-lg border text-left transition-all ${
                          selectedDate === dateOption.date
                            ? "border-orange-300 bg-orange-50"
                            : "border-gray-200 bg-white hover:border-orange-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{dateOption.dayName}</p>
                            <p className="text-sm text-gray-600">{new Date(dateOption.date).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">{dateOption.slots.filter(s => s.available).length} slots</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Time</h3>
                  {selectedDate ? (
                    <div className="space-y-2">
                      {availableDates
                        .find(d => d.date === selectedDate)
                        ?.slots.filter(slot => slot.available)
                        .map((slot) => (
                          <button
                            key={slot.time}
                            onClick={() => {
                              setSelectedTime(slot.time);
                              setSelectedType(slot.type);
                            }}
                            className={`w-full p-3 rounded-lg border text-left transition-all ${
                              selectedTime === slot.time
                                ? "border-orange-300 bg-orange-50"
                                : "border-gray-200 bg-white hover:border-orange-300"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Clock className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="font-medium text-gray-900">{slot.time}</p>
                                <p className="text-sm text-gray-600 capitalize">{slot.type}</p>
                              </div>
                              {slot.type === "telehealth" && (
                                <Video className="h-4 w-4 text-blue-500 ml-auto" />
                              )}
                            </div>
                          </button>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Select a date to view available times</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirm Appointment Details</h2>
              <p className="text-gray-600">Review your appointment information before booking</p>
            </div>

            {/* Appointment Summary */}
            <div className="p-6 rounded-2xl border border-gray-200 bg-white">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Summary</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Appointment Type</p>
                    <p className="text-gray-900">
                      {appointmentTypes.find(t => t.id === selectedAppointmentType)?.name}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-600">Healthcare Provider</p>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold text-sm">
                        {selectedProvider?.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <p className="text-gray-900">{selectedProvider?.name}</p>
                        <p className="text-sm text-gray-600">{selectedProvider?.specialty}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-600">Date & Time</p>
                    <p className="text-gray-900">
                      {selectedDate ? new Date(selectedDate).toLocaleDateString() : ""} at {selectedTime}
                    </p>
                    <p className="text-sm text-gray-600 capitalize">{selectedType} appointment</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Visit *
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                      rows={3}
                      placeholder="Please describe the reason for your appointment..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                      rows={2}
                      placeholder="Any additional information..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Important Information */}
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-blue-900 font-medium">Important Information</p>
                  <ul className="text-blue-700 text-sm mt-1 space-y-1">
                    <li>• Please arrive 15 minutes early for check-in</li>
                    <li>• Bring your insurance card and ID</li>
                    <li>• For telehealth appointments, ensure you have a stable internet connection</li>
                    <li>• You can reschedule or cancel up to 24 hours before the appointment</li>
                  </ul>
                </div>
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
            Book Appointment
          </p>
          <h1 className="text-3xl font-bold text-foreground mt-1">
            Schedule Healthcare Visit
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Book appointments with healthcare providers
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                currentStep > step.id
                  ? "border-green-500 bg-green-500 text-white"
                  : currentStep === step.id
                  ? "border-orange-500 bg-orange-50 text-orange-600"
                  : "border-gray-300 text-gray-400"
              }`}>
                {currentStep > step.id ? <CheckCircle2 className="h-5 w-5" /> : step.id}
              </div>
              <div className={`ml-3 ${currentStep === step.id ? "text-gray-900" : "text-gray-500"}`}>
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs">{step.description}</p>
              </div>
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
          className="flex items-center gap-2 px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        {currentStep < 4 ? (
          <button
            onClick={() => setCurrentStep(prev => Math.min(4, prev + 1))}
            disabled={!canProceedToNext()}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleBooking}
            disabled={booking || !canProceedToNext()}
            className="px-6 py-3 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {booking ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Booking...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Confirm Booking
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
