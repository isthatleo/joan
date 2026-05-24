"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/auth";
import {
  Button,
  Badge,
  Skeleton,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { StatCard } from "@/components/StatCard";
import {
  Bell,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Calendar,
  Users,
  Settings,
  CheckCheck,
  Clock,
  EyeOff,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { NotificationDialog } from "@/components/NotificationDialog";

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

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);

  // Fetch notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/notifications?userId=${user?.id}`);
      if (!response.ok) throw new Error("Failed to fetch notifications");
      return response.json();
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to mark as read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["notification-count", user?.id] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/notifications/mark-all-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id }),
      });
      if (!response.ok) throw new Error("Failed to mark all as read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification-count"] });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete notification");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification-count"] });
    },
  });

  const notifications = notificationsData?.notifications || [];
  const stats = notificationsData?.stats || {
    total: 0,
    unread: 0,
    read: 0,
    appointments: 0,
    messages: 0,
    system: 0,
    alerts: 0,
    broadcasts: 0,
  };

  const filteredNotifications = notifications.filter((n: Notification) => {
    if (activeTab === "overview") return true;
    if (activeTab === "unread") return !n.read;
    if (activeTab === "read") return n.read;
    return n.type === activeTab;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "appointment":
        return <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-300" />;
      case "message":
        return <MessageSquare className="h-4 w-4 text-violet-600 dark:text-violet-300" />;
      case "alert":
        return <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-300" />;
      case "broadcast":
        return <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />;
      default:
        return <Bell className="h-4 w-4 text-slate-600 dark:text-slate-300" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "appointment":
        return "bg-blue-50/80 border-blue-200 dark:bg-blue-500/10 dark:border-blue-400/20";
      case "message":
        return "bg-violet-50/80 border-violet-200 dark:bg-violet-500/10 dark:border-violet-400/20";
      case "alert":
        return "bg-red-50/80 border-red-200 dark:bg-red-500/10 dark:border-red-400/20";
      case "broadcast":
        return "bg-emerald-50/80 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-400/20";
      default:
        return "bg-slate-50/80 border-slate-200 dark:bg-slate-500/10 dark:border-slate-400/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Notifications
          </p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Stay updated with important messages, appointments, and alerts
          </p>
        </div>
        {stats.unread > 0 && (
          <Button
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            variant="outline"
          >
            Mark all as read
          </Button>
        )}
      </div>

      {/* Stats */}
      {!isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Notifications"
            value={stats.total}
            icon={Bell}
            color="text-blue-600 dark:text-blue-300"
            bgColor="bg-blue-50 dark:bg-blue-500/10"
          />
          <StatCard
            title="Unread"
            value={stats.unread}
            icon={Clock}
            color="text-orange-600 dark:text-orange-300"
            bgColor="bg-orange-50 dark:bg-orange-500/10"
          />
          <StatCard
            title="Messages"
            value={stats.messages}
            icon={MessageSquare}
            color="text-violet-600 dark:text-violet-300"
            bgColor="bg-violet-50 dark:bg-violet-500/10"
          />
          <StatCard
            title="Appointments"
            value={stats.appointments}
            icon={Calendar}
            color="text-emerald-600 dark:text-emerald-300"
            bgColor="bg-emerald-50 dark:bg-emerald-500/10"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card/60 p-2">
        {[
          { id: "overview", label: "All Notifications", count: stats.total },
          { id: "unread", label: "Unread", count: stats.unread },
          { id: "read", label: "Read", count: stats.read },
          { id: "message", label: "Messages", count: stats.messages },
          { id: "appointment", label: "Appointments", count: stats.appointments },
          { id: "alert", label: "Alerts", count: stats.alerts },
          { id: "broadcast", label: "Broadcasts", count: stats.broadcasts },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <Badge
                variant={activeTab === tab.id ? "secondary" : "outline"}
                className="ml-2"
              >
                {tab.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </>
        ) : filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No notifications found</p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notification: Notification) => (
            <div
              key={notification.id}
              className={cn(
                "rounded-2xl border p-4 transition-all cursor-pointer hover:shadow-sm bg-card",
                getNotificationColor(notification.type),
                !notification.read && "border-primary/50 ring-1 ring-primary/15"
              )}
              onClick={() => {
                setSelectedNotification(notification);
                setNotificationDialogOpen(true);
                if (!notification.read) {
                  markAsReadMutation.mutate(notification.id);
                }
              }}
            >
              <div className="flex items-start gap-4">
                <div className="mt-1">{getNotificationIcon(notification.type)}</div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{notification.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(notification.createdAt), "PPp")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!notification.read && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                      <Badge variant={notification.type === "alert" ? "destructive" : "default"}>
                        {notification.type}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Notification Dialog */}
      {selectedNotification && (
        <NotificationDialog
          open={notificationDialogOpen}
          onOpenChange={setNotificationDialogOpen}
          notification={selectedNotification}
          onMarkAsRead={(notificationId) => {
            markAsReadMutation.mutate(notificationId);
          }}
        />
      )}
    </div>
  );
}

