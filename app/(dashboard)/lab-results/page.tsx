"use client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Search, Plus, FileText, CheckCircle, Clock, AlertTriangle, Download, Eye } from "lucide-react";

export default function LabResultsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Mock data - in real app, fetch from API
  const results = [
    {
      id: "R001",
      orderId: "LO001",
      patientId: "P001",
      patientName: "John Doe",
      testType: "Complete Blood Count",
      status: "completed",
      resultDate: "2026-04-15 14:30",
      technician: "Lab Tech Sarah",
      findings: "Normal CBC results",
      criticalValues: false,
      pdfUrl: "/results/cbc-001.pdf"
    },
    {
      id: "R002",
      orderId: "LO002",
      patientId: "P002",
      patientName: "Jane Smith",
      testType: "Lipid Panel",
      status: "pending_review",
      resultDate: "2026-04-15 15:45",
      technician: "Lab Tech Mike",
      findings: "High cholesterol levels detected",
      criticalValues: true,
      pdfUrl: null
    },
    {
      id: "R003",
      orderId: "LO003",
      patientId: "P003",
      patientName: "Bob Wilson",
      testType: "Liver Function Test",
      status: "completed",
      resultDate: "2026-04-14 11:20",
      technician: "Lab Tech Sarah",
      findings: "Elevated liver enzymes",
      criticalValues: false,
      pdfUrl: "/results/lft-003.pdf"
    }
  ];

  const filteredResults = results.filter(result => {
    const matchesSearch = result.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         result.testType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         result.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || result.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: results.length,
    completed: results.filter(r => r.status === "completed").length,
    pending: results.filter(r => r.status === "pending_review").length,
    critical: results.filter(r => r.criticalValues).length
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "pending_review": return <Clock className="w-5 h-5 text-orange-600" />;
      default: return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending_review": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Lab Results</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Review and manage laboratory test results
            </p>
          </div>
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-5 h-5" />
            <span>Upload Result</span>
          </button>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Results</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Review</p>
              <p className="text-3xl font-bold text-orange-600">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Critical Values</p>
              <p className="text-3xl font-bold text-red-600">{stats.critical}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </Card>
      </div>

      {/* Filters Card */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by patient name, test type, or result ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending_review">Pending Review</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredResults.map((result) => (
          <Card key={result.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                {getStatusIcon(result.status)}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{result.testType}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Result #{result.id}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(result.status)}`}>
                  {result.status.replace('_', ' ')}
                </span>
                {result.criticalValues && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    Critical
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Patient:</span>
                <span>{result.patientName} ({result.patientId})</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Order ID:</span> {result.orderId}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Technician:</span> {result.technician}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Result Date:</span> {result.resultDate}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Findings:</span> {result.findings}
              </div>
            </div>

            <div className="flex space-x-2">
              <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2">
                <Eye className="w-4 h-4" />
                <span>View Details</span>
              </button>
              {result.pdfUrl && (
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>PDF</span>
                </button>
              )}
              {result.status === "pending_review" && (
                <button className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
                  Review
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filteredResults.length === 0 && (
        <Card className="p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No results found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm ? 'Try adjusting your search terms' : 'No results match your current filters'}
          </p>
        </Card>
      )}
    </div>
  );
}
