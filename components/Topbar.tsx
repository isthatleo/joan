"use client";
import { useState } from "react";
import {
  Bell,
  MessageSquare,
  User,
  Settings,
  LogOut,
  Sun,
  Moon,
  ChevronRight,
  Home,
  Clock,
  CheckCircle,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter, usePathname } from "next/navigation";
import { useNotificationStore } from "@/stores/notification";
import { useAuthStore } from "@/stores/auth";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface TopbarProps {
  breadcrumbs?: BreadcrumbItem[];
}

export function Topbar({ breadcrumbs = [] }: TopbarProps) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { notifications, markAsRead } = useNotificationStore();
  const { user } = useAuthStore();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadNotifications = notifications.filter((n) => !n.read).length;

  const handleLogout = async () => {
    setShowProfileDropdown(false);
    // Implement logout logic
    router.push("/login");
  };

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
  };

  // Generate breadcrumbs from pathname if not provided
  const generatedBreadcrumbs = breadcrumbs.length > 0 ? breadcrumbs : [
    { label: "Dashboard", href: "/" },
    {
      label: pathname
        .split("/")
        .filter((p) => p)
        .pop()
        ?.replace(/-/g, " ")
        .charAt(0)
        .toUpperCase() +
        pathname
          .split("/")
          .filter((p) => p)
          .pop()
          ?.slice(1)
          .replace(/-/g, " ") ||
        "Dashboard",
    },
  ];

  return (
    <div className="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-6 sticky top-0 z-40 backdrop-blur-sm bg-opacity-95">
      {/* Breadcrumbs */}
      <div className="flex items-center space-x-1">
        {generatedBreadcrumbs.map((crumb, index) => (
          <div key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-gray-400 mx-2" />
            )}
            {crumb.href ? (
              <a
                href={crumb.href}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                {crumb.label}
              </a>
            ) : (
              <span className="text-sm text-gray-900 dark:text-white font-medium">
                {crumb.label}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          title="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          ) : (
            <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          )}
        </button>

        {/* Messages */}
        <button
          onClick={() => {
            router.push("/messages");
          }}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors relative"
          title="Messages"
        >
          <MessageSquare className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {unreadNotifications}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 z-50">
              {/* Header */}
              <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Notifications
                </h3>
                {unreadNotifications > 0 && (
                  <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-2 py-1 rounded-full">
                    {unreadNotifications} new
                  </span>
                )}
              </div>

              {/* Notifications List */}
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">
                      No notifications yet
                    </p>
                  </div>
                ) : (
                  notifications.slice(0, 8).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleNotificationClick(n.id)}
                      className={`w-full text-left p-4 border-b border-gray-100 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${
                        !n.read
                          ? "bg-blue-50 dark:bg-blue-900 bg-opacity-20"
                          : ""
                      }`}
                    >
                      <div className="flex gap-3">
                        <div
                          className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            !n.read
                              ? "bg-blue-600"
                              : "bg-gray-300 dark:bg-gray-600"
                          }`}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {n.message}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {new Date().toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="p-4 border-t border-gray-200 dark:border-slate-700 text-center">
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      router.push("/notifications");
                    }}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                  >
                    View all notifications
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            title="Profile"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-sm">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {user?.fullName || "User"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {user?.role || "Staff"}
              </p>
            </div>
          </button>

          {showProfileDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 z-50">
              {/* User Info */}
              <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                <p className="font-semibold text-gray-900 dark:text-white">
                  {user?.fullName || "User"}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {user?.email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 capitalize">
                  {user?.role || "Staff"}
                </p>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                <button
                  onClick={() => {
                    setShowProfileDropdown(false);
                    router.push("/profile");
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors text-gray-700 dark:text-gray-300"
                >
                  <User className="w-4 h-4" />
                  <span>My Profile</span>
                </button>
                <button
                  onClick={() => {
                    setShowProfileDropdown(false);
                    router.push("/settings");
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors text-gray-700 dark:text-gray-300"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>

                <hr className="my-2 border-gray-200 dark:border-slate-600" />

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900 dark:hover:bg-opacity-20 flex items-center gap-3 transition-colors text-red-600 dark:text-red-400"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
