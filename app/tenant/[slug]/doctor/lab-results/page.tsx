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
  Microscope,
  Search,
  Filter,
  Eye,
  Download,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

interface LabResult {
  id: string;
  orderId: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  testName: string;
  testCode: string;
  category: string;
  result: string;
  unit?: string;
  referenceRange?: string;
  flag: "normal" | "high" | "low" | "critical" | "abnormal";
  status: "preliminary" | "final" | "amended";
  performedBy: string;
  verifiedBy?: string;
  performedAt: string;
  verifiedAt?: string;
  notes?: string;
  attachments?: string[];
}

interface ResultValue {
  name: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  flag: "normal" | "high" | "low" | "critical" | "abnormal";
  interpretation?: string;
}

export default function DoctorLabResultsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [flagFilter, setFlagFilter] = useState("all");
  const [selectedResult, setSelectedResult] = useState<LabResult | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  // Fetch lab results
  const { data: labResults, isLoading } = useQuery({
    queryKey: ["doctor-lab-results", slug, statusFilter, flagFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: statusFilter,
        flag: flagFilter,
        search: searchTerm,
      });
      const response = await fetch(`/api/doctor/lab-results?${params}&slug=${slug}`);
      if (!response.ok) throw new Error("Failed to fetch lab results");
      return response.json();
    },
  });

  const filteredResults = labResults?.filter((result: LabResult) => {
    const matchesSearch = result.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         result.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         result.testCode.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  const getFlagColor = (flag: LabResult["flag"]) => {
    switch (flag) {
      case "normal": return "bg-green-50 text-green-700 border-green-200";
      case "high": return "bg-orange-50 text-orange-700 border-orange-200";
      case "low": return "bg-blue-50 text-blue-700 border-blue-200";
      case "critical": return "bg-red-50 text-red-700 border-red-200";
      case "abnormal": return "bg-yellow-50 text-yellow-700 border-yellow-200";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getFlagIcon = (flag: LabResult["flag"]) => {
    switch (flag) {
      case "high": return <TrendingUp className="h-4 w-4" />;
      case "low": return <TrendingDown className="h-4 w-4" />;
      case "critical": return <AlertTriangle className="h-4 w-4" />;
      case "normal": return <CheckCircle className="h-4 w-4" />;
      default: return <Minus className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: LabResult["status"]) => {
    switch (status) {
      case "final": return "bg-green-100 text-green-800";
      case "preliminary": return "bg-yellow-100 text-yellow-800";
      case "amended": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const criticalResults = filteredResults.filter((result: LabResult) => result.flag === "critical");
  const abnormalResults = filteredResults.filter((result: LabResult) => result.flag !== "normal");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lab Results"
        subtitle="Review and analyze laboratory test results for your patients"
      />

      {/* Critical Alerts */}
      {criticalResults.length > 0 && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900">Critical Results Requiring Attention</h3>
              <p className="text-sm text-red-700 mt-1">
                {criticalResults.length} critical result{criticalResults.length > 1 ? 's' : ''} need immediate review.
              </p>
              <div className="mt-2 space-y-1">
                {criticalResults.slice(0, 3).map((result: LabResult) => (
                  <div key={result.id} className="text-xs text-red-800">
                    {result.patientName} - {result.testName}: {result.result}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search results..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="final">Final</SelectItem>
            <SelectItem value="preliminary">Preliminary</SelectItem>
            <SelectItem value="amended">Amended</SelectItem>
          </SelectContent>
        </Select>
        <Select value={flagFilter} onValueChange={setFlagFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Flag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Flags</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="abnormal">Abnormal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Results</p>
              <p className="text-2xl font-bold text-gray-900">{filteredResults.length}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Normal</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredResults.filter((r: LabResult) => r.flag === "normal").length}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-50">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Abnormal</p>
              <p className="text-2xl font-bold text-gray-900">{abnormalResults.length}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Critical</p>
              <p className="text-2xl font-bold text-gray-900">{criticalResults.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lab Results List */}
      <SectionCard>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredResults.length === 0 ? (
              <div className="text-center py-12">
                <Microscope className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No lab results found</h3>
                <p className="text-gray-500">Try adjusting your filters or check back later for new results.</p>
              </div>
            ) : (
              filteredResults.map((result: LabResult) => (
                <div
                  key={result.id}
                  className="p-6 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <Microscope className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{result.testName}</h3>
                        <p className="text-sm text-gray-600">Patient: {result.patientName}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {result.testCode}
                          </Badge>
                          <Badge className={getStatusColor(result.status)}>
                            {result.status}
                          </Badge>
                          <Badge variant="outline" className={getFlagColor(result.flag)}>
                            <div className="flex items-center gap-1">
                              {getFlagIcon(result.flag)}
                              {result.flag}
                            </div>
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Performed</p>
                      <p className="text-sm font-medium text-gray-900">
                        {format(new Date(result.performedAt), "MMM dd, yyyy")}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(result.performedAt), "h:mm a")}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Result</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {result.result} {result.unit && <span className="text-sm text-gray-500">{result.unit}</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Reference Range</p>
                      <p className="text-sm text-gray-900">{result.referenceRange || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Performed By</p>
                      <p className="text-sm text-gray-900">{result.performedBy}</p>
                    </div>
                  </div>

                  {result.verifiedBy && (
                    <div className="mb-4 p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-green-900 font-medium">Verified by {result.verifiedBy}</span>
                        {result.verifiedAt && (
                          <span className="text-green-700">
                            on {format(new Date(result.verifiedAt), "MMM dd, yyyy h:mm a")}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {result.patientName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(result.performedAt), "MMM dd")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedResult(result);
                          setShowResultModal(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button variant="outline" size="sm">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Comment
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </SectionCard>

      {/* Lab Result Details Modal */}
      <Dialog open={showResultModal} onOpenChange={setShowResultModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Lab Result Details</DialogTitle>
          </DialogHeader>
          {selectedResult && (
            <LabResultDetails
              result={selectedResult}
              onClose={() => setShowResultModal(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LabResultDetails({
  result,
  onClose
}: {
  result: LabResult;
  onClose: () => void;
}) {
  // Parse result values if it's a multi-parameter test
  const resultValues: ResultValue[] = result.result.includes('\n') ?
    result.result.split('\n').map(line => {
      const [name, value] = line.split(':');
      return {
        name: name?.trim() || '',
        value: value?.trim() || '',
        flag: result.flag
      };
    }) : [{
      name: result.testName,
      value: result.result,
      unit: result.unit,
      referenceRange: result.referenceRange,
      flag: result.flag
    }];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="results" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="details">Test Details</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Patient Name</label>
                  <p className="text-sm text-gray-900">{result.patientName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Patient ID</label>
                  <p className="text-sm text-gray-900">{result.patientId}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-sm text-gray-900">{result.patientPhone}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Test Name</label>
                  <p className="text-sm text-gray-900">{result.testName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Test Code</label>
                  <p className="text-sm text-gray-900">{result.testCode}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <p className="text-sm text-gray-900">{result.category}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <Badge className="mt-1">{result.status}</Badge>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Results</h3>
            <div className="space-y-3">
              {resultValues.map((value, index) => (
                <div key={index} className="p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{value.name}</h4>
                    <Badge variant="outline" className={getFlagColor(value.flag)}>
                      <div className="flex items-center gap-1">
                        {getFlagIcon(value.flag)}
                        {value.flag}
                      </div>
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Result:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {value.value} {value.unit && <span className="text-gray-500">{value.unit}</span>}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Reference Range:</span>
                      <span className="ml-2 text-gray-900">{value.referenceRange || "Not specified"}</span>
                    </div>
                  </div>
                  {value.interpretation && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-900">{value.interpretation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Performed By</label>
                  <p className="text-sm text-gray-900">{result.performedBy}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Performed At</label>
                  <p className="text-sm text-gray-900">
                    {format(new Date(result.performedAt), "MMM dd, yyyy h:mm a")}
                  </p>
                </div>
                {result.verifiedBy && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Verified By</label>
                      <p className="text-sm text-gray-900">{result.verifiedBy}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Verified At</label>
                      <p className="text-sm text-gray-900">
                        {format(new Date(result.verifiedAt!), "MMM dd, yyyy h:mm a")}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
              <div className="space-y-3">
                {result.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <p className="text-sm text-gray-900 p-3 bg-gray-50 rounded-lg">{result.notes}</p>
                  </div>
                )}
                {result.attachments && result.attachments.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Attachments</label>
                    <div className="space-y-2">
                      {result.attachments.map((attachment, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-900">{attachment}</span>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="text-center py-8">
            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Historical Results</h3>
            <p className="text-gray-500">Previous results for this test will be displayed here.</p>
          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          Download Report
        </Button>
      </DialogFooter>
    </div>
  );
}

function getFlagColor(flag: LabResult["flag"]) {
  switch (flag) {
    case "normal": return "bg-green-50 text-green-700 border-green-200";
    case "high": return "bg-orange-50 text-orange-700 border-orange-200";
    case "low": return "bg-blue-50 text-blue-700 border-blue-200";
    case "critical": return "bg-red-50 text-red-700 border-red-200";
    case "abnormal": return "bg-yellow-50 text-yellow-700 border-yellow-200";
    default: return "bg-gray-50 text-gray-700 border-gray-200";
  }
}

function getFlagIcon(flag: LabResult["flag"]) {
  switch (flag) {
    case "high": return <TrendingUp className="h-4 w-4" />;
    case "low": return <TrendingDown className="h-4 w-4" />;
    case "critical": return <AlertTriangle className="h-4 w-4" />;
    case "normal": return <CheckCircle className="h-4 w-4" />;
    default: return <Minus className="h-4 w-4" />;
  }
}
