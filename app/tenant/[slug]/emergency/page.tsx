"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertOctagon, AlertTriangle, Phone, MessageSquare, Clock, MapPin,
  User, Heart, Activity, Thermometer, Stethoscope, Ambulance,
  CheckCircle2, XCircle, RefreshCw, Volume2, VolumeX, Zap,
  Shield, Users, Timer, Bell
} from "lucide-react";

interface EmergencyAlert {
  id: string;
  patientId: string;
  patientName: string;
  type: "medical" | "trauma" | "cardiac" | "respiratory" | "neurological" | "other";
  severity: "critical" | "urgent" | "moderate" | "minor";
  location: string;
  description: string;
  reportedBy: string;
  reportedAt: string;
  status: "active" | "responding" | "resolved" | "cancelled";
  assignedTeam?: string;
  eta?: string;
  vitalSigns?: {
    heartRate?: number;
    bloodPressure?: string;
    oxygenSaturation?: number;
    temperature?: number;
    respiratoryRate?: number;
  };
}

interface EmergencyTeam {
  id: string;
  name: string;
  role: string;
  status: "available" | "responding" | "busy" | "off-duty";
  location: string;
  lastActive: string;
}

interface EmergencyProtocol {
  id: string;
  name: string;
  type: string;
  steps: string[];
  estimatedTime: string;
  requiredPersonnel: string[];
}

