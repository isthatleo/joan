"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Globe, Smartphone, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  resource?: string;
  description?: string;
  browser?: string;
  os?: string;
  deviceType?: string;
  country?: string;
  city?: string;
  ipAddress?: string;
  status?: string;
  timestamp?: Date;
}

export function ActivityLogsViewer({ tenantId }: { tenantId: string }) {
  const { data: session } = useSession();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<{ action?: string; hoursBack?: number }>({
    hoursBack: 24,
  });

  const fetchLogs = async () => {
    if (!session?.user) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        tenantId,
        limit: "100",
        hoursBack: filter.hoursBack?.toString() || "24",
      });

      if (filter.action) {
        params.append("action", filter.action);
      }

      const response = await fetch(`/api/activity-logging?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Failed to fetch activity logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [filter]);

  const getActionBadgeColor = (action: string) => {
    const colorMap: Record<string, string> = {
      login: "bg-green-100 text-green-800",
      logout: "bg-gray-100 text-gray-800",
      view: "bg-blue-100 text-blue-800",
      create: "bg-purple-100 text-purple-800",
      update: "bg-yellow-100 text-yellow-800",
      delete: "bg-red-100 text-red-800",
      export: "bg-orange-100 text-orange-800",
      download: "bg-indigo-100 text-indigo-800",
      upload: "bg-pink-100 text-pink-800",
      send_message: "bg-cyan-100 text-cyan-800",
    };
    return colorMap[action] || "bg-gray-100 text-gray-800";
  };

  const columns = [
    {
      header: "Timestamp",
      accessorKey: "timestamp",
      cell: (info: any) => new Date(info.getValue()).toLocaleString(),
    },
    {
      header: "Action",
      accessorKey: "action",
      cell: (info: any) => (
        <Badge className={getActionBadgeColor(info.getValue())}>{info.getValue()}</Badge>
      ),
    },
    {
      header: "Resource",
      accessorKey: "resource",
      cell: (info: any) => info.getValue() || "-",
    },
    {
      header: "Description",
      accessorKey: "description",
      cell: (info: any) => <span className="text-sm">{info.getValue() || "-"}</span>,
    },
    {
      header: "Device",
      accessorKey: "deviceType",
      cell: (info: any) => (
        <div className="flex items-center gap-1">
          <Smartphone className="h-4 w-4" />
          <span>{info.getValue() || "-"}</span>
        </div>
      ),
    },
    {
      header: "Browser",
      accessorKey: "browser",
      cell: (info: any) => <span className="text-sm">{info.getValue() || "-"}</span>,
    },
    {
      header: "OS",
      accessorKey: "os",
      cell: (info: any) => <span className="text-sm">{info.getValue() || "-"}</span>,
    },
    {
      header: "Location",
      accessorKey: "country",
      cell: (info: any) => (
        <div className="flex items-center gap-1">
          <Globe className="h-4 w-4" />
          <span>{`${info.row.original.country || "-"}, ${info.row.original.city || "-"}`}</span>
        </div>
      ),
    },
    {
      header: "IP Address",
      accessorKey: "ipAddress",
      cell: (info: any) => <span className="text-xs font-mono">{info.getValue() || "-"}</span>,
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (info: any) => {
        const value = info.getValue();
        const statusColors: Record<string, string> = {
          success: "bg-green-100 text-green-800",
          failure: "bg-red-100 text-red-800",
          pending: "bg-yellow-100 text-yellow-800",
        };
        return (
          <Badge className={statusColors[value] || "bg-gray-100 text-gray-800"}>{value}</Badge>
        );
      },
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <div>
              <CardTitle>Activity Logs</CardTitle>
              <CardDescription>Real-time user and system activities</CardDescription>
            </div>
          </div>
          <Button onClick={fetchLogs} disabled={loading} size="sm">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <select
              value={filter.hoursBack || 24}
              onChange={(e) => setFilter({ ...filter, hoursBack: parseInt(e.target.value) })}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value={1}>Last 1 hour</option>
              <option value={6}>Last 6 hours</option>
              <option value={24}>Last 24 hours</option>
              <option value={168}>Last 7 days</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <DataTable columns={columns} data={logs} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

