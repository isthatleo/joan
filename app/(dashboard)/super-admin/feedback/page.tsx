"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

import {
  PageHeader,
  SectionCard,
  Button,
  Input,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Skeleton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import {
  MessageSquare,
  Search,
  AlertCircle,
  CheckCircle,
  Clock,
  Building,
  Star,
  MessageCircle,
  X,
  Trash2,
} from "lucide-react";

interface FeedbackItem {
  id: string;
  scope?: string;
  type: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    tenantId: string;
  };
  tenant: {
    id: string;
    name: string;
  };
  assignedToUser?: {
    id: string;
    fullName: string;
    email: string;
  };
  resolvedAt?: string;
  resolution?: string;
}

export default function FeedbackPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateData, setUpdateData] = useState({
    status: "",
    assignedTo: "unassigned",
    resolution: "",
  });

  // Fetch feedback
  const { data: feedbackData, isLoading } = useQuery({
    queryKey: ["feedback", statusFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("scope", "platform");
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);

      const response = await fetch(`/api/feedback?${params}`);
      if (!response.ok) throw new Error("Failed to fetch feedback");
      return response.json();
    },
  });

  // Update feedback mutation
  const updateFeedbackMutation = useMutation({
    mutationFn: async (data: { feedbackId: string; status: string; assignedTo?: string; resolution?: string }) => {
      const response = await fetch("/api/feedback", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update feedback");
      return response.json();
    },
    onSuccess: () => {
      setUpdateDialogOpen(false);
      setSelectedFeedback(null);
      setUpdateData({ status: "", assignedTo: "unassigned", resolution: "" });
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
    },
  });

  const deleteFeedbackMutation = useMutation({
    mutationFn: async (feedbackId: string) => {
      const response = await fetch(`/api/feedback/${feedbackId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Failed to delete feedback");
      return payload;
    },
    onSuccess: () => {
      setSelectedFeedback(null);
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
    },
  });

  const feedback = feedbackData?.feedback || [];
  const stats = {
    total: feedback.length,
    open: feedback.filter((item: FeedbackItem) => item.status === "open").length,
    inProgress: feedback.filter((item: FeedbackItem) => item.status === "in_progress").length,
    resolved: feedback.filter((item: FeedbackItem) => item.status === "resolved").length,
    critical: feedback.filter((item: FeedbackItem) => item.priority === "critical").length,
  };

  const filteredFeedback = feedback.filter((item: FeedbackItem) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "resolved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "closed":
        return <X className="h-4 w-4 text-gray-500" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: "destructive",
      in_progress: "default",
      resolved: "secondary",
      closed: "outline",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      low: "outline",
      medium: "secondary",
      high: "default",
      critical: "destructive",
    };

    return (
      <Badge variant={variants[priority] || "outline"}>
        {priority}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "bug":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "feature_request":
        return <Star className="h-4 w-4 text-yellow-500" />;
      case "feature_improvement":
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const handleUpdateFeedback = (feedback: FeedbackItem) => {
    setSelectedFeedback(feedback);
    setUpdateData({
      status: feedback.status,
      assignedTo: feedback.assignedToUser?.id || "unassigned",
      resolution: feedback.resolution || "",
    });
    setUpdateDialogOpen(true);
  };

  if (!user || user.role !== "super_admin") {
    return (
      <div className="flex items-center justify-center h-96">
        <p>You don't have permission to access this page</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feedback Management"
        description="Manage platform feedback sent directly to the super admin for system fixes, feature additions, and product improvements"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Total" value={stats.total} icon={<MessageSquare className="size-5" />} />
        <Metric label="Open" value={stats.open} icon={<AlertCircle className="size-5" />} />
        <Metric label="In Progress" value={stats.inProgress} icon={<Clock className="size-5" />} />
        <Metric label="Resolved" value={stats.resolved} icon={<CheckCircle className="size-5" />} />
        <Metric label="Critical" value={stats.critical} icon={<Star className="size-5" />} />
      </div>

      {/* Filters */}
      <SectionCard>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search feedback..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="bug">Bug Report</SelectItem>
              <SelectItem value="feature_request">Feature Request</SelectItem>
              <SelectItem value="feature_improvement">Feature Improvement</SelectItem>
              <SelectItem value="integration_issue">Integration Issue</SelectItem>
              <SelectItem value="platform_billing">Platform Billing</SelectItem>
              <SelectItem value="platform_general">General Platform</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      {/* Feedback Table */}
      <SectionCard>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        ) : filteredFeedback.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-4" />
            <p>No feedback found</p>
            <p className="text-sm">No feedback matches your current filters</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFeedback.map((item: FeedbackItem) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(item.type)}
                      <span className="capitalize">{item.type.replace("_", " ")}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {item.description}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {(item.user.fullName || item.user.email).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{item.user.fullName || item.user.email}</p>
                        <p className="text-xs text-muted-foreground">{item.user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{item.tenant.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell>{getPriorityBadge(item.priority)}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(item.createdAt), "MMM dd, yyyy")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateFeedback(item)}
                      >
                        Manage
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deleteFeedbackMutation.isPending}
                        onClick={() => {
                          if (confirm("Delete this feedback record?")) deleteFeedbackMutation.mutate(item.id);
                        }}
                      >
                        <Trash2 className="mr-2 size-3.5" /> Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      {/* Update Feedback Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Feedback</DialogTitle>
          </DialogHeader>

          {selectedFeedback && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">{selectedFeedback.title}</h4>
                <p className="text-sm text-muted-foreground mb-2">{selectedFeedback.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>From: {selectedFeedback.user.fullName || selectedFeedback.user.email}</span>
                  <span>Tenant: {selectedFeedback.tenant.name}</span>
                  <span>Type: {selectedFeedback.type.replace("_", " ")}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={updateData.status}
                    onValueChange={(value) => setUpdateData({ ...updateData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Assign To (Optional)</label>
                  <Select
                    value={updateData.assignedTo}
                    onValueChange={(value) => setUpdateData({ ...updateData, assignedTo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select admin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      <SelectItem value={user.id}>Me ({user.fullName || user.email})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Reply / Resolution Update</label>
                <Textarea
                  value={updateData.resolution}
                  onChange={(e) => setUpdateData({ ...updateData, resolution: e.target.value })}
                  placeholder="Write a response to the sender. They will be notified when you save."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Saving a status change or reply sends a notification to the feedback sender.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedFeedback) {
                  updateFeedbackMutation.mutate({
                    feedbackId: selectedFeedback.id,
                    status: updateData.status,
                    assignedTo: updateData.assignedTo === "unassigned" ? "" : updateData.assignedTo,
                    resolution: updateData.resolution || undefined,
                  });
                }
              }}
              disabled={!updateData.status || updateFeedbackMutation.isPending}
            >
              {updateFeedbackMutation.isPending ? "Updating..." : "Update Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 text-orange-500">{icon}</div>
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
