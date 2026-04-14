"use client";
import { useState } from "react";
import { Bell, MessageSquare, User, Settings, LogOut, Sun, Moon, ChevronRight } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useNotificationStore } from "@/stores/notification";

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
  const { notifications } = useNotificationStore();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadNotifications = notifications.filter(n => !n.read).length;

  const handleLogout = async () => {
    // Implement logout logic
    router.push("/login");
  };

  return (
    <div className="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-6">
      {/* Breadcrumbs */}
      <div className="flex items-center space-x-2">
        {breadcrumbs.map((crumb, index) => (
          <div key={index} className="flex items-center">
            {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400 mx-2" />}
            {crumb.href ? (
              <a href={crumb.href} className="text-blue-600 hover:text-blue-800">
                {crumb.label}
              </a>
            ) : (
              <span className="text-gray-900 dark:text-white font-medium">
                {crumb.label}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Right side actions */}
      <div className="flex items-center space-x-4">
        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>

        {/* Messages */}
        <button
          onClick={() => router.push("/messages")}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 relative"
        >
          <MessageSquare className="w-5 h-5" />
          {/* Add unread count if needed */}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 relative"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadNotifications}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-50">
              <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                <h3 className="font-semibold">Notifications</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No notifications
                  </div>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <div key={n.id} className="p-4 border-b border-gray-100 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700">
                      <p className="text-sm">{n.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date().toLocaleTimeString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-slate-700">
                <button
                  onClick={() => router.push("/notifications")}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          </button>

          {showProfileDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-50">
              <div className="py-2">
                <button
                  onClick={() => router.push("/profile")}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center space-x-2"
                >
                  <User className="w-4 h-4" />
                  <span>My Profile</span>
                </button>
                <button
                  onClick={() => router.push("/settings")}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center space-x-2"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>
                <hr className="my-2 border-gray-200 dark:border-slate-600" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center space-x-2 text-red-600"
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
