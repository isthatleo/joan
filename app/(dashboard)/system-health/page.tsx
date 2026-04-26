"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Server, Database, Zap, AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";

interface SystemMetrics {
  uptime: number;
  responseTime: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkIO: number;
  activeConnections: number;
  errorRate: number;
}

interface ServiceStatus {
  id: string;
  name: string;
  status: "operational" | "degraded" | "down";
  uptime: number;
  responseTime: number;
  lastChecked: string;
  incidents: number;
}

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
  status: "active" | "resolved";
  timestamp: string;
  resolvedAt?: string;
  affectedServices: string[];
}

export default function SystemHealthPage() {
  const { data: systemData, isLoading, refetch } = useQuery({
    queryKey: ["system-health"],
    queryFn: async () => {
      // This would typically fetch from monitoring APIs
      return {
        metrics: {
          uptime: 99.98,
          responseTime: 125,
          cpuUsage: 42,
          memoryUsage: 58,
          diskUsage: 67,
          networkIO: 34,
          activeConnections: 1247,
          errorRate: 0.02,
        } as SystemMetrics,
        services: [
          {
            id: "auth-api",
            name: "Authentication API",
            status: "operational",
            uptime: 99.99,
            responseTime: 45,
            lastChecked: "2024-04-17T14:30:00Z",
            incidents: 0,
          },
          {
            id: "patient-db",
            name: "Patient Database",
            status: "operational",
            uptime: 100,
            responseTime: 35,
            lastChecked: "2024-04-17T14:30:00Z",
            incidents: 0,
          },
          {
            id: "lab-system",
            name: "Lab System",
            status: "operational",
            uptime: 99.95,
            responseTime: 120,
            lastChecked: "2024-04-17T14:30:00Z",
            incidents: 1,
          },
          {
            id: "pharmacy-system",
            name: "Pharmacy System",
            status: "operational",
            uptime: 99.98,
            responseTime: 85,
            lastChecked: "2024-04-17T14:30:00Z",
            incidents: 0,
          },
          {
            id: "billing-engine",
            name: "Billing Engine",
            status: "degraded",
            uptime: 99.92,
            responseTime: 200,
            lastChecked: "2024-04-17T14:30:00Z",
            incidents: 2,
          },
          {
            id: "email-service",
            name: "Email Service",
            status: "operational",
            uptime: 99.88,
            responseTime: 500,
            lastChecked: "2024-04-17T14:30:00Z",
            incidents: 0,
          },
          {
            id: "sms-gateway",
            name: "SMS Gateway",
            status: "operational",
            uptime: 99.85,
            responseTime: 1200,
            lastChecked: "2024-04-17T14:30:00Z",
            incidents: 1,
          },
          {
            id: "file-storage",
            name: "File Storage",
            status: "operational",
            uptime: 100,
            responseTime: 150,
            lastChecked: "2024-04-17T14:30:00Z",
            incidents: 0,
          },
        ] as ServiceStatus[],
        incidents: [
          {
            id: "1",
            title: "High API latency detected",
            description: "Authentication API response time exceeded 200ms threshold",
            severity: "warning",
            status: "resolved",
            timestamp: "2024-04-17T12:30:00Z",
            resolvedAt: "2024-04-17T13:15:00Z",
            affectedServices: ["auth-api"],
          },
          {
            id: "2",
            title: "Database connection pool exhausted",
            description: "Patient database reached maximum connection limit",
            severity: "critical",
            status: "resolved",
            timestamp: "2024-04-17T10:45:00Z",
            resolvedAt: "2024-04-17T11:20:00Z",
            affectedServices: ["patient-db"],
          },
          {
            id: "3",
            title: "Billing engine performance degradation",
            description: "Invoice processing taking longer than expected",
            severity: "warning",
            status: "active",
            timestamp: "2024-04-17T14:00:00Z",
            affectedServices: ["billing-engine"],
          },
        ] as Incident[],
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getServiceStatusIcon = (status: string) => {
    switch (status) {
      case "operational":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "degraded":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "down":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getServiceStatusBadge = (status: string) => {
    switch (status) {
      case "operational":
        return <Badge variant="default" className="bg-green-100 text-green-800">Operational</Badge>;
      case "degraded":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Degraded</Badge>;
      case "down":
        return <Badge variant="destructive">Down</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getIncidentSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "border-red-500 bg-red-50 text-red-900";
      case "warning":
        return "border-yellow-500 bg-yellow-50 text-yellow-900";
      case "info":
        return "border-blue-500 bg-blue-50 text-blue-900";
      default:
        return "border-gray-500 bg-gray-50 text-gray-900";
    }
  };

  const formatUptime = (uptime: number) => {
    return `${uptime.toFixed(2)}%`;
  };

  const formatResponseTime = (time: number) => {
    return `${time}ms`;
  };

  const getResourceStatus = (usage: number) => {
    if (usage > 80) return { color: "bg-red-500", status: "Critical" };
    if (usage > 60) return { color: "bg-yellow-500", status: "Warning" };
    return { color: "bg-green-500", status: "Good" };
  };

  const activeIncidents = systemData?.incidents?.filter(inc => inc.status === "active") || [];
  const operationalServices = systemData?.services?.filter(svc => svc.status === "operational").length || 0;
  const totalServices = systemData?.services?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="System Health Monitoring"
          subtitle="Real-time infrastructure and service monitoring"
        />
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatUptime(systemData?.metrics?.uptime || 0)}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Response Time</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatResponseTime(systemData?.metrics?.responseTime || 0)}</div>
            <p className="text-xs text-muted-foreground">Average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services Status</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{operationalServices}/{totalServices}</div>
            <p className="text-xs text-muted-foreground">Operational</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{activeIncidents.length}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {activeIncidents.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {activeIncidents.length} active incident{activeIncidents.length > 1 ? 's' : ''} require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* System Health Tabs */}
      <Tabs defaultValue="services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="services">Service Status</TabsTrigger>
          <TabsTrigger value="resources">System Resources</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Health Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {systemData?.services?.map((service) => (
                  <div key={service.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getServiceStatusIcon(service.status)}
                      <div>
                        <h3 className="font-semibold">{service.name}</h3>
                        <p className="text-sm text-gray-600">
                          {formatUptime(service.uptime)} uptime • {formatResponseTime(service.responseTime)} response
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getServiceStatusBadge(service.status)}
                      {service.incidents > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {service.incidents} incident{service.incidents > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Server Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">CPU Usage</span>
                    <span className="text-sm">{systemData?.metrics?.cpuUsage}%</span>
                  </div>
                  <Progress value={systemData?.metrics?.cpuUsage} className="mb-1" />
                  <p className="text-xs text-gray-500">Healthy range: &lt; 80%</p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Memory Usage</span>
                    <span className="text-sm">{systemData?.metrics?.memoryUsage}%</span>
                  </div>
                  <Progress value={systemData?.metrics?.memoryUsage} className="mb-1" />
                  <p className="text-xs text-gray-500">Healthy range: &lt; 85%</p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Disk Usage</span>
                    <span className="text-sm">{systemData?.metrics?.diskUsage}%</span>
                  </div>
                  <Progress value={systemData?.metrics?.diskUsage} className="mb-1" />
                  <p className="text-xs text-gray-500">Healthy range: &lt; 90%</p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Network I/O</span>
                    <span className="text-sm">{systemData?.metrics?.networkIO}%</span>
                  </div>
                  <Progress value={systemData?.metrics?.networkIO} className="mb-1" />
                  <p className="text-xs text-gray-500">Healthy range: &lt; 75%</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Database Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-green-900">Query Response</p>
                    <p className="text-lg font-bold text-green-900">35ms</p>
                    <p className="text-xs text-green-700">Excellent</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">Connection Pool</p>
                    <p className="text-lg font-bold text-blue-900">24/32</p>
                    <p className="text-xs text-blue-700">Good</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm font-medium text-purple-900">Transaction Rate</p>
                    <p className="text-lg font-bold text-purple-900">1,245/min</p>
                    <p className="text-xs text-purple-700">Normal</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-green-900">Cache Hit Rate</p>
                    <p className="text-lg font-bold text-green-900">87%</p>
                    <p className="text-xs text-green-700">Excellent</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Active Connections</span>
                    <span className="text-sm">{systemData?.metrics?.activeConnections}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Error Rate</span>
                    <span className="text-sm">{systemData?.metrics?.errorRate}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="incidents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Incidents & Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {systemData?.incidents?.map((incident) => (
                  <div
                    key={incident.id}
                    className={`p-4 border-l-4 rounded-lg ${getIncidentSeverityColor(incident.severity)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold">{incident.title}</h3>
                          <Badge variant={incident.status === "active" ? "destructive" : "default"}>
                            {incident.status === "active" ? "Active" : "Resolved"}
                          </Badge>
                        </div>
                        <p className="text-sm mb-2">{incident.description}</p>
                        <div className="flex items-center space-x-4 text-xs">
                          <span>Started: {new Date(incident.timestamp).toLocaleString()}</span>
                          {incident.resolvedAt && (
                            <span>Resolved: {new Date(incident.resolvedAt).toLocaleString()}</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-xs">Affected services:</span>
                          {incident.affectedServices.map(serviceId => {
                            const service = systemData.services?.find(s => s.id === serviceId);
                            return (
                              <Badge key={serviceId} variant="outline" className="text-xs">
                                {service?.name || serviceId}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

