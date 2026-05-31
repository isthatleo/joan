"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
} from "@/components/ui";
import { DialogDescription } from "@/components/ui/dialog";
import { AlertCircle, Send } from "lucide-react";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  tenantId?: string;
  userName?: string;
  userEmail?: string;
  feedbackType?: "platform" | "service"; // "platform" = system/feature feedback, "service" = patient about service
  title?: string;
  description?: string;
}

export function FeedbackDialog({
  open,
  onOpenChange,
  userId,
  tenantId,
  userName,
  userEmail,
  feedbackType = "platform",
  title = "Send Feedback",
  description = feedbackType === "service"
    ? "Share your feedback about the service or staff you received"
    : "Help us improve by sharing your feedback about bugs, features, or suggestions",
}: FeedbackDialogProps) {
  const [formData, setFormData] = useState({
    type: feedbackType === "service" ? "service_delivery" : "bug",
    title: "",
    description: "",
    priority: "medium",
  });

  const feedbackTypes =
    feedbackType === "service"
      ? [
          { value: "general", label: "General Feedback" },
          { value: "service_delivery", label: "Service Delivery" },
          { value: "staff_conduct", label: "Staff Conduct" },
          { value: "wait_time", label: "Wait Time" },
          { value: "care_quality", label: "Care Quality" },
          { value: "billing", label: "Billing/Payments" },
          { value: "service_improvement", label: "Service Improvement" },
        ]
      : [
          { value: "bug", label: "Bug Report" },
          { value: "feature_request", label: "Feature Request" },
          { value: "feature_improvement", label: "Feature Improvement" },
          { value: "platform_general", label: "Other Platform Feedback" },
        ];

  const createFeedbackMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit feedback");
      }

      return response.json();
    },
    onSuccess: () => {
      setFormData({
        type: feedbackType === "service" ? "service_delivery" : "bug",
        title: "",
        description: "",
        priority: "medium",
      });
      onOpenChange(false);
    },
  });

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      alert("Please enter a title");
      return;
    }

    createFeedbackMutation.mutate({
      userId,
      tenantId,
      userName,
      userEmail,
      type: formData.type,
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      // mark service feedback so it is routed to hospital admins
      patientFeedback: feedbackType === "service",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type Field */}
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {feedbackTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title Field */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Brief summary of your feedback"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              {formData.title.length}/100
            </p>
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Provide more details about your feedback..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {formData.description.length}/500
            </p>
          </div>

          {/* Priority Field (for platform feedback) */}
          {feedbackType === "platform" && (
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger id="priority">
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
          )}

          {/* Info Alert */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-900">
              {feedbackType === "service"
                ? "This is tenant service feedback and will be reviewed by the hospital admin team."
                : "This is platform/product feedback and will be reviewed by super admins."}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createFeedbackMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !formData.title.trim() || createFeedbackMutation.isPending
            }
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {createFeedbackMutation.isPending ? "Submitting..." : "Submit Feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

