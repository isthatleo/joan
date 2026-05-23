import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export function useBroadcastNotifications() {
  const { user } = useAuthStore();

  // Fetch unread broadcasts on mount
  const { data: broadcastsData, refetch } = useQuery({
    queryKey: ["unread-broadcasts", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const response = await fetch(
        `/api/messages?userId=${user.id}&type=unread-broadcasts`
      );
      if (!response.ok) throw new Error("Failed to fetch broadcasts");
      return response.json();
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Show toast notifications for unread broadcasts when user logs in
  useEffect(() => {
    if (broadcastsData?.broadcasts && broadcastsData.broadcasts.length > 0) {
      broadcastsData.broadcasts.slice(0, 3).forEach((broadcastRead: any) => {
        const broadcastInfo = broadcastRead.broadcast;
        const sender = broadcastInfo.sender?.fullName || broadcastInfo.sender?.email || "Unknown sender";

        toast.info(broadcastInfo.title, {
          description: `${broadcastInfo.message}\nFrom: ${sender}`,
          position: "top-right",
          duration: 6000,
          action: {
            label: "Mark as Read",
            onClick: async () => {
              try {
                await fetch("/api/messages", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    type: "mark-broadcast-read",
                    broadcastId: broadcastRead.broadcastId,
                    userId: user?.id,
                  }),
                });
                refetch();
              } catch (error) {
                console.error("Failed to mark broadcast as read", error);
              }
            },
          },
        });
      });
    }
  }, [broadcastsData, user?.id, refetch]);

  return { broadcasts: broadcastsData?.broadcasts || [] };
}

