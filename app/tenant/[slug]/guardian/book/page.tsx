"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  Calendar, Clock, User, MapPin, Stethoscope, Search,
  Filter, Plus, CheckCircle, AlertCircle, Loader2,
  ChevronLeft, ChevronRight, Baby
} from "lucide-react";

const orange = "#F97316";

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  avatar?: string;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  avatar?: string;
  rating: number;
  experience: string;
}

interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
  booked?: boolean;
}

interface AppointmentType {
  id: string;
  name: string;
  duration: number;
  description: string;
  price?: number;
}

interface BookingForm {
  childId: string;
  doctorId: string;
  appointmentTypeId: string;
  date: string;
  timeSlot: string;
  reason: string;
  notes: string;
}

export default function BookAppointmentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;
  const preselectedChildId = searchParams.get("child");

  const [children, setChildren] = useState<Child[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState<BookingForm>({
    childId: preselectedChildId || "",
    doctorId: "",
    appointmentTypeId: "",
    date: "",
    timeSlot: "",
    reason: "",
    notes: ""
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (form.doctorId && form.date) {
      fetchTimeSlots();
    }
  }, [form.doctorId, form.date]);

  const fetchInitialData = async () => {
    try {
      const [childrenRes, doctorsRes, typesRes] = await Promise.all([
        fetch(`/api/guardian/children?slug=${slug}`),
        fetch(`/api/guardian/doctors?slug=${slug}`),
        fetch(`/api/guardian/appointment-types?slug=${slug}`)
      ]);

      if (childrenRes.ok) setChildren(await childrenRes.json());
      if (doctorsRes.ok) setDoctors(await doctorsRes.json());
      if (typesRes.ok) setAppointmentTypes(await typesRes.json());

      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch initial data:", error);
      setLoading(false);
    }
  };

  const fetchTimeSlots = async () => {
    try {
      const res = await fetch(
        `/api/guardian/doctors/${form.doctorId}/slots?date=${form.date}&slug=${slug}`
      );
      if (res.ok) {
        setTimeSlots(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch time slots:", error);
    }
  };

  const handleBooking = async () => {
    setBooking(true);
    try {
      const res = await fetch(`/api/guardian/appointments?slug=${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        setSuccess(true);
        // Reset form
        setForm({
          childId: "",
          doctorId: "",
          appointmentTypeId: "",
          date: "",
          timeSlot: "",
          reason: "",
          notes: ""
        });
        setCurrentStep(1);
      } else {
        throw new Error("Booking failed");
      }
    } catch (error) {
      console.error("Booking error:", error);
      alert("Failed to book appointment. Please try again.");
    } finally {
      setBooking(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1: return form.childId;
      case 2: return form.appointmentTypeId;
      case 3: return form.doctorId && form.date && form.timeSlot;
      case 4: return form.reason.trim().length > 0;
      default: return false;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
          Loading booking system...
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Appointment Booked!</h2>
        <p className="text-gray-600 mb-6">
          Your appointment has been successfully scheduled. You'll receive a confirmation email shortly.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => setSuccess(false)}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Book Another
          </button>
          <a
            href={`/tenant/${slug}/guardian/appointments`}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            View Appointments
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          Book Appointment
        </p>
        <h1 className="text-3xl font-bold text-foreground mt-1">
          Schedule Healthcare Visit
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Book appointments for your children with qualified healthcare professionals
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-4">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step <= currentStep
                  ? "bg-orange-500 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}>
                {step}
              </div>
              {step < 4 && (
                <div className={`w-12 h-0.5 mx-2 ${
                  step < currentStep ? "bg-orange-500" : "bg-gray-200"
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <Baby className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900">Select Child</h2>
              <p className="text-gray-600">Choose which child needs the appointment</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {children.map((child) => (
                <div
                  key={child.id}
                  onClick={() => setForm({...form, childId: child.id})}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    form.childId === child.id
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                      <span className="text-orange-600 font-semibold">
                        {child.firstName.charAt(0)}{child.lastName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {child.firstName} {child.lastName}
                      </p>
                      <p className="text-sm text-gray-600">
                        Age {new Date().getFullYear() - new Date(child.dob).getFullYear()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <Stethoscope className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900">Appointment Type</h2>
              <p className="text-gray-600">What type of appointment do you need?</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {appointmentTypes.map((type) => (
                <div
                  key={type.id}
                  onClick={() => setForm({...form, appointmentTypeId: type.id})}
                  className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                    form.appointmentTypeId === type.id
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <h3 className="font-semibold text-gray-900 mb-2">{type.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{type.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Duration: {type.duration} min</span>
                    {type.price && (
                      <span className="font-semibold text-orange-600">${type.price}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900">Select Doctor & Time</h2>
              <p className="text-gray-600">Choose your preferred doctor and available time slot</p>
            </div>

            {/* Doctor Selection */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Choose Doctor</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {doctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    onClick={() => setForm({...form, doctorId: doctor.id})}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      form.doctorId === doctor.id
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">
                          {doctor.name.split(" ").map(n => n[0]).join("")}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{doctor.name}</p>
                        <p className="text-sm text-gray-600">{doctor.specialty}</p>
                        <p className="text-xs text-gray-500">{doctor.experience} experience</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Date Selection */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Select Date</h3>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({...form, date: e.target.value})}
                min={new Date().toISOString().split('T')[0]}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Time Slots */}
            {form.doctorId && form.date && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Available Times</h3>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => setForm({...form, timeSlot: slot.time})}
                      disabled={!slot.available}
                      className={`p-3 rounded-lg border text-sm font-semibold transition-all ${
                        form.timeSlot === slot.time
                          ? "border-orange-500 bg-orange-50 text-orange-700"
                          : slot.available
                          ? "border-gray-200 hover:border-gray-300 text-gray-700"
                          : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="text-center">
              <FileText className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900">Appointment Details</h2>
              <p className="text-gray-600">Provide additional information for your appointment</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reason for Visit *
                </label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm({...form, reason: e.target.value})}
                  placeholder="Please describe the reason for this appointment..."
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({...form, notes: e.target.value})}
                  placeholder="Any additional information or special requests..."
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Appointment Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Child:</span>
                  <span className="font-semibold">
                    {children.find(c => c.id === form.childId)?.firstName} {children.find(c => c.id === form.childId)?.lastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Doctor:</span>
                  <span className="font-semibold">
                    {doctors.find(d => d.id === form.doctorId)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-semibold">
                    {appointmentTypes.find(t => t.id === form.appointmentTypeId)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date & Time:</span>
                  <span className="font-semibold">
                    {new Date(form.date).toLocaleDateString()} at {form.timeSlot}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevStep}
          disabled={currentStep === 1}
          className="flex items-center gap-2 px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        {currentStep < 4 ? (
          <button
            onClick={nextStep}
            disabled={!canProceedToNext()}
            className="flex items-center gap-2 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleBooking}
            disabled={!canProceedToNext() || booking}
            className="flex items-center gap-2 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {booking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Booking...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Confirm Booking
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
