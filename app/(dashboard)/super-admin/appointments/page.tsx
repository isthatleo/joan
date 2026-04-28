"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { KPICard } from "@/components/KPICard";
import { DataCard, DataCardItem } from "@/components/DataCard";
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Play,
  UserCheck,
  Settings,
  BarChart3,
  Video,
  MessageSquare,
  Star,
  TrendingUp,
  Award,
  Target,
  Calendar as CalendarIcon,
  BarChart,
  PieChart,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function SuperAdminAppointmentsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [appointmentDetailsOpen, setAppointmentDetailsOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [scheduleForm, setScheduleForm] = useState({
    type: "",
    title: "",
    hospital: "",
    date: "",
    time: "",
    duration: "",
    attendees: "",
    notes: ""
  });
  const searchParams = useSearchParams();

  // Mock super admin appointment data
  const demoAppointments: DataCardItem[] = [
    {
      id: "1",
      title: "Live Product Demo",
      subtitle: "St. Mary's Hospital - System Overview",
      status: "scheduled",
      value: "2:00 PM Today"
    },
    {
      id: "2",
      title: "Onboarding Session",
      subtitle: "City General Hospital - Staff Training",
      status: "in-progress",
      value: "11:00 AM"
    },
    {
      id: "3",
      title: "Technical Consultation",
      subtitle: "Regional Medical Center - Integration",
      status: "completed",
      value: "9:30 AM"
    },
    {
      id: "4",
      title: "Feature Walkthrough",
      subtitle: "University Hospital - New Modules",
      status: "scheduled",
      value: "4:00 PM"
    },
  ];

  const onboardingSessions = [
    {
      id: "1",
      hospital: "St. Mary's Hospital",
      status: "in-progress",
      progress: 75,
      nextStep: "User Training",
      attendees: 12,
      startDate: "2024-04-15",
      estimatedCompletion: "2024-04-20"
    },
    {
      id: "2",
      hospital: "City General Hospital",
      status: "scheduled",
      progress: 0,
      nextStep: "Initial Setup",
      attendees: 8,
      startDate: "2024-04-18",
      estimatedCompletion: "2024-04-25"
    },
    {
      id: "3",
      hospital: "Regional Medical Center",
      status: "completed",
      progress: 100,
      nextStep: "Go Live",
      attendees: 15,
      startDate: "2024-04-01",
      estimatedCompletion: "2024-04-10"
    }
  ];

  const liveDemos = [
    {
      id: "1",
      title: "Complete System Demo",
      hospital: "Metropolitan Hospital",
      scheduledFor: "2024-04-16 14:00",
      duration: "2 hours",
      attendees: ["Dr. Smith", "IT Manager", "Admin Staff"],
      status: "confirmed"
    },
    {
      id: "2",
      title: "EMR Module Demo",
      hospital: "Community Health Center",
      scheduledFor: "2024-04-17 10:00",
      duration: "1.5 hours",
      attendees: ["Medical Director", "Nurses"],
      status: "pending"
    },
    {
      id: "3",
      title: "Billing Integration Demo",
      hospital: "Specialty Clinic",
      scheduledFor: "2024-04-18 15:30",
      duration: "1 hour",
      attendees: ["Finance Manager", "IT Team"],
      status: "confirmed"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "in-progress": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "completed": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };


  const handleScheduleAppointment = () => {
    // Here you would typically make an API call to save the appointment
    console.log("Scheduling appointment:", scheduleForm);
    // Reset form and close modal
    setScheduleForm({
      type: "",
      title: "",
      hospital: "",
      date: "",
      time: "",
      duration: "",
      attendees: "",
      notes: ""
    });
    setScheduleOpen(false);
    // You could show a success toast here
  };

  const handleFormChange = (field: string, value: string) => {
    setScheduleForm(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const appointmentId = searchParams.get("appointmentId");
    const openDetails = searchParams.get("openDetails") === "true";

    if (appointmentId && openDetails) {
      // Here you would fetch the appointment details by ID and open the details view
      console.log("Fetch and open appointment details for ID:", appointmentId);
      // Mock appointment data for demonstration
      const mockAppointment = {
        id: appointmentId,
        title: "Live Product Demo",
        type: "demo",
        hospital: "St. Mary's Hospital",
        scheduledFor: "2024-04-16 14:00",
        duration: "2 hours",
        attendees: ["Dr. Smith", "IT Manager", "Admin Staff"],
        status: "confirmed",
        notes: "Complete system overview and feature walkthrough",
        contactPerson: "Dr. Sarah Johnson",
        contactEmail: "sarah.johnson@stmarys.com",
        contactPhone: "+1 (555) 123-4567"
      };
      setSelectedAppointment(mockAppointment);
      setAppointmentDetailsOpen(true);
    }
  }, [searchParams]);

  const handleViewAppointmentDetails = (appointment: any) => {
    setSelectedAppointment(appointment);
    setAppointmentDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Super Admin Appointments
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage demos, onboarding sessions, and technical consultations
          </p>
        </div>
        <div className="flex gap-3">
          <Dialog open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Appointments Analytics
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Analytics Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BarChart className="w-5 h-5 text-blue-500" />
                        Monthly Appointments
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Demos</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div className="bg-blue-500 h-2 rounded-full" style={{width: '60%'}}></div>
                            </div>
                            <span className="text-sm font-medium">24</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Onboardings</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div className="bg-green-500 h-2 rounded-full" style={{width: '20%'}}></div>
                            </div>
                            <span className="text-sm font-medium">8</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Consultations</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div className="bg-purple-500 h-2 rounded-full" style={{width: '20%'}}></div>
                            </div>
                            <span className="text-sm font-medium">15</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-green-500" />
                        Success Rates
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Completion Rate</span>
                          <div className="flex items-center gap-2">
                            <Progress value={94} className="w-24" />
                            <span className="text-sm font-medium">94%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Client Satisfaction</span>
                          <div className="flex items-center gap-2">
                            <Progress value={96} className="w-24" />
                            <span className="text-sm font-medium">4.8/5</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">On-time Delivery</span>
                          <div className="flex items-center gap-2">
                            <Progress value={89} className="w-24" />
                            <span className="text-sm font-medium">89%</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Performance Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="w-5 h-5 text-orange-500" />
                      Performance Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">+12%</div>
                        <p className="text-sm text-muted-foreground">vs last month</p>
                        <p className="text-xs">Appointment bookings</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">+8%</div>
                        <p className="text-sm text-muted-foreground">vs last month</p>
                        <p className="text-xs">Completion rate</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">+15%</div>
                        <p className="text-sm text-muted-foreground">vs last month</p>
                        <p className="text-xs">Client satisfaction</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Performers */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-500" />
                      Top Performers This Month
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { name: "Sarah Johnson", role: "Senior Demo Specialist", appointments: 18, rating: 4.9 },
                        { name: "Mike Chen", role: "Onboarding Lead", appointments: 15, rating: 4.8 },
                        { name: "Lisa Rodriguez", role: "Technical Consultant", appointments: 12, rating: 4.7 },
                        { name: "David Kim", role: "Demo Specialist", appointments: 10, rating: 4.6 },
                      ].map((performer, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                {performer.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{performer.name}</p>
                              <p className="text-sm text-muted-foreground">{performer.role}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{performer.appointments} appointments</p>
                            <p className="text-sm text-muted-foreground">⭐ {performer.rating}/5.0</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Schedule Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  Schedule New Appointment
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Appointment Type</Label>
                    <Select value={scheduleForm.type} onValueChange={(value) => handleFormChange("type", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="demo">Live Demo</SelectItem>
                        <SelectItem value="onboarding">Onboarding Session</SelectItem>
                        <SelectItem value="consultation">Technical Consultation</SelectItem>
                        <SelectItem value="walkthrough">Feature Walkthrough</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="Enter appointment title"
                      value={scheduleForm.title}
                      onChange={(e) => handleFormChange("title", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hospital">Hospital/Client</Label>
                  <Input
                    id="hospital"
                    placeholder="Enter hospital or client name"
                    value={scheduleForm.hospital}
                    onChange={(e) => handleFormChange("hospital", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={scheduleForm.date}
                      onChange={(e) => handleFormChange("date", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={scheduleForm.time}
                      onChange={(e) => handleFormChange("time", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration</Label>
                    <Select value={scheduleForm.duration} onValueChange={(value) => handleFormChange("duration", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                        <SelectItem value="180">3 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="attendees">Attendees</Label>
                  <Input
                    id="attendees"
                    placeholder="Enter attendee names or roles"
                    value={scheduleForm.attendees}
                    onChange={(e) => handleFormChange("attendees", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes or requirements"
                    value={scheduleForm.notes}
                    onChange={(e) => handleFormChange("notes", e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleScheduleAppointment}
                    className="flex-1"
                    disabled={!scheduleForm.type || !scheduleForm.title || !scheduleForm.hospital || !scheduleForm.date || !scheduleForm.time}
                  >
                    Schedule Appointment
                  </Button>
                  <Button variant="outline" onClick={() => setScheduleOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Today's Appointments"
          value="8"
          subtitle="Scheduled"
          color="blue"
          icon={Calendar}
          trend={{
            value: 12,
            label: "this week",
            isPositive: true,
          }}
        />
        <KPICard
          title="Active Onboardings"
          value="5"
          subtitle="In progress"
          color="yellow"
          icon={UserCheck}
          trend={{
            value: 2,
            label: "completed",
            isPositive: true,
          }}
        />
        <KPICard
          title="Live Demos"
          value="12"
          subtitle="This month"
          color="green"
          icon={Video}
          trend={{
            value: 8,
            label: "booked",
            isPositive: true,
          }}
        />
        <KPICard
          title="Success Rate"
          value="94%"
          subtitle="Completion rate"
          color="purple"
          icon={Award}
          trend={{
            value: 3,
            label: "improvement",
            isPositive: true,
          }}
        />
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-200 dark:border-slate-700 flex gap-2">
        {[
          { id: "overview", label: "Overview", icon: BarChart3 },
          { id: "demos", label: "Live Demos", icon: Video },
          { id: "onboarding", label: "Onboarding", icon: UserCheck },
          { id: "consultations", label: "Consultations", icon: MessageSquare },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === tab.id
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Sections */}
      <div className="space-y-6">
        {activeTab === "overview" && (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    This Month
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Demos Completed</span>
                      <span className="font-semibold">24</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Onboardings</span>
                      <span className="font-semibold">8</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Consultations</span>
                      <span className="font-semibold">15</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-500" />
                    Goals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-muted-foreground">Monthly Target</span>
                        <span className="text-sm font-semibold">30/35</span>
                      </div>
                      <Progress value={86} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-muted-foreground">Satisfaction</span>
                        <span className="text-sm font-semibold">4.8/5.0</span>
                      </div>
                      <Progress value={96} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    Top Performers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Sarah Johnson</span>
                      <Badge variant="secondary">18 demos</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Mike Chen</span>
                      <Badge variant="secondary">15 onboardings</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Lisa Rodriguez</span>
                      <Badge variant="secondary">12 consultations</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Today's Schedule */}
            <DataCard
              title="Today's Appointments"
              items={demoAppointments}
              onItemClick={handleViewAppointmentDetails}
            />
          </>
        )}

        {activeTab === "demos" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Live Demos</h2>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Schedule Demo
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveDemos.map((demo) => (
                <Card key={demo.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{demo.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{demo.hospital}</p>
                      </div>
                      <Badge className={getStatusColor(demo.status)}>
                        {demo.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{demo.scheduledFor} ({demo.duration})</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>{demo.attendees.length} attendees</span>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" className="flex-1">
                          <Play className="w-4 h-4 mr-2" />
                          Start Demo
                        </Button>
                        <Button size="sm" variant="outline">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === "onboarding" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Onboarding Sessions</h2>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Start Onboarding
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {onboardingSessions.map((session) => (
                <Card key={session.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{session.hospital}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {session.attendees} team members
                        </p>
                      </div>
                      <Badge className={getStatusColor(session.status)}>
                        {session.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Progress</span>
                          <span className="text-sm text-muted-foreground">{session.progress}%</span>
                        </div>
                        <Progress value={session.progress} className="h-2" />
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Next Step</p>
                          <p className="font-medium">{session.nextStep}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Est. Completion</p>
                          <p className="font-medium">{session.estimatedCompletion}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Button size="sm" className="flex-1">
                          <UserCheck className="w-4 h-4 mr-2" />
                          Continue Session
                        </Button>
                        <Button size="sm" variant="outline">
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === "consultations" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Technical Consultations</h2>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Schedule Consultation
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Consultations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { time: "10:00 AM", client: "Regional Hospital", type: "Integration Support" },
                      { time: "2:30 PM", client: "City Clinic", type: "Custom Workflow" },
                      { time: "4:00 PM", client: "Medical Center", type: "Data Migration" },
                    ].map((consultation, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        <div>
                          <p className="font-medium">{consultation.client}</p>
                          <p className="text-sm text-muted-foreground">{consultation.type}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{consultation.time}</p>
                          <Badge variant="outline" className="text-xs">Scheduled</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Consultation Topics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { topic: "System Integration", count: 8, color: "bg-blue-500" },
                      { topic: "Custom Workflows", count: 12, color: "bg-green-500" },
                      { topic: "Data Migration", count: 5, color: "bg-purple-500" },
                      { topic: "Training", count: 15, color: "bg-orange-500" },
                    ].map((topic, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${topic.color}`} />
                          <span className="text-sm">{topic.topic}</span>
                        </div>
                        <Badge variant="secondary">{topic.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Appointment Details Modal */}
      <Dialog open={appointmentDetailsOpen} onOpenChange={setAppointmentDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Appointment Details
            </DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{selectedAppointment.title}</h3>
                  <p className="text-muted-foreground">{selectedAppointment.hospital}</p>
                </div>
                <Badge className={getStatusColor(selectedAppointment.status)}>
                  {selectedAppointment.status}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{selectedAppointment.scheduledFor}</p>
                      <p className="text-sm text-muted-foreground">Duration: {selectedAppointment.duration}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{selectedAppointment.attendees?.length || 0} Attendees</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedAppointment.attendees?.join(", ")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Contact Person</p>
                    <p className="font-medium">{selectedAppointment.contactPerson}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Contact Email</p>
                    <p className="font-medium">{selectedAppointment.contactEmail}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Contact Phone</p>
                    <p className="font-medium">{selectedAppointment.contactPhone}</p>
                  </div>
                </div>
              </div>

              {selectedAppointment.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm bg-gray-50 dark:bg-slate-700 p-3 rounded-lg">
                    {selectedAppointment.notes}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button className="flex-1">
                  <Play className="w-4 h-4 mr-2" />
                  Start Appointment
                </Button>
                <Button variant="outline">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
                <Button variant="outline" onClick={() => setAppointmentDetailsOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
