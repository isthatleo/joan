"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  FileText, Search, Filter, Download, Eye, Calendar,
  User, Stethoscope, Pill, FlaskConical, Heart,
  ChevronDown, ChevronRight, Loader2, Baby
} from "lucide-react";

const orange = "#F97316";

interface HealthRecord {
  id: string;
  childId: string;
  childName: string;
  type: "visit" | "lab" | "prescription" | "vaccination" | "vital";
  title: string;
  description: string;
  date: string;
  doctor?: string;
  facility?: string;
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
  }>;
  details: {
    diagnosis?: string[];
    medications?: Array<{
      name: string;
      dosage: string;
      duration: string;
    }>;
    vitals?: {
      temperature?: string;
      bloodPressure?: string;
      heartRate?: string;
      weight?: string;
      height?: string;
    };
    labResults?: Array<{
      test: string;
      value: string;
      normalRange: string;
      status: "normal" | "high" | "low";
    }>;
  };
}

interface Child {
  id: string;
  firstName: string;
  lastName: string;
}

export default function HealthRecordsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterChild, setFilterChild] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [recordsRes, childrenRes] = await Promise.all([
        fetch(`/api/guardian/records?slug=${slug}`),
        fetch(`/api/guardian/children?slug=${slug}`)
      ]);

      if (recordsRes.ok) setRecords(await recordsRes.json());
      if (childrenRes.ok) setChildren(await childrenRes.json());

      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch records:", error);
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.childName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesChild = filterChild === "all" || record.childId === filterChild;
    const matchesType = filterType === "all" || record.type === filterType;

    return matchesSearch && matchesChild && matchesType;
  });

  const toggleExpanded = (recordId: string) => {
    const newExpanded = new Set(expandedRecords);
    if (newExpanded.has(recordId)) {
      newExpanded.delete(recordId);
    } else {
      newExpanded.add(recordId);
    }
    setExpandedRecords(newExpanded);
  };

  const getRecordIcon = (type: string) => {
    switch (type) {
      case "visit": return <Stethoscope className="h-5 w-5" />;
      case "lab": return <FlaskConical className="h-5 w-5" />;
      case "prescription": return <Pill className="h-5 w-5" />;
      case "vaccination": return <Heart className="h-5 w-5" />;
      case "vital": return <Heart className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const getRecordColor = (type: string) => {
    switch (type) {
      case "visit": return "text-blue-600 bg-blue-50";
      case "lab": return "text-cyan-600 bg-cyan-50";
      case "prescription": return "text-green-600 bg-green-50";
      case "vaccination": return "text-purple-600 bg-purple-50";
      case "vital": return "text-red-600 bg-red-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const downloadAttachment = async (attachment: { id: string; name: string; url: string }) => {
    try {
      const response = await fetch(attachment.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to download attachment:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
          Loading health records...
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
            Medical History
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage your children's complete health records
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

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search records..."
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
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="visit">Doctor Visits</option>
            <option value="lab">Lab Results</option>
            <option value="prescription">Prescriptions</option>
            <option value="vaccination">Vaccinations</option>
            <option value="vital">Vital Signs</option>
          </select>
        </div>
      </div>

      {/* Records List */}
      <div className="space-y-4">
        {filteredRecords.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No records found</h3>
            <p className="text-gray-600">
              {searchTerm || filterChild !== "all" || filterType !== "all"
                ? "Try adjusting your search or filters"
                : "Health records will appear here once medical visits are completed"}
            </p>
          </div>
        ) : (
          filteredRecords.map((record) => (
            <div key={record.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Record Header */}
              <div
                className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleExpanded(record.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${getRecordColor(record.type)}`}>
                      {getRecordIcon(record.type)}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{record.title}</h3>
                        <span className={`px-2 py-1 rounded-md text-xs font-semibold capitalize ${
                          record.type === "visit" ? "bg-blue-50 text-blue-600" :
                          record.type === "lab" ? "bg-cyan-50 text-cyan-600" :
                          record.type === "prescription" ? "bg-green-50 text-green-600" :
                          record.type === "vaccination" ? "bg-purple-50 text-purple-600" :
                          "bg-red-50 text-red-600"
                        }`}>
                          {record.type}
                        </span>
                      </div>

                      <p className="text-gray-600 mb-3">{record.description}</p>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Baby className="h-4 w-4" />
                          <span>{record.childName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(record.date).toLocaleDateString()}</span>
                        </div>
                        {record.doctor && (
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{record.doctor}</span>
                          </div>
                        )}
                        {record.facility && (
                          <span className="text-gray-400">• {record.facility}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {record.attachments && record.attachments.length > 0 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                        {record.attachments.length} file{record.attachments.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {expandedRecords.has(record.id) ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedRecords.has(record.id) && (
                <div className="border-t border-gray-200 p-6 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Medical Details */}
                    <div className="space-y-4">
                      {record.details.diagnosis && record.details.diagnosis.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Diagnosis</h4>
                          <ul className="space-y-1">
                            {record.details.diagnosis.map((diagnosis, index) => (
                              <li key={index} className="text-sm text-gray-600">• {diagnosis}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {record.details.medications && record.details.medications.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Medications</h4>
                          <div className="space-y-2">
                            {record.details.medications.map((med, index) => (
                              <div key={index} className="bg-white p-3 rounded-lg border">
                                <p className="font-medium text-gray-900">{med.name}</p>
                                <p className="text-sm text-gray-600">{med.dosage} • {med.duration}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {record.details.vitals && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Vital Signs</h4>
                          <div className="bg-white p-4 rounded-lg border space-y-2">
                            {record.details.vitals.temperature && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Temperature:</span>
                                <span className="font-medium">{record.details.vitals.temperature}</span>
                              </div>
                            )}
                            {record.details.vitals.bloodPressure && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Blood Pressure:</span>
                                <span className="font-medium">{record.details.vitals.bloodPressure}</span>
                              </div>
                            )}
                            {record.details.vitals.heartRate && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Heart Rate:</span>
                                <span className="font-medium">{record.details.vitals.heartRate} bpm</span>
                              </div>
                            )}
                            {record.details.vitals.weight && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Weight:</span>
                                <span className="font-medium">{record.details.vitals.weight}</span>
                              </div>
                            )}
                            {record.details.vitals.height && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Height:</span>
                                <span className="font-medium">{record.details.vitals.height}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Lab Results & Attachments */}
                    <div className="space-y-4">
                      {record.details.labResults && record.details.labResults.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Lab Results</h4>
                          <div className="space-y-2">
                            {record.details.labResults.map((result, index) => (
                              <div key={index} className="bg-white p-3 rounded-lg border">
                                <div className="flex justify-between items-start mb-1">
                                  <p className="font-medium text-gray-900">{result.test}</p>
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                    result.status === "normal" ? "bg-green-50 text-green-600" :
                                    result.status === "high" ? "bg-red-50 text-red-600" :
                                    "bg-yellow-50 text-yellow-600"
                                  }`}>
                                    {result.status}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600">
                                  Result: {result.value} (Normal: {result.normalRange})
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {record.attachments && record.attachments.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Attachments</h4>
                          <div className="space-y-2">
                            {record.attachments.map((attachment) => (
                              <div key={attachment.id} className="flex items-center justify-between bg-white p-3 rounded-lg border">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm font-medium text-gray-900">{attachment.name}</span>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => window.open(attachment.url, '_blank')}
                                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => downloadAttachment(attachment)}
                                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                  >
                                    <Download className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
