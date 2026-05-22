"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Users, Plus, Search, Filter, Edit, Eye, UserPlus,
  Calendar, Heart, ShieldCheck, FileText, MoreHorizontal,
  Trash2, Phone, Mail, MapPin, Loader2, Baby
} from "lucide-react";
import Link from "next/link";

const orange = "#F97316";

interface ChildProfile {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  bloodType?: string;
  allergies: string[];
  conditions: string[];
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  insurance?: {
    provider: string;
    policyNumber: string;
  };
  avatar?: string;
  lastVisit?: string;
  nextAppointment?: string;
  healthStatus: "excellent" | "good" | "fair" | "poor";
  vaccinationStatus: "up-to-date" | "due-soon" | "overdue";
}

interface ChildStats {
  totalChildren: number;
  activeChildren: number;
  childrenWithAppointments: number;
  childrenNeedingVaccinations: number;
}

export default function ChildProfilesPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [stats, setStats] = useState<ChildStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      const [childrenRes, statsRes] = await Promise.all([
        fetch(`/api/guardian/children?slug=${slug}`),
        fetch(`/api/guardian/children/stats?slug=${slug}`)
      ]);

      if (childrenRes.ok) setChildren(await childrenRes.json());
      if (statsRes.ok) setStats(await statsRes.json());

      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch children:", error);
      setLoading(false);
    }
  };

  const filteredChildren = children.filter(child => {
    const matchesSearch = `${child.firstName} ${child.lastName}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesFilter = filterStatus === "all" ||
      child.healthStatus === filterStatus ||
      child.vaccinationStatus === filterStatus;

    return matchesSearch && matchesFilter;
  });

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
          Loading children profiles...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Child Profiles
          </p>
          <h1 className="text-3xl font-bold text-foreground mt-1">
            Manage Children
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage your children's health profiles
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Child
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Children</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalChildren || 0}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 text-green-600">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Profiles</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.activeChildren || 0}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">With Appointments</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.childrenWithAppointments || 0}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50 text-red-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Need Vaccinations</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.childrenNeedingVaccinations || 0}</p>
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
            placeholder="Search children..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="excellent">Excellent Health</option>
            <option value="good">Good Health</option>
            <option value="fair">Fair Health</option>
            <option value="poor">Poor Health</option>
            <option value="up-to-date">Vaccinations Up-to-date</option>
            <option value="due-soon">Vaccinations Due Soon</option>
            <option value="overdue">Vaccinations Overdue</option>
          </select>
        </div>
      </div>

      {/* Children Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredChildren.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Baby className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No children found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filterStatus !== "all"
                ? "Try adjusting your search or filters"
                : "Add your first child to get started"}
            </p>
            {!searchTerm && filterStatus === "all" && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Child
              </button>
            )}
          </div>
        ) : (
          filteredChildren.map((child) => (
            <div key={child.id} className="p-6 rounded-2xl border border-gray-200 bg-white hover:shadow-lg transition-all">
              {/* Child Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                    <span className="text-orange-600 font-semibold">
                      {child.firstName.charAt(0)}{child.lastName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {child.firstName} {child.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Age {calculateAge(child.dob)} • {child.gender}
                    </p>
                  </div>
                </div>

                <div className="flex gap-1">
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Health Status */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Health Status</span>
                  <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                    child.healthStatus === "excellent" ? "bg-green-50 text-green-600" :
                    child.healthStatus === "good" ? "bg-blue-50 text-blue-600" :
                    child.healthStatus === "fair" ? "bg-yellow-50 text-yellow-600" :
                    "bg-red-50 text-red-600"
                  }`}>
                    {child.healthStatus.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Vaccinations</span>
                  <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                    child.vaccinationStatus === "up-to-date" ? "bg-green-50 text-green-600" :
                    child.vaccinationStatus === "due-soon" ? "bg-yellow-50 text-yellow-600" :
                    "bg-red-50 text-red-600"
                  }`}>
                    {child.vaccinationStatus.replace("-", " ").toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Medical Info */}
              <div className="space-y-2 mb-4">
                {child.bloodType && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Heart className="h-4 w-4" />
                    <span>Blood Type: {child.bloodType}</span>
                  </div>
                )}

                {child.allergies.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Allergies: {child.allergies.join(", ")}</span>
                  </div>
                )}

                {child.conditions.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="h-4 w-4" />
                    <span>Conditions: {child.conditions.join(", ")}</span>
                  </div>
                )}
              </div>

              {/* Emergency Contact */}
              <div className="p-3 bg-gray-50 rounded-lg mb-4">
                <p className="text-xs font-semibold text-gray-700 mb-1">Emergency Contact</p>
                <p className="text-sm text-gray-900">{child.emergencyContact.name}</p>
                <p className="text-xs text-gray-600">{child.emergencyContact.relationship}</p>
                <p className="text-xs text-gray-600">{child.emergencyContact.phone}</p>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Link
                  href={`/tenant/${slug}/guardian/children/${child.id}`}
                  className="flex-1 text-center px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  View Profile
                </Link>
                <Link
                  href={`/tenant/${slug}/guardian/book?child=${child.id}`}
                  className="flex-1 text-center px-3 py-2 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                >
                  Book Appt
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
