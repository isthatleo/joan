"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { MessageSquare } from "lucide-react";
import { FeedbackDialog } from "./FeedbackDialog";
import { useAuthStore } from "@/stores/auth";

interface FeedbackButtonProps {
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  label?: string;
  feedbackType?: "platform" | "service";
}

export function FeedbackButton({
  className,
  variant = "outline",
  size = "sm",
  label = "Send Feedback",
  feedbackType = "platform",
}: FeedbackButtonProps) {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        {size === "icon" ? (
          <MessageSquare className="h-4 w-4" />
        ) : (
          <>
            <MessageSquare className="h-4 w-4" />
            {label}
          </>
        )}
      </Button>

      <FeedbackDialog
        open={open}
        onOpenChange={setOpen}
        userId={user.id}
        tenantId={user.tenantId}
        userName={user.fullName}
        userEmail={user.email}
        feedbackType={feedbackType}
        title={
          feedbackType === "service"
            ? "Service Feedback"
            : "Platform Feedback"
        }
      />
    </>
  );
}

