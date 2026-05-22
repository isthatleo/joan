"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck, Search, Plus, CheckCircle, AlertCircle,
  Loader2, Trash2, Eye, RefreshCw, ArrowLeft, TrendingUp,
  BarChart3, Calendar
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const orange = "#F97316";

interface QCRecord {
  id: string;
  testName: string;
  date: string;
  result: string;
  status: "pass" | "fail" | "review";
  recordedBy: string;
  notes?: string;
}

export default function LabQCPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [records, setRecords] = useState<QCRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState<QCRecord | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [formData, setFormData] = useState({
    testName: "",
    result: "",
    notes: "",
  });
  const queryClient = useQueryClient();

  const fetchQCRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lab/qc");
      if (res.ok) {
        const data = await res.json();
        setRecords(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch QC records:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQCRecords();
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchQCRecords, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, []);

  const createQCRecordMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/lab/qc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create QC record");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qc-records"] });
      fetchQCRecords();
      setShowNewModal(false);
      setFormData({ testName: "", result: "", notes: "" });
    },
  });

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.testName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const passRate = records.length > 0
    ? (records.filter(r => r.status === "pass").length / records.length * 100).toFixed(1)
    : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pass": return "bg-green-50 text-green-700 border-green-100";
      case "fail": return "bg-red-50 text-red-700 border-red-100";
      case "review": return "bg-yellow-50 text-yellow-700 border-yellow-100";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass": return <CheckCircle className="size-3" />;
      case "fail": return <AlertCircle className="size-3" />;
      case "review": return <AlertCircle className="size-3" />;
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
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Quality Control Management</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Quality Control</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor QC tests, track results, and maintain compliance.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchQCRecords}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all"
          >
            <RefreshCw className="size-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90"
            style={{ backgroundColor: orange }}
          >
            <Plus className="size-4" />
            New QC Test
          </button>
        </div>
      </div>

      {/* QC Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-blue-50 text-blue-600 rounded-lg p-4">
          <p className="text-xs font-semibold uppercase tracking-wide">Total Tests</p>
          <p className="text-2xl font-bold mt-1">{records.length}</p>
        </div>
        <div className="bg-green-50 text-green-600 rounded-lg p-4">
          <p className="text-xs font-semibold uppercase tracking-wide">Pass Rate</p>
          <p className="text-2xl font-bold mt-1">{passRate}%</p>
        </div>
        <div className="bg-red-50 text-red-600 rounded-lg p-4">
          <p className="text-xs font-semibold uppercase tracking-wide">Failed Tests</p>
          <p className="text-2xl font-bold mt-1">{records.filter(r => r.status === "fail").length}</p>
        </div>
        <div className="bg-yellow-50 text-yellow-600 rounded-lg p-4">
          <p className="text-xs font-semibold uppercase tracking-wide">Under Review</p>
          <p className="text-2xl font-bold mt-1">{records.filter(r => r.status === "review").length}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by test name..."
              className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300"
          >
            <option value="all">All Status</option>
            <option value="pass">Passed</option>
            <option value="fail">Failed</option>
            <option value="review">Under Review</option>
          </select>
        </div>
      </div>

      {/* QC Records Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                <th className="text-left px-5 py-3">Test Name</th>
                <th className="text-left px-5 py-3">Date</th>
                <th className="text-left px-5 py-3">Result</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Recorded By</th>
                <th className="text-left px-5 py-3">Notes</th>
                <th className="text-left px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={7} className="py-16 text-center"><Loader2 className="size-6 text-orange-500 animate-spin mx-auto" /></td></tr>
              ) : filteredRecords.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center">
                  <ShieldCheck className="size-10 text-muted mx-auto mb-2" />
                  <p className="text-muted-foreground font-medium">No QC records found</p>
                </td></tr>
              ) : (
                filteredRecords.map(record => (
                  <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap">
                      <p className="font-semibold text-foreground">{record.testName}</p>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm text-foreground">
                      {new Date(record.date).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <p className="font-mono text-sm">{record.result}</p>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(record.status)}`}>
                        {getStatusIcon(record.status)}
                        {record.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm text-foreground">
                      {record.recordedBy}
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-xs text-muted-foreground truncate max-w-xs">{record.notes || "-"}</p>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedRecord(record)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 font-semibold text-xs transition-colors"
                      >
                        <Eye className="size-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">QC Record Details</h2>
            <div className="space-y-3 mb-6">
              <div>
                <p className="text-xs text-muted-foreground">Test Name</p>
                <p className="font-semibold">{selectedRecord.testName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="font-semibold">{new Date(selectedRecord.date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Result</p>
                <p className="font-mono">{selectedRecord.result}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(selectedRecord.status)}`}>
                  {getStatusIcon(selectedRecord.status)}
                  {selectedRecord.status.toUpperCase()}
                </span>
              </div>
              {selectedRecord.notes && (
                <div>
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedRecord.notes}</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedRecord(null)}
              className="w-full px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* New QC Test Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Create QC Test Record</h2>
            <div className="space-y-4 mb-6">
              <input
                type="text"
                placeholder="Test Name"
                value={formData.testName}
                onChange={e => setFormData({ ...formData, testName: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
              />
              <input
                type="text"
                placeholder="Result Value"
                value={formData.result}
                onChange={e => setFormData({ ...formData, result: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
              />
              <textarea
                placeholder="Additional Notes"
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full h-20 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowNewModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => createQCRecordMutation.mutate({
                  ...formData,
                  status: "pass",
                  date: new Date().toISOString(),
                  recordedBy: "Current User"
                })}
                className="flex-1 px-4 py-2 rounded-lg text-white text-sm font-semibold"
                style={{ backgroundColor: orange }}
              >
                Create Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

