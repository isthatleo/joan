"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/auth";
import {
  PageHeader,
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
import { cn } from "@/lib/utils";
import { NotificationDialog } from "@/components/NotificationDialog";
import { formatDateTimeForUser } from "@/lib/time-format";

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
    refetchInterval: 30000, // Refetch every 30 seconds
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
      // Force refetch of all notification-related queries
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification-count"] });
      // Also invalidate the specific user queries
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

  const notifications: Notification[] = notificationsData?.notifications || [];

  const filteredNotifications = notifications.filter((notification: Notification) => {
    if (activeTab === "overview") return false; // Overview doesn't show individual notifications
    // Map tab names to notification types
    const typeMapping: Record<string, string> = {
      messages: "message",
      appointments: "appointment",
      alerts: "alert",
      broadcasts: "broadcast",
      system: "system"
    };
    return notification.type === typeMapping[activeTab];
  });

  const unreadCount = notifications.filter((n: Notification) => !n.read).length;
  const totalCount = notifications.length;
  const messageCount = notifications.filter(n => n.type === "message").length;
  const appointmentCount = notifications.filter(n => n.type === "appointment").length;
  const systemCount = notifications.filter(n => n.type === "system").length;
  const alertCount = notifications.filter(n => n.type === "alert").length;
  const broadcastCount = notifications.filter(n => n.type === "broadcast").length;
  const recentCount = notifications.filter(n => {
    const notificationDate = new Date(n.createdAt);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return notificationDate >= yesterday;
  }).length;

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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return formatDateTimeForUser(date, { month: "short", day: "2-digit" });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <p>Please log in to view notifications</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Notifications"
        subtitle="Stay updated with important messages and alerts"
        actions={
          unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          )
        }
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        <StatCard
          title="Total"
          value={totalCount}
          icon={Bell}
          tone="neutral"
          subtitle={`${unreadCount} unread`}
        />
        <StatCard
          title="Unread"
          value={unreadCount}
          icon={EyeOff}
          tone="warning"
          subtitle="Requires attention"
        />
        <StatCard
          title="Messages"
          value={messageCount}
          icon={MessageSquare}
          tone="info"
        />
        <StatCard
          title="Appointments"
          value={appointmentCount}
          icon={Calendar}
          tone="success"
        />
        <StatCard
          title="System"
          value={systemCount}
          icon={Settings}
          tone="neutral"
        />
        <StatCard
          title="Alerts"
          value={alertCount}
          icon={AlertCircle}
          tone="destructive"
        />
        <StatCard
          title="Broadcasts"
          value={broadcastCount}
          icon={Users}
          tone="info"
        />
        <StatCard
          title="Recent"
          value={recentCount}
          icon={Clock}
          tone="neutral"
          subtitle="Last 24h"
        />
      </div>

      {/* Pill Navigation */}
      <div className="flex justify-center">
        <div className="inline-flex flex-wrap gap-2 rounded-full border border-border bg-card/70 p-1.5 shadow-sm">
          {[
            { id: "overview", label: "Overview", count: null },
            { id: "messages", label: "Messages", count: messageCount },
            { id: "appointments", label: "Appointments", count: appointmentCount },
            { id: "system", label: "System", count: systemCount },
            { id: "alerts", label: "Alerts", count: alertCount },
            { id: "broadcasts", label: "Broadcasts", count: broadcastCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-full transition-all duration-200",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {tab.count}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content Sections */}
      <div className="mt-8">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Overview Main Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Recent Activity Card */}
              <Card className="border-border bg-card hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-500/10">
                      <Clock className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Recent Activity</h3>
                      <p className="text-xs text-muted-foreground">Last 24 hours</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-1 text-2xl font-bold text-blue-600 dark:text-blue-300">
                    {recentCount}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {recentCount === 1 ? "notification" : "notifications"} received
                  </p>
                </CardContent>
              </Card>

              {/* Unread Priority Card */}
              <Card className="border-border bg-card hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-red-50 p-2 dark:bg-red-500/10">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-300" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Priority Items</h3>
                      <p className="text-xs text-muted-foreground">Requires attention</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-1 text-2xl font-bold text-red-600 dark:text-red-300">
                    {unreadCount}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    unread {unreadCount === 1 ? "item" : "items"}
                  </p>
                </CardContent>
              </Card>

              {/* Communication Hub Card */}
              <Card className="border-border bg-card hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-500/10">
                      <MessageSquare className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Communication Hub</h3>
                      <p className="text-xs text-muted-foreground">Messages & broadcasts</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-1 text-2xl font-bold text-emerald-600 dark:text-emerald-300">
                    {messageCount + broadcastCount}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    active conversations
                  </p>
                </CardContent>
              </Card>

              {/* System Status Card */}
              <Card className="border-border bg-card hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-violet-50 p-2 dark:bg-violet-500/10">
                      <Settings className="h-5 w-5 text-violet-600 dark:text-violet-300" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">System Status</h3>
                      <p className="text-xs text-muted-foreground">Updates & alerts</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-1 text-2xl font-bold text-violet-600 dark:text-violet-300">
                    {systemCount + alertCount}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    system {systemCount + alertCount === 1 ? "notification" : "notifications"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions Section */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <p className="text-sm text-muted-foreground">Common notification tasks</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    className="justify-start h-auto p-4"
                    onClick={() => markAllAsReadMutation.mutate()}
                    disabled={markAllAsReadMutation.isPending || unreadCount === 0}
                  >
                    <CheckCheck className="h-5 w-5 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">Mark All Read</div>
                      <div className="text-xs text-muted-foreground">
                        Clear all unread notifications
                      </div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-auto p-4"
                    onClick={() => setActiveTab("messages")}
                  >
                    <MessageSquare className="h-5 w-5 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">View Messages</div>
                      <div className="text-xs text-muted-foreground">
                        Check your conversations
                      </div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-auto p-4"
                    onClick={() => setActiveTab("appointments")}
                  >
                    <Calendar className="h-5 w-5 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">Schedule</div>
                      <div className="text-xs text-muted-foreground">
                        View upcoming appointments
                      </div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab !== "overview" && (
          <>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Card key={i}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-6 w-6 rounded-full" />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4 mb-4" />
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No notifications</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    {activeTab === "unread"
                      ? "You're all caught up! No unread notifications."
                      : `No ${activeTab} notifications yet. We'll notify you when there are updates.`}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredNotifications.map((notification) => {
                  const IconComponent = getNotificationIcon(notification.type);
                  return (
                    <Card
                      key={notification.id}
                      className={cn(
                        "group cursor-pointer border-border bg-card transition-all duration-200 hover:shadow-lg",
                        !notification.read && "ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/10"
                      )}
                      onClick={() => {
                        setSelectedNotification(notification);
                        setNotificationDialogOpen(true);
                      }}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-lg bg-muted",
                              getNotificationColor(notification.type)
                            )}>
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm">{notification.title}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs capitalize">
                                  {notification.type}
                                </Badge>
                                {!notification.read && (
                                  <div className="h-2 w-2 bg-primary rounded-full" />
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsReadMutation.mutate(notification.id);
                            }}
                            disabled={markAsReadMutation.isPending}
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {notification.read ? (
                              <CheckCircle className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-primary" />
                            )}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatTime(notification.createdAt)}</span>
                          </div>
                          {notification.metadata?.senderName && (
                            <span>From: {notification.metadata.senderName}</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Notification Detail Dialog */}
      {selectedNotification && (
        <NotificationDialog
          open={notificationDialogOpen}
          onOpenChange={setNotificationDialogOpen}
          notification={selectedNotification}
          onMarkAsRead={() => markAsReadMutation.mutate(selectedNotification.id)}
        />
      )}
    </div>
  );
}
