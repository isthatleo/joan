"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Switch, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Label } from "@/components/ui";
import { Bell, Lock, Palette, Save } from "lucide-react";
import { toast } from "sonner";

interface UserSettings {
  notifications: { email: boolean; push: boolean; sms: boolean; };
  privacy: { profileVisibility: "public" | "private" | "contacts"; dataSharing: boolean; analytics: boolean; };
  appearance: { theme: "light" | "dark" | "system"; language: string; timezone: string; };
  security: { twoFactorEnabled: boolean; sessionTimeout: number; loginAlerts: boolean; };
}

const DEFAULT_SETTINGS: UserSettings = {
  notifications: { email: true, push: true, sms: false },
  privacy: { profileVisibility: "private", dataSharing: false, analytics: true },
  appearance: { theme: "system", language: "en", timezone: "UTC" },
  security: { twoFactorEnabled: false, sessionTimeout: 30, loginAlerts: true },
};

export default function UserSettingsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: fetchedSettings, isLoading } = useQuery({
    queryKey: ["user-settings", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/users/settings?userId=${user?.id}`);
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json();
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (fetchedSettings) {
      setSettings(fetchedSettings);
    }
  }, [fetchedSettings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: UserSettings) => {
      const response = await fetch(`/api/users/settings?userId=${user?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });
      if (!response.ok) throw new Error("Failed to update settings");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-settings"] });
      setHasChanges(false);
      toast.success("Settings saved successfully");
    },
    onError: () => toast.error("Failed to save settings"),
  });

  const handleChange = (path: string, value: any) => {
    const [section, key] = path.split(".");
    setSettings(prev => ({
      ...prev,
      [section]: { ...prev[section as keyof UserSettings], [key]: value }
    }));
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your Settings"
        description="Manage your account preferences and notification settings"
        actions={
          <Button
            onClick={() => updateSettingsMutation.mutate(settings)}
            disabled={!hasChanges || updateSettingsMutation.isPending}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        }
      />

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Configure how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Email Notifications</Label>
            <Switch
              checked={settings.notifications.email}
              onCheckedChange={(checked) => handleChange("notifications.email", checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Push Notifications</Label>
            <Switch
              checked={settings.notifications.push}
              onCheckedChange={(checked) => handleChange("notifications.push", checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>SMS Notifications</Label>
            <Switch
              checked={settings.notifications.sms}
              onCheckedChange={(checked) => handleChange("notifications.sms", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>Customize your interface</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Theme</Label>
            <Select value={settings.appearance.theme} onValueChange={(value: any) => handleChange("appearance.theme", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Language</Label>
            <Select value={settings.appearance.language} onValueChange={(value) => handleChange("appearance.language", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select value={settings.appearance.timezone} onValueChange={(value) => handleChange("appearance.timezone", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="America/New_York">Eastern Time</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy</CardTitle>
          <CardDescription>Control your privacy settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Profile Visibility</Label>
            <Select value={settings.privacy.profileVisibility} onValueChange={(value: any) => handleChange("privacy.profileVisibility", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="contacts">Contacts Only</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>Share Data for Analytics</Label>
            <Switch
              checked={settings.privacy.analytics}
              onCheckedChange={(checked) => handleChange("privacy.analytics", checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Allow Data Sharing</Label>
            <Switch
              checked={settings.privacy.dataSharing}
              onCheckedChange={(checked) => handleChange("privacy.dataSharing", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>Manage your account security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Two-Factor Authentication</Label>
            <Switch
              checked={settings.security.twoFactorEnabled}
              onCheckedChange={(checked) => handleChange("security.twoFactorEnabled", checked)}
            />
          </div>
          <div className="space-y-2">
            <Label>Session Timeout (minutes)</Label>
            <Select value={settings.security.sessionTimeout.toString()} onValueChange={(value) => handleChange("security.sessionTimeout", parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="240">4 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>Login Alerts</Label>
            <Switch
              checked={settings.security.loginAlerts}
              onCheckedChange={(checked) => handleChange("security.loginAlerts", checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

