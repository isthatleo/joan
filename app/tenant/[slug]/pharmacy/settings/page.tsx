"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Settings, Save, Loader2, Bell, Eye, Package, Pill,
  AlertCircle, ToggleLeft, Clock, Users, BarChart3
} from "lucide-react";

const orange = "#F97316";

interface PharmacistSettings {
  notificationsEnabled: boolean;
  emailAlerts: boolean;
  lowStockThreshold: number;
  criticalStockThreshold: number;
  autoReorder: boolean;
  reorderLeadTime: number;
  dispensingQueueRefresh: number;
  dashboardLayout: "compact" | "default" | "expanded";
  showAnalytics: boolean;
  prescriptionValidation: boolean;
  interactionChecks: boolean;
  requireSecondVerification: boolean;
  workingHours: {
    startTime: string;
    endTime: string;
  };
}

export default function SettingsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [settings, setSettings] = useState<PharmacistSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("notifications");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/${slug}/pharmacy/settings`);
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      setMessage({ type: "error", text: "Failed to load settings" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/tenant/${slug}/pharmacy/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Settings saved successfully" });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: "error", text: "Failed to save settings" });
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      setMessage({ type: "error", text: "Error saving settings" });
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (key: string, value: any) => {
    if (!settings) return;
    const keys = key.split(".");
    const newSettings: any = { ...settings };
    if (keys.length === 1) {
      newSettings[key as keyof PharmacistSettings] = value;
    } else {
      const parent = keys[0] as keyof PharmacistSettings;
      newSettings[parent] = { ...(newSettings[parent] || {}), [keys[1]]: value };
    }
    setSettings(newSettings);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-6 text-orange-500 animate-spin" />
          Loading settings...
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "dispensing", label: "Dispensing", icon: Pill },
    { id: "safety", label: "Safety", icon: AlertCircle },
    { id: "display", label: "Display", icon: Eye },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Management</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure your pharmacy dashboard preferences.</p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === "success"
            ? "bg-green-50 border-green-200"
            : "bg-red-50 border-red-200"
        }`}>
          <p className={message.type === "success" ? "text-green-700" : "text-red-700"}>
            {message.text}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border overflow-x-auto pb-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-card border border-border rounded-xl p-6">
        {/* Notifications Tab */}
        {activeTab === "notifications" && settings && (
          <div className="space-y-6">
            <div className="pb-6 border-b border-border">
              <h3 className="font-semibold text-foreground mb-4">Push Notifications</h3>
              <label className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                <div>
                  <p className="font-medium text-foreground">Enable Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive pharmacy alerts and updates</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notificationsEnabled}
                  onChange={e => handleSettingChange("notificationsEnabled", e.target.checked)}
                  className="rounded"
                />
              </label>
            </div>

            <div className="pb-6 border-b border-border">
              <h3 className="font-semibold text-foreground mb-4">Email Alerts</h3>
              <label className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                <div>
                  <p className="font-medium text-foreground">Stock Alerts via Email</p>
                  <p className="text-xs text-muted-foreground">Get notified about low stock items</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.emailAlerts}
                  onChange={e => handleSettingChange("emailAlerts", e.target.checked)}
                  className="rounded"
                />
              </label>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-4">Notification Frequency</h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                  <div>
                    <p className="font-medium text-foreground">Queue Refresh Rate</p>
                    <p className="text-xs text-muted-foreground">How often to check for new items</p>
                  </div>
                  <select
                    value={settings.dispensingQueueRefresh}
                    onChange={e => handleSettingChange("dispensingQueueRefresh", parseInt(e.target.value))}
                    className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none"
                  >
                    <option value={5}>Every 5 seconds</option>
                    <option value={10}>Every 10 seconds</option>
                    <option value={30}>Every 30 seconds</option>
                    <option value={60}>Every 1 minute</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === "inventory" && settings && (
          <div className="space-y-6">
            <div className="pb-6 border-b border-border">
              <h3 className="font-semibold text-foreground mb-4">Stock Thresholds</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">
                    Low Stock Threshold (%)
                  </label>
                  <input
                    type="number"
                    value={settings.lowStockThreshold}
                    onChange={e => handleSettingChange("lowStockThreshold", parseInt(e.target.value))}
                    className="w-full mt-2 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Alert when stock below this percentage
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">
                    Critical Stock Threshold (%)
                  </label>
                  <input
                    type="number"
                    value={settings.criticalStockThreshold}
                    onChange={e => handleSettingChange("criticalStockThreshold", parseInt(e.target.value))}
                    className="w-full mt-2 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Critical alert when below this level
                  </p>
                </div>
              </div>
            </div>

            <div className="pb-6 border-b border-border">
              <h3 className="font-semibold text-foreground mb-4">Auto Reorder</h3>
              <label className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer mb-4">
                <div>
                  <p className="font-medium text-foreground">Enable Auto Reorder</p>
                  <p className="text-xs text-muted-foreground">Automatically create purchase orders</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoReorder}
                  onChange={e => handleSettingChange("autoReorder", e.target.checked)}
                  className="rounded"
                />
              </label>

              {settings.autoReorder && (
                <div>
                  <label className="text-sm font-medium text-foreground">
                    Lead Time (days)
                  </label>
                  <input
                    type="number"
                    value={settings.reorderLeadTime}
                    onChange={e => handleSettingChange("reorderLeadTime", parseInt(e.target.value))}
                    className="w-full mt-2 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Days before estimated stock depletion
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dispensing Tab */}
        {activeTab === "dispensing" && settings && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-foreground mb-4">Working Hours</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Start Time</label>
                  <input
                    type="time"
                    value={settings.workingHours.startTime}
                    onChange={e => handleSettingChange("workingHours.startTime", e.target.value)}
                    className="w-full mt-2 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">End Time</label>
                  <input
                    type="time"
                    value={settings.workingHours.endTime}
                    onChange={e => handleSettingChange("workingHours.endTime", e.target.value)}
                    className="w-full mt-2 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Safety Tab */}
        {activeTab === "safety" && settings && (
          <div className="space-y-6">
            <div className="pb-6 border-b border-border">
              <h3 className="font-semibold text-foreground mb-4">Safety Checks</h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                  <div>
                    <p className="font-medium text-foreground">Drug Interaction Checks</p>
                    <p className="text-xs text-muted-foreground">Automatically check for interactions</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.interactionChecks}
                    onChange={e => handleSettingChange("interactionChecks", e.target.checked)}
                    className="rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                  <div>
                    <p className="font-medium text-foreground">Prescription Validation</p>
                    <p className="text-xs text-muted-foreground">Validate prescription format</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.prescriptionValidation}
                    onChange={e => handleSettingChange("prescriptionValidation", e.target.checked)}
                    className="rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                  <div>
                    <p className="font-medium text-foreground">Require Second Verification</p>
                    <p className="text-xs text-muted-foreground">High-risk medications require approval</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.requireSecondVerification}
                    onChange={e => handleSettingChange("requireSecondVerification", e.target.checked)}
                    className="rounded"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Display Tab */}
        {activeTab === "display" && settings && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-foreground mb-4">Dashboard Layout</h3>
              <div className="space-y-2">
                {["compact", "default", "expanded"].map(layout => (
                  <label key={layout} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                    <input
                      type="radio"
                      name="layout"
                      value={layout}
                      checked={settings.dashboardLayout === layout}
                      onChange={e => handleSettingChange("dashboardLayout", e.target.value)}
                      className="rounded-full"
                    />
                    <div>
                      <p className="font-medium text-foreground capitalize">{layout} Layout</p>
                      <p className="text-xs text-muted-foreground">
                        {layout === "compact" && "Minimal view with key metrics"}
                        {layout === "default" && "Standard view with all features"}
                        {layout === "expanded" && "Full view with advanced options"}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="pb-6 border-b border-border">
              <h3 className="font-semibold text-foreground mb-4">Dashboard Features</h3>
              <label className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                <div>
                  <p className="font-medium text-foreground">Show Analytics</p>
                  <p className="text-xs text-muted-foreground">Display analytics widgets</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showAnalytics}
                  onChange={e => handleSettingChange("showAnalytics", e.target.checked)}
                  className="rounded"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <button
          onClick={fetchSettings}
          className="px-4 py-2 rounded-lg border border-border text-muted-foreground font-semibold text-sm hover:bg-muted transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 disabled:opacity-50 transition-all flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="size-4" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}

