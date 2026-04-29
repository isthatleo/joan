"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/auth";
import {
  PageHeader,
  Button,
  Input,
  Label,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Textarea,
  Skeleton,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import {
  Bell,
  Shield,
  Palette,
  Lock,
  MessageSquare,
  Save,
  CheckCircle,
  Eye,
  EyeOff,
  ChevronRight,
  Server,
  Key,
  FileCheck,
  Settings as SettingsIcon,
  AlertCircle,
  Check,
  X,
  Mail,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SettingsData {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    marketing: boolean;
    systemAlerts: boolean;
    emergencyAlerts: boolean;
    maintenanceNotifications: boolean;
  };
  privacy: {
    profileVisibility: "public" | "private" | "contacts";
    dataSharing: boolean;
    analytics: boolean;
    auditLogging: boolean;
    dataRetention: number;
  };
  appearance: {
    theme: "light" | "dark" | "system";
    language: string;
    timezone: string;
    dashboardLayout: "compact" | "comfortable" | "spacious";
    itemsPerPage: number;
    fontSize?: "small" | "medium" | "large";
    compactMode?: boolean;
    showAnimations?: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
    sessionTimeout: number;
    loginAlerts: boolean;
    passwordPolicy: {
      minLength: number;
      requireSpecialChars: boolean;
      requireNumbers: boolean;
      requireUppercase: boolean;
      expiryDays: number;
    };
    ipWhitelist: string[];
    bruteForceProtection: boolean;
  };
  communication: {
    messageSettings: {
      allowMessagesFrom: "anyone" | "contacts" | "doctors" | "none";
      autoReply: string;
      workingHours: {
        enabled: boolean;
        start: string;
        end: string;
      };
    };
    emailTemplates: boolean;
    smsGateway: string;
  };
  system: {
    maintenanceMode: boolean;
    debugMode: boolean;
    backupFrequency: "daily" | "weekly" | "monthly";
    logRetention: number;
    performanceMonitoring: boolean;
    apiRateLimiting: boolean;
    systemHealthCheck: boolean;
    enableCaching: boolean;
    errorReporting: "none" | "basic" | "detailed";
  };
  integrations: {
    emailProvider: "sendgrid" | "mailgun" | "ses" | "smtp";
    smsProvider: "twilio" | "aws-sns" | "messagebird";
    storageProvider: "local" | "s3" | "azure" | "gcp";
    analyticsProvider: "google" | "mixpanel" | "segment";
    emailApiKey?: string;
    emailDomain?: string;
    smsAccountSid?: string;
    smsAuthToken?: string;
    smsPhoneNumber?: string;
    storageBucket?: string;
    storageRegion?: string;
    storageAccessKey?: string;
    storageSecretKey?: string;
    analyticsTrackingId?: string;
  };
  compliance: {
    hipaaCompliance: boolean;
    gdprCompliance: boolean;
    auditTrail: boolean;
    dataEncryption: boolean;
    accessLogging: boolean;
  };
}

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const sidebarItems: SidebarItem[] = [
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    description: "Manage your notification preferences",
  },
  {
    id: "privacy",
    label: "Privacy",
    icon: Shield,
    description: "Control your privacy settings",
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: Palette,
    description: "Customize your interface",
  },
  {
    id: "security",
    label: "Security",
    icon: Lock,
    description: "Secure your account",
  },
  {
    id: "communication",
    label: "Communication",
    icon: MessageSquare,
    description: "Manage messaging preferences",
  },
  {
    id: "system",
    label: "System",
    icon: Server,
    description: "System administration settings",
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: Key,
    description: "Third-party service integrations",
  },
  {
    id: "compliance",
    label: "Compliance",
    icon: FileCheck,
    description: "Regulatory compliance settings",
  },
];

