"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Calendar,
  Users,
  Settings,
  Clock,
  User,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

interface Notification {
  id: string;
  type: "message" | "appointment" | "system" | "alert" | "broadcast";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: {
    senderId?: string;
    senderName?: string;
    appointmentId?: string;
    patientId?: string;
  };
}

interface NotificationDialogProps {
  notification: Notification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkAsRead?: (notificationId: string) => void;
  showViewAllButton?: boolean;
}

export function NotificationDialog({
  notification,
  open,
  onOpenChange,
  onMarkAsRead,
  showViewAllButton = false,
}: NotificationDialogProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(notification);

  // Update selectedNotification when notification prop changes
  useEffect(() => {
    setSelectedNotification(notification);
  }, [notification]);

  if (!notification) return null;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "message":
        return MessageSquare;
      case "appointment":
        return Calendar;
      case "system":
        return Settings;
      case "alert":
        return AlertCircle;
      case "broadcast":
        return Users;
      default:
        return Bell;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "message":
        return "text-blue-500 dark:text-blue-300";
      case "appointment":
        return "text-green-500 dark:text-green-300";
      case "system":
        return "text-violet-500 dark:text-violet-300";
      case "alert":
        return "text-red-500 dark:text-red-300";
      case "broadcast":
        return "text-orange-500 dark:text-orange-300";
      default:
        return "text-slate-500 dark:text-slate-300";
    }
  };

  const getNotificationSurface = (type: string) => {
    switch (type) {
      case "message":
        return "bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-400/20";
      case "appointment":
        return "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-400/20";
      case "system":
        return "bg-violet-50 border-violet-200 dark:bg-violet-500/10 dark:border-violet-400/20";
      case "alert":
        return "bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-400/20";
      case "broadcast":
        return "bg-orange-50 border-orange-200 dark:bg-orange-500/10 dark:border-orange-400/20";
      default:
        return "bg-slate-50 border-slate-200 dark:bg-slate-500/10 dark:border-slate-400/20";
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return format(date, "MMM dd, yyyy 'at' h:mm a");
  };

  const handleMarkAsRead = () => {
    if (onMarkAsRead && !notification.read) {
      onMarkAsRead(notification.id);
      // Update local notification state to reflect read status
      setSelectedNotification(prev => prev ? { ...prev, read: true } : null);
    }
  };

  const handleViewAll = () => {
    onOpenChange(false);
    router.push("/notifications");
  };

  const handleViewDetails = () => {
    onOpenChange(false);
    // Mark as read when viewing details
    if (onMarkAsRead && !notification.read) {
      onMarkAsRead(notification.id);
    }
    // Navigate to specific notification or related page based on type
    switch (notification.type) {
      case "appointment":
        // Navigate to appointment page with details modal
        if (user?.role === "super_admin") {
          router.push(`/super-admin/appointments?appointmentId=${notification.metadata?.appointmentId || ''}&openDetails=true`);
        } else if (user?.role === "admin") {
          router.push(`/admin?appointmentId=${notification.metadata?.appointmentId || ''}&openDetails=true`);
        } else if (user?.role === "doctor") {
          router.push(`/doctor?appointmentId=${notification.metadata?.appointmentId || ''}&openDetails=true`);
        } else {
          router.push(`/appointments?appointmentId=${notification.metadata?.appointmentId || ''}&openDetails=true`);
        }
        break;
      case "message":
        if (notification.metadata?.senderId) {
          router.push(`/messages?userId=${notification.metadata.senderId}`);
        } else {
          router.push("/messages");
        }
        break;
      case "system":
      case "alert":
      case "broadcast":
      default:
        router.push("/notifications");
    }
  };

  const IconComponent = getNotificationIcon(notification.type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-background shadow-xl">
        <DialogHeader>
          <div className="flex items-start gap-3 rounded-2xl border border-border bg-card/70 p-4">
            <div className={cn(
              "rounded-xl border p-2.5",
              getNotificationSurface(notification.type),
              getNotificationColor(notification.type)
            )}>
              <IconComponent className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-left pr-8">{notification.title}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs capitalize">
                  {notification.type}
                </Badge>
                {!selectedNotification.read && (
                  <div className="h-2 w-2 bg-primary rounded-full" />
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <DialogDescription className="rounded-2xl border border-border bg-card/60 p-4 text-left text-sm leading-relaxed text-foreground/90">
            {notification.message}
          </DialogDescription>

          <div className="space-y-2 rounded-2xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <span>{formatTime(notification.createdAt)}</span>
            </div>
            {notification.metadata?.senderName && (
              <div className="flex items-center gap-2">
                <User className="h-3 w-3" />
                <span>From: {notification.metadata.senderName}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {showViewAllButton && (
            <Button variant="outline" onClick={handleViewAll} className="w-full border-border bg-background sm:w-auto">
              View All Notifications
            </Button>
          )}
          <Button onClick={handleViewDetails} className="w-full sm:w-auto">
            View Details
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          {!selectedNotification.read && onMarkAsRead && (
            <Button
              variant="ghost"
              onClick={handleMarkAsRead}
              className="w-full sm:w-auto"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Read
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