export default function EmergencyPage() {
  const { slug } = useParams();
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [teams, setTeams] = useState<EmergencyTeam[]>([]);
  const [protocols, setProtocols] = useState<EmergencyProtocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<EmergencyAlert | null>(null);
  const [showProtocol, setShowProtocol] = useState(false);

  // Fetch emergency data
  const fetchEmergencyData = async () => {
    try {
      setRefreshing(true);
      const [alertsRes, teamsRes, protocolsRes] = await Promise.all([
        fetch(`/api/tenant/${slug}/receptionist/emergency/alerts`),
        fetch(`/api/tenant/${slug}/receptionist/emergency/teams`),
        fetch(`/api/tenant/${slug}/receptionist/emergency/protocols`),
      ]);

      if (alertsRes.ok) setAlerts(await alertsRes.json());
      if (teamsRes.ok) setTeams(await teamsRes.json());
      if (protocolsRes.ok) setProtocols(await protocolsRes.json());

      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch emergency data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmergencyData();
    const interval = setInterval(fetchEmergencyData, 15000); // Refresh every 15 seconds for emergencies
    return () => clearInterval(interval);
  }, []);

  // Create emergency alert
  const createEmergencyAlert = async (alertData: Omit<EmergencyAlert, "id" | "reportedAt" | "status">) => {
    try {
      const res = await fetch(`/api/tenant/${slug}/receptionist/emergency/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(alertData),
      });

      if (res.ok) {
        fetchEmergencyData();
        if (soundEnabled) {
          // Play emergency alert sound
          const audio = new Audio("/sounds/emergency-alert.mp3");
          audio.play().catch(() => {});
        }
      }
    } catch (error) {
      console.error("Failed to create emergency alert:", error);
    }
  };

  // Update alert status
  const updateAlertStatus = async (alertId: string, status: EmergencyAlert["status"], assignedTeam?: string) => {
    try {
      const res = await fetch(`/api/tenant/${slug}/receptionist/emergency/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, assignedTeam }),
      });

      if (res.ok) {
        fetchEmergencyData();
      }
    } catch (error) {
      console.error("Failed to update alert status:", error);
    }
  };

  // Call emergency team
  const callEmergencyTeam = async (teamId: string, alertId: string) => {
    try {
      const res = await fetch(`/api/tenant/${slug}/receptionist/emergency/teams/${teamId}/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId }),
      });

      if (res.ok) {
        updateAlertStatus(alertId, "responding", teamId);
      }
    } catch (error) {
      console.error("Failed to call emergency team:", error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "text-red-600 bg-red-50 border-red-300";
      case "urgent": return "text-orange-600 bg-orange-50 border-orange-300";
      case "moderate": return "text-yellow-600 bg-yellow-50 border-yellow-300";
      case "minor": return "text-blue-600 bg-blue-50 border-blue-300";
      default: return "text-gray-600 bg-gray-50 border-gray-300";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "text-red-600 bg-red-50";
      case "responding": return "text-blue-600 bg-blue-50";
      case "resolved": return "text-green-600 bg-green-50";
      case "cancelled": return "text-gray-600 bg-gray-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const getTeamStatusColor = (status: string) => {
    switch (status) {
      case "available": return "text-green-600 bg-green-50";
      case "responding": return "text-blue-600 bg-blue-50";
      case "busy": return "text-yellow-600 bg-yellow-50";
      case "off-duty": return "text-gray-600 bg-gray-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          Loading emergency response system...
        </div>
      </div>
    );
  }

  const activeAlerts = alerts.filter(a => a.status === "active" || a.status === "responding");
  const criticalAlerts = alerts.filter(a => a.severity === "critical" && (a.status === "active" || a.status === "responding"));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Emergency Response System
          </p>
          <h1 className="text-3xl font-bold text-foreground mt-1">
            Emergency Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Critical incident response and emergency coordination
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg border ${soundEnabled ? 'bg-red-50 border-red-300 text-red-600' : 'bg-gray-50 border-gray-300 text-gray-600'} transition-all`}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <button
            onClick={fetchEmergencyData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <div className="p-4 rounded-xl border border-red-300 bg-red-50">
          <div className="flex items-center gap-3">
            <AlertOctagon className="h-6 w-6 text-red-600 animate-pulse" />
            <div className="flex-1">
              <p className="text-red-900 font-semibold">
                CRITICAL EMERGENCY - {criticalAlerts.length} Active
              </p>
              <p className="text-red-700 text-sm">
                Immediate response required. Emergency teams have been alerted.
              </p>
            </div>
            <button className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-all">
              View Details
            </button>
          </div>
        </div>
      )}

      {/* Emergency Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50 text-red-600">
              <AlertOctagon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Active Emergencies</p>
              <p className="text-xl font-bold text-gray-900">{activeAlerts.length}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Teams Available</p>
              <p className="text-xl font-bold text-gray-900">{teams.filter(t => t.status === "available").length}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Resolved Today</p>
              <p className="text-xl font-bold text-gray-900">{alerts.filter(a => a.status === "resolved").length}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
              <Timer className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Response</p>
              <p className="text-xl font-bold text-gray-900">4.2 min</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Emergency Alerts */}
      <div className="p-6 rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Active Emergency Alerts
          </h2>
          <button
            onClick={() => createEmergencyAlert({
              patientId: "",
              patientName: "Unknown Patient",
              type: "medical",
              severity: "urgent",
              location: "Emergency Department",
              description: "Medical emergency - details to be confirmed",
              reportedBy: "Reception Staff"
            })}
            className="px-4 py-2 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-all"
          >
            Report Emergency
          </button>
        </div>

        <div className="space-y-4">
          {activeAlerts.map((alert) => (
            <div
              key={alert.id}
              className="p-4 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-all cursor-pointer"
              onClick={() => setSelectedAlert(alert)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getSeverityColor(alert.severity)}`}>
                    <AlertOctagon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{alert.patientName}</p>
                    <p className="text-sm text-gray-600">{alert.type.toUpperCase()} • {alert.location}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded font-semibold ${getStatusColor(alert.status)}`}>
                    {alert.status.toUpperCase()}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(alert.reportedAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-700 mb-3">{alert.description}</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>Reported by: {alert.reportedBy}</span>
                  {alert.assignedTeam && <span>Team: {alert.assignedTeam}</span>}
                  {alert.eta && <span>ETA: {alert.eta}</span>}
                </div>

                <div className="flex gap-2">
                  {alert.status === "active" && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateAlertStatus(alert.id, "responding");
                        }}
                        className="px-3 py-1 rounded text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-all"
                      >
                        Start Response
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateAlertStatus(alert.id, "resolved");
                        }}
                        className="px-3 py-1 rounded text-sm font-semibold bg-green-500 text-white hover:bg-green-600 transition-all"
                      >
                        Resolve
                      </button>
                    </>
                  )}
                  {alert.status === "responding" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateAlertStatus(alert.id, "resolved");
                      }}
                      className="px-3 py-1 rounded text-sm font-semibold bg-green-500 text-white hover:bg-green-600 transition-all"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>

              {/* Vital Signs */}
              {alert.vitalSigns && (
                <div className="mt-3 pt-3 border-t border-red-200">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    {alert.vitalSigns.heartRate && (
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-red-500" />
                        <span className="font-medium">{alert.vitalSigns.heartRate} BPM</span>
                      </div>
                    )}
                    {alert.vitalSigns.bloodPressure && (
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">{alert.vitalSigns.bloodPressure}</span>
                      </div>
                    )}
                    {alert.vitalSigns.oxygenSaturation && (
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-green-500" />
                        <span className="font-medium">{alert.vitalSigns.oxygenSaturation}% O2</span>
                      </div>
                    )}
                    {alert.vitalSigns.temperature && (
                      <div className="flex items-center gap-2">
                        <Thermometer className="h-4 w-4 text-orange-500" />
                        <span className="font-medium">{alert.vitalSigns.temperature}°F</span>
                      </div>
                    )}
                    {alert.vitalSigns.respiratoryRate && (
                      <div className="flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-purple-500" />
                        <span className="font-medium">{alert.vitalSigns.respiratoryRate} RR</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {activeAlerts.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-300 mx-auto mb-4" />
              <p className="text-gray-500">No active emergency alerts</p>
              <p className="text-sm text-gray-400 mt-1">
                Emergency alerts will appear here when reported
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Emergency Teams */}
      <div className="p-6 rounded-2xl border border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-500" />
          Emergency Response Teams
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <div
              key={team.id}
              className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                    {team.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{team.name}</p>
                    <p className="text-sm text-gray-500">{team.role}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded font-semibold ${getTeamStatusColor(team.status)}`}>
                  {team.status.replace("-", " ").toUpperCase()}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3" />
                  <span>{team.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>Last active: {new Date(team.lastActive).toLocaleTimeString()}</span>
                </div>
              </div>

              {team.status === "available" && selectedAlert && (
                <button
                  onClick={() => callEmergencyTeam(team.id, selectedAlert.id)}
                  className="w-full mt-3 px-3 py-2 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  Call Team
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Emergency Protocols */}
      <div className="p-6 rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-500" />
            Emergency Protocols
          </h2>
          <button
            onClick={() => setShowProtocol(!showProtocol)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
          >
            {showProtocol ? "Hide" : "Show"} Protocols
          </button>
        </div>

        {showProtocol && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {protocols.map((protocol) => (
              <div
                key={protocol.id}
                className="p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{protocol.name}</p>
                    <p className="text-sm text-gray-500">{protocol.type} • {protocol.estimatedTime}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Required Personnel:</p>
                  <div className="flex flex-wrap gap-1">
                    {protocol.requiredPersonnel.map((personnel, index) => (
                      <span
                        key={index}
                        className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600"
                      >
                        {personnel}
                      </span>
                    ))}
                  </div>
                </div>

                <button className="w-full mt-3 px-3 py-2 rounded-lg border border-purple-300 text-purple-600 hover:bg-purple-50 transition-all text-sm font-semibold">
                  View Full Protocol
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button className="p-4 rounded-2xl border border-gray-200 bg-white hover:border-red-300 hover:shadow-sm transition-all text-left">
          <div className="flex items-center gap-3">
            <Ambulance className="h-5 w-5 text-red-600" />
            <div>
              <p className="font-semibold text-gray-900">Call Ambulance</p>
              <p className="text-sm text-gray-500">Emergency medical services</p>
            </div>
          </div>
        </button>

        <button className="p-4 rounded-2xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all text-left">
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-semibold text-gray-900">Emergency Line</p>
              <p className="text-sm text-gray-500">Internal emergency response</p>
            </div>
          </div>
        </button>

        <button className="p-4 rounded-2xl border border-gray-200 bg-white hover:border-green-300 hover:shadow-sm transition-all text-left">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-semibold text-gray-900">Alert All Staff</p>
              <p className="text-sm text-gray-500">Broadcast emergency alert</p>
            </div>
          </div>
        </button>

        <button className="p-4 rounded-2xl border border-gray-200 bg-white hover:border-orange-300 hover:shadow-sm transition-all text-left">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-orange-600" />
            <div>
              <p className="font-semibold text-gray-900">Monitor Vitals</p>
              <p className="text-sm text-gray-500">Real-time patient monitoring</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
