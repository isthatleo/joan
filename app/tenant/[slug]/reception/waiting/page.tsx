"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  BedDouble, Users, Clock, AlertTriangle, CheckCircle2, RefreshCw,
  Volume2, VolumeX, Monitor, Wifi, Coffee, Phone, MessageSquare,
  User, Calendar, Timer, Zap
} from "lucide-react";

interface WaitingRoomPatient {
  id: string;
  patientName: string;
  checkInTime: string;
  estimatedWaitTime: string;
  actualWaitTime: string;
  appointmentType: string;
  doctorName: string;
  status: "waiting" | "with-doctor" | "ready" | "delayed";
  priority: "low" | "normal" | "high" | "urgent";
  roomNumber?: string;
  position: number;
}

interface WaitingRoomStats {
  totalPatients: number;
  averageWaitTime: string;
  longestWait: string;
  roomsOccupied: number;
  roomsAvailable: number;
  nextPatientCall: string;
}

interface Announcement {
  id: string;
  message: string;
  type: "info" | "urgent" | "delay";
  timestamp: string;
  active: boolean;
}

export default function WaitingRoomPage() {
  const { slug } = useParams();
  const [patients, setPatients] = useState<WaitingRoomPatient[]>([]);
  const [stats, setStats] = useState<WaitingRoomStats | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [displayMode, setDisplayMode] = useState<"list" | "board">("board");

  // Fetch waiting room data
  const fetchWaitingRoomData = async () => {
    try {
      setRefreshing(true);
      const [patientsRes, statsRes, announcementsRes] = await Promise.all([
        fetch(`/api/tenant/${slug}/receptionist/waiting-room/patients`),
        fetch(`/api/tenant/${slug}/receptionist/waiting-room/stats`),
        fetch(`/api/tenant/${slug}/receptionist/waiting-room/announcements`),
      ]);

      if (patientsRes.ok) setPatients(await patientsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (announcementsRes.ok) setAnnouncements(await announcementsRes.json());

      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch waiting room data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWaitingRoomData();
    const interval = setInterval(fetchWaitingRoomData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Call next patient
  const callNextPatient = async (patientId: string) => {
    try {
      const res = await fetch(`/api/tenant/${slug}/receptionist/waiting-room/call/${patientId}`, {
        method: "POST",
      });

      if (res.ok) {
        fetchWaitingRoomData(); // Refresh data
        if (soundEnabled) {
          // Play announcement sound
          const audio = new Audio("/sounds/patient-call.mp3");
          audio.play().catch(() => {}); // Ignore if audio fails
        }
      }
    } catch (error) {
      console.error("Failed to call patient:", error);
    }
  };

  // Create announcement
  const createAnnouncement = async (message: string, type: Announcement["type"]) => {
    try {
      const res = await fetch(`/api/tenant/${slug}/receptionist/waiting-room/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, type }),
      });

      if (res.ok) {
        fetchWaitingRoomData();
      }
    } catch (error) {
      console.error("Failed to create announcement:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "waiting": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "with-doctor": return "bg-blue-100 text-blue-800 border-blue-300";
      case "ready": return "bg-green-100 text-green-800 border-green-300";
      case "delayed": return "bg-red-100 text-red-800 border-red-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "text-red-600 bg-red-50";
      case "high": return "text-orange-600 bg-orange-50";
      case "normal": return "text-blue-600 bg-blue-50";
      case "low": return "text-gray-600 bg-gray-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
          Loading waiting room...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Waiting Room Management
          </p>
          <h1 className="text-3xl font-bold text-foreground mt-1">
            Patient Waiting Room
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor patient flow and manage waiting room communications
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg border ${soundEnabled ? 'bg-blue-50 border-blue-300 text-blue-600' : 'bg-gray-50 border-gray-300 text-gray-600'} transition-all`}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setDisplayMode(displayMode === "list" ? "board" : "list")}
            className="p-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all"
          >
            <Monitor className="h-4 w-4" />
          </button>
          <button
            onClick={fetchWaitingRoomData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Waiting</p>
              <p className="text-xl font-bold text-gray-900">{stats?.totalPatients || 0}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 text-green-600">
              <Timer className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Wait</p>
              <p className="text-xl font-bold text-gray-900">{stats?.averageWaitTime || "0m"}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50 text-red-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Longest Wait</p>
              <p className="text-xl font-bold text-gray-900">{stats?.longestWait || "0m"}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <BedDouble className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Rooms Used</p>
              <p className="text-xl font-bold text-gray-900">{stats?.roomsOccupied || 0}/{stats?.roomsAvailable ? (stats.roomsOccupied + stats.roomsAvailable) : 0}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Next Call</p>
              <p className="text-xl font-bold text-gray-900">{stats?.nextPatientCall || "None"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Announcements */}
      <div className="p-6 rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Active Announcements
          </h2>
          <button
            onClick={() => createAnnouncement("Please be patient, we are experiencing higher than normal wait times.", "info")}
            className="px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-all text-sm"
          >
            New Announcement
          </button>
        </div>

        <div className="space-y-3">
          {announcements.filter(a => a.active).map((announcement) => (
            <div
              key={announcement.id}
              className={`p-4 rounded-lg border ${
                announcement.type === "urgent" ? "border-red-300 bg-red-50" :
                announcement.type === "delay" ? "border-yellow-300 bg-yellow-50" :
                "border-blue-300 bg-blue-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-1 rounded ${
                    announcement.type === "urgent" ? "bg-red-100 text-red-600" :
                    announcement.type === "delay" ? "bg-yellow-100 text-yellow-600" :
                    "bg-blue-100 text-blue-600"
                  }`}>
                    {announcement.type === "urgent" ? <AlertTriangle className="h-4 w-4" /> :
                     announcement.type === "delay" ? <Clock className="h-4 w-4" /> :
                     <MessageSquare className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{announcement.message}</p>
                    <p className="text-sm text-gray-500">
                      Posted {new Date(announcement.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  <Volume2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {announcements.filter(a => a.active).length === 0 && (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No active announcements</p>
              <p className="text-sm text-gray-400 mt-1">
                Announcements will appear here when posted
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Patient Display */}
      <div className="p-6 rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BedDouble className="h-5 w-5 text-orange-500" />
            Waiting Room Patients
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Display:</span>
            <button
              onClick={() => setDisplayMode("board")}
              className={`px-3 py-1 rounded text-sm font-medium ${
                displayMode === "board"
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              } transition-all`}
            >
              Board
            </button>
            <button
              onClick={() => setDisplayMode("list")}
              className={`px-3 py-1 rounded text-sm font-medium ${
                displayMode === "list"
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              } transition-all`}
            >
              List
            </button>
          </div>
        </div>

        {displayMode === "board" ? (
          /* Board View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {patients.map((patient) => (
              <div
                key={patient.id}
                className="p-4 rounded-lg border border-gray-200 hover:border-orange-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                      {patient.position}
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(patient.priority)}`}>
                      {patient.priority.toUpperCase()}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded font-semibold ${getStatusColor(patient.status)}`}>
                    {patient.status.replace("-", " ").toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">{patient.patientName}</p>
                    <p className="text-sm text-gray-600">{patient.appointmentType}</p>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {patient.doctorName}
                    </div>
                    {patient.roomNumber && (
                      <div className="flex items-center gap-1">
                        <BedDouble className="h-3 w-3" />
                        Room {patient.roomNumber}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-gray-500">Wait Time</p>
                      <p className="font-semibold text-gray-900">{patient.actualWaitTime}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500">Est. Total</p>
                      <p className="font-semibold text-gray-900">{patient.estimatedWaitTime}</p>
                    </div>
                  </div>

                  {patient.status === "waiting" && (
                    <button
                      onClick={() => callNextPatient(patient.id)}
                      className="w-full mt-3 px-3 py-2 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                    >
                      <Phone className="h-4 w-4" />
                      Call Patient
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-3">
            {patients.map((patient) => (
              <div
                key={patient.id}
                className="p-4 rounded-lg border border-gray-200 hover:border-orange-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                    {patient.position}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-gray-900">{patient.patientName}</p>
                      <span className={`text-xs px-2 py-1 rounded font-semibold ${getPriorityColor(patient.priority)}`}>
                        {patient.priority.toUpperCase()}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded font-semibold ${getStatusColor(patient.status)}`}>
                        {patient.status.replace("-", " ").toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 mt-1 text-sm text-gray-500">
                      <span>{patient.appointmentType}</span>
                      <span>Dr. {patient.doctorName}</span>
                      <span>Wait: {patient.actualWaitTime}</span>
                      <span>Est: {patient.estimatedWaitTime}</span>
                      {patient.roomNumber && <span>Room {patient.roomNumber}</span>}
                    </div>
                  </div>

                  {patient.status === "waiting" && (
                    <button
                      onClick={() => callNextPatient(patient.id)}
                      className="px-4 py-2 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-all flex items-center gap-2"
                    >
                      <Phone className="h-4 w-4" />
                      Call
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {patients.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No patients in waiting room</p>
            <p className="text-sm text-gray-400 mt-1">
              Patients will appear here after check-in
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button className="p-4 rounded-2xl border border-gray-200 bg-white hover:border-orange-300 hover:shadow-sm transition-all text-left">
          <div className="flex items-center gap-3">
            <Wifi className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-semibold text-gray-900">WiFi Information</p>
              <p className="text-sm text-gray-500">Share guest WiFi details</p>
            </div>
          </div>
        </button>

        <button className="p-4 rounded-2xl border border-gray-200 bg-white hover:border-orange-300 hover:shadow-sm transition-all text-left">
          <div className="flex items-center gap-3">
            <Coffee className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-semibold text-gray-900">Amenities</p>
              <p className="text-sm text-gray-500">Water, coffee, and refreshments</p>
            </div>
          </div>
        </button>

        <button className="p-4 rounded-2xl border border-gray-200 bg-white hover:border-orange-300 hover:shadow-sm transition-all text-left">
          <div className="flex items-center gap-3">
            <Monitor className="h-5 w-5 text-purple-600" />
            <div>
              <p className="font-semibold text-gray-900">Digital Signage</p>
              <p className="text-sm text-gray-500">Update waiting room displays</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
