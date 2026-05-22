"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Switch,
  Skeleton,
  Alert,
  AlertDescription,
} from "@/components/ui";
import { MessageSquare, Shield, Info } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface MessagingSettingsData {
  allowAllStaffMessaging: boolean;
  allowPatientMessaging: boolean;
  allowGuardianMessaging: boolean;
}

export function MessagingSettingsComponent() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<MessagingSettingsData>({
    allowAllStaffMessaging: false,
    allowPatientMessaging: false,
    allowGuardianMessaging: false,
  });

  // Fetch settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["messaging-settings", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/messaging-settings?userId=${user?.id}`);
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json();
    },
    enabled: !!user?.id && user?.role === "hospital_admin",
  });

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (newSettings: MessagingSettingsData) => {
      const response = await fetch("/api/messaging-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          ...newSettings,
        }),
      });
      if (!response.ok) throw new Error("Failed to update settings");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messaging-settings"] });
      toast.success("Messaging settings updated successfully");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update settings");
    },
  });

  // Update local settings when data comes in
  useEffect(() => {
    if (settingsData?.settings) {
      setSettings(settingsData.settings);
    }
  }, [settingsData]);

  const handleToggle = (key: keyof MessagingSettingsData) => {
    const newSettings = {
      ...settings,
      [key]: !settings[key],
    };
    setSettings(newSettings);
    updateMutation.mutate(newSettings);
  };

  if (user?.role !== "hospital_admin") {
    return (
      <Alert>
        <AlertDescription>
          Only hospital administrators can access messaging settings.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Messaging Permissions
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Configure who can message you and how your hospital staff can communicate
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Staff Messaging Permissions
          </CardTitle>
          <CardDescription>
            Control whether hospital staff can initiate messages with you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div>
                  <p className="font-medium text-sm">Allow All Staff to Message</p>
                  <p className="text-xs text-muted-foreground">
                    Doctors, nurses, technicians, pharmacists, receptionists, and accountants can start conversations
                  </p>
                </div>
                <Switch
                  checked={settings.allowAllStaffMessaging}
                  onCheckedChange={() => handleToggle("allowAllStaffMessaging")}
                  disabled={updateMutation.isPending}
                />
              </div>

              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div>
                  <p className="font-medium text-sm">Allow Patients to Message</p>
                  <p className="text-xs text-muted-foreground">
                    Patients can initiate direct messages with you
                  </p>
                </div>
                <Switch
                  checked={settings.allowPatientMessaging}
                  onCheckedChange={() => handleToggle("allowPatientMessaging")}
                  disabled={updateMutation.isPending}
                />
              </div>

              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div>
                  <p className="font-medium text-sm">Allow Guardians to Message</p>
                  <p className="text-xs text-muted-foreground">
                    Parents and guardians can initiate direct messages with you
                  </p>
                </div>
                <Switch
                  checked={settings.allowGuardianMessaging}
                  onCheckedChange={() => handleToggle("allowGuardianMessaging")}
                  disabled={updateMutation.isPending}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Default Behavior:</strong> By default, only doctors, nurses, lab technicians, pharmacists, receptionists, and accountants can reply to your messages. Enable "Allow All Staff to Message" to let them start conversations with you.
        </AlertDescription>
      </Alert>
    </div>
  );
}

