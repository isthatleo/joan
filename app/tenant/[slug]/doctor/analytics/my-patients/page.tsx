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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import {
  History,
  Search,
  Filter,
  User,
  Calendar,
  FileText,
  TrendingUp,
  TrendingDown,
  Activity,
  Heart,
  Pill,
  FlaskConical,
  Microscope,
  Stethoscope,
  BarChart3,
  LineChart,
  PieChart,
  Download,
  Eye,
  MessageSquare,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";

interface PatientHistory {
  id: string;
  patientId: string;
  patientName: string;
  type: "visit" | "lab" | "prescription" | "vital" | "note" | "appointment";
  title: string;
  description: string;
  date: string;
  provider: string;
  category?: string;
  status?: string;
  details?: any;
}

interface PatientAnalytics {
  totalVisits: number;
  averageVisitDuration: number;
  prescriptionCount: number;
  labOrderCount: number;
  lastVisitDate?: string;
  nextAppointmentDate?: string;
  healthScore: number;
  riskFactors: string[];
  trends: {
    visitsOverTime: { date: string; count: number }[];
    prescriptionsOverTime: { date: string; count: number }[];
    labOrdersOverTime: { date: string; count: number }[];
  };
}

export default function DoctorPatientHistoryPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);

  // Fetch patients for selection
  const { data: patients } = useQuery({
    queryKey: ["patients", slug],
    queryFn: async () => {
      const response = await fetch(`/api/patients?slug=${slug}&limit=100`);
      if (!response.ok) throw new Error("Failed to fetch patients");
      return response.json();
    },
  });

  // Fetch patient history when a patient is selected
  const { data: patientHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["patient-history", slug, selectedPatient, typeFilter, dateFilter],
    queryFn: async () => {
      if (!selectedPatient) return null;
      const params = new URLSearchParams({
        patientId: selectedPatient,
        type: typeFilter,
        date: dateFilter,
      });
      const response = await fetch(`/api/doctor/patient-history?${params}&slug=${slug}`);
      if (!response.ok) throw new Error("Failed to fetch patient history");
      return response.json();
    },
    enabled: !!selectedPatient,
  });

  // Fetch patient analytics
  const { data: patientAnalytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["patient-analytics", slug, selectedPatient],
    queryFn: async () => {
      if (!selectedPatient) return null;
      const response = await fetch(`/api/doctor/patient-analytics/${selectedPatient}?slug=${slug}`);
      if (!response.ok) throw new Error("Failed to fetch patient analytics");
      return response.json();
    },
    enabled: !!selectedPatient,
  });

  const filteredHistory = patientHistory?.filter((item: PatientHistory) => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.provider.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  const getTypeIcon = (type: PatientHistory["type"]) => {
    switch (type) {
      case "visit": return <Stethoscope className="h-4 w-4" />;
      case "lab": return <FlaskConical className="h-4 w-4" />;
      case "prescription": return <Pill className="h-4 w-4" />;
      case "vital": return <Heart className="h-4 w-4" />;
      case "appointment": return <Calendar className="h-4 w-4" />;
      case "note": return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: PatientHistory["type"]) => {
    switch (type) {
      case "visit": return "bg-blue-50 text-blue-700 border-blue-200";
      case "lab": return "bg-purple-50 text-purple-700 border-purple-200";
      case "prescription": return "bg-green-50 text-green-700 border-green-200";
      case "vital": return "bg-red-50 text-red-700 border-red-200";
      case "appointment": return "bg-orange-50 text-orange-700 border-orange-200";
      case "note": return "bg-gray-50 text-gray-700 border-gray-200";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const selectedPatientData = patients?.find((p: any) => p.id === selectedPatient);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient History & Analytics"
        subtitle="Comprehensive patient records and health analytics"
      />

      {/* Patient Selection */}
      <SectionCard title="Select Patient">
        <div className="flex gap-4">
          <div className="flex-1">
            <Select value={selectedPatient || ""} onValueChange={setSelectedPatient}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a patient to view their history" />
              </SelectTrigger>
              <SelectContent>
                {patients?.map((patient: any) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.firstName} {patient.lastName} - {patient.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedPatientData && (
            <Button variant="outline" onClick={() => setShowPatientModal(true)}>
              <Eye className="h-4 w-4 mr-2" />
              View Profile
            </Button>
          )}
        </div>
      </SectionCard>

      {selectedPatient && (
        <>
          {/* Patient Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg border border-gray-200 bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Visits</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {patientAnalytics?.totalVisits || 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-lg border border-gray-200 bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-50">
                  <Pill className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Prescriptions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {patientAnalytics?.prescriptionCount || 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-lg border border-gray-200 bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-50">
                  <FlaskConical className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Lab Orders</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {patientAnalytics?.labOrderCount || 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-lg border border-gray-200 bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-50">
                  <Activity className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Health Score</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {patientAnalytics?.healthScore || 0}/100
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Analytics Tabs */}
          <Tabs defaultValue="history" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="history">Medical History</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
            </TabsList>

            <TabsContent value="history" className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search history..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="visit">Visits</SelectItem>
                    <SelectItem value="lab">Lab Results</SelectItem>
                    <SelectItem value="prescription">Prescriptions</SelectItem>
                    <SelectItem value="vital">Vitals</SelectItem>
                    <SelectItem value="appointment">Appointments</SelectItem>
                    <SelectItem value="note">Notes</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="week">Last Week</SelectItem>
                    <SelectItem value="month">Last Month</SelectItem>
                    <SelectItem value="quarter">Last Quarter</SelectItem>
                    <SelectItem value="year">Last Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* History Timeline */}
              <SectionCard>
                {historyLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No history found</h3>
                    <p className="text-gray-500">Try adjusting your filters or check back later.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredHistory.map((item: PatientHistory, index: number) => (
                      <div key={item.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`p-2 rounded-full border-2 ${getTypeColor(item.type)}`}>
                            {getTypeIcon(item.type)}
                          </div>
                          {index < filteredHistory.length - 1 && (
                            <div className="w-px h-8 bg-gray-200 mt-2" />
                          )}
                        </div>
                        <div className="flex-1 pb-8">
                          <div className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900">{item.title}</h4>
                                <p className="text-xs text-gray-500">{item.provider}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500">
                                  {format(new Date(item.date), "MMM dd, yyyy")}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {format(new Date(item.date), "h:mm a")}
                                </p>
                              </div>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{item.description}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={getTypeColor(item.type)}>
                                {item.type}
                              </Badge>
                              {item.category && (
                                <Badge variant="outline" className="text-xs">
                                  {item.category}
                                </Badge>
                              )}
                              {item.status && (
                                <Badge variant="secondary" className="text-xs">
                                  {item.status}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              {analyticsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-64 w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Visit Frequency */}
                  <SectionCard title="Visit Frequency">
                    <div className="h-64 flex items-center justify-center">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-500">Chart visualization would go here</p>
                        <p className="text-sm text-gray-400 mt-2">
                          Average: {patientAnalytics?.averageVisitDuration || 0} minutes per visit
                        </p>
                      </div>
                    </div>
                  </SectionCard>

                  {/* Health Metrics */}
                  <SectionCard title="Health Metrics Overview">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Overall Health Score</span>
                        <span className="text-lg font-semibold text-gray-900">
                          {patientAnalytics?.healthScore || 0}/100
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${patientAnalytics?.healthScore || 0}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Last Visit</span>
                          <p className="font-medium">
                            {patientAnalytics?.lastVisitDate
                              ? format(new Date(patientAnalytics.lastVisitDate), "MMM dd, yyyy")
                              : "No visits yet"}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Next Appointment</span>
                          <p className="font-medium">
                            {patientAnalytics?.nextAppointmentDate
                              ? format(new Date(patientAnalytics.nextAppointmentDate), "MMM dd, yyyy")
                              : "Not scheduled"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </SectionCard>

                  {/* Risk Factors */}
                  <SectionCard title="Risk Factors & Alerts">
                    <div className="space-y-3">
                      {patientAnalytics?.riskFactors?.length > 0 ? (
                        patientAnalytics.riskFactors.map((risk: string, index: number) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                            <span className="text-sm text-yellow-900">{risk}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                          <p className="text-green-700">No significant risk factors identified</p>
                        </div>
                      )}
                    </div>
                  </SectionCard>

                  {/* Quick Stats */}
                  <SectionCard title="Quick Statistics">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <Calendar className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                        <p className="text-2xl font-bold text-blue-900">{patientAnalytics?.totalVisits || 0}</p>
                        <p className="text-xs text-blue-700">Total Visits</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <Pill className="h-8 w-8 mx-auto mb-2 text-green-600" />
                        <p className="text-2xl font-bold text-green-900">{patientAnalytics?.prescriptionCount || 0}</p>
                        <p className="text-xs text-green-700">Prescriptions</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <FlaskConical className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                        <p className="text-2xl font-bold text-purple-900">{patientAnalytics?.labOrderCount || 0}</p>
                        <p className="text-xs text-purple-700">Lab Orders</p>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <Activity className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                        <p className="text-2xl font-bold text-orange-900">
                          {patientAnalytics?.averageVisitDuration || 0}
                        </p>
                        <p className="text-xs text-orange-700">Avg Visit (min)</p>
                      </div>
                    </div>
                  </SectionCard>
                </div>
              )}
            </TabsContent>

            <TabsContent value="trends" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Visits Over Time */}
                <SectionCard title="Visit Trends" className="lg:col-span-2">
                  <div className="h-64 flex items-center justify-center">
                    <div className="text-center">
                      <LineChart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-500">Visit trends chart would go here</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Showing visit patterns over time
                      </p>
                    </div>
                  </div>
                </SectionCard>

                {/* Recent Activity Summary */}
                <SectionCard title="Recent Activity">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-50">
                        <Stethoscope className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Last Visit</p>
                        <p className="text-xs text-gray-500">
                          {patientAnalytics?.lastVisitDate
                            ? format(new Date(patientAnalytics.lastVisitDate), "MMM dd, yyyy")
                            : "No recent visits"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-50">
                        <Pill className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Active Prescriptions</p>
                        <p className="text-xs text-gray-500">{patientAnalytics?.prescriptionCount || 0} current</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-50">
                        <FlaskConical className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Pending Lab Results</p>
                        <p className="text-xs text-gray-500">{patientAnalytics?.labOrderCount || 0} results</p>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Patient Profile Modal */}
      <Dialog open={showPatientModal} onOpenChange={setShowPatientModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Patient Profile</DialogTitle>
          </DialogHeader>
          {selectedPatientData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <p className="text-sm text-gray-900">
                    {selectedPatientData.firstName} {selectedPatientData.lastName}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                  <p className="text-sm text-gray-900">
                    {format(new Date(selectedPatientData.dateOfBirth), "MMM dd, yyyy")}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-sm text-gray-900">{selectedPatientData.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-sm text-gray-900">{selectedPatientData.phone}</p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPatientModal(false)}>
                  Close
                </Button>
                <Button>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
