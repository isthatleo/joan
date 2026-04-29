"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/auth";
import {
  PageHeader,
  SectionCard,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Badge,
  Skeleton,
} from "@/components/ui";
import {
  Megaphone,
  Send,
  Users,
  Building2,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface Broadcast {
  id: string;
  message: string;
  createdAt: string;
  receiver: {
    id: string;
    fullName?: string;
    email: string;
  };
  type: string;
}

export default function BroadcastsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("compose");
  const [broadcastData, setBroadcastData] = useState({
    target: "",
    message: "",
  });

  const userRole = user?.role || "patient";
  const canBroadcast = ["super_admin", "hospital_admin"].includes(userRole);

  // Fetch broadcasts
  const { data: broadcastsData, isLoading: broadcastsLoading } = useQuery({
    queryKey: ["broadcasts", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/messages?userId=${user?.id}&type=broadcasts`);
      if (!response.ok) throw new Error("Failed to fetch broadcasts");
      return response.json();
    },
    enabled: !!user?.id && canBroadcast,
  });

  // Send broadcast mutation
  const sendBroadcastMutation = useMutation({
    mutationFn: async (data: typeof broadcastData) => {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: user?.id,
          message: data.message,
          type: "broadcast",
          ...(data.target === "role" ? { roleTarget: "doctor" } : // Default to doctors, can be expanded
             data.target === "tenant" ? { tenantTarget: true } :
             data.target === "all" ? { allUsers: true } : {}),
        }),
      });
      if (!response.ok) throw new Error("Failed to send broadcast");
      return response.json();
    },
    onSuccess: () => {
      setBroadcastData({ target: "", message: "" });
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
    },
  });

  const broadcasts = broadcastsData?.broadcasts || [];

  const handleSendBroadcast = () => {
    if (broadcastData.message.trim() && broadcastData.target) {
      sendBroadcastMutation.mutate(broadcastData);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <p>Please log in to access broadcasts</p>
      </div>
    );
  }

  if (!canBroadcast) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Access Restricted</h3>
          <p className="text-muted-foreground">
            Only administrators can send broadcast messages
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Broadcasts & Communications"
        subtitle="Send important messages to your team or organization"
      />

      <div className="flex justify-center mb-6">
        <div className="inline-flex flex-wrap gap-2 p-1 bg-muted rounded-full">
          {[
            { id: "compose", label: "Compose Message" },
            { id: "history", label: "Message History" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-full transition-all duration-200",
                activeTab === tab.id
                  ? "bg-orange-500 text-white shadow-sm dark:bg-orange-600"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "compose" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compose Form */}
            <SectionCard title="Send Broadcast" icon={Megaphone}>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Select
                    value={broadcastData.target}
                    onValueChange={(value) => setBroadcastData({ ...broadcastData, target: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select who to message" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tenant">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          All users in my hospital
                        </div>
                      </SelectItem>
                      <SelectItem value="role">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          All doctors
                        </div>
                      </SelectItem>
                      {userRole === "super_admin" && (
                        <SelectItem value="all">
                          <div className="flex items-center gap-2">
                            <Megaphone className="h-4 w-4" />
                            All users in all hospitals
                          </div>
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    value={broadcastData.message}
                    onChange={(e) => setBroadcastData({ ...broadcastData, message: e.target.value })}
                    placeholder="Enter your broadcast message..."
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    This message will be sent to all selected recipients
                  </p>
                </div>

                <Button
                  onClick={handleSendBroadcast}
                  disabled={!broadcastData.target || !broadcastData.message.trim() || sendBroadcastMutation.isPending}
                  className="w-full inline-flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {sendBroadcastMutation.isPending ? "Sending..." : "Send Broadcast"}
                </Button>
              </div>
            </SectionCard>

            {/* Preview */}
            <SectionCard title="Message Preview" icon={MessageSquare}>
              <div className="space-y-4">
                <div className="p-4 border border-border rounded-lg bg-muted/50">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                      {user.fullName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {user.fullName || "Administrator"}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {userRole.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Broadcasting to: {
                          broadcastData.target === "tenant" ? "Hospital Staff" :
                          broadcastData.target === "role" ? "All Doctors" :
                          broadcastData.target === "all" ? "All Users" :
                          "Select audience"
                        }
                      </p>
                      <div className="p-3 bg-background rounded-lg border">
                        <p className="text-sm">
                          {broadcastData.message || "Your message will appear here..."}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date().toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-2">Broadcast Guidelines:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Use broadcasts for important announcements only</li>
                    <li>• Recipients cannot reply to broadcast messages</li>
                    <li>• Messages are delivered instantly to all recipients</li>
                    <li>• Consider the urgency and relevance to recipients</li>
                  </ul>
                </div>
              </div>
            </SectionCard>
          </div>
      )}

      {activeTab === "history" && (
        <SectionCard title="Broadcast History" icon={Clock}>
            {broadcastsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-4 border border-border rounded-lg">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : broadcasts.length === 0 ? (
              <div className="text-center py-8">
                <Megaphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No broadcasts sent yet</p>
                <p className="text-sm text-muted-foreground">
                  Your broadcast messages will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {broadcasts.map((broadcast) => (
                  <div key={broadcast.id} className="p-4 border border-border rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                        {user.fullName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {user.fullName || "Administrator"}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            Broadcast
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(broadcast.createdAt), "MMM dd, HH:mm")}
                          </span>
                        </div>
                        <p className="text-sm mb-2">{broadcast.message}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle className="h-3 w-3" />
                          Sent to {broadcast.receiver.fullName || broadcast.receiver.email}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
      )}
    </div>
  );
}
