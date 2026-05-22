"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Bell, AlertTriangle, CheckCircle, Clock, Calendar,
  Pill, Syringe, Stethoscope, Search, Filter,
  Settings, BellOff, BellRing, Loader2, Baby
} from "lucide-react";

const orange = "#F97316";

interface Alert {
  id: string;
  childId: string;
  childName: string;
  type: "appointment" | "vaccination" | "medication" | "health" | "system";
  title: string;
  message: string;
  severity: "low" | "medium" | "high" | "urgent";
  status: "active" | "acknowledged" | "resolved";
  createdAt: string;
  dueDate?: string;
  actionRequired: boolean;
  actionUrl?: string;
  metadata?: {
    appointmentId?: string;
    vaccinationId?: string;
    medicationId?: string;
  };
}

interface ReminderSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  appointmentReminders: boolean;
  vaccinationReminders: boolean;
  medicationReminders: boolean;
  healthCheckReminders: boolean;
  reminderAdvanceTime: number; // minutes
}

interface Child {
  id: string;
  firstName: string;
  lastName: string;
}

export default function AlertsRemindersPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [alertsRes, settingsRes, childrenRes] = await Promise.all([
        fetch(`/api/guardian/alerts?slug=${slug}`),
        fetch(`/api/guardian/alerts/settings?slug=${slug}`),
        fetch(`/api/guardian/children?slug=${slug}`)
      ]);

      if (alertsRes.ok) setAlerts(await alertsRes.json());
      if (settingsRes.ok) setSettings(await settingsRes.json());
      if (childrenRes.ok) setChildren(await childrenRes.json());

      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch alerts data:", error);
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<ReminderSettings>) => {
    setUpdatingSettings(true);
    try {
      const res = await fetch(`/api/guardian/alerts/settings?slug=${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, ...newSettings })
      });

      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (error) {
      console.error("Failed to update settings:", error);
    } finally {
      setUpdatingSettings(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const res = await fetch(`/api/guardian/alerts/${alertId}/acknowledge?slug=${slug}`, {
        method: "POST"
      });

      if (res.ok) {
        setAlerts(alerts.map(alert =>
          alert.id === alertId
            ? { ...alert, status: "acknowledged" as const }
            : alert
        ));
      }
    } catch (error) {
      console.error("Failed to acknowledge alert:", error);
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.childName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === "all" || alert.type === filterType;
    const matchesSeverity = filterSeverity === "all" || alert.severity === filterSeverity;
    const matchesStatus = filterStatus === "all" || alert.status === filterStatus;

    return matchesSearch && matchesType && matchesSeverity && matchesStatus;
  });

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "appointment": return <Calendar className="h-5 w-5" />;
      case "vaccination": return <Syringe className="h-5 w-5" />;
      case "medication": return <Pill className="h-5 w-5" />;
      case "health": return <Stethoscope className="h-5 w-5" />;
      default: return <Bell className="h-5 w-5" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "urgent": return "text-red-600 bg-red-50 border-red-200";
      case "high": return "text-orange-600 bg-orange-50 border-orange-200";
      case "medium": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "low": return "text-blue-600 bg-blue-50 border-blue-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-red-100 text-red-800";
      case "acknowledged": return "bg-yellow-100 text-yellow-800";
      case "resolved": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getAlertStats = () => {
    const stats = {
      total: alerts.length,
      active: alerts.filter(a => a.status === "active").length,
      acknowledged: alerts.filter(a => a.status === "acknowledged").length,
      resolved: alerts.filter(a => a.status === "resolved").length,
    };
    return stats;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
          Loading alerts and reminders...
        </div>
      </div>
    );
  }

  const stats = getAlertStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Alerts & Reminders
          </p>
          <h1 className="text-3xl font-bold text-foreground mt-1">
            Health Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Stay informed about your children's health appointments and important reminders
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-50 text-yellow-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Acknowledged</p>
              <p className="text-2xl font-bold text-gray-900">{stats.acknowledged}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 text-green-600">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Resolved</p>
              <p className="text-2xl font-bold text-gray-900">{stats.resolved}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Notification Settings</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Notification Types */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Notification Types</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings?.emailNotifications || false}
                  onChange={(e) => updateSettings({ emailNotifications: e.target.checked })}
                  disabled={updatingSettings}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm">Email notifications</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings?.smsNotifications || false}
                  onChange={(e) => updateSettings({ smsNotifications: e.target.checked })}
                  disabled={updatingSettings}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm">SMS notifications</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings?.pushNotifications || false}
                  onChange={(e) => updateSettings({ pushNotifications: e.target.checked })}
                  disabled={updatingSettings}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm">Push notifications</span>
              </label>
            </div>
          </div>

          {/* Reminder Types */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Reminder Types</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings?.appointmentReminders || false}
                  onChange={(e) => updateSettings({ appointmentReminders: e.target.checked })}
                  disabled={updatingSettings}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm">Appointment reminders</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings?.vaccinationReminders || false}
                  onChange={(e) => updateSettings({ vaccinationReminders: e.target.checked })}
                  disabled={updatingSettings}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm">Vaccination reminders</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings?.medicationReminders || false}
                  onChange={(e) => updateSettings({ medicationReminders: e.target.checked })}
                  disabled={updatingSettings}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm">Medication reminders</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings?.healthCheckReminders || false}
                  onChange={(e) => updateSettings({ healthCheckReminders: e.target.checked })}
                  disabled={updatingSettings}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm">Health check reminders</span>
              </label>
            </div>
          </div>

          {/* Timing */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Reminder Timing</h3>
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Advance notice (minutes)
              </label>
              <select
                value={settings?.reminderAdvanceTime || 60}
                onChange={(e) => updateSettings({ reminderAdvanceTime: parseInt(e.target.value) })}
                disabled={updatingSettings}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
                <option value={1440}>1 day</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search alerts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="appointment">Appointments</option>
            <option value="vaccination">Vaccinations</option>
            <option value="medication">Medications</option>
            <option value="health">Health</option>
            <option value="system">System</option>
          </select>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="all">All Severities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12">
            <BellOff className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No alerts found</h3>
            <p className="text-gray-600">
              {searchTerm || filterType !== "all" || filterSeverity !== "all" || filterStatus !== "all"
                ? "Try adjusting your search or filters"
                : "You're all caught up! No active alerts at this time."}
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div key={alert.id} className={`p-6 rounded-lg border ${getSeverityColor(alert.severity)}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-white bg-opacity-50">
                    {getAlertIcon(alert.type)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{alert.title}</h3>
                      <span className={`px-2 py-1 rounded-md text-xs font-semibold uppercase ${getStatusColor(alert.status)}`}>
                        {alert.status}
                      </span>
                      <span className={`px-2 py-1 rounded-md text-xs font-semibold uppercase bg-white bg-opacity-50`}>
                        {alert.severity}
                      </span>
                    </div>

                    <p className="text-gray-700 mb-3">{alert.message}</p>

                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <Baby className="h-4 w-4" />
                        <span>{alert.childName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{new Date(alert.createdAt).toLocaleString()}</span>
                      </div>
                      {alert.dueDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Due: {new Date(alert.dueDate).toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    {alert.actionRequired && (
                      <div className="flex gap-2">
                        {alert.status === "active" && (
                          <button
                            onClick={() => acknowledgeAlert(alert.id)}
                            className="px-4 py-2 bg-white bg-opacity-50 text-gray-700 rounded-lg hover:bg-opacity-75 transition-colors text-sm font-semibold"
                          >
                            Acknowledge
                          </button>
                        )}
                        {alert.actionUrl && (
                          <a
                            href={alert.actionUrl}
                            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-semibold"
                          >
                            Take Action
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
