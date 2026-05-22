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
  Textarea,
} from "@/components/ui";
import {
  FlaskConical,
  Search,
  Plus,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Calendar,
  FileText,
  Microscope,
  TestTube,
  Activity,
  MoreVertical,
  Eye,
  Edit,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

interface LabOrder {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  testName: string;
  testCode: string;
  category: string;
  priority: "routine" | "urgent" | "stat";
  status: "ordered" | "collected" | "processing" | "completed" | "cancelled";
  orderedBy: string;
  orderedAt: string;
  collectedAt?: string;
  completedAt?: string;
  results?: string;
  notes?: string;
  dueDate?: string;
  labLocation?: string;
}

interface LabTest {
  code: string;
  name: string;
  category: string;
  description: string;
  turnaroundTime: string;
  price: number;
}

export default function DoctorLabOrdersPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);

  const queryClient = useQueryClient();

  // Fetch lab orders
  const { data: labOrders, isLoading } = useQuery({
    queryKey: ["doctor-lab-orders", slug, statusFilter, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: statusFilter,
        category: categoryFilter,
        search: searchTerm,
      });
      const response = await fetch(`/api/doctor/lab-orders?${params}&slug=${slug}`);
      if (!response.ok) throw new Error("Failed to fetch lab orders");
      return response.json();
    },
  });

  // Fetch available lab tests
  const { data: labTests } = useQuery({
    queryKey: ["lab-tests", slug],
    queryFn: async () => {
      const response = await fetch(`/api/lab/tests?slug=${slug}`);
      if (!response.ok) throw new Error("Failed to fetch lab tests");
      return response.json();
    },
  });

  // Fetch patients for new orders
  const { data: patients } = useQuery({
    queryKey: ["patients", slug],
    queryFn: async () => {
      const response = await fetch(`/api/patients?slug=${slug}&limit=100`);
      if (!response.ok) throw new Error("Failed to fetch patients");
      return response.json();
    },
  });

  // Create lab order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: Partial<LabOrder>) => {
      const response = await fetch("/api/doctor/lab-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...orderData, slug }),
      });
      if (!response.ok) throw new Error("Failed to create lab order");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-lab-orders"] });
      setShowNewOrderModal(false);
    },
  });

  // Update lab order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<LabOrder> }) => {
      const response = await fetch(`/api/doctor/lab-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updates, slug }),
      });
      if (!response.ok) throw new Error("Failed to update lab order");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-lab-orders"] });
    },
  });

  const filteredOrders = labOrders?.filter((order: LabOrder) => {
    const matchesSearch = order.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.testCode.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  const getStatusColor = (status: LabOrder["status"]) => {
    switch (status) {
      case "ordered": return "bg-blue-50 text-blue-700 border-blue-200";
      case "collected": return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "processing": return "bg-purple-50 text-purple-700 border-purple-200";
      case "completed": return "bg-green-50 text-green-700 border-green-200";
      case "cancelled": return "bg-red-50 text-red-700 border-red-200";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getPriorityColor = (priority: LabOrder["priority"]) => {
    switch (priority) {
      case "stat": return "bg-red-100 text-red-800";
      case "urgent": return "bg-orange-100 text-orange-800";
      case "routine": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "hematology": return <TestTube className="h-4 w-4" />;
      case "chemistry": return <FlaskConical className="h-4 w-4" />;
      case "microbiology": return <Microscope className="h-4 w-4" />;
      case "immunology": return <Activity className="h-4 w-4" />;
      default: return <FlaskConical className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lab Orders"
        subtitle="Order and track laboratory tests for your patients"
      />

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search orders..."
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
              <SelectItem value="ordered">Ordered</SelectItem>
              <SelectItem value="collected">Collected</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="hematology">Hematology</SelectItem>
              <SelectItem value="chemistry">Chemistry</SelectItem>
              <SelectItem value="microbiology">Microbiology</SelectItem>
              <SelectItem value="immunology">Immunology</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowNewOrderModal(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Lab Order
        </Button>
      </div>

      {/* Lab Orders List */}
      <SectionCard>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <FlaskConical className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No lab orders found</h3>
                <p className="text-gray-500">Try adjusting your filters or create a new lab order.</p>
              </div>
            ) : (
              filteredOrders.map((order: LabOrder) => (
                <div
                  key={order.id}
                  className="p-6 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                        {getCategoryIcon(order.category)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{order.testName}</h3>
                        <p className="text-sm text-gray-600">Patient: {order.patientName}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {order.testCode}
                          </Badge>
                          <Badge className={getPriorityColor(order.priority)}>
                            {order.priority}
                          </Badge>
                          <Badge variant="outline" className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Ordered by</p>
                      <p className="text-sm font-medium text-gray-900">{order.orderedBy}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(order.orderedAt), "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-gray-500">Category</p>
                      <p className="font-medium text-gray-900">{order.category}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Due Date</p>
                      <p className="font-medium text-gray-900">
                        {order.dueDate ? format(new Date(order.dueDate), "MMM dd") : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Lab Location</p>
                      <p className="font-medium text-gray-900">{order.labLocation || "Main Lab"}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Status Timeline</p>
                      <div className="flex items-center gap-1">
                        {order.status === "completed" && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {order.status === "processing" && <Clock className="h-4 w-4 text-purple-500" />}
                        {order.status === "collected" && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                        <span className="text-xs text-gray-600">
                          {order.completedAt ? format(new Date(order.completedAt), "MMM dd") :
                           order.collectedAt ? "Collected" : "Pending"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {order.notes && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">{order.notes}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="h-4 w-4" />
                      {order.patientName}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      {order.status === "ordered" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateOrderMutation.mutate({
                            id: order.id,
                            updates: { status: "cancelled" }
                          })}
                          disabled={updateOrderMutation.isPending}
                        >
                          Cancel
                        </Button>
                      )}
                      {order.status === "completed" && order.results && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Results
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </SectionCard>

      {/* New Lab Order Modal */}
      <Dialog open={showNewOrderModal} onOpenChange={setShowNewOrderModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order New Lab Test</DialogTitle>
          </DialogHeader>
          <LabOrderForm
            patients={patients || []}
            labTests={labTests || []}
            onSubmit={(data) => createOrderMutation.mutate(data)}
            isLoading={createOrderMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Lab Order Details Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Lab Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <LabOrderDetails
              order={selectedOrder}
              onUpdate={(updates) => updateOrderMutation.mutate({
                id: selectedOrder.id,
                updates
              })}
              isUpdating={updateOrderMutation.isPending}
              onClose={() => setSelectedOrder(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LabOrderForm({
  patients,
  labTests,
  onSubmit,
  isLoading
}: {
  patients: any[];
  labTests: LabTest[];
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    patientId: "",
    testCode: "",
    priority: "routine" as LabOrder["priority"],
    notes: "",
    dueDate: "",
    labLocation: "Main Lab",
  });

  const selectedTest = labTests.find(test => test.code === formData.testCode);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedPatient = patients.find(p => p.id === formData.patientId);
    const test = labTests.find(t => t.code === formData.testCode);

    onSubmit({
      patientId: formData.patientId,
      patientName: selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : "",
      patientEmail: selectedPatient?.email || "",
      patientPhone: selectedPatient?.phone || "",
      testName: test?.name || "",
      testCode: formData.testCode,
      category: test?.category || "",
      priority: formData.priority,
      status: "ordered",
      notes: formData.notes,
      dueDate: formData.dueDate,
      labLocation: formData.labLocation,
      orderedAt: new Date().toISOString(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
          <Select value={formData.patientId} onValueChange={(value) => setFormData({ ...formData, patientId: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select patient" />
            </SelectTrigger>
            <SelectContent>
              {patients.map((patient) => (
                <SelectItem key={patient.id} value={patient.id}>
                  {patient.firstName} {patient.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lab Test</label>
          <Select value={formData.testCode} onValueChange={(value) => setFormData({ ...formData, testCode: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select test" />
            </SelectTrigger>
            <SelectContent>
              {labTests.map((test) => (
                <SelectItem key={test.code} value={test.code}>
                  {test.name} ({test.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedTest && (
        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Test Details</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-700">Category:</span>
              <span className="ml-2 text-blue-900">{selectedTest.category}</span>
            </div>
            <div>
              <span className="text-blue-700">Turnaround:</span>
              <span className="ml-2 text-blue-900">{selectedTest.turnaroundTime}</span>
            </div>
            <div className="col-span-2">
              <span className="text-blue-700">Description:</span>
              <span className="ml-2 text-blue-900">{selectedTest.description}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="routine">Routine</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="stat">STAT</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
          <Input
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lab Location</label>
          <Select value={formData.labLocation} onValueChange={(value) => setFormData({ ...formData, labLocation: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Main Lab">Main Lab</SelectItem>
              <SelectItem value="Satellite Lab">Satellite Lab</SelectItem>
              <SelectItem value="Reference Lab">Reference Lab</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Clinical Notes</label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Reason for test, clinical indications..."
          rows={3}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Ordering..." : "Order Lab Test"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function LabOrderDetails({
  order,
  onUpdate,
  isUpdating,
  onClose
}: {
  order: LabOrder;
  onUpdate: (updates: Partial<LabOrder>) => void;
  isUpdating: boolean;
  onClose: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Information</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Test Name</label>
              <p className="text-sm text-gray-900">{order.testName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Test Code</label>
              <p className="text-sm text-gray-900">{order.testCode}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <p className="text-sm text-gray-900">{order.category}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Priority</label>
              <Badge className="mt-1">{order.priority}</Badge>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <Badge variant="outline" className="mt-1">{order.status}</Badge>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Information</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Patient Name</label>
              <p className="text-sm text-gray-900">{order.patientName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="text-sm text-gray-900">{order.patientEmail}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <p className="text-sm text-gray-900">{order.patientPhone}</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Ordered</p>
              <p className="text-xs text-gray-500">{format(new Date(order.orderedAt), "MMM dd, yyyy h:mm a")}</p>
            </div>
          </div>

          {order.collectedAt && (
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                <TestTube className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Sample Collected</p>
                <p className="text-xs text-gray-500">{format(new Date(order.collectedAt), "MMM dd, yyyy h:mm a")}</p>
              </div>
            </div>
          )}

          {order.completedAt && (
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Completed</p>
                <p className="text-xs text-gray-500">{format(new Date(order.completedAt), "MMM dd, yyyy h:mm a")}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {order.results && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Results</h3>
          <div className="p-4 bg-gray-50 rounded-lg">
            <pre className="text-sm text-gray-900 whitespace-pre-wrap">{order.results}</pre>
          </div>
        </div>
      )}

      {order.notes && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Clinical Notes</h3>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-900">{order.notes}</p>
          </div>
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {order.status === "ordered" && (
          <Button
            variant="destructive"
            onClick={() => onUpdate({ status: "cancelled" })}
            disabled={isUpdating}
          >
            Cancel Order
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}
