"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth";
import {
  Settings, User, Bell, Shield, Palette, Clock,
  Mail, Phone, Save, RefreshCw, Eye, EyeOff, Key,
  Globe, Monitor, Moon, Sun, ArrowLeft, AlertCircle
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PhoneNumberInput } from "@/components/forms/PhoneNumberInput";

const orange = "#F97316";

interface LabTechnicianSettings {
  displayName: string;
  email: string;
  phone?: string;

  // Notification Settings
  emailNotifications: boolean;
  labOrderAlerts: boolean;
  resultReadyAlerts: boolean;
  inventoryAlerts: boolean;
  systemNotifications: boolean;

  // Preferences
  theme: "light" | "dark" | "system";
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: "12h" | "24h";

  // Dashboard Settings
  itemsPerPage: number;
  autoRefresh: boolean;
  refreshInterval: number;
  defaultView: "dashboard" | "orders" | "results";
}

export default function LabSettingsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState<LabTechnicianSettings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "notifications" | "preferences" | "security">("profile");

  // Fetch settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["lab-settings", slug, user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/lab/settings`);
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json();
    },
  });

  useEffect(() => {
    if (settingsData) {
      setSettings(settingsData);
    }
  }, [settingsData]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<LabTechnicianSettings>) => {
      const response = await fetch("/api/lab/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update settings");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-settings"] });
      setHasChanges(false);
    },
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => prev ? { ...prev, [key]: value } : null);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (settings) {
      updateSettingsMutation.mutate(settings);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="size-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="size-12 text-red-600 mx-auto mb-4" />
        <p className="text-muted-foreground">Failed to load settings</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href={`/tenant/${slug}/lab`} className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 mb-3">
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </Link>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Dashboard Settings</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Lab Technician Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your profile, notifications, and preferences.</p>
        </div>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={updateSettingsMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: orange }}
          >
            <Save className="size-4" />
            {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {[
            { id: "profile", label: "Profile", icon: User },
            { id: "notifications", label: "Notifications", icon: Bell },
            { id: "preferences", label: "Preferences", icon: Palette },
            { id: "security", label: "Security", icon: Shield },
          ].map((tab: any) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="size-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-card border border-border rounded-xl p-6">
        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Display Name</label>
              <input
                type="text"
                value={settings.displayName}
                onChange={e => handleSettingChange("displayName", e.target.value)}
                className="w-full h-10 px-4 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Email Address</label>
              <input
                type="email"
                value={settings.email}
                onChange={e => handleSettingChange("email", e.target.value)}
                className="w-full h-10 px-4 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Phone Number</label>
              <PhoneNumberInput
                value={settings.phone || ""}
                onChange={value => handleSettingChange("phone", value)}
                placeholder="+1 (555) 000-0000"
                className="h-10"
              />
            </div>

            <div className="pt-4 border-t border-border">
              <button
                onClick={() => setShowPasswordModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all"
              >
                <Key className="size-4" />
                Change Password
              </button>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div className="space-y-6 max-w-2xl">
            <div className="space-y-4">
              <p className="text-sm font-semibold text-foreground">Alert Preferences</p>

              {[
                { key: "labOrderAlerts", label: "Lab Order Alerts", description: "Get notified when new lab orders arrive" },
                { key: "resultReadyAlerts", label: "Result Ready Alerts", description: "Get notified when test results are ready" },
                { key: "inventoryAlerts", label: "Inventory Alerts", description: "Get notified about low stock items" },
                { key: "emailNotifications", label: "Email Notifications", description: "Receive alerts via email" },
                { key: "systemNotifications", label: "System Notifications", description: "Get system-wide notifications" },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                  </div>
                  <button
                    onClick={() => handleSettingChange(item.key, !settings[item.key as keyof LabTechnicianSettings])}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings[item.key as keyof LabTechnicianSettings]
                        ? "bg-orange-500"
                        : "bg-muted"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings[item.key as keyof LabTechnicianSettings] ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === "preferences" && (
          <div className="space-y-6 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Theme</label>
                <select
                  value={settings.theme}
                  onChange={e => handleSettingChange("theme", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-orange-300"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Language</label>
                <select
                  value={settings.language}
                  onChange={e => handleSettingChange("language", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-orange-300"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Timezone</label>
                <select
                  value={settings.timezone}
                  onChange={e => handleSettingChange("timezone", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-orange-300"
                >
                  <option value="UTC">UTC</option>
                  <option value="EST">Eastern Time</option>
                  <option value="CST">Central Time</option>
                  <option value="MST">Mountain Time</option>
                  <option value="PST">Pacific Time</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Date Format</label>
                <select
                  value={settings.dateFormat}
                  onChange={e => handleSettingChange("dateFormat", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-orange-300"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Time Format</label>
                <select
                  value={settings.timeFormat}
                  onChange={e => handleSettingChange("timeFormat", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-orange-300"
                >
                  <option value="12h">12 Hour</option>
                  <option value="24h">24 Hour</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Default View</label>
                <select
                  value={settings.defaultView}
                  onChange={e => handleSettingChange("defaultView", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-orange-300"
                >
                  <option value="dashboard">Dashboard</option>
                  <option value="orders">Lab Orders</option>
                  <option value="results">Lab Results</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-border space-y-4">
              <p className="text-sm font-semibold text-foreground">Dashboard Options</p>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Items Per Page</label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={settings.itemsPerPage}
                  onChange={e => handleSettingChange("itemsPerPage", parseInt(e.target.value))}
                  className="w-full h-10 px-4 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-orange-300"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium text-sm">Auto Refresh</p>
                  <p className="text-xs text-muted-foreground mt-1">Automatically refresh data at intervals</p>
                </div>
                <button
                  onClick={() => handleSettingChange("autoRefresh", !settings.autoRefresh)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.autoRefresh ? "bg-orange-500" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.autoRefresh ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {settings.autoRefresh && (
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Refresh Interval (seconds)</label>
                  <input
                    type="number"
                    min="10"
                    max="300"
                    value={settings.refreshInterval}
                    onChange={e => handleSettingChange("refreshInterval", parseInt(e.target.value))}
                    className="w-full h-10 px-4 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-orange-300"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <div className="space-y-6 max-w-2xl">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Security Tip:</strong> Keep your password strong and unique. Never share your login credentials with anyone.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Password Management</h3>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all"
              >
                <Key className="size-4" />
                Change Password
              </button>
            </div>

            <div className="pt-4 border-t border-border">
              <h3 className="text-lg font-semibold mb-4">Session Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded">
                  <span className="text-sm">Current Session</span>
                  <span className="text-xs font-semibold text-green-600">Active</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded">
                  <span className="text-sm">Last Login</span>
                  <span className="text-sm font-semibold">Today at 10:30 AM</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded">
                  <span className="text-sm">Session Timeout</span>
                  <span className="text-sm font-semibold">30 minutes</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Change Password</h2>
            <div className="space-y-4 mb-6">
              <input
                type="password"
                placeholder="Current Password"
                className="w-full h-10 px-4 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-orange-300"
              />
              <input
                type="password"
                placeholder="New Password"
                className="w-full h-10 px-4 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-orange-300"
              />
              <input
                type="password"
                placeholder="Confirm New Password"
                className="w-full h-10 px-4 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-orange-300"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2 rounded-lg text-white text-sm font-semibold"
                style={{ backgroundColor: orange }}
              >
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

