"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Smartphone,
  Laptop,
  Tablet,
  MapPin,
  Clock,
  RefreshCw,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

interface UserDevice {
  id: string;
  browser: string;
  os: string;
  deviceType: "mobile" | "tablet" | "desktop";
  country?: string;
  city?: string;
  ipAddress?: string;
  lastSeenAt: Date;
  isVpn?: boolean;
  isProxy?: boolean;
  screenResolution?: string;
}

interface UserSession {
  id: string;
  deviceFingerprintId?: string;
  browser?: string;
  os?: string;
  deviceType?: string;
  country?: string;
  ipAddress?: string;
  isActive: boolean;
  lastActivityAt: Date;
  createdAt?: Date;
}

export function UserDevicesMonitor({ userId, tenantId }: { userId: string; tenantId: string }) {
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch devices
      const devicesResponse = await fetch(
        `/api/fingerprinting?userId=${userId}&tenantId=${tenantId}`
      );
      if (devicesResponse.ok) {
        const devicesData = await devicesResponse.json();
        setDevices(devicesData.devices || []);
      }

      // Fetch sessions
      const sessionsResponse = await fetch(`/api/sessions?userId=${userId}&tenantId=${tenantId}`);
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json();
        setSessions(sessionsData.sessions || []);
      }
    } catch (error) {
      console.error("Failed to fetch user devices/sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [userId, tenantId]);

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case "mobile":
        return <Smartphone className="h-5 w-5" />;
      case "tablet":
        return <Tablet className="h-5 w-5" />;
      default:
        return <Laptop className="h-5 w-5" />;
    }
  };

  const activeSessions = sessions.filter((s) => s.isActive);

  return (
    <div className="space-y-4">
      {/* Active Sessions Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              <div>
                <CardTitle>Active Sessions</CardTitle>
                <CardDescription>Current user sessions</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800">
                {activeSessions.length} Active
              </Badge>
              <Button onClick={fetchData} disabled={loading} size="sm">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activeSessions.length === 0 ? (
            <p className="text-sm text-gray-500">No active sessions</p>
          ) : (
            <div className="space-y-3">
              {activeSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-start justify-between border rounded-lg p-3 bg-gray-50"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">{getDeviceIcon(session.deviceType || "desktop")}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">
                        {session.browser || "Unknown"} on {session.os || "Unknown"}
                      </div>
                      <div className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {session.country || "Unknown"} • {session.ipAddress}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        Last active:{" "}
                        {new Date(session.lastActivityAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Registered Devices */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            <div>
              <CardTitle>Registered Devices</CardTitle>
              <CardDescription>All devices used by this user</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {devices.length === 0 ? (
            <p className="text-sm text-gray-500">No devices registered</p>
          ) : (
            <div className="space-y-3">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(device.deviceType)}
                      <div>
                        <div className="font-medium text-sm">
                          {device.browser} • {device.os}
                        </div>
                        <div className="text-xs text-gray-500">
                          {device.deviceType === "mobile" && "Mobile"}
                          {device.deviceType === "tablet" && "Tablet"}
                          {device.deviceType === "desktop" && "Desktop"}
                          {device.screenResolution && ` • ${device.screenResolution}`}
                        </div>
                      </div>
                    </div>
                    {device.isVpn || device.isProxy ? (
                      <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {device.isVpn ? "VPN" : "Proxy"}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {device.country || "Unknown"} {device.city ? `• ${device.city}` : ""}
                    </div>
                    <div className="font-mono text-gray-500">{device.ipAddress}</div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last seen: {new Date(device.lastSeenAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

