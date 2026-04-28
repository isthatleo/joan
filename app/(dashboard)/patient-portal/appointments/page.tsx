"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, User, Plus, MapPin, Phone, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Appointment {
  id: string;
  doctor: string;
  date: string;
  time: string;
  type: string;
  status: string;
  location?: string;
  notes?: string;
}

export default function PatientAppointmentsPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock patient appointments data
  const mockAppointments: Appointment[] = [
    {
      id: "1",
      doctor: "Dr. Sarah Johnson",
      date: "2024-04-16",
      time: "10:00 AM",
      type: "General Checkup",
      status: "confirmed",
      location: "Room 201",
      notes: "Annual physical examination"
    },
    {
      id: "2",
      doctor: "Dr. Michael Chen",
      date: "2024-04-20",
      time: "2:30 PM",
      type: "Follow-up",
      status: "confirmed",
      location: "Room 105",
      notes: "Blood pressure check"
    },
    {
      id: "3",
      doctor: "Dr. Emily Davis",
      date: "2024-04-25",
      time: "9:15 AM",
      type: "Consultation",
      status: "pending",
      notes: "Discuss test results"
    }
  ];

  useEffect(() => {
    // Simulate loading appointments
    const loadAppointments = async () => {
      setLoading(true);
      // In a real app, fetch from API
      setTimeout(() => {
        setAppointments(mockAppointments);
        setLoading(false);
      }, 1000);
    };

    loadAppointments();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              My Appointments
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              View and manage your scheduled appointments
            </p>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            My Appointments
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View and manage your scheduled appointments
          </p>
        </div>
        <Button
          onClick={() => router.push('/appointments/book')}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Schedule New Appointment
        </Button>
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {appointments.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Appointments Scheduled
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You don't have any upcoming appointments.
              </p>
              <Button onClick={() => router.push('/appointments/book')}>
                Schedule Your First Appointment
              </Button>
            </CardContent>
          </Card>
        ) : (
          appointments.map((appointment) => (
            <Card key={appointment.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{appointment.doctor}</CardTitle>
                      <p className="text-sm text-muted-foreground">{appointment.type}</p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(appointment.status)}>
                    {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{formatDate(appointment.date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>{appointment.time}</span>
                    </div>
                    {appointment.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{appointment.location}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {appointment.notes && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
                        <p className="text-sm">{appointment.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button size="sm" variant="outline" className="flex-1">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Contact Doctor
                  </Button>
                  <Button size="sm" variant="outline">
                    <Phone className="w-4 h-4 mr-2" />
                    Call Clinic
                  </Button>
                  {appointment.status === "confirmed" && (
                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Quick Actions */}
      {appointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => router.push('/appointments/book')}
              >
                <Plus className="w-5 h-5" />
                Schedule New
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => router.push('/patient-portal/records')}
              >
                <Calendar className="w-5 h-5" />
                View History
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => router.push('/messages')}
              >
                <MessageSquare className="w-5 h-5" />
                Message Doctor
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
