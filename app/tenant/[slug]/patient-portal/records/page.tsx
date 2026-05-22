"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  FileText, Download, Eye, Calendar, User, Stethoscope,
  Microscope, Pill, HeartPulse, Search, Filter, SortDesc,
  AlertTriangle, CheckCircle2, Clock, RefreshCw, Share
} from "lucide-react";

interface HealthRecord {
  id: string;
  type: "visit" | "lab" | "prescription" | "imaging" | "procedure" | "vaccination";
  title: string;
  description: string;
  provider: string;
  date: string;
  status: "final" | "preliminary" | "amended";
  category: string;
  attachments?: {
    name: string;
    type: string;
    size: string;
    url: string;
  }[];
  notes?: string;
  followUp?: string;
}

interface RecordCategory {
  id: string;
  name: string;
  count: number;
  icon: React.ElementType;
  color: string;
}

export default function HealthRecordsPage() {
  const { slug } = useParams();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<HealthRecord[]>([]);
  const [categories, setCategories] = useState<RecordCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "type" | "provider">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Fetch health records
  const fetchRecords = async () => {
    try {
      setRefreshing(true);
      const [recordsRes, categoriesRes] = await Promise.all([
        fetch(`/api/tenant/${slug}/patient/records`),
        fetch(`/api/tenant/${slug}/patient/records/categories`),
      ]);

      if (recordsRes.ok) {
        const recordsData = await recordsRes.json();
        setRecords(recordsData);
        setFilteredRecords(recordsData);
      }

      if (categoriesRes.ok) setCategories(await categoriesRes.json());

      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch health records:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // Filter and sort records
  useEffect(() => {
    let filtered = records;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.provider.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(record => record.category === selectedCategory);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "date":
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case "type":
          aValue = a.type;
          bValue = b.type;
          break;
        case "provider":
          aValue = a.provider;
          bValue = b.provider;
          break;
        default:
          return 0;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredRecords(filtered);
  }, [records, searchTerm, selectedCategory, sortBy, sortOrder]);

  const getRecordTypeIcon = (type: string) => {
    switch (type) {
      case "visit": return Stethoscope;
      case "lab": return Microscope;
      case "prescription": return Pill;
      case "imaging": return HeartPulse;
      case "procedure": return AlertTriangle;
      case "vaccination": return CheckCircle2;
      default: return FileText;
    }
  };

  const getRecordTypeColor = (type: string) => {
    switch (type) {
      case "visit": return "bg-blue-50 text-blue-600";
      case "lab": return "bg-purple-50 text-purple-600";
      case "prescription": return "bg-green-50 text-green-600";
      case "imaging": return "bg-orange-50 text-orange-600";
      case "procedure": return "bg-red-50 text-red-600";
      case "vaccination": return "bg-cyan-50 text-cyan-600";
      default: return "bg-gray-50 text-gray-600";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "final": return "text-green-600 bg-green-50";
      case "preliminary": return "text-yellow-600 bg-yellow-50";
      case "amended": return "text-blue-600 bg-blue-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
          Loading your health records...
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
            Health Records
          </p>
          <h1 className="text-3xl font-bold text-foreground mt-1">
            Medical Records
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Access and manage your complete medical history
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all">
            <Share className="h-4 w-4" />
            Share Records
          </button>
          <button
            onClick={fetchRecords}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Record Categories */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(selectedCategory === category.id ? "all" : category.id)}
              className={`p-4 rounded-2xl border transition-all ${
                selectedCategory === category.id
                  ? "border-orange-300 bg-orange-50"
                  : "border-gray-200 bg-white hover:border-orange-300"
              }`}
            >
              <div className={`p-2 rounded-lg ${category.color} w-fit mb-3`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-gray-900">{category.name}</p>
              <p className="text-xs text-gray-500">{category.count} records</p>
            </button>
          );
        })}
      </div>

      {/* Filters and Search */}
      <div className="p-6 rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
            />
          </div>

          {/* Sort */}
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-sm"
            >
              <option value="date">Sort by Date</option>
              <option value="type">Sort by Type</option>
              <option value="provider">Sort by Provider</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-all"
            >
              <SortDesc className={`h-4 w-4 transition-transform ${sortOrder === "asc" ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Records List */}
      <div className="space-y-4">
        {filteredRecords.length > 0 ? (
          filteredRecords.map((record) => {
            const TypeIcon = getRecordTypeIcon(record.type);
            return (
              <div key={record.id} className="p-6 rounded-2xl border border-gray-200 bg-white hover:shadow-sm transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${getRecordTypeColor(record.type)}`}>
                      <TypeIcon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{record.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded font-semibold ${getStatusColor(record.status)}`}>
                          {record.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3">{record.description}</p>

                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>{record.provider}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(record.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{new Date(record.date).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-all">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-all">
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Attachments */}
                {record.attachments && record.attachments.length > 0 && (
                  <div className="pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Attachments</h4>
                    <div className="space-y-2">
                      {record.attachments.map((attachment, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                              <p className="text-xs text-gray-500">{attachment.size} • {attachment.type}</p>
                            </div>
                          </div>
                          <button className="text-orange-600 hover:text-orange-700 font-medium text-sm">
                            Download
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {record.notes && (
                  <div className="pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Notes</h4>
                    <p className="text-sm text-gray-600">{record.notes}</p>
                  </div>
                )}

                {/* Follow-up */}
                {record.followUp && (
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Follow-up Required</p>
                        <p className="text-sm text-blue-700">{record.followUp}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No records found</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchTerm || selectedCategory !== "all"
                ? "Try adjusting your search or filters"
                : "Your medical records will appear here"
              }
            </p>
          </div>
        )}
      </div>

      {/* Record Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Records</p>
              <p className="text-2xl font-bold text-gray-900">{records.length}</p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Final Records</p>
              <p className="text-2xl font-bold text-gray-900">
                {records.filter(r => r.status === "final").length}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">
                {records.filter(r => {
                  const recordDate = new Date(r.date);
                  const now = new Date();
                  return recordDate.getMonth() === now.getMonth() &&
                         recordDate.getFullYear() === now.getFullYear();
                }).length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
