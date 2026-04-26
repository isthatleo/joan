"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Download,
  Eye,
  Filter,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  userRole: string;
  action: string;
  resource: string;
  resourceType: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  status: "success" | "failed" | "warning";
  complianceFlag: boolean;
  sessionId: string;
}

interface AuditStats {
  totalEvents: number;
  criticalEvents: number;
  failedLogins: number;
  dataChanges: number;
  complianceFlags: number;
}

export default function AuditLogsPage() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [userFilter, setUserFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [resourceFilter, setResourceFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const { data: auditData, isLoading } = useQuery({
    queryKey: [
      "audit-logs",
      search,
      actionFilter,
      userFilter,
      statusFilter,
      resourceFilter,
      dateRange,
    ],
    queryFn: async () => {
      // This would typically fetch from audit API with filters
      return {
        stats: {
          totalEvents: 487234,
          criticalEvents: 12,
          failedLogins: 34,
          dataChanges: 2341,
          complianceFlags: 3,
        } as AuditStats,
        logs: [
          {
            id: "1",
            timestamp: "2024-04-17T14:23:00Z",
            user: "admin@joan.com",
            userRole: "Super Admin",
            action: "UPDATE",
            resource: "Patient Record #P-1234",
            resourceType: "Patient",
            details: "Updated patient contact information",
            ipAddress: "192.168.1.100",
            userAgent:
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            status: "success",
            complianceFlag: false,
            sessionId: "sess_abc123",
          },
          {
            id: "2",
            timestamp: "2024-04-17T14:15:00Z",
            user: "dr.smith@hospital.com",
            userRole: "Doctor",
            action: "VIEW",
            resource: "Lab Results #L-5678",
            resourceType: "Lab Result",
            details: "Viewed lab results for patient",
            ipAddress: "192.168.1.101",
            userAgent:
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
            status: "success",
            complianceFlag: false,
            sessionId: "sess_def456",
          },
          {
            id: "3",
            timestamp: "2024-04-17T14:08:00Z",
            user: "nurse.johnson@hospital.com",
            userRole: "Nurse",
            action: "CREATE",
            resource: "Vital Signs #V-9012",
            resourceType: "Vital Signs",
            details: "Recorded new vital signs measurement",
            ipAddress: "192.168.1.102",
            userAgent:
              "Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15",
            status: "success",
            complianceFlag: false,
            sessionId: "sess_ghi789",
          },
          {
            id: "4",
            timestamp: "2024-04-17T13:52:00Z",
            user: "pharm.brown@hospital.com",
            userRole: "Pharmacist",
            action: "DISPENSE",
            resource: "Prescription #RX-3456",
            resourceType: "Prescription",
            details: "Dispensed medication to patient",
            ipAddress: "192.168.1.103",
            userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
            status: "success",
            complianceFlag: false,
            sessionId: "sess_jkl012",
          },
          {
            id: "5",
            timestamp: "2024-04-17T13:45:00Z",
            user: "unknown",
            userRole: "Unknown",
            action: "LOGIN_FAILED",
            resource: "Authentication",
            resourceType: "Auth",
            details: "Failed login attempt - invalid credentials",
            ipAddress: "203.0.113.45",
            userAgent:
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            status: "failed",
            complianceFlag: true,
            sessionId: "sess_suspicious",
          },
          {
            id: "6",
            timestamp: "2024-04-17T13:30:00Z",
            user: "admin@joan.com",
            userRole: "Super Admin",
            action: "EXPORT",
            resource: "Patient Data Report",
            resourceType: "Report",
            details: "Exported patient data for analysis",
            ipAddress: "192.168.1.100",
            userAgent:
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            status: "warning",
            complianceFlag: true,
            sessionId: "sess_abc123",
          },
        ] as AuditLog[],
      };
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge
            variant="default"
            className="bg-green-100 text-green-800"
          >
            Success
          </Badge>
        );
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "warning":
        return (
          <Badge
            variant="secondary"
            className="bg-yellow-100 text-yellow-800"
          >
            Warning
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDate = (date: Date) => {
    return format(date, "PPP");
  };

  const filteredLogs =
    auditData?.logs
      ?.filter((log) => {
        const matchesSearch =
          !search ||
          log.user.toLowerCase().includes(search.toLowerCase()) ||
          log.action.toLowerCase().includes(search.toLowerCase()) ||
          log.resource.toLowerCase().includes(search.toLowerCase());

        const matchesAction = !actionFilter || log.action === actionFilter;
        const matchesUser = !userFilter || log.user === userFilter;
        const matchesStatus = !statusFilter || log.status === statusFilter;
        const matchesResource = !resourceFilter || log.resourceType === resourceFilter;

        return (
          matchesSearch &&
          matchesAction &&
          matchesUser &&
          matchesStatus &&
          matchesResource
        );
      }) || [];

  const uniqueActions = [
    ...new Set(auditData?.logs?.map((log) => log.action) || []),
  ];
  const uniqueUsers = [...new Set(auditData?.logs?.map((log) => log.user) || [])];
  const uniqueResources = [
    ...new Set(auditData?.logs?.map((log) => log.resourceType) || []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        subtitle="Comprehensive system activity tracking and monitoring"
      />

      {/* Audit Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {auditData?.stats?.totalEvents.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">This year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {auditData?.stats?.criticalEvents}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {auditData?.stats?.failedLogins}
            </div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Changes</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {auditData?.stats?.dataChanges.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Flags</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {auditData?.stats?.complianceFlags}
            </div>
            <p className="text-xs text-muted-foreground">Require review</p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Alerts */}
      {auditData?.stats?.complianceFlags > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {auditData.stats.complianceFlags} audit events have been flagged for
            compliance review. Please review these events carefully.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Audit Log Entries</CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search audit logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 border rounded-lg bg-gray-50">
              <div>
                <Label htmlFor="action-filter">Action</Label>
                <Select
                  value={actionFilter}
                  onValueChange={setActionFilter}
                  defaultValue=""
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All actions</SelectItem>
                    {uniqueActions.map((action) => (
                      <SelectItem key={action} value={action}>
                        {action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="user-filter">User</Label>
                <Select
                  value={userFilter}
                  onValueChange={setUserFilter}
                  defaultValue=""
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All users</SelectItem>
                    {uniqueUsers.map((user) => (
                      <SelectItem key={user} value={user}>
                        {user}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status-filter">Status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                  defaultValue=""
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="resource-filter">Resource Type</Label>
                <Select
                  value={resourceFilter}
                  onValueChange={setResourceFilter}
                  defaultValue=""
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All resources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All resources</SelectItem>
                    {uniqueResources.map((resource) => (
                      <SelectItem key={resource} value={resource}>
                        {resource}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Audit Logs Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading audit logs...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No audit logs found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {formatDateTime(log.timestamp)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{log.user}</p>
                          <p className="text-xs text-gray-500">{log.userRole}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.action}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{log.resource}</p>
                          <p className="text-xs text-gray-500">
                            {log.resourceType}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(log.status)}
                          {getStatusBadge(log.status)}
                          {log.complianceFlag && (
                            <Badge variant="destructive" className="text-xs">
                              Flag
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLog(log);
                            setIsDetailsOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Timestamp</Label>
                  <p className="text-sm">
                    {formatDateTime(selectedLog.timestamp)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(selectedLog.status)}
                    {getStatusBadge(selectedLog.status)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">User</Label>
                  <p className="text-sm">{selectedLog.user}</p>
                  <p className="text-xs text-gray-500">{selectedLog.userRole}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Action</Label>
                  <p className="text-sm">{selectedLog.action}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Resource</Label>
                  <p className="text-sm">{selectedLog.resource}</p>
                  <p className="text-xs text-gray-500">
                    {selectedLog.resourceType}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">IP Address</Label>
                  <p className="text-sm font-mono">{selectedLog.ipAddress}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Details</Label>
                <p className="text-sm">{selectedLog.details}</p>
              </div>

              <div>
                <Label className="text-sm font-medium">User Agent</Label>
                <p className="text-xs font-mono bg-gray-100 p-2 rounded">
                  {selectedLog.userAgent}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Session ID</Label>
                <p className="text-xs font-mono">{selectedLog.sessionId}</p>
              </div>

              {selectedLog.complianceFlag && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This event has been flagged for compliance review.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
