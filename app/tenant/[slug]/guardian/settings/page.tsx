"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Settings, User, Bell, Shield, Eye, EyeOff,
  Save, Loader2, CheckCircle, AlertCircle,
  Key, Mail, Phone, MapPin, Calendar
} from "lucide-react";
import { PhoneNumberInput } from "@/components/forms/PhoneNumberInput";

const orange = "#F97316";

interface GuardianSettings {
  profile: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    dateOfBirth: string;
    emergencyContact: {
      name: string;
      relationship: string;
      phone: string;
    };
  };
  preferences: {
    language: string;
    timezone: string;
    dateFormat: string;
    theme: "light" | "dark" | "auto";
  };
  notifications: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    appointmentReminders: boolean;
    vaccinationReminders: boolean;
    medicationReminders: boolean;
    healthCheckReminders: boolean;
    marketingEmails: boolean;
  };
  privacy: {
    profileVisibility: "private" | "family" | "public";
    dataSharing: boolean;
    analyticsTracking: boolean;
  };
}

export default function GuardianSettingsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [settings, setSettings] = useState<GuardianSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`/api/guardian/settings?slug=${slug}`);
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<GuardianSettings>) => {
    if (!settings) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/guardian/settings?slug=${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, ...updates })
      });

      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (error) {
      console.error("Failed to update settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const updatePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert("New passwords don't match");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/guardian/change-password?slug=${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm)
      });

      if (res.ok) {
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        alert("Password updated successfully");
      } else {
        alert("Failed to update password");
      }
    } catch (error) {
      console.error("Failed to update password:", error);
      alert("Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
          Loading settings...
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load settings</h2>
        <p className="text-gray-600">Please try refreshing the page</p>
      </div>
    );
  }

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "privacy", label: "Privacy", icon: Shield },
    { id: "security", label: "Security", icon: Key },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          Guardian Settings
        </p>
        <h1 className="text-3xl font-bold text-foreground mt-1">
          Account Preferences
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 font-semibold text-sm transition-colors ${
              activeTab === tab.id
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === "profile" && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
              <User className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={settings.profile.fullName}
                  onChange={(e) => setSettings({
                    ...settings,
                    profile: { ...settings.profile, fullName: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={settings.profile.email}
                  onChange={(e) => setSettings({
                    ...settings,
                    profile: { ...settings.profile, email: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number
                </label>
                <PhoneNumberInput
                  value={settings.profile.phone}
                  onChange={(value) => setSettings({
                    ...settings,
                    profile: { ...settings.profile, phone: value }
                  })}
                  className="border-gray-300"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={settings.profile.dateOfBirth}
                  onChange={(e) => setSettings({
                    ...settings,
                    profile: { ...settings.profile, dateOfBirth: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Address
              </label>
              <textarea
                value={settings.profile.address}
                onChange={(e) => setSettings({
                  ...settings,
                  profile: { ...settings.profile, address: e.target.value }
                })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div className="border-t pt-6">
              <h3 className="text-md font-semibold text-gray-900 mb-4">Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={settings.profile.emergencyContact.name}
                    onChange={(e) => setSettings({
                      ...settings,
                      profile: {
                        ...settings.profile,
                        emergencyContact: {
                          ...settings.profile.emergencyContact,
                          name: e.target.value
                        }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Relationship
                  </label>
                  <input
                    type="text"
                    value={settings.profile.emergencyContact.relationship}
                    onChange={(e) => setSettings({
                      ...settings,
                      profile: {
                        ...settings.profile,
                        emergencyContact: {
                          ...settings.profile.emergencyContact,
                          relationship: e.target.value
                        }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <PhoneNumberInput
                    value={settings.profile.emergencyContact.phone}
                    onChange={(value) => setSettings({
                      ...settings,
                      profile: {
                        ...settings.profile,
                        emergencyContact: {
                          ...settings.profile.emergencyContact,
                          phone: value
                        }
                      }
                    })}
                    className="border-gray-300"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-md font-semibold text-gray-900 mb-4">Preferences</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Language
                  </label>
                  <select
                    value={settings.preferences.language}
                    onChange={(e) => setSettings({
                      ...settings,
                      preferences: { ...settings.preferences, language: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Theme
                  </label>
                  <select
                    value={settings.preferences.theme}
                    onChange={(e) => setSettings({
                      ...settings,
                      preferences: { ...settings.preferences, theme: e.target.value as any }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
              <Bell className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Communication Channels</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.notifications.emailNotifications}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          emailNotifications: e.target.checked
                        }
                      })}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <div>
                      <span className="font-medium">Email Notifications</span>
                      <p className="text-sm text-gray-600">Receive notifications via email</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.notifications.smsNotifications}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          smsNotifications: e.target.checked
                        }
                      })}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <div>
                      <span className="font-medium">SMS Notifications</span>
                      <p className="text-sm text-gray-600">Receive notifications via text message</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.notifications.pushNotifications}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          pushNotifications: e.target.checked
                        }
                      })}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <div>
                      <span className="font-medium">Push Notifications</span>
                      <p className="text-sm text-gray-600">Receive push notifications in browser</p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Alert Types</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.notifications.appointmentReminders}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          appointmentReminders: e.target.checked
                        }
                      })}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="font-medium">Appointment Reminders</span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.notifications.vaccinationReminders}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          vaccinationReminders: e.target.checked
                        }
                      })}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="font-medium">Vaccination Reminders</span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.notifications.medicationReminders}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          medicationReminders: e.target.checked
                        }
                      })}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="font-medium">Medication Reminders</span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.notifications.healthCheckReminders}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          healthCheckReminders: e.target.checked
                        }
                      })}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="font-medium">Health Check Reminders</span>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Marketing</h3>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.notifications.marketingEmails}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        marketingEmails: e.target.checked
                      }
                    })}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <div>
                    <span className="font-medium">Marketing Emails</span>
                    <p className="text-sm text-gray-600">Receive emails about new features and health tips</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === "privacy" && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Privacy Settings</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Profile Visibility
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="visibility"
                      value="private"
                      checked={settings.privacy.profileVisibility === "private"}
                      onChange={(e) => setSettings({
                        ...settings,
                        privacy: {
                          ...settings.privacy,
                          profileVisibility: e.target.value as any
                        }
                      })}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    <div>
                      <span className="font-medium">Private</span>
                      <p className="text-sm text-gray-600">Only you can view your profile</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="visibility"
                      value="family"
                      checked={settings.privacy.profileVisibility === "family"}
                      onChange={(e) => setSettings({
                        ...settings,
                        privacy: {
                          ...settings.privacy,
                          profileVisibility: e.target.value as any
                        }
                      })}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    <div>
                      <span className="font-medium">Family Only</span>
                      <p className="text-sm text-gray-600">Visible to family members and healthcare providers</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="visibility"
                      value="public"
                      checked={settings.privacy.profileVisibility === "public"}
                      onChange={(e) => setSettings({
                        ...settings,
                        privacy: {
                          ...settings.privacy,
                          profileVisibility: e.target.value as any
                        }
                      })}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    <div>
                      <span className="font-medium">Public</span>
                      <p className="text-sm text-gray-600">Visible to all users in the system</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.privacy.dataSharing}
                    onChange={(e) => setSettings({
                      ...settings,
                      privacy: {
                        ...settings.privacy,
                        dataSharing: e.target.checked
                      }
                    })}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <div>
                    <span className="font-medium">Data Sharing for Research</span>
                    <p className="text-sm text-gray-600">Allow anonymized health data to be used for medical research</p>
                  </div>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.privacy.analyticsTracking}
                    onChange={(e) => setSettings({
                      ...settings,
                      privacy: {
                        ...settings.privacy,
                        analyticsTracking: e.target.checked
                      }
                    })}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <div>
                    <span className="font-medium">Analytics Tracking</span>
                    <p className="text-sm text-gray-600">Help improve the platform by sharing usage analytics</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === "security" && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
              <Key className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Change Password</h3>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={updatePassword}
                  disabled={saving || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                  className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4" />
                      Update Password
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      {activeTab !== "security" && (
        <div className="flex justify-end">
          <button
            onClick={() => updateSettings(settings)}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
