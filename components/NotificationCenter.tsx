"use client";
import { useNotificationStore } from "@/stores/notification";
import { X } from "lucide-react";

export function NotificationCenter() {
  const { notifications, markAsRead } = useNotificationStore();

  return (
    <div className="fixed bottom-4 right-4 space-y-2 max-w-sm">
      {notifications.slice(0, 3).map((n) => (
        <div
          key={n.id}
          className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg"
        >
          <div className="flex justify-between items-start">
            <p>{n.message}</p>
            <button
              onClick={() => markAsRead(n.id)}
              className="hover:bg-gray-200 p-1 rounded"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
