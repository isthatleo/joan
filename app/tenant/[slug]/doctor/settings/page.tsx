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
  Monitor,
  Moon,
  Sun,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface DoctorSettings {
  // Profile Settings
  displayName: string;
  title: string;
  specialty: string;
  licenseNumber: string;
  phone: string;
  email: string;
  bio: string;

  // Notification Settings
  emailNotifications: boolean;
  smsNotifications: boolean;
  appointmentReminders: boolean;
  labResultAlerts: boolean;
  prescriptionAlerts: boolean;
  systemUpdates: boolean;

  // Security Settings
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  passwordLastChanged: string;

  // Preferences
  theme: "light" | "dark" | "system";
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: "12h" | "24h";

  // Clinical Settings
  defaultAppointmentDuration: number;
  workingHours: {
    monday: { start: string; end: string; enabled: boolean };
    tuesday: { start: string; end: string; enabled: boolean };
    wednesday: { start: string; end: string; enabled: boolean };
    thursday: { start: string; end: string; enabled: boolean };
    friday: { start: string; end: string; enabled: boolean };
    saturday: { start: string; end: string; enabled: boolean };
    sunday: { start: string; end: string; enabled: boolean };
  };

  // Dashboard Settings
  defaultView: string;
  itemsPerPage: number;
  autoRefresh: boolean;
  refreshInterval: number;
}

