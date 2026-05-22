"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ShieldCheck, Calendar, AlertTriangle, CheckCircle,
  Clock, Search, Filter, Download, Baby, User,
  Syringe, FileText, Bell, Loader2
} from "lucide-react";

const orange = "#F97316";

interface Vaccination {
  id: string;
  childId: string;
  childName: string;
  vaccineName: string;
  vaccineType: string;
  scheduledDate: string;
  administeredDate?: string;
  status: "scheduled" | "completed" | "overdue" | "upcoming";
  administeredBy?: string;
  batchNumber?: string;
  location?: string;
  nextDueDate?: string;
  notes?: string;
  sideEffects?: string[];
}

interface VaccinationSchedule {
  vaccineName: string;
  recommendedAges: string[];
  description: string;
  required: boolean;
}

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
}

export default function VaccinationsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [schedule, setSchedule] = useState<VaccinationSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterChild, setFilterChild] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [vaccinationsRes, childrenRes, scheduleRes] = await Promise.all([
        fetch(`/api/guardian/vaccinations?slug=${slug}`),
        fetch(`/api/guardian/children?slug=${slug}`),
        fetch(`/api/guardian/vaccinations/schedule?slug=${slug}`)
      ]);

      if (vaccinationsRes.ok) setVaccinations(await vaccinationsRes.json());
      if (childrenRes.ok) setChildren(await childrenRes.json());
      if (scheduleRes.ok) setSchedule(await scheduleRes.json());

      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch vaccination data:", error);
      setLoading(false);
    }
  };

  const filteredVaccinations = vaccinations.filter(vaccination => {
    const matchesSearch = vaccination.vaccineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vaccination.childName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesChild = filterChild === "all" || vaccination.childId === filterChild;
    const matchesStatus = filterStatus === "all" || vaccination.status === filterStatus;

    return matchesSearch && matchesChild && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "scheduled": return <Calendar className="h-5 w-5 text-blue-600" />;
      case "upcoming": return <Clock className="h-5 w-5 text-orange-600" />;
      case "overdue": return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return <ShieldCheck className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-50 border-green-200 text-green-900";
      case "scheduled": return "bg-blue-50 border-blue-200 text-blue-900";
      case "upcoming": return "bg-orange-50 border-orange-200 text-orange-900";
      case "overdue": return "bg-red-50 border-red-200 text-red-900";
      default: return "bg-gray-50 border-gray-200 text-gray-900";
    }
  };

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  const getVaccinationStats = () => {
    const stats = {
      total: vaccinations.length,
      completed: vaccinations.filter(v => v.status === "completed").length,
      upcoming: vaccinations.filter(v => v.status === "upcoming").length,
      overdue: vaccinations.filter(v => v.status === "overdue").length,
    };
    return stats;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
          Loading vaccinations...
        </div>
      </div>
    );
  }

  const stats = getVaccinationStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Vaccinations
          </p>
          <h1 className="text-3xl font-bold text-foreground mt-1">
            Immunization Records
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and manage your children's vaccination schedules
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export Records
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Vaccinations</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 text-green-600">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Upcoming</p>
              <p className="text-2xl font-bold text-gray-900">{stats.upcoming}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-gray-900">{stats.overdue}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search vaccinations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={filterChild}
            onChange={(e) => setFilterChild(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="all">All Children</option>
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.firstName} {child.lastName}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="scheduled">Scheduled</option>
            <option value="upcoming">Upcoming</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Vaccination Schedule Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recommended Vaccination Schedule</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-4 font-semibold text-gray-900">Vaccine</th>
                <th className="text-left py-2 px-4 font-semibold text-gray-900">Recommended Ages</th>
                <th className="text-left py-2 px-4 font-semibold text-gray-900">Description</th>
                <th className="text-center py-2 px-4 font-semibold text-gray-900">Required</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((item, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium text-gray-900">{item.vaccineName}</td>
                  <td className="py-3 px-4 text-gray-600">{item.recommendedAges.join(", ")}</td>
                  <td className="py-3 px-4 text-gray-600">{item.description}</td>
                  <td className="py-3 px-4 text-center">
                    {item.required ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                    ) : (
                      <span className="text-gray-400">Optional</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vaccination Records */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Vaccination Records</h2>

        {filteredVaccinations.length === 0 ? (
          <div className="text-center py-12">
            <Syringe className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No vaccinations found</h3>
            <p className="text-gray-600">
              {searchTerm || filterChild !== "all" || filterStatus !== "all"
                ? "Try adjusting your search or filters"
                : "Vaccination records will appear here once scheduled"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredVaccinations.map((vaccination) => (
              <div key={vaccination.id} className={`p-6 rounded-lg border ${getStatusColor(vaccination.status)}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(vaccination.status)}
                    <div>
                      <h3 className="font-semibold text-lg">{vaccination.vaccineName}</h3>
                      <p className="text-sm opacity-90">{vaccination.vaccineType}</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-md text-xs font-semibold uppercase bg-white bg-opacity-50">
                    {vaccination.status}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Baby className="h-4 w-4" />
                    <span>{vaccination.childName} (Age {children.find(c => c.id === vaccination.childId) ? calculateAge(children.find(c => c.id === vaccination.childId)!.dob) : '?'})</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>Scheduled: {new Date(vaccination.scheduledDate).toLocaleDateString()}</span>
                  </div>

                  {vaccination.administeredDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      <span>Administered: {new Date(vaccination.administeredDate).toLocaleDateString()}</span>
                    </div>
                  )}

                  {vaccination.administeredBy && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4" />
                      <span>By: {vaccination.administeredBy}</span>
                    </div>
                  )}

                  {vaccination.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4" />
                      <span>{vaccination.location}</span>
                    </div>
                  )}

                  {vaccination.nextDueDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Bell className="h-4 w-4" />
                      <span>Next due: {new Date(vaccination.nextDueDate).toLocaleDateString()}</span>
                    </div>
                  )}

                  {vaccination.batchNumber && (
                    <div className="text-xs opacity-75 mt-2">
                      Batch: {vaccination.batchNumber}
                    </div>
                  )}

                  {vaccination.notes && (
                    <div className="text-sm opacity-90 mt-2 p-2 bg-white bg-opacity-50 rounded">
                      {vaccination.notes}
                    </div>
                  )}

                  {vaccination.sideEffects && vaccination.sideEffects.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-semibold">Side Effects:</p>
                      <ul className="text-sm opacity-90 ml-4">
                        {vaccination.sideEffects.map((effect, index) => (
                          <li key={index}>• {effect}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
