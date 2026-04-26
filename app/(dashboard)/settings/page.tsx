"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Save, RefreshCw, Shield, Bell, Settings as SettingsIcon, Key, Database, Mail, Smartphone, Globe } from "lucide-react";
import { AlertTriangle } from "lucide-react";

interface PlatformSettings {
  general: {
    platformName: string;
    platformDescription: string;
    contactEmail: string;
    contactPhone: string;
    timezone: string;
    language: string;
  };
  security: {
    sessionTimeout: number;
    passwordMinLength: number;
    requireTwoFactor: boolean;
    allowApiKeys: boolean;
    ipWhitelist: string[];
    auditLogRetention: number;
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    maintenanceAlerts: boolean;
    securityAlerts: boolean;
    performanceAlerts: boolean;
  };
  api: {
    rateLimitEnabled: boolean;
    rateLimitRequests: number;
    rateLimitWindow: number;
    apiVersion: string;
    webhookEnabled: boolean;
    webhookUrl: string;
  };
  features: {
    analyticsEnabled: boolean;
    aiCopilotEnabled: boolean;
    multiTenantEnabled: boolean;
    fileStorageEnabled: boolean;
    backupEnabled: boolean;
  };
}

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      // This would typically fetch from settings API
      return {
        general: {
          platformName: "Joan Healthcare OS",
          platformDescription: "Enterprise Healthcare Management System",
          contactEmail: "admin@joanhealthcare.com",
          contactPhone: "+1 (555) 123-4567",
          timezone: "America/New_York",
          language: "en",
        },
        security: {
          sessionTimeout: 30,
          passwordMinLength: 8,
          requireTwoFactor: true,
          allowApiKeys: true,
          ipWhitelist: ["192.168.1.0/24", "10.0.0.0/8"],
          auditLogRetention: 365,
        },
        notifications: {
          emailEnabled: true,
          smsEnabled: true,
          pushEnabled: false,
          maintenanceAlerts: true,
          securityAlerts: true,
          performanceAlerts: true,
        },
        api: {
          rateLimitEnabled: true,
          rateLimitRequests: 1000,
          rateLimitWindow: 60,
          apiVersion: "v2.1.0",
          webhookEnabled: true,
          webhookUrl: "https://api.joanhealthcare.com/webhooks",
        },
        features: {
          analyticsEnabled: true,
          aiCopilotEnabled: true,
          multiTenantEnabled: true,
          fileStorageEnabled: true,
          backupEnabled: true,
        },
      } as PlatformSettings;
    },
  });

  const [formData, setFormData] = useState<PlatformSettings | null>(null);

  // Initialize form data when settings are loaded
  React.useEffect(() => {
    if (settings && !formData) {
      setFormData(settings);
    }
  }, [settings, formData]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: PlatformSettings) => {
      // This would typically call the settings API
      console.log("Updating settings:", newSettings);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      return newSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
      toast.success("Settings updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update settings");
      console.error(error);
    },
  });

  const handleSave = (category: keyof PlatformSettings) => {
    if (!formData) return;
    updateSettingsMutation.mutate(formData);
  };

  const handleInputChange = (category: keyof PlatformSettings, field: string, value: any) => {
    if (!formData) return;
    setFormData({
      ...formData,
      [category]: {
        ...formData[category],
        [field]: value,
      },
    });
  };

  const handleArrayChange = (category: keyof PlatformSettings, field: string, value: string) => {
    if (!formData) return;
    const arrayValue = value.split('\n').filter(item => item.trim());
    setFormData({
      ...formData,
      [category]: {
        ...formData[category],
        [field]: arrayValue,
      },
    });
  };

  if (isLoading || !formData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Platform Settings"
          subtitle="Configure system-wide settings and preferences"
        />
        <div className="grid grid-cols-1 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Settings"
        subtitle="Configure system-wide settings and preferences"
      />

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Features
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="platformName">Platform Name</Label>
                  <Input
                    id="platformName"
                    value={formData.general.platformName}
                    onChange={(e) => handleInputChange("general", "platformName", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={formData.general.contactEmail}
                    onChange={(e) => handleInputChange("general", "contactEmail", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="platformDescription">Platform Description</Label>
                <Textarea
                  id="platformDescription"
                  value={formData.general.platformDescription}
                  onChange={(e) => handleInputChange("general", "platformDescription", e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    value={formData.general.contactPhone}
                    onChange={(e) => handleInputChange("general", "contactPhone", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={formData.general.timezone}
                    onValueChange={(value) => handleInputChange("general", "timezone", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={formData.general.language}
                    onValueChange={(value) => handleInputChange("general", "language", value)}
                  >
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
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave("general")} disabled={updateSettingsMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={formData.security.sessionTimeout}
                    onChange={(e) => handleInputChange("security", "sessionTimeout", parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="passwordMinLength">Minimum Password Length</Label>
                  <Input
                    id="passwordMinLength"
                    type="number"
                    value={formData.security.passwordMinLength}
                    onChange={(e) => handleInputChange("security", "passwordMinLength", parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="auditLogRetention">Audit Log Retention (days)</Label>
                  <Input
                    id="auditLogRetention"
                    type="number"
                    value={formData.security.auditLogRetention}
                    onChange={(e) => handleInputChange("security", "auditLogRetention", parseInt(e.target.value))}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="requireTwoFactor">Require Two-Factor Authentication</Label>
                    <p className="text-sm text-gray-600">Enforce 2FA for all user accounts</p>
                  </div>
                  <Switch
                    id="requireTwoFactor"
                    checked={formData.security.requireTwoFactor}
                    onCheckedChange={(checked) => handleInputChange("security", "requireTwoFactor", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="allowApiKeys">Allow API Key Authentication</Label>
                    <p className="text-sm text-gray-600">Enable API key-based authentication</p>
                  </div>
                  <Switch
                    id="allowApiKeys"
                    checked={formData.security.allowApiKeys}
                    onCheckedChange={(checked) => handleInputChange("security", "allowApiKeys", checked)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="ipWhitelist">IP Whitelist (one per line)</Label>
                <Textarea
                  id="ipWhitelist"
                  value={formData.security.ipWhitelist.join('\n')}
                  onChange={(e) => handleArrayChange("security", "ipWhitelist", e.target.value)}
                  rows={4}
                  placeholder="192.168.1.0/24&#10;10.0.0.0/8"
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave("security")} disabled={updateSettingsMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-blue-500" />
                    <div>
                      <Label htmlFor="emailEnabled">Email Notifications</Label>
                      <p className="text-sm text-gray-600">Send notifications via email</p>
                    </div>
                  </div>
                  <Switch
                    id="emailEnabled"
                    checked={formData.notifications.emailEnabled}
                    onCheckedChange={(checked) => handleInputChange("notifications", "emailEnabled", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Smartphone className="h-5 w-5 text-green-500" />
                    <div>
                      <Label htmlFor="smsEnabled">SMS Notifications</Label>
                      <p className="text-sm text-gray-600">Send notifications via SMS</p>
                    </div>
                  </div>
                  <Switch
                    id="smsEnabled"
                    checked={formData.notifications.smsEnabled}
                    onCheckedChange={(checked) => handleInputChange("notifications", "smsEnabled", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Bell className="h-5 w-5 text-purple-500" />
                    <div>
                      <Label htmlFor="pushEnabled">Push Notifications</Label>
                      <p className="text-sm text-gray-600">Send push notifications to mobile apps</p>
                    </div>
                  </div>
                  <Switch
                    id="pushEnabled"
                    checked={formData.notifications.pushEnabled}
                    onCheckedChange={(checked) => handleInputChange("notifications", "pushEnabled", checked)}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Alert Types</h3>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="maintenanceAlerts">Maintenance Alerts</Label>
                    <p className="text-sm text-gray-600">System maintenance notifications</p>
                  </div>
                  <Switch
                    id="maintenanceAlerts"
                    checked={formData.notifications.maintenanceAlerts}
                    onCheckedChange={(checked) => handleInputChange("notifications", "maintenanceAlerts", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="securityAlerts">Security Alerts</Label>
                    <p className="text-sm text-gray-600">Security-related notifications</p>
                  </div>
                  <Switch
                    id="securityAlerts"
                    checked={formData.notifications.securityAlerts}
                    onCheckedChange={(checked) => handleInputChange("notifications", "securityAlerts", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="performanceAlerts">Performance Alerts</Label>
                    <p className="text-sm text-gray-600">System performance notifications</p>
                  </div>
                  <Switch
                    id="performanceAlerts"
                    checked={formData.notifications.performanceAlerts}
                    onCheckedChange={(checked) => handleInputChange("notifications", "performanceAlerts", checked)}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave("notifications")} disabled={updateSettingsMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="apiVersion">API Version</Label>
                  <Input
                    id="apiVersion"
                    value={formData.api.apiVersion}
                    onChange={(e) => handleInputChange("api", "apiVersion", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="webhookUrl">Webhook URL</Label>
                  <Input
                    id="webhookUrl"
                    value={formData.api.webhookUrl}
                    onChange={(e) => handleInputChange("api", "webhookUrl", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rateLimitRequests">Rate Limit (requests)</Label>
                  <Input
                    id="rateLimitRequests"
                    type="number"
                    value={formData.api.rateLimitRequests}
                    onChange={(e) => handleInputChange("api", "rateLimitRequests", parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="rateLimitWindow">Rate Limit Window (seconds)</Label>
                  <Input
                    id="rateLimitWindow"
                    type="number"
                    value={formData.api.rateLimitWindow}
                    onChange={(e) => handleInputChange("api", "rateLimitWindow", parseInt(e.target.value))}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="rateLimitEnabled">Enable Rate Limiting</Label>
                    <p className="text-sm text-gray-600">Limit API requests per time window</p>
                  </div>
                  <Switch
                    id="rateLimitEnabled"
                    checked={formData.api.rateLimitEnabled}
                    onCheckedChange={(checked) => handleInputChange("api", "rateLimitEnabled", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="webhookEnabled">Enable Webhooks</Label>
                    <p className="text-sm text-gray-600">Send webhook notifications for events</p>
                  </div>
                  <Switch
                    id="webhookEnabled"
                    checked={formData.api.webhookEnabled}
                    onCheckedChange={(checked) => handleInputChange("api", "webhookEnabled", checked)}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave("api")} disabled={updateSettingsMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Toggles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="analyticsEnabled">Analytics Dashboard</Label>
                    <p className="text-sm text-gray-600">Enable platform-wide analytics and reporting</p>
                  </div>
                  <Switch
                    id="analyticsEnabled"
                    checked={formData.features.analyticsEnabled}
                    onCheckedChange={(checked) => handleInputChange("features", "analyticsEnabled", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="aiCopilotEnabled">AI Copilot</Label>
                    <p className="text-sm text-gray-600">Enable AI-powered assistance features</p>
                  </div>
                  <Switch
                    id="aiCopilotEnabled"
                    checked={formData.features.aiCopilotEnabled}
                    onCheckedChange={(checked) => handleInputChange("features", "aiCopilotEnabled", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="multiTenantEnabled">Multi-Tenant Support</Label>
                    <p className="text-sm text-gray-600">Enable multi-tenant architecture</p>
                  </div>
                  <Switch
                    id="multiTenantEnabled"
                    checked={formData.features.multiTenantEnabled}
                    onCheckedChange={(checked) => handleInputChange("features", "multiTenantEnabled", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="fileStorageEnabled">File Storage</Label>
                    <p className="text-sm text-gray-600">Enable file upload and storage features</p>
                  </div>
                  <Switch
                    id="fileStorageEnabled"
                    checked={formData.features.fileStorageEnabled}
                    onCheckedChange={(checked) => handleInputChange("features", "fileStorageEnabled", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="backupEnabled">Automated Backups</Label>
                    <p className="text-sm text-gray-600">Enable automated data backup systems</p>
                  </div>
                  <Switch
                    id="backupEnabled"
                    checked={formData.features.backupEnabled}
                    onCheckedChange={(checked) => handleInputChange("features", "backupEnabled", checked)}
                  />
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Feature toggles may require system restart to take effect. Some features may have additional configuration requirements.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end">
                <Button onClick={() => handleSave("features")} disabled={updateSettingsMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
