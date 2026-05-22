
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  Globe,
  Smartphone,
  Laptop,
  Tablet,
  Clock,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

interface ActiveUserSession {
  userId: string;
  fullName?: string;
  email?: string;
  avatar?: string;
  currentDevice?: {
    browser: string;
    os: string;
    deviceType: "mobile" | "tablet" | "desktop";
  };
  location?: {
    country: string;
    city: string;
    ipAddress: string;
  };
  activeSessions: number;
  lastActivityAt: Date;
  role?: string;
}

export function SystemActivityMonitor({ tenantId }: { tenantId: string }) {
  const [activeUsers, setActiveUsers] = useState<ActiveUserSession[]>([]);
  const [stats, setStats] = useState({
    totalActiveUsers: 0,
    totalActiveSessions: 0,
    totalDevices: 0,
  });
  const [loading, setLoading] = useState(false);

  const fetchActiveUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/sessions?tenantId=${tenantId}&action=active`);
      if (response.ok) {
        const data = await response.json();

        // Group sessions by user for summary
        const userMap = new Map<string, any>();

        data.sessions?.forEach((session: any) => {
          if (!userMap.has(session.userId)) {
            userMap.set(session.userId, {
              userId: session.userId,
              fullName: session.fullName || "Unknown",
              email: session.email || "N/A",
              avatar: session.avatar,
              activeSessions: 0,
              devices: new Set(),
              lastActivityAt: session.lastActivityAt,
              currentDevice: {
                browser: session.browser,
                os: session.os,
                deviceType: session.deviceType || "desktop",
              },
              location: {
                country: session.country || "Unknown",
                city: session.city || "Unknown",
                ipAddress: session.ipAddress || "Unknown",
              },
            });
          }

          const user = userMap.get(session.userId);
          user.activeSessions += 1;
          user.devices.add(session.deviceFingerprintId);

          // Update to most recent activity
          if (new Date(session.lastActivityAt) > new Date(user.lastActivityAt)) {
            user.lastActivityAt = session.lastActivityAt;
          }
        });

        const users = Array.from(userMap.values()).map((u) => ({
          ...u,
          devices: undefined, // Remove the Set
        }));

        setActiveUsers(users);
        setStats({
          totalActiveUsers: users.length,
          totalActiveSessions: data.sessions?.length || 0,
          totalDevices: new Set(data.sessions?.map((s: any) => s.deviceFingerprintId)).size || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch active users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveUsers();
    const interval = setInterval(fetchActiveUsers, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [tenantId]);

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case "mobile":
        return <Smartphone className="h-4 w-4" />;
      case "tablet":
        return <Tablet className="h-4 w-4" />;
      default:
        return <Laptop className="h-4 w-4" />;
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase();
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Users</p>
                <p className="text-3xl font-bold text-green-600">{stats.totalActiveUsers}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Sessions</p>
                <p className="text-3xl font-bold text-blue-600">{stats.totalActiveSessions}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Devices</p>
                <p className="text-3xl font-bold text-purple-600">{stats.totalDevices}</p>
              </div>
              <Smartphone className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Users List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              <div>
                <CardTitle>Currently Online</CardTitle>
                <CardDescription>Active users in real-time</CardDescription>
              </div>
            </div>
            <Button onClick={fetchActiveUsers} disabled={loading} size="sm">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activeUsers.length === 0 ? (
            <p className="text-sm text-gray-500">No active users</p>
          ) : (
            <div className="space-y-3">
              {activeUsers.map((user) => (
                <div
                  key={user.userId}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <Avatar className="h-10 w-10">
                        {user.avatar && <img src={user.avatar} alt={user.fullName} />}
                        <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{user.fullName || "Unknown User"}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Online</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="flex items-center gap-1">
                      {getDeviceIcon(user.currentDevice?.deviceType || "desktop")}
                      <span>{user.currentDevice?.browser || "Unknown"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {user.currentDevice?.os}
                    </div>
                    <div className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      <span>{user.location?.country || "Unknown"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{getTimeAgo(user.lastActivityAt)}</span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 space-y-1">
                    <div>{user.location?.city && `${user.location.city}, `}{user.location?.country}</div>
                    <div className="font-mono">{user.location?.ipAddress}</div>
                    <div>
                      {user.activeSessions} session{user.activeSessions !== 1 ? "s" : ""} active
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