export default function DoctorSettingsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState<DoctorSettings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Fetch doctor settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["doctor-settings", slug, user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/doctor/settings?slug=${slug}`);
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json();
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<DoctorSettings>) => {
      const response = await fetch("/api/doctor/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updates, slug }),
      });
      if (!response.ok) throw new Error("Failed to update settings");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-settings"] });
      setHasChanges(false);
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await fetch("/api/doctor/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, slug }),
      });
      if (!response.ok) throw new Error("Failed to change password");
      return response.json();
    },
    onSuccess: () => {
      setShowPasswordModal(false);
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

  const handleNestedSettingChange = (parentKey: string, childKey: string, value: any) => {
    if (!settings) return;

    setSettings({
      ...settings,
      [parentKey]: {
        ...settings[parentKey as keyof DoctorSettings] as any,
        [childKey]: value,
      },
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!settings) return;
    updateSettingsMutation.mutate(settings);
  };

  const handleRestoreDefaults = () => {
    // Reset to default settings
    const defaultSettings: DoctorSettings = {
      displayName: user?.fullName || "",
      title: "Dr.",
      specialty: "",
      licenseNumber: "",
      phone: user?.phone || "",
      email: user?.email || "",
      bio: "",

      emailNotifications: true,
      smsNotifications: true,
      appointmentReminders: true,
      labResultAlerts: true,
      prescriptionAlerts: true,
      systemUpdates: false,

      twoFactorEnabled: false,
      sessionTimeout: 30,
      passwordLastChanged: new Date().toISOString(),

      theme: "system",
      language: "en",
      timezone: "UTC",
      dateFormat: "MM/dd/yyyy",
      timeFormat: "12h",

      defaultAppointmentDuration: 30,
      workingHours: {
        monday: { start: "09:00", end: "17:00", enabled: true },
        tuesday: { start: "09:00", end: "17:00", enabled: true },
        wednesday: { start: "09:00", end: "17:00", enabled: true },
        thursday: { start: "09:00", end: "17:00", enabled: true },
        friday: { start: "09:00", end: "17:00", enabled: true },
        saturday: { start: "09:00", end: "12:00", enabled: false },
        sunday: { start: "09:00", end: "12:00", enabled: false },
      },

      defaultView: "dashboard",
      itemsPerPage: 10,
      autoRefresh: true,
      refreshInterval: 30,
    };

    setSettings(defaultSettings);
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" subtitle="Manage your doctor account settings" />
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
        <PageHeader title="Settings" subtitle="Manage your doctor account settings" />
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="clinical">Clinical</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <SectionCard title="Personal Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                <Input
                  value={settings?.displayName || ""}
                  onChange={(e) => handleSettingChange("displayName", e.target.value)}
                  placeholder="Dr. John Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <Select value={settings?.title || ""} onValueChange={(value) => handleSettingChange("title", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dr.">Dr.</SelectItem>
                    <SelectItem value="Prof. Dr.">Prof. Dr.</SelectItem>
                    <SelectItem value="Dr. (MD)">Dr. (MD)</SelectItem>
                    <SelectItem value="Dr. (DO)">Dr. (DO)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
                <Input
                  value={settings?.specialty || ""}
                  onChange={(e) => handleSettingChange("specialty", e.target.value)}
                  placeholder="e.g., Internal Medicine"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                <Input
                  value={settings?.licenseNumber || ""}
                  onChange={(e) => handleSettingChange("licenseNumber", e.target.value)}
                  placeholder="Medical license number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <Input
                  value={settings?.phone || ""}
                  onChange={(e) => handleSettingChange("phone", e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <Input
                  value={settings?.email || ""}
                  onChange={(e) => handleSettingChange("email", e.target.value)}
                  type="email"
                />
              </div>
            </div>
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <Textarea
                value={settings?.bio || ""}
                onChange={(e) => handleSettingChange("bio", e.target.value)}
                placeholder="Brief professional biography..."
                rows={4}
              />
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <SectionCard title="Notification Preferences">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
                  <p className="text-sm text-gray-500">Receive notifications via email</p>
                </div>
                <Switch
                  checked={settings?.emailNotifications || false}
                  onCheckedChange={(checked) => handleSettingChange("emailNotifications", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">SMS Notifications</h4>
                  <p className="text-sm text-gray-500">Receive notifications via text message</p>
                </div>
                <Switch
                  checked={settings?.smsNotifications || false}
                  onCheckedChange={(checked) => handleSettingChange("smsNotifications", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Appointment Reminders</h4>
                  <p className="text-sm text-gray-500">Get reminded about upcoming appointments</p>
                </div>
                <Switch
                  checked={settings?.appointmentReminders || false}
                  onCheckedChange={(checked) => handleSettingChange("appointmentReminders", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Lab Result Alerts</h4>
                  <p className="text-sm text-gray-500">Notifications for new lab results</p>
                </div>
                <Switch
                  checked={settings?.labResultAlerts || false}
                  onCheckedChange={(checked) => handleSettingChange("labResultAlerts", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Prescription Alerts</h4>
                  <p className="text-sm text-gray-500">Alerts for prescription activities</p>
                </div>
                <Switch
                  checked={settings?.prescriptionAlerts || false}
                  onCheckedChange={(checked) => handleSettingChange("prescriptionAlerts", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">System Updates</h4>
                  <p className="text-sm text-gray-500">Notifications about system updates and maintenance</p>
                </div>
                <Switch
                  checked={settings?.systemUpdates || false}
                  onCheckedChange={(checked) => handleSettingChange("systemUpdates", checked)}
                />
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <SectionCard title="Password & Authentication">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h4>
                  <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                </div>
                <Switch
                  checked={settings?.twoFactorEnabled || false}
                  onCheckedChange={(checked) => handleSettingChange("twoFactorEnabled", checked)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <SelectItem value="480">8 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password Last Changed</label>
                  <Input
                    value={settings?.passwordLastChanged ? new Date(settings.passwordLastChanged).toLocaleDateString() : ""}
                    disabled
                  />
                </div>
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
          <SectionCard title="Display & Language">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                <Select value={settings?.language || "en"} onValueChange={(value) => handleSettingChange("language", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <Select value={settings?.timezone || "UTC"} onValueChange={(value) => handleSettingChange("timezone", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time Format</label>
                <Select value={settings?.timeFormat || "12h"} onValueChange={(value: any) => handleSettingChange("timeFormat", value)}>
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

          <SectionCard title="Dashboard Preferences">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default View</label>
                <Select value={settings?.defaultView || "dashboard"} onValueChange={(value) => handleSettingChange("defaultView", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dashboard">Dashboard</SelectItem>
                    <SelectItem value="patients">Patients</SelectItem>
                    <SelectItem value="appointments">Appointments</SelectItem>
                    <SelectItem value="queue">Queue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Items Per Page</label>
                <Select value={settings?.itemsPerPage?.toString() || "10"} onValueChange={(value) => handleSettingChange("itemsPerPage", parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
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
                  <p className="text-xs text-gray-500">Automatically refresh dashboard data</p>
                </div>
              </div>
              {settings?.autoRefresh && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Refresh Interval (seconds)</label>
                  <Select value={settings?.refreshInterval?.toString() || "30"} onValueChange={(value) => handleSettingChange("refreshInterval", parseInt(value))}>
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

        <TabsContent value="clinical" className="space-y-6">
          <SectionCard title="Appointment Settings">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Appointment Duration</label>
                <Select value={settings?.defaultAppointmentDuration?.toString() || "30"} onValueChange={(value) => handleSettingChange("defaultAppointmentDuration", parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Working Hours">
            <div className="space-y-4">
              {Object.entries(settings?.workingHours || {}).map(([day, hours]: [string, any]) => (
                <div key={day} className="flex items-center gap-4">
                  <div className="w-24">
                    <span className="text-sm font-medium text-gray-700 capitalize">{day}</span>
                  </div>
                  <Switch
                    checked={hours.enabled}
                    onCheckedChange={(checked) => handleNestedSettingChange("workingHours", day, { ...hours, enabled: checked })}
                  />
                  {hours.enabled && (
                    <>
                      <Input
                        type="time"
                        value={hours.start}
                        onChange={(e) => handleNestedSettingChange("workingHours", day, { ...hours, start: e.target.value })}
                        className="w-32"
                      />
                      <span className="text-sm text-gray-500">to</span>
                      <Input
                        type="time"
                        value={hours.end}
                        onChange={(e) => handleNestedSettingChange("workingHours", day, { ...hours, end: e.target.value })}
                        className="w-32"
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* Change Password Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <PasswordChangeForm
            onSubmit={(data) => changePasswordMutation.mutate(data)}
            isLoading={changePasswordMutation.isPending}
            onClose={() => setShowPasswordModal(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PasswordChangeForm({
  onSubmit,
  isLoading,
  onClose
}: {
  onSubmit: (data: { currentPassword: string; newPassword: string }) => void;
  isLoading: boolean;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      alert("New passwords don't match");
      return;
    }
    onSubmit({
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
        <div className="relative">
          <Input
            type={showPasswords.current ? "text" : "password"}
            value={formData.currentPassword}
            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
            required
          />
          <button
            type="button"
            onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
            className="absolute right-3 top-1/2 transform -translate-y-1/2"
          >
            {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
        <div className="relative">
          <Input
            type={showPasswords.new ? "text" : "password"}
            value={formData.newPassword}
            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
            required
          />
          <button
            type="button"
            onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
            className="absolute right-3 top-1/2 transform -translate-y-1/2"
          >
            {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
        <div className="relative">
          <Input
            type={showPasswords.confirm ? "text" : "password"}
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            required
          />
          <button
            type="button"
            onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
            className="absolute right-3 top-1/2 transform -translate-y-1/2"
          >
            {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Changing..." : "Change Password"}
        </Button>
      </DialogFooter>
    </form>
  );
}
