"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, Home, LogOut, Settings, User } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { authClient } from "@/lib/auth-client";
import { ThemeToggle } from "./theme/ThemeToggle";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { NotificationDialog } from "./NotificationDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface TopbarProps {
  breadcrumbs?: BreadcrumbItem[];
}

/**
 * Auto-derive breadcrumbs from the current pathname when none are passed.
 * "/admin/schools" → [Admin, Schools]
 * "/" → [Dashboard]
 */
function deriveBreadcrumbs(pathname: string): BreadcrumbItem[] {
  if (pathname === "/" || pathname === "") return [{ label: "Dashboard" }];
  const parts = pathname.split("/").filter(Boolean);
  return parts.map((seg, i) => {
    const href = "/" + parts.slice(0, i + 1).join("/");
    const label = seg
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
    return i === parts.length - 1 ? { label } : { label, href };
  });
}

export function Topbar({ breadcrumbs }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const crumbs = useMemo(
    () => (breadcrumbs && breadcrumbs.length ? breadcrumbs : deriveBreadcrumbs(pathname)),
    [breadcrumbs, pathname]
  );

  // Fetch notification count
  const { data: notificationData } = useQuery({
    queryKey: ["notification-count", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/notifications?userId=${user?.id}&countOnly=true`);
      if (!response.ok) throw new Error("Failed to fetch notification count");
      return response.json();
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch notifications for dropdown
  const { data: notificationsData } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/notifications?userId=${user?.id}`);
      if (!response.ok) throw new Error("Failed to fetch notifications");
      return response.json();
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const unreadCount = notificationData?.unreadCount || 0;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return format(date, "MMM dd");
  };

  const handleLogout = async () => {
    try {
      await authClient.signOut();
    } catch (e) {
      // ignore
    }
    logout();
    router.push("/login");
  };

  // Close dropdowns when clicking outside
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (notifOpen && notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false);
      }
      if (profileOpen && profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [notifOpen, profileOpen]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
        <Link href="/" className="text-muted-foreground hover:text-foreground">
          <Home className="h-4 w-4" />
        </Link>
        {crumbs.map((c, i) => (
          <div key={`${c.label}-${i}`} className="flex items-center gap-1.5">
            <span className="text-muted-foreground/60">/</span>
            {c.href ? (
              <Link href={c.href} className="text-muted-foreground hover:text-foreground">
                {c.label}
              </Link>
            ) : (
              <span className="font-medium text-foreground">{c.label}</span>
            )}
          </div>
        ))}
      </nav>

      {/* Right cluster */}
      <div className="flex items-center gap-1">
        <ThemeToggle />

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            aria-label="Notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
            )}
          </button>
          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
                <div className="border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold">Notifications</p>
                  {unreadCount > 0 && (
                    <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto p-2 text-sm text-muted-foreground">
                  {notificationsData?.notifications?.slice(0, 5).map((notification: any) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "rounded-lg px-3 py-2 hover:bg-muted cursor-pointer",
                        !notification.read && "bg-primary/5"
                      )}
                      onClick={() => {
                        setSelectedNotification(notification);
                        setNotificationDialogOpen(true);
                        setNotifOpen(false);
                      }}
                    >
                      <p className="font-medium text-foreground text-sm line-clamp-1">
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                  )) || (
                    <div className="rounded-lg px-3 py-2">
                      <p className="font-medium text-foreground">Welcome to Joan Healthcare OS</p>
                      <p className="text-xs">You're all set. Explore your dashboard.</p>
                    </div>
                  )}
                </div>
                <div className="border-t border-border p-2">
                  <Link
                    href="/notifications"
                    className="block w-full text-center text-sm text-primary hover:underline"
                    onClick={() => setNotifOpen(false)}
                  >
                    View all notifications
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Profile */}
        <div className="relative ml-2" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatar} alt={user?.fullName || "User"} />
              <AvatarFallback className="text-xs font-semibold">
                {(user?.fullName || user?.email || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium leading-tight text-foreground">
                {user?.fullName || "User"}
              </p>
              <p className="text-[11px] capitalize leading-tight text-muted-foreground">
                {(user?.role || "staff").replace(/_/g, " ")}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-border bg-popover py-1 shadow-lg">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
                  onClick={() => setProfileOpen(false)}
                >
                  <User className="h-4 w-4" /> My Profile
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
                  onClick={() => setProfileOpen(false)}
                >
                  <Settings className="h-4 w-4" /> Settings
                </Link>
                <div className="my-1 border-t border-border" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-muted"
                  )}
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Notification Dialog - Moved outside to avoid portal issues */}
      {selectedNotification && (
        <NotificationDialog
          open={notificationDialogOpen}
          onOpenChange={setNotificationDialogOpen}
          notification={selectedNotification}
          onMarkAsRead={(notificationId) => {
            fetch(`/api/notifications/${notificationId}/read`, {
              method: "POST",
            }).then(() => {
              queryClient.invalidateQueries({ queryKey: ["notification-count"] });
              queryClient.invalidateQueries({ queryKey: ["notifications"] });
              setSelectedNotification((prev: any) => (prev ? { ...prev, read: true } : null));
            });
          }}
        />
      )}
    </header>
  );
}
