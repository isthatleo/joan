"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import {
  PageHeader,
  SectionCard,
  Button,
  Input,
  Badge,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import {
  Settings,
  User,
  Bell,
  Shield,
  Palette,
  Clock,
  Mail,
  Phone,
  Calendar,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Key,
  Globe,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface NurseSettings {
  displayName: string;
  license: string;
  specialty: string;
  phone: string;
  email: string;
  bio: string;

  emailNotifications: boolean;
  smsNotifications: boolean;
  taskAlerts: boolean;
  vitalsAlerts: boolean;
  medicationReminders: boolean;

  twoFactorEnabled: boolean;
  sessionTimeout: number;
  passwordLastChanged: string;

  theme: "light" | "dark" | "system";
  language: string;
  timezone: string;
  timeFormat: "12h" | "24h";

  defaultShiftDuration: number;
  workingDays: string[];
  defaultView: string;
  autoRefresh: boolean;
  refreshInterval: number;
}

export default function NurseSettingsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState<NurseSettings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Fetch settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["nurse-settings", slug, user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/nurse/settings?slug=${slug}`);
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json();
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<NurseSettings>) => {
      const response = await fetch("/api/nurse/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updates, slug }),
      });
      if (!response.ok) throw new Error("Failed to update settings");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nurse-settings"] });
      setHasChanges(false);
    },
  });

  useEffect(() => {
    if (settingsData) {
      setSettings(settingsData);
    }
  }, [settingsData]);

  const handleSettingChange = (key: string, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!settings) return;
    updateSettingsMutation.mutate(settings);
  };

  const handleRestoreDefaults = () => {
    const defaultSettings: NurseSettings = {
      displayName: user?.fullName || "",
      license: "",
      specialty: "",
      phone: user?.phone || "",
      email: user?.email || "",
      bio: "",

      emailNotifications: true,
      smsNotifications: true,
      taskAlerts: true,
      vitalsAlerts: true,
      medicationReminders: true,

      twoFactorEnabled: false,
      sessionTimeout: 30,
      passwordLastChanged: new Date().toISOString(),

      theme: "system",
      language: "en",
      timezone: "UTC",
      timeFormat: "24h",

      defaultShiftDuration: 8,
      workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      defaultView: "dashboard",
      autoRefresh: true,
      refreshInterval: 30,
    };

    setSettings(defaultSettings);
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" subtitle="Manage your nursing dashboard settings" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Settings" subtitle="Manage your nursing dashboard settings" />
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRestoreDefaults}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Restore Defaults
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || updateSettingsMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="p-4 rounded-lg border border-orange-200 bg-orange-50">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-orange-600" />
            <span className="text-sm text-orange-900">You have unsaved changes</span>
          </div>
        </div>
      )}

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="shift">Shift Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <SectionCard title="Professional Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                <Input
                  value={settings?.displayName || ""}
                  onChange={(e) => handleSettingChange("displayName", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                <Input
                  value={settings?.license || ""}
                  onChange={(e) => handleSettingChange("license", e.target.value)}
                  placeholder="RN License"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
                <Input
                  value={settings?.specialty || ""}
                  onChange={(e) => handleSettingChange("specialty", e.target.value)}
                  placeholder="e.g., ICU, Pediatrics"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <Input
                  value={settings?.phone || ""}
                  onChange={(e) => handleSettingChange("phone", e.target.value)}
                />
              </div>
            </div>
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <Textarea
                value={settings?.bio || ""}
                onChange={(e) => handleSettingChange("bio", e.target.value)}
                placeholder="Professional biography..."
                rows={4}
              />
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <SectionCard title="Notification Preferences">
            <div className="space-y-6">
              {[
                { key: "emailNotifications", label: "Email Notifications", desc: "Receive notifications via email" },
                { key: "smsNotifications", label: "SMS Notifications", desc: "Critical alerts via text message" },
                { key: "taskAlerts", label: "Task Alerts", desc: "Get notified about new tasks" },
                { key: "vitalsAlerts", label: "Vitals Alerts", desc: "Alert on abnormal vital signs" },
                { key: "medicationReminders", label: "Medication Reminders", desc: "Reminders for medication administration" },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{label}</h4>
                    <p className="text-sm text-gray-500">{desc}</p>
                  </div>
                  <Switch
                    checked={settings?.[key as keyof NurseSettings] as boolean || false}
                    onCheckedChange={(checked) => handleSettingChange(key, checked)}
                  />
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="messages" className="space-y-6">
          <SectionCard title="Messages">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900">New Message Notifications</h4>
                <Switch
                  checked={settings?.smsNotifications || false}
                  onCheckedChange={(checked) => handleSettingChange("smsNotifications", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
                <Switch
                  checked={settings?.emailNotifications || false}
                  onCheckedChange={(checked) => handleSettingChange("emailNotifications", checked)}
                />
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <SectionCard title="Security Settings">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h4>
                  <p className="text-sm text-gray-500">Add an extra layer of security</p>
                </div>
                <Switch
                  checked={settings?.twoFactorEnabled || false}
                  onCheckedChange={(checked) => handleSettingChange("twoFactorEnabled", checked)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Session Timeout (minutes)</label>
                <Select
                  value={settings?.sessionTimeout?.toString() || "30"}
                  onValueChange={(value) => handleSettingChange("sessionTimeout", parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 border-t">
                <Button variant="outline" onClick={() => setShowPasswordModal(true)}>
                  <Key className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <SectionCard title="Display Preferences">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
                <Select value={settings?.theme || "system"} onValueChange={(value: any) => handleSettingChange("theme", value)}>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time Format</label>
                <Select value={settings?.timeFormat || "24h"} onValueChange={(value: any) => handleSettingChange("timeFormat", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12h">12 Hour</SelectItem>
                    <SelectItem value="24h">24 Hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="shift" className="space-y-6">
          <SectionCard title="Shift Settings">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Shift Duration (hours)</label>
                <Select
                  value={settings?.defaultShiftDuration?.toString() || "8"}
                  onValueChange={(value) => handleSettingChange("defaultShiftDuration", parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4 hours</SelectItem>
                    <SelectItem value="6">6 hours</SelectItem>
                    <SelectItem value="8">8 hours</SelectItem>
                    <SelectItem value="12">12 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings?.autoRefresh || false}
                  onCheckedChange={(checked) => handleSettingChange("autoRefresh", checked)}
                />
                <div>
                  <label className="text-sm font-medium text-gray-700">Auto-refresh Dashboard</label>
                  <p className="text-xs text-gray-500">Automatically refresh data</p>
                </div>
              </div>

              {settings?.autoRefresh && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Refresh Interval (seconds)</label>
                  <Select
                    value={settings?.refreshInterval?.toString() || "30"}
                    onValueChange={(value) => handleSettingChange("refreshInterval", parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 seconds</SelectItem>
                      <SelectItem value="30">30 seconds</SelectItem>
                      <SelectItem value="60">1 minute</SelectItem>
                      <SelectItem value="300">5 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
