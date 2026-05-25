"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Eye, MessageCircle, MessageSquare, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { withTenantPrefix } from "@/lib/tenant-routing";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  PageHeader,
  SectionCard,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "@/components/ui";

interface FeedbackItem {
  id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
}

type UserFeedbackWorkspaceProps = {
  routeBase: string;
  queryKey: string;
  title?: string;
  description?: string;
};

export function UserFeedbackWorkspace({
  routeBase,
  queryKey,
  title = "Feedback & Support",
  description = "System/product feedback routes to super admin. Service and operational feedback stays in tenant scope.",
}: UserFeedbackWorkspaceProps) {
  const { user } = useAuthStore();
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : undefined;
  const hostname = typeof window !== "undefined" ? window.location.hostname : null;
  const toTenantPath = (path: string) => withTenantPrefix(path, slug, hostname);
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isCreating, setIsCreating] = useState(false);
  const [newFeedback, setNewFeedback] = useState({
    type: "general",
    title: "",
    description: "",
    priority: "medium",
  });

  const { data: feedbackData, isLoading } = useQuery({
    queryKey: [queryKey, user?.id, statusFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ userId: user?.id || "" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);

      const response = await fetch(`/api/feedback?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch feedback");
      return response.json();
    },
    enabled: !!user?.id,
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: async (data: typeof newFeedback) => {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          userId: user?.id,
          tenantId: user?.tenantId,
        }),
      });
      if (!response.ok) throw new Error("Failed to submit feedback");
      return response.json();
    },
    onSuccess: () => {
      setIsCreating(false);
      setNewFeedback({ type: "general", title: "", description: "", priority: "medium" });
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast.success("Feedback submitted successfully");
    },
    onError: () => toast.error("Failed to submit feedback"),
  });

  const deleteFeedbackMutation = useMutation({
    mutationFn: async (feedbackId: string) => {
      const response = await fetch(`/api/feedback/${feedbackId}`, { method: "DELETE" });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete feedback");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast.success("Feedback deleted");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete feedback");
    },
  });

  const feedback = feedbackData?.feedback || [];
  const filteredFeedback = feedback.filter((item: FeedbackItem) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: "destructive",
      in_progress: "default",
      resolved: "secondary",
      closed: "outline",
    };

    return <Badge variant={variants[status] || "outline"}>{status.replace("_", " ")}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      low: "outline",
      medium: "secondary",
      high: "default",
      critical: "destructive",
    };

    return <Badge variant={variants[priority] || "outline"}>{priority}</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Submit Feedback
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard>
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Platform</p>
            <h2 className="text-base font-semibold text-foreground">Super admin review</h2>
            <p className="text-sm text-muted-foreground">
              Bugs, product changes, and feature requests are routed directly for implementation review.
            </p>
          </div>
        </SectionCard>
        <SectionCard>
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Tenant</p>
            <h2 className="text-base font-semibold text-foreground">Hospital follow-up</h2>
            <p className="text-sm text-muted-foreground">
              Service, workflow, and operational issues stay within the active tenant for local action.
            </p>
          </div>
        </SectionCard>
        <SectionCard>
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Guidance</p>
            <h2 className="text-base font-semibold text-foreground">What to include</h2>
            <p className="text-sm text-muted-foreground">
              Include page, workflow, expected behavior, actual behavior, and urgency so the reviewer can act directly.
            </p>
          </div>
        </SectionCard>
      </div>

      <SectionCard>
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search feedback..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
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
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="service">Service Issue</SelectItem>
              <SelectItem value="bug">Bug Report</SelectItem>
              <SelectItem value="feature_request">Feature Request</SelectItem>
              <SelectItem value="improvement">Improvement</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      <SectionCard>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredFeedback.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MessageSquare className="mb-4 h-12 w-12" />
            <p>No feedback yet</p>
            <p className="text-sm">Your feedback submissions will appear here</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFeedback.map((item: FeedbackItem) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm capitalize">{item.type.replace("_", " ")}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="line-clamp-1 text-sm text-muted-foreground">{item.description}</p>
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
                    <div className="flex items-center justify-end gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={toTenantPath(`${routeBase}/${item.id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-destructive/30 text-destructive hover:bg-destructive/10"
                        disabled={deleteFeedbackMutation.isPending}
                        onClick={() => {
                          if (!window.confirm("Delete this feedback entry?")) return;
                          deleteFeedbackMutation.mutate(item.id);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submit Feedback</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Feedback Type</label>
              <Select value={newFeedback.type} onValueChange={(value) => setNewFeedback({ ...newFeedback, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">Service Issue</SelectItem>
                  <SelectItem value="bug">Bug Report</SelectItem>
                  <SelectItem value="feature_request">Feature Request</SelectItem>
                  <SelectItem value="improvement">Improvement</SelectItem>
                  <SelectItem value="general">General Feedback</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={newFeedback.title}
                onChange={(event) => setNewFeedback({ ...newFeedback, title: event.target.value })}
                placeholder="Brief description of the issue or request"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={newFeedback.description}
                onChange={(event) => setNewFeedback({ ...newFeedback, description: event.target.value })}
                placeholder="Provide detailed workflow context, expected behavior, and actual behavior..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Select value={newFeedback.priority} onValueChange={(value) => setNewFeedback({ ...newFeedback, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => submitFeedbackMutation.mutate(newFeedback)}
              disabled={!newFeedback.title || !newFeedback.description || submitFeedbackMutation.isPending}
            >
              {submitFeedbackMutation.isPending ? "Submitting..." : "Submit Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