export default function SettingsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState("notifications");

  const [settings, setSettings] = useState<SettingsData>({
    notifications: {
      email: true,
      push: true,
      sms: false,
      marketing: false,
      systemAlerts: true,
      emergencyAlerts: true,
      maintenanceNotifications: false,
    },
    privacy: {
      profileVisibility: "private",
      dataSharing: false,
      analytics: true,
      auditLogging: true,
      dataRetention: 30,
    },
    appearance: {
      theme: "system",
      language: "en",
      timezone: "UTC",
      dashboardLayout: "comfortable",
      itemsPerPage: 10,
      fontSize: "medium",
      compactMode: false,
      showAnimations: true,
    },
    security: {
      twoFactorEnabled: false,
      sessionTimeout: 30,
      loginAlerts: true,
      passwordPolicy: {
        minLength: 8,
        requireSpecialChars: true,
        requireNumbers: true,
        requireUppercase: true,
        expiryDays: 90,
      },
      ipWhitelist: [],
      bruteForceProtection: true,
    },
    communication: {
      messageSettings: {
        allowMessagesFrom: "doctors",
        autoReply: "",
        workingHours: {
          enabled: false,
          start: "09:00",
          end: "17:00",
        },
      },
      emailTemplates: true,
      smsGateway: "twilio",
    },
    system: {
      maintenanceMode: false,
      debugMode: false,
      backupFrequency: "daily",
      logRetention: 7,
      performanceMonitoring: true,
      apiRateLimiting: true,
      systemHealthCheck: false,
      enableCaching: false,
      errorReporting: "basic",
    },
    integrations: {
      emailProvider: "sendgrid",
      smsProvider: "twilio",
      storageProvider: "s3",
      analyticsProvider: "google",
    },
    compliance: {
      hipaaCompliance: false,
      gdprCompliance: false,
      auditTrail: true,
      dataEncryption: true,
      accessLogging: true,
    },
  });

  const [originalSettings, setOriginalSettings] = useState<SettingsData>(settings);
  const [unsavedSections, setUnsavedSections] = useState<Set<string>>(new Set());
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  // Fetch settings
  const { data: fetchedSettings, isLoading } = useQuery({
    queryKey: ["user-settings", user?.id],
    queryFn: async (): Promise<SettingsData> => {
      const response = await fetch(`/api/users/settings?userId=${user?.id}`);
      if (response.ok) {
        return response.json();
      }
      // Return defaults if no settings exist yet
      return settings;
    },
    enabled: !!user?.id,
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<SettingsData>) => {
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
      toast.success("Settings updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update settings");
      console.error("Update error:", error);
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to change password");
      return response.json();
    },
    onSuccess: () => {
      setChangePasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed successfully");
    },
    onError: (error) => {
      toast.error("Failed to change password");
      console.error("Password change error:", error);
    },
  });

  // Initialize settings when data loads
  useEffect(() => {
    if (fetchedSettings) {
      // Deep merge fetched settings with defaults to ensure all properties exist
      const mergedSettings = {
        notifications: { ...settings.notifications, ...fetchedSettings.notifications },
        privacy: { ...settings.privacy, ...fetchedSettings.privacy },
        appearance: { ...settings.appearance, ...fetchedSettings.appearance },
        security: {
          ...settings.security,
          ...fetchedSettings.security,
          passwordPolicy: { ...settings.security.passwordPolicy, ...fetchedSettings.security?.passwordPolicy },
        },
        communication: {
          ...settings.communication,
          ...fetchedSettings.communication,
          messageSettings: {
            ...settings.communication.messageSettings,
            ...fetchedSettings.communication?.messageSettings,
            workingHours: { ...settings.communication.messageSettings.workingHours, ...fetchedSettings.communication?.messageSettings?.workingHours },
          },
        },
        system: { ...settings.system, ...fetchedSettings.system },
        integrations: { ...settings.integrations, ...fetchedSettings.integrations },
        compliance: { ...settings.compliance, ...fetchedSettings.compliance },
      };
      setSettings(mergedSettings);
      setOriginalSettings(mergedSettings); // Set original settings to fetched data
    }
  }, [fetchedSettings]);

  const handleSettingChange = (path: string, value: any) => {
    setSettings(prevSettings => {
      const newSettings = JSON.parse(JSON.stringify(prevSettings)); // Deep clone
      const keys = path.split(".");
      let current = newSettings as any;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;

      return newSettings;
    });

    // Track unsaved sections
    setUnsavedSections(prev => {
      const newUnsaved = new Set(prev);
      newUnsaved.add(activeSection);
      return newUnsaved;
    });
  };

  const handleSave = () => {
    updateSettingsMutation.mutate(settings);
    setOriginalSettings(settings); // Update original settings on save
    setUnsavedSections(new Set()); // Clear unsaved sections
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  const handleSectionSave = useCallback((section: string) => {
    const sectionData = { [section]: settings[section as keyof SettingsData] };
    updateSettingsMutation.mutate(sectionData);
    setOriginalSettings(prev => ({ ...prev, [section]: settings[section as keyof SettingsData] }));
    setUnsavedSections(prev => {
      const newUnsaved = new Set(prev);
      newUnsaved.delete(section);
      return newUnsaved;
    });
  }, [settings, updateSettingsMutation]);

  const renderContent = () => {
    const hasUnsavedChanges = unsavedSections.has(activeSection);

    switch (activeSection) {
      case "notifications":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Notifications</h2>
                  <p className="text-muted-foreground">Manage your notification preferences</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasUnsavedChanges && (
                  <div className="flex items-center gap-1 text-amber-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    Unsaved changes
                  </div>
                )}
                <Button
                  onClick={() => handleSectionSave("notifications")}
                  disabled={updateSettingsMutation.isPending || !hasUnsavedChanges}
                  size="sm"
                  className="inline-flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {updateSettingsMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              <Card className="p-6">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Email Notifications
                  </CardTitle>
                  <CardDescription>
                    Configure how you receive email notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Email Notifications</Label>
                      <p className="text-xs text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifications.email}
                      onCheckedChange={(checked) =>
                        handleSettingChange("notifications.email", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Marketing Communications</Label>
                      <p className="text-xs text-muted-foreground">
                        Receive updates about new features and promotions
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifications.marketing}
                      onCheckedChange={(checked) =>
                        handleSettingChange("notifications.marketing", checked)
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="p-6">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Push & SMS Notifications
                  </CardTitle>
                  <CardDescription>
                    Configure push notifications and SMS alerts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Push Notifications</Label>
                      <p className="text-xs text-muted-foreground">
                        Receive push notifications in your browser
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifications.push}
                      onCheckedChange={(checked) =>
                        handleSettingChange("notifications.push", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">SMS Notifications</Label>
                      <p className="text-xs text-muted-foreground">
                        Receive important alerts via SMS
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifications.sms}
                      onCheckedChange={(checked) =>
                        handleSettingChange("notifications.sms", checked)
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="p-6">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    System & Emergency Alerts
                  </CardTitle>
                  <CardDescription>
                    Critical system notifications and emergency alerts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">System Alerts</Label>
                      <p className="text-xs text-muted-foreground">
                        Receive critical system alerts
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifications.systemAlerts}
                      onCheckedChange={(checked) =>
                        handleSettingChange("notifications.systemAlerts", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Emergency Alerts</Label>
                      <p className="text-xs text-muted-foreground">
                        Receive emergency notifications
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifications.emergencyAlerts}
                      onCheckedChange={(checked) =>
                        handleSettingChange("notifications.emergencyAlerts", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Maintenance Notifications</Label>
                      <p className="text-xs text-muted-foreground">
                        Receive notifications about system maintenance
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifications.maintenanceNotifications}
                      onCheckedChange={(checked) =>
                        handleSettingChange("notifications.maintenanceNotifications", checked)
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "privacy":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Privacy</h2>
                  <p className="text-muted-foreground">Control your privacy settings</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasUnsavedChanges && (
                  <div className="flex items-center gap-1 text-amber-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    Unsaved changes
                  </div>
                )}
                <Button
                  onClick={() => handleSectionSave("privacy")}
                  disabled={updateSettingsMutation.isPending || !hasUnsavedChanges}
                  size="sm"
                  className="inline-flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {updateSettingsMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              <Card className="p-6">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Profile Visibility
                  </CardTitle>
                  <CardDescription>
                    Control who can see your profile information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Profile Visibility</Label>
                    <Select
                      value={settings.privacy.profileVisibility}
                      onValueChange={(value: any) =>
                        handleSettingChange("privacy.profileVisibility", value)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public - Visible to everyone</SelectItem>
                        <SelectItem value="contacts">Contacts - Visible to colleagues</SelectItem>
                        <SelectItem value="private">Private - Visible only to you</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="p-6">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <SettingsIcon className="h-5 w-5" />
                    Data & Analytics
                  </CardTitle>
                  <CardDescription>
                    Manage data sharing and analytics preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Data Sharing</Label>
                      <p className="text-xs text-muted-foreground">
                        Allow sharing anonymized data for research
                      </p>
                    </div>
                    <Switch
                      checked={settings.privacy.dataSharing}
                      onCheckedChange={(checked) =>
                        handleSettingChange("privacy.dataSharing", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Analytics</Label>
                      <p className="text-xs text-muted-foreground">
                        Help improve the system with usage analytics
                      </p>
                    </div>
                    <Switch
                      checked={settings.privacy.analytics}
                      onCheckedChange={(checked) =>
                        handleSettingChange("privacy.analytics", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Audit Logging</Label>
                      <p className="text-xs text-muted-foreground">
                        Keep a log of system access and changes
                      </p>
                    </div>
                    <Switch
                      checked={settings.privacy.auditLogging}
                      onCheckedChange={(checked) =>
                        handleSettingChange("privacy.auditLogging", checked)
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="p-6">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Data Retention
                  </CardTitle>
                  <CardDescription>
                    Configure how long your data is retained
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Data Retention Period</Label>
                    <Select
                      value={(settings.privacy?.dataRetention ?? 30).toString()}
                      onValueChange={(value) =>
                        handleSettingChange("privacy.dataRetention", parseInt(value))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="180">6 months</SelectItem>
                        <SelectItem value="365">1 year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "appearance":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Palette className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Appearance</h2>
                  <p className="text-muted-foreground">Customize your interface</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasUnsavedChanges && (
                  <div className="flex items-center gap-1 text-amber-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    Unsaved changes
                  </div>
                )}
                <Button
                  onClick={() => handleSectionSave("appearance")}
                  disabled={updateSettingsMutation.isPending || !hasUnsavedChanges}
                  size="sm"
                  className="inline-flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {updateSettingsMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              <Card className="p-6">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Theme & Language
                  </CardTitle>
                  <CardDescription>
                    Customize the look and language of your interface
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Theme</Label>
                    <Select
                      value={settings.appearance.theme}
                      onValueChange={(value: any) =>
                        handleSettingChange("appearance.theme", value)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Language</Label>
                    <Select
                      value={settings.appearance.language}
                      onValueChange={(value: any) =>
                        handleSettingChange("appearance.language", value)
                      }
                    >
                      <SelectTrigger className="w-full">
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
                </CardContent>
              </Card>

              <Card className="p-6">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <SettingsIcon className="h-5 w-5" />
                    Layout & Display
                  </CardTitle>
                  <CardDescription>
                    Configure dashboard layout and display preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Timezone</Label>
                    <Select
                      value={settings.appearance.timezone}
                      onValueChange={(value: any) =>
                        handleSettingChange("appearance.timezone", value)
                      }
                    >
                      <SelectTrigger className="w-full">
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

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Dashboard Layout</Label>
                    <Select
                      value={settings.appearance.dashboardLayout}
                      onValueChange={(value: any) =>
                        handleSettingChange("appearance.dashboardLayout", value)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compact">Compact</SelectItem>
                        <SelectItem value="comfortable">Comfortable</SelectItem>
                        <SelectItem value="spacious">Spacious</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Items Per Page</Label>
                    <Select
                      value={settings.appearance.itemsPerPage.toString()}
                      onValueChange={(value) =>
                        handleSettingChange("appearance.itemsPerPage", parseInt(value))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="p-6">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Typography & Effects
                  </CardTitle>
                  <CardDescription>
                    Customize text size and visual effects
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Font Size</Label>
                    <Select
                      value={settings.appearance.fontSize || "medium"}
                      onValueChange={(value: any) =>
                        handleSettingChange("appearance.fontSize", value)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Compact Mode</Label>
                      <p className="text-xs text-muted-foreground">
                        Use a more compact interface design
                      </p>
                    </div>
                    <Switch
                      checked={settings.appearance.compactMode || false}
                      onCheckedChange={(checked) =>
                        handleSettingChange("appearance.compactMode", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Show Animations</Label>
                      <p className="text-xs text-muted-foreground">
                        Enable smooth transitions and animations
                      </p>
                    </div>
                    <Switch
                      checked={settings.appearance.showAnimations !== false}
                      onCheckedChange={(checked) =>
                        handleSettingChange("appearance.showAnimations", checked)
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "security":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Security</h2>
                  <p className="text-muted-foreground">Secure your account</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasUnsavedChanges && (
                  <div className="flex items-center gap-1 text-amber-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    Unsaved changes
                  </div>
                )}
                <Button
                  onClick={() => handleSectionSave("security")}
                  disabled={updateSettingsMutation.isPending || !hasUnsavedChanges}
                  size="sm"
                  className="inline-flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {updateSettingsMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              <Card className="p-6">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Authentication
                  </CardTitle>
                  <CardDescription>
                    Configure authentication and access controls
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Two-Factor Authentication</Label>
                      <p className="text-xs text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {settings.security.twoFactorEnabled && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      <Switch
                        checked={settings.security.twoFactorEnabled}
                        onCheckedChange={(checked) =>
                          handleSettingChange("security.twoFactorEnabled", checked)
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Session Timeout (minutes)</Label>
                    <Select
                      value={settings.security.sessionTimeout.toString()}
                      onValueChange={(value) =>
                        handleSettingChange("security.sessionTimeout", parseInt(value))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="240">4 hours</SelectItem>
                        <SelectItem value="480">8 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Login Alerts</Label>
                      <p className="text-xs text-muted-foreground">
                        Get notified of new login attempts
                      </p>
                    </div>
                    <Switch
                      checked={settings.security.loginAlerts}
                      onCheckedChange={(checked) =>
                        handleSettingChange("security.loginAlerts", checked)
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="p-6">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Password Policy
                  </CardTitle>
                  <CardDescription>
                    Configure password requirements and security rules
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Minimum Length</Label>
                      <Select
                        value={settings.security.passwordPolicy.minLength.toString()}
                        onValueChange={(value) =>
                          handleSettingChange("security.passwordPolicy.minLength", parseInt(value))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="8">8</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="12">12</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Password Expiry (days)</Label>
                      <Select
                        value={settings.security.passwordPolicy.expiryDays.toString()}
                        onValueChange={(value) =>
                          handleSettingChange("security.passwordPolicy.expiryDays", parseInt(value))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30</SelectItem>
                          <SelectItem value="60">60</SelectItem>
                          <SelectItem value="90">90</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Requirements</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Special Characters</Label>
                        </div>
                        <Switch
                          checked={settings.security.passwordPolicy.requireSpecialChars}
                          onCheckedChange={(checked) =>
                            handleSettingChange("security.passwordPolicy.requireSpecialChars", checked)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Numbers</Label>
                        </div>
                        <Switch
                          checked={settings.security.passwordPolicy.requireNumbers}
                          onCheckedChange={(checked) =>
                            handleSettingChange("security.passwordPolicy.requireNumbers", checked)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Uppercase</Label>
                        </div>
                        <Switch
                          checked={settings.security.passwordPolicy.requireUppercase}
                          onCheckedChange={(checked) =>
                            handleSettingChange("security.passwordPolicy.requireUppercase", checked)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="p-6">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Access Control
                  </CardTitle>
                  <CardDescription>
                    Manage IP restrictions and security features
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">IP Whitelist</Label>
                      <p className="text-xs text-muted-foreground">
                        Limit access to specific IP addresses
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {}}
                      size="sm"
                      className="whitespace-nowrap"
                    >
                      Manage IPs
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Brute Force Protection</Label>
                      <p className="text-xs text-muted-foreground">
                        Protect against brute force attacks
                      </p>
                    </div>
                    <Switch
                      checked={settings.security.bruteForceProtection}
                      onCheckedChange={(checked) =>
                        handleSettingChange("security.bruteForceProtection", checked)
                      }
                    />
                  </div>

                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setChangePasswordOpen(true)}
                      className="inline-flex items-center gap-2"
                    >
                      <Lock className="h-4 w-4" />
                      Change Password
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "communication":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Communication</h2>
                  <p className="text-muted-foreground">Manage messaging preferences</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasUnsavedChanges && (
                  <div className="flex items-center gap-1 text-amber-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    Unsaved changes
                  </div>
                )}
                <Button
                  onClick={() => handleSectionSave("communication")}
                  disabled={updateSettingsMutation.isPending || !hasUnsavedChanges}
                  size="sm"
                  className="inline-flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {updateSettingsMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              <Card className="p-6">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Message Settings
                  </CardTitle>
                  <CardDescription>
                    Configure who can message you and auto-reply settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Allow Messages From</Label>
                    <Select
                      value={settings.communication.messageSettings.allowMessagesFrom}
                      onValueChange={(value: any) =>
                        handleSettingChange("communication.messageSettings.allowMessagesFrom", value)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="anyone">Anyone</SelectItem>
                        <SelectItem value="contacts">Contacts Only</SelectItem>
                        <SelectItem value="doctors">Doctors Only</SelectItem>
                        <SelectItem value="none">No One</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Auto Reply Message</Label>
                    <Textarea
                      value={settings.communication.messageSettings.autoReply}
                      onChange={(e) =>
                        handleSettingChange("communication.messageSettings.autoReply", e.target.value)
                      }
                      placeholder="I'm currently unavailable. I'll respond as soon as possible."
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="p-6">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <SettingsIcon className="h-5 w-5" />
                    Working Hours
                  </CardTitle>
                  <CardDescription>
                    Set your availability for receiving messages
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Enable Working Hours</Label>
                    <Switch
                      checked={settings.communication.messageSettings.workingHours.enabled}
                      onCheckedChange={(checked) =>
                        handleSettingChange("communication.messageSettings.workingHours.enabled", checked)
                      }
                    />
                  </div>

                  {settings.communication.messageSettings.workingHours.enabled && (
                    <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
                      <div className="space-y-2">
                        <Label className="text-xs">Start Time</Label>
                        <Input
                          type="time"
                          value={settings.communication.messageSettings.workingHours.start}
                          onChange={(e) =>
                            handleSettingChange("communication.messageSettings.workingHours.start", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">End Time</Label>
                        <Input
                          type="time"
                          value={settings.communication.messageSettings.workingHours.end}
                          onChange={(e) =>
                            handleSettingChange("communication.messageSettings.workingHours.end", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="p-6">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Templates & Gateway
                  </CardTitle>
                  <CardDescription>
                    Configure email templates and SMS gateway settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Email Templates</Label>
                      <p className="text-xs text-muted-foreground">
                        Use custom email templates for notifications
                      </p>
                    </div>
                    <Switch
                      checked={settings.communication.emailTemplates}
                      onCheckedChange={(checked) =>
                        handleSettingChange("communication.emailTemplates", checked)
                      }
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">SMS Gateway</Label>
                    <Select
                      value={settings.communication.smsGateway}
                      onValueChange={(value: any) =>
                        handleSettingChange("communication.smsGateway", value)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="twilio">Twilio</SelectItem>
                        <SelectItem value="aws-sns">AWS SNS</SelectItem>
                        <SelectItem value="messagebird">MessageBird</SelectItem>
                        <SelectItem value="nexmo">Nexmo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "system":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Server className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">System Settings</h2>
                  <p className="text-muted-foreground">Manage system administration settings</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasUnsavedChanges && (
                  <div className="flex items-center gap-1 text-amber-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    Unsaved changes
                  </div>
                )}
                <Button
                  onClick={() => handleSectionSave("system")}
                  disabled={updateSettingsMutation.isPending || !hasUnsavedChanges}
                  size="sm"
                  className="inline-flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {updateSettingsMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              <Card className="p-6">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <SettingsIcon className="h-5 w-5" />
                    System Control
                  </CardTitle>
                  <CardDescription>
                    Basic system operation settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Maintenance Mode</Label>
                      <p className="text-xs text-muted-foreground">
                        Enable to perform maintenance on the system
                      </p>
                    </div>
                    <Switch
                      checked={settings.system.maintenanceMode}
                      onCheckedChange={(checked) =>
                        handleSettingChange("system.maintenanceMode", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Debug Mode</Label>
                      <p className="text-xs text-muted-foreground">
                        Enable to debug issues with the system
                      </p>
                    </div>
                    <Switch
                      checked={settings.system.debugMode}
                      onCheckedChange={(checked) =>
                        handleSettingChange("system.debugMode", checked)
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="p-6">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Data Management
                  </CardTitle>
                  <CardDescription>
                    Configure backups, logs, and data retention
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Backup Frequency</Label>
                    <Select
                      value={settings.system.backupFrequency}
                      onValueChange={(value: any) =>
                        handleSettingChange("system.backupFrequency", value)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Log Retention (days)</Label>
                    <Select
                      value={settings.system.logRetention.toString()}
                      onValueChange={(value) =>
                        handleSettingChange("system.logRetention", parseInt(value))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="180">6 months</SelectItem>
                        <SelectItem value="365">1 year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="p-6">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Monitoring & Performance
                  </CardTitle>
                  <CardDescription>
                    Configure system monitoring and performance settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Performance Monitoring</Label>
                      <p className="text-xs text-muted-foreground">
                        Monitor system performance and usage
                      </p>
                    </div>
                    <Switch
                      checked={settings.system.performanceMonitoring}
                      onCheckedChange={(checked) =>
                        handleSettingChange("system.performanceMonitoring", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">API Rate Limiting</Label>
                      <p className="text-xs text-muted-foreground">
                        Limit the rate of API requests
                      </p>
                    </div>
                    <Switch
                      checked={settings.system.apiRateLimiting}
                      onCheckedChange={(checked) =>
                        handleSettingChange("system.apiRateLimiting", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">System Health Check</Label>
                      <p className="text-xs text-muted-foreground">
                        Enable automatic system health monitoring
                      </p>
                    </div>
                    <Switch
                      checked={settings.system.systemHealthCheck}
                      onCheckedChange={(checked) =>
                        handleSettingChange("system.systemHealthCheck", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Cache Management</Label>
                      <p className="text-xs text-muted-foreground">
                        Enable caching for improved performance
                      </p>
                    </div>
                    <Switch
                      checked={settings.system.enableCaching}
                      onCheckedChange={(checked) =>
                        handleSettingChange("system.enableCaching", checked)
                      }
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Error Reporting</Label>
                    <Select
                      value={settings.system.errorReporting || "basic"}
                      onValueChange={(value: any) =>
                        handleSettingChange("system.errorReporting", value)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="detailed">Detailed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "integrations":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Key className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Integrations</h2>
                  <p className="text-muted-foreground">Manage third-party service integrations</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasUnsavedChanges && (
                  <div className="flex items-center gap-1 text-amber-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    Unsaved changes
                  </div>
                )}
                <Button
                  onClick={() => handleSectionSave("integrations")}
                  disabled={updateSettingsMutation.isPending || !hasUnsavedChanges}
                  size="sm"
                  className="inline-flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {updateSettingsMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              <Card className="p-6">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Provider
                  </CardTitle>
                  <CardDescription>
                    Configure your email service provider
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Email Provider</Label>
                    <Select
                      value={settings.integrations.emailProvider}
                      onValueChange={(value: any) =>
                        handleSettingChange("integrations.emailProvider", value)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sendgrid">SendGrid</SelectItem>
                        <SelectItem value="mailgun">Mailgun</SelectItem>
                        <SelectItem value="ses">AWS SES</SelectItem>
                        <SelectItem value="smtp">SMTP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {settings.integrations.emailProvider === "sendgrid" && (
                    <div className="space-y-3 p-4 rounded-lg border bg-muted/50">
                      <Label className="text-sm font-medium">SendGrid Configuration</Label>
                      <Input
                        placeholder="Enter SendGrid API Key"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  return <div className="p-6">{renderContent()}</div>;
}

