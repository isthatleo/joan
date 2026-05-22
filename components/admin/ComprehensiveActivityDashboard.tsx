"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityLogsViewer } from "./ActivityLogsViewer";
import { UserDevicesMonitor } from "./UserDevicesMonitor";
import { SecurityEventsMonitor } from "./SecurityEventsMonitor";
import { SystemActivityMonitor } from "./SystemActivityMonitor";
import { Activity, Shield, Users, Smartphone } from "lucide-react";

interface ComprehensiveActivityDashboardProps {
  tenantId: string;
  userId?: string;
}

export function ComprehensiveActivityDashboard({
  tenantId,
  userId,
}: ComprehensiveActivityDashboardProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity & Security Monitoring</h1>
        <p className="text-gray-500 mt-2">
          Monitor user activities, devices, and security events across your organization
        </p>
      </div>

      <Tabs defaultValue="system" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">System Activity</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Activity Logs</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          {userId && (
            <TabsTrigger value="devices" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              <span className="hidden sm:inline">Devices</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="system" className="space-y-4">
          <SystemActivityMonitor tenantId={tenantId} />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <ActivityLogsViewer tenantId={tenantId} />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <SecurityEventsMonitor tenantId={tenantId} />
        </TabsContent>

        {userId && (
          <TabsContent value="devices" className="space-y-4">
            <UserDevicesMonitor userId={userId} tenantId={tenantId} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

