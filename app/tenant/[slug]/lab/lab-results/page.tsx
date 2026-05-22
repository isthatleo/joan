"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Microscope, Search, Plus, CheckCircle, AlertCircle,
  Loader2, Edit, Trash2, Eye, Download, RefreshCw,
  ArrowLeft, Upload, Zap, File, MoreVertical
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const orange = "#F97316";

interface LabResult {
  id: string;
  labOrderId: string;
  patientName: string;
  testType: string;
  resultData: Record<string, any>;
  fileUrl?: string;
  status: "pending" | "reviewed" | "approved";
  createdAt: string;
  approvedBy?: string;
  notes?: string;
}

export default function LabResultsPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedResult, setSelectedResult] = useState<LabResult | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const queryClient = useQueryClient();

  const fetchResults = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lab/results?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch (error) {
      console.error("Failed to fetch results:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchResults, 60000);
    return () => clearInterval(interval);
  }, []);

  const uploadResultMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch("/api/lab/results", {
        method: "POST",
        body: data,
      });
      if (!res.ok) throw new Error("Failed to upload result");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-results"] });
      fetchResults();
      setShowUploadModal(false);
    },
  });

  const filteredResults = results.filter(result => {
    const matchesSearch = result.patientName.toLowerCase().includes(search.toLowerCase()) ||
                         result.testType.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || result.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-50 text-yellow-700 border-yellow-100";
      case "reviewed": return "bg-blue-50 text-blue-700 border-blue-100";
      case "approved": return "bg-green-50 text-green-700 border-green-100";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <AlertCircle className="size-3" />;
      case "reviewed": return <Eye className="size-3" />;
      case "approved": return <CheckCircle className="size-3" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href={`/tenant/${slug}/lab`} className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 mb-3">
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </Link>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Lab Results Management</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Lab Results</h1>
          <p className="text-sm text-muted-foreground mt-1">Upload, review, and manage lab test results.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchResults}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all"
          >
            <RefreshCw className="size-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90"
            style={{ backgroundColor: orange }}
          >
            <Upload className="size-4" />
            Upload Result
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Results", count: results.length, color: "bg-blue-50 text-blue-600" },
          { label: "Pending Review", count: results.filter(r => r.status === "pending").length, color: "bg-yellow-50 text-yellow-600" },
          { label: "Reviewed", count: results.filter(r => r.status === "reviewed").length, color: "bg-purple-50 text-purple-600" },
          { label: "Approved", count: results.filter(r => r.status === "approved").length, color: "bg-green-50 text-green-600" },
        ].map((stat, idx) => (
          <div key={idx} className={`${stat.color} rounded-lg p-4`}>
            <p className="text-xs font-semibold uppercase tracking-wide">{stat.label}</p>
            <p className="text-2xl font-bold mt-1">{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by patient name or test type..."
              className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending Review</option>
            <option value="reviewed">Reviewed</option>
            <option value="approved">Approved</option>
          </select>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                <th className="text-left px-5 py-3">Test Type</th>
                <th className="text-left px-5 py-3">Patient</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Uploaded</th>
                <th className="text-left px-5 py-3">Results</th>
                <th className="text-left px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="py-16 text-center"><Loader2 className="size-6 text-orange-500 animate-spin mx-auto" /></td></tr>
              ) : filteredResults.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center">
                  <Microscope className="size-10 text-muted mx-auto mb-2" />
                  <p className="text-muted-foreground font-medium">No results found</p>
                </td></tr>
              ) : (
                filteredResults.map(result => (
                  <tr key={result.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap">
                      <p className="font-semibold text-foreground">{result.testType}</p>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <p className="text-sm text-foreground">{result.patientName}</p>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(result.status)}`}>
                        {getStatusIcon(result.status)}
                        {result.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm text-foreground">
                      {new Date(result.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {result.fileUrl && (
                          <a href={result.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-semibold">
                            <File className="size-3" />
                            PDF
                          </a>
                        )}
                        {Object.keys(result.resultData || {}).length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {Object.keys(result.resultData).length} fields
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedResult(result)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 font-semibold text-xs transition-colors"
                        >
                          <Eye className="size-3" />
                        </button>
                        {result.fileUrl && (
                          <a
                            href={result.fileUrl}
                            download
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-50 font-semibold text-xs transition-colors"
                          >
                            <Download className="size-3" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Result Details Modal */}
      {selectedResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{selectedResult.testType} Results</h2>
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-xs text-muted-foreground">Patient</p>
                <p className="font-semibold">{selectedResult.patientName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(selectedResult.status)}`}>
                  {getStatusIcon(selectedResult.status)}
                  {selectedResult.status.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Test Results</p>
                <div className="mt-2 space-y-2">
                  {Object.entries(selectedResult.resultData || {}).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm p-2 bg-muted/30 rounded">
                      <span className="font-semibold">{key}:</span>
                      <span>{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
              {selectedResult.notes && (
                <div>
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedResult.notes}</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedResult(null)}
              className="w-full px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Upload Lab Result</h2>
            <div className="space-y-4 mb-6">
              <input
                type="text"
                placeholder="Patient Name"
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300"
              />
              <input
                type="text"
                placeholder="Test Type"
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300"
              />
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors">
                <Upload className="size-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload result file</p>
                <p className="text-xs text-muted-foreground">PDF, CSV, or TXT</p>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.csv,.txt"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2 rounded-lg text-white text-sm font-semibold"
                style={{ backgroundColor: orange }}
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

