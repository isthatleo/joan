"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Microscope, Calendar, Download, Eye, AlertTriangle, CheckCircle2,
  RefreshCw, Search, Filter, FileText, TrendingUp, TrendingDown,
  Clock, User, Stethoscope, MessageSquare, Share, X
} from "lucide-react";

interface LabResult {
  id: string;
  testName: string;
  category: string;
  status: "pending" | "completed" | "reviewed" | "critical";
  orderedDate: string;
  completedDate?: string;
  reviewedDate?: string;
  provider: {
    name: string;
    specialty: string;
  };
  results: {
    name: string;
    value: string | number;
    unit: string;
    referenceRange: string;
    status: "normal" | "high" | "low" | "critical";
    flag?: string;
  }[];
  notes?: string;
  attachments?: {
    name: string;
    type: string;
    url: string;
  }[];
  followUp?: string;
}

interface LabCategory {
  id: string;
  name: string;
  count: number;
  icon: React.ElementType;
  color: string;
}

export default function LabResultsPage() {
  const { slug } = useParams();
  const [results, setResults] = useState<LabResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<LabResult[]>([]);
  const [categories, setCategories] = useState<LabCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedResult, setSelectedResult] = useState<LabResult | null>(null);

  // Fetch lab results
  const fetchResults = async () => {
    try {
      setRefreshing(true);
      const [resultsRes, categoriesRes] = await Promise.all([
        fetch(`/api/tenant/${slug}/patient/lab-results`),
        fetch(`/api/tenant/${slug}/patient/lab-results/categories`),
      ]);

      if (resultsRes.ok) {
        const resultsData = await resultsRes.json();
        setResults(resultsData);
        setFilteredResults(resultsData);
      }

      if (categoriesRes.ok) setCategories(await categoriesRes.json());

      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch lab results:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  // Filter results
  useEffect(() => {
    let filtered = results;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(result =>
        result.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.provider.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(result => result.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(result => result.category === categoryFilter);
    }

    // Sort by date (most recent first)
    filtered.sort((a, b) => new Date(b.orderedDate).getTime() - new Date(a.orderedDate).getTime());

    setFilteredResults(filtered);
  }, [results, searchTerm, statusFilter, categoryFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-600 bg-green-50";
      case "pending": return "text-yellow-600 bg-yellow-50";
      case "reviewed": return "text-blue-600 bg-blue-50";
      case "critical": return "text-red-600 bg-red-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const getResultStatusColor = (status: string) => {
    switch (status) {
      case "normal": return "text-green-600";
      case "high": return "text-red-600";
      case "low": return "text-blue-600";
      case "critical": return "text-red-700 font-semibold";
      default: return "text-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
          Loading your lab results...
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
            Lab Results
          </p>
          <h1 className="text-3xl font-bold text-foreground mt-1">
            Laboratory Results
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage your laboratory test results
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all">
            <Share className="h-4 w-4" />
            Share Results
          </button>
          <button
            onClick={fetchResults}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Critical Results Alert */}
      {results.filter(r => r.status === "critical").length > 0 && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600 animate-pulse" />
            <div className="flex-1">
              <p className="text-red-900 font-semibold">
                Critical Results - Immediate Attention Required
              </p>
              <p className="text-red-700 text-sm">
                {results.filter(r => r.status === "critical").length} test(s) have critical results that require immediate medical attention.
              </p>
            </div>
            <button className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-all">
              View Critical Results
            </button>
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => setCategoryFilter(categoryFilter === category.id ? "all" : category.id)}
              className={`p-4 rounded-2xl border-2 transition-all ${
                categoryFilter === category.id
                  ? "border-orange-300 bg-orange-50"
                  : "border-gray-200 bg-white hover:border-orange-300"
              }`}
            >
              <div className={`p-2 rounded-lg ${category.color} w-fit mb-3`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-gray-900">{category.name}</p>
              <p className="text-xs text-gray-500">{category.count} tests</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search lab results..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {/* Results List */}
      <div className="space-y-4">
        {filteredResults.length > 0 ? (
          filteredResults.map((result) => (
            <div
              key={result.id}
              className="p-6 rounded-2xl border border-gray-200 bg-white hover:shadow-sm transition-all cursor-pointer"
              onClick={() => setSelectedResult(result)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
                    <Microscope className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{result.testName}</h3>
                      <span className={`text-xs px-2 py-1 rounded font-semibold ${getStatusColor(result.status)}`}>
                        {result.status.toUpperCase()}
                      </span>
                      {result.status === "critical" && (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      )}
                    </div>

                    <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>{result.provider.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Ordered: {new Date(result.orderedDate).toLocaleDateString()}</span>
                      </div>
                      {result.completedDate && (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Completed: {new Date(result.completedDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-sm text-gray-500 mb-3">{result.category}</p>

                    {/* Quick Result Preview */}
                    {result.results && result.results.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        {result.results.slice(0, 3).map((testResult, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm font-medium text-gray-900">{testResult.name}</p>
                            <p className={`text-lg font-bold ${getResultStatusColor(testResult.status)}`}>
                              {testResult.value} {testResult.unit}
                            </p>
                            <p className="text-xs text-gray-500">Range: {testResult.referenceRange}</p>
                          </div>
                        ))}
                        {result.results.length > 3 && (
                          <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-center">
                            <span className="text-sm text-gray-500">
                              +{result.results.length - 3} more results
                            </span>
                          </div>
                        )}
                      </div>
                    )}
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

              {/* Follow-up */}
              {result.followUp && (
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Follow-up Required</p>
                      <p className="text-sm text-blue-700">{result.followUp}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <Microscope className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No lab results found</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchTerm || statusFilter !== "all" || categoryFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Your lab results will appear here when available"
              }
            </p>
          </div>
        )}
      </div>

      {/* Detailed Result Modal */}
      {selectedResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">{selectedResult.testName}</h2>
                <button
                  onClick={() => setSelectedResult(null)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <span>{selectedResult.category}</span>
                <span>•</span>
                <span>{selectedResult.provider.name}</span>
                <span>•</span>
                <span>Ordered: {new Date(selectedResult.orderedDate).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="p-6">
              {/* Detailed Results */}
              <div className="space-y-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Test Results</h3>
                {selectedResult.results.map((testResult, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{testResult.name}</h4>
                      <span className={`text-sm font-semibold ${getResultStatusColor(testResult.status)}`}>
                        {testResult.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Result</p>
                        <p className={`text-lg font-bold ${getResultStatusColor(testResult.status)}`}>
                          {testResult.value} {testResult.unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Reference Range</p>
                        <p className="text-lg font-bold text-gray-900">{testResult.referenceRange}</p>
                      </div>
                    </div>
                    {testResult.flag && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-sm text-yellow-800">
                          <AlertTriangle className="h-4 w-4 inline mr-1" />
                          {testResult.flag}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Notes */}
              {selectedResult.notes && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes</h3>
                  <p className="text-gray-700">{selectedResult.notes}</p>
                </div>
              )}

              {/* Attachments */}
              {selectedResult.attachments && selectedResult.attachments.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Attachments</h3>
                  <div className="space-y-2">
                    {selectedResult.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                            <p className="text-xs text-gray-500">{attachment.type}</p>
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

              {/* Actions */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {selectedResult.completedDate && (
                    <span>Completed: {new Date(selectedResult.completedDate).toLocaleDateString()}</span>
                  )}
                  {selectedResult.reviewedDate && (
                    <span>Reviewed: {new Date(selectedResult.reviewedDate).toLocaleDateString()}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Contact Provider
                  </button>
                  <button className="px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-all">
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-6 rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-xl font-bold text-gray-900">
                {results.filter(r => r.status === "completed").length}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-50 text-yellow-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-xl font-bold text-gray-900">
                {results.filter(r => r.status === "pending").length}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Critical</p>
              <p className="text-xl font-bold text-gray-900">
                {results.filter(r => r.status === "critical").length}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-xl font-bold text-gray-900">
                {results.filter(r => {
                  const resultDate = new Date(r.orderedDate);
                  const now = new Date();
                  return resultDate.getMonth() === now.getMonth() &&
                         resultDate.getFullYear() === now.getFullYear();
                }).length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
