"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertOctagon, Search, AlertCircle, AlertTriangle, Loader2,
  Filter, Download, Eye, CheckCircle, XCircle
} from "lucide-react";

const orange = "#F97316";

interface DrugInteraction {
  id: string;
  drug1: string;
  drug2: string;
  severity: "low" | "moderate" | "high" | "critical";
  type: string;
  description: string;
  recommendation: string;
  evidenceLevel: string;
  prescriptionId?: string;
  patientName?: string;
}

export default function DrugInteractionsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [selectedInteraction, setSelectedInteraction] = useState<DrugInteraction | null>(null);

  useEffect(() => {
    fetchInteractions();
  }, [severityFilter]);

  const fetchInteractions = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/tenant/${slug}/pharmacy/drug-interactions?severity=${severityFilter}`
      );
      if (res.ok) {
        setInteractions(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch drug interactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInteractions = interactions.filter(interaction => {
    const matchesSearch = interaction.drug1.toLowerCase().includes(search.toLowerCase()) ||
                         interaction.drug2.toLowerCase().includes(search.toLowerCase()) ||
                         interaction.description.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-50 text-red-700 border-red-200";
      case "high": return "bg-orange-50 text-orange-700 border-orange-200";
      case "moderate": return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "low": return "bg-blue-50 text-blue-700 border-blue-200";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <XCircle className="size-5 text-red-600" />;
      case "high": return <AlertTriangle className="size-5 text-orange-600" />;
      case "moderate": return <AlertCircle className="size-5 text-yellow-600" />;
      default: return <AlertCircle className="size-5 text-blue-600" />;
    }
  };

  const stats = {
    critical: interactions.filter(i => i.severity === "critical").length,
    high: interactions.filter(i => i.severity === "high").length,
    moderate: interactions.filter(i => i.severity === "moderate").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Safety</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Drug Interactions</h1>
          <p className="text-sm text-muted-foreground mt-1">Check and monitor medication interactions.</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all">
            <Download className="size-4" />
            Export
          </button>
        </div>
      </div>

      {/* Alert Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-red-700 font-semibold">Critical Interactions</p>
              <p className="text-2xl font-semibold text-red-600">{stats.critical}</p>
            </div>
            <div className="bg-red-100 text-red-600 p-3 rounded-lg">
              <XCircle className="size-6" />
            </div>
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-orange-700 font-semibold">High Interactions</p>
              <p className="text-2xl font-semibold text-orange-600">{stats.high}</p>
            </div>
            <div className="bg-orange-100 text-orange-600 p-3 rounded-lg">
              <AlertTriangle className="size-6" />
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-yellow-700 font-semibold">Moderate Interactions</p>
              <p className="text-2xl font-semibold text-yellow-600">{stats.moderate}</p>
            </div>
            <div className="bg-yellow-100 text-yellow-600 p-3 rounded-lg">
              <AlertCircle className="size-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search drug interactions..."
              className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300"
            />
          </div>
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="moderate">Moderate</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Interactions List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-6 text-orange-500 animate-spin" />
            </div>
          ) : filteredInteractions.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <CheckCircle className="size-12 text-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">No interactions found</p>
            </div>
          ) : (
            filteredInteractions.map(interaction => (
              <div
                key={interaction.id}
                onClick={() => setSelectedInteraction(interaction)}
                className={`bg-card border rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all ${
                  selectedInteraction?.id === interaction.id
                    ? "ring-2 ring-orange-500"
                    : getSeverityColor(interaction.severity).replace("text-", "border-").split(" ")[0] === "border-red-50"
                    ? "border-red-200"
                    : "border-border"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">
                      {getSeverityIcon(interaction.severity)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">
                        {interaction.drug1} + {interaction.drug2}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">{interaction.type}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${getSeverityColor(interaction.severity)}`}>
                    {interaction.severity.toUpperCase()}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2">{interaction.description}</p>

                {interaction.patientName && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Patient: <span className="font-semibold text-foreground">{interaction.patientName}</span>
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Detail Panel */}
        <div>
          {selectedInteraction ? (
            <div className="bg-card border border-border rounded-xl p-6 sticky top-6">
              <h3 className="font-semibold text-foreground mb-4">Interaction Details</h3>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">Drugs</p>
                  <p className="font-semibold text-foreground text-sm">
                    {selectedInteraction.drug1} + {selectedInteraction.drug2}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Severity</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${getSeverityColor(selectedInteraction.severity)}`}>
                      {selectedInteraction.severity.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground font-semibold mb-2">Type</p>
                  <p className="text-sm text-foreground">{selectedInteraction.type}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground font-semibold mb-2">Description</p>
                  <p className="text-sm text-foreground">{selectedInteraction.description}</p>
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground font-semibold mb-2">Recommendation</p>
                  <div className={`p-3 rounded-lg ${
                    selectedInteraction.severity === "critical"
                      ? "bg-red-50"
                      : selectedInteraction.severity === "high"
                      ? "bg-orange-50"
                      : "bg-yellow-50"
                  }`}>
                    <p className="text-sm text-foreground">{selectedInteraction.recommendation}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground font-semibold mb-2">Evidence Level</p>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                    {selectedInteraction.evidenceLevel}
                  </span>
                </div>

                <button className="w-full px-4 py-2 rounded-lg border border-border text-muted-foreground font-semibold text-sm hover:bg-muted transition-all flex items-center gap-2 justify-center">
                  <Eye className="size-4" />
                  View Full Report
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-6 flex items-center justify-center h-96 text-muted-foreground">
              <div className="text-center">
                <AlertOctagon className="size-12 mx-auto mb-4 opacity-50" />
                <p>Select an interaction for details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

