"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, CheckCircle, AlertTriangle, XCircle, FileText, Calendar, Users, Lock, Eye, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComplianceStatus {
  overall: number;
  hipaa: number;
  gdpr: number;
  hipaa_compliance: number;
  gdpr_compliance: number;
  last_audit: string;
  next_audit: string;
}

interface ComplianceCheck {
  id: string;
  category: string;
  requirement: string;
  status: "compliant" | "non_compliant" | "pending" | "warning";
  last_checked: string;
  details: string;
  severity: "high" | "medium" | "low";
}

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  ip_address: string;
  user_agent: string;
  compliance_flag: boolean;
}

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState("checks");
  const { data: complianceData, isLoading } = useQuery({
    queryKey: ["compliance"],
    queryFn: async () => {
      // This would typically fetch from compliance APIs
      return {
        status: {
          overall: 98.5,
          hipaa: 99.2,
          gdpr: 97.8,
          hipaa_compliance: 99.2,
          gdpr_compliance: 97.8,
          last_audit: "2024-04-01",
          next_audit: "2024-07-01",
        } as ComplianceStatus,
        checks: [
          {
            id: "1",
            category: "Data Encryption",
            requirement: "All PHI data must be encrypted at rest and in transit",
            status: "compliant",
            last_checked: "2024-04-15",
            details: "AES-256 encryption implemented for all databases and data transfers",
            severity: "high",
          },
          {
            id: "2",
            category: "Access Controls",
            requirement: "Role-based access control must be enforced",
            status: "compliant",
            last_checked: "2024-04-15",
            details: "RBAC system active with 8 roles and 35 permissions configured",
            severity: "high",
          },
          {
            id: "3",
            category: "Audit Logging",
            requirement: "All access to PHI must be logged",
            status: "compliant",
            last_checked: "2024-04-15",
            details: "Comprehensive audit logging implemented for all PHI access",
            severity: "high",
          },
          {
            id: "4",
            category: "Data Retention",
            requirement: "Data retention policies must comply with regulations",
            status: "warning",
            last_checked: "2024-04-10",
            details: "Retention policies need review for GDPR compliance",
            severity: "medium",
          },
          {
            id: "5",
            category: "Consent Management",
            requirement: "User consent must be properly managed",
            status: "compliant",
            last_checked: "2024-04-12",
            details: "Consent management system fully implemented",
            severity: "medium",
          },
          {
            id: "6",
            category: "Incident Response",
            requirement: "Incident response plan must be documented",
            status: "pending",
            last_checked: "2024-03-15",
            details: "Annual incident response plan review due",
            severity: "medium",
          },
        ] as ComplianceCheck[],
        auditLogs: [
          {
            id: "1",
            timestamp: "2024-04-15T10:30:00Z",
            user: "Dr. Sarah Smith",
            action: "viewed",
            resource: "Patient Record #P-1234",
            ip_address: "192.168.1.100",
            user_agent: "Chrome/91.0",
            compliance_flag: false,
          },
          {
            id: "2",
            timestamp: "2024-04-15T10:25:00Z",
            user: "Nurse John Johnson",
            action: "updated",
            resource: "Vitals Record #V-5678",
            ip_address: "192.168.1.101",
            user_agent: "Safari/14.0",
            compliance_flag: false,
          },
          {
            id: "3",
            timestamp: "2024-04-15T10:20:00Z",
            user: "Admin Michael Brown",
            action: "exported",
            resource: "Patient Data Report",
            ip_address: "192.168.1.102",
            user_agent: "Firefox/89.0",
            compliance_flag: true,
          },
          {
            id: "4",
            timestamp: "2024-04-15T10:15:00Z",
            user: "Dr. Emily Davis",
            action: "accessed",
            resource: "Lab Results #L-9012",
            ip_address: "192.168.1.103",
            user_agent: "Edge/91.0",
            compliance_flag: false,
          },
        ] as AuditLog[],
      };
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "compliant":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "non_compliant":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "pending":
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "compliant":
        return <Badge variant="default" className="bg-green-100 text-green-800">Compliant</Badge>;
      case "non_compliant":
        return <Badge variant="destructive">Non-Compliant</Badge>;
      case "warning":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "text-red-600";
      case "medium":
        return "text-yellow-600";
      case "low":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Compliance & Security"
          subtitle="Monitor regulatory compliance and system security"
        />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded mb-1"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance & Security"
        subtitle="Monitor regulatory compliance and system security"
      />

      {/* Compliance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Compliance</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complianceData?.status?.overall}%</div>
            <Progress value={complianceData?.status?.overall} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">System-wide compliance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">HIPAA Compliance</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complianceData?.status?.hipaa}%</div>
            <Progress value={complianceData?.status?.hipaa} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">Healthcare data protection</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GDPR Compliance</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complianceData?.status?.gdpr}%</div>
            <Progress value={complianceData?.status?.gdpr} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">Data privacy regulations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Audit Status</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Active</div>
            <p className="text-xs text-muted-foreground mt-1">
              Next: {formatDate(complianceData?.status?.next_audit || "")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Alerts */}
      {complianceData?.checks?.some(check => check.status === "non_compliant" || check.status === "warning") && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {complianceData.checks.filter(check => check.status === "non_compliant").length} critical compliance issues and{" "}
            {complianceData.checks.filter(check => check.status === "warning").length} warnings require attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Compliance Tabs */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex flex-wrap gap-2 p-1 bg-muted rounded-full">
          {[
            { id: "checks", label: "Compliance Checks" },
            { id: "audit", label: "Audit Logs" },
            { id: "reports", label: "Reports" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-full transition-all duration-200",
                activeTab === tab.id
                  ? "bg-orange-500 text-white shadow-sm dark:bg-orange-600"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "checks" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Regulatory Compliance Checks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {complianceData?.checks?.map((check) => (
                  <div key={check.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                    <div className="mt-1">
                      {getStatusIcon(check.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{check.category}</h3>
                        {getStatusBadge(check.status)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{check.requirement}</p>
                      <p className="text-xs text-gray-500 mb-2">{check.details}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Last checked: {formatDate(check.last_checked)}</span>
                        <span className={getSeverityColor(check.severity)}>
                          Severity: {check.severity.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "audit" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Audit Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Flag</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {complianceData?.auditLogs?.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {formatDateTime(log.timestamp)}
                        </TableCell>
                        <TableCell className="font-medium">{log.user}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.action}</Badge>
                        </TableCell>
                        <TableCell className="text-sm max-w-xs truncate">
                          {log.resource}
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {log.ip_address}
                        </TableCell>
                        <TableCell>
                          {log.compliance_flag && (
                            <Badge variant="destructive" className="text-xs">
                              Flagged
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "reports" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Reports</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">HIPAA Compliance Report</h3>
                    <p className="text-sm text-gray-600">Quarterly compliance assessment</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">GDPR Compliance Report</h3>
                    <p className="text-sm text-gray-600">Data privacy compliance check</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">Security Audit Report</h3>
                    <p className="text-sm text-gray-600">System security assessment</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Scheduled Audits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <div>
                    <h3 className="font-semibold">Quarterly HIPAA Audit</h3>
                    <p className="text-sm text-gray-600">Due: July 1, 2024</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Calendar className="h-5 w-5 text-green-500" />
                  <div>
                    <h3 className="font-semibold">Annual Security Review</h3>
                    <p className="text-sm text-gray-600">Due: December 31, 2024</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Calendar className="h-5 w-5 text-orange-500" />
                  <div>
                    <h3 className="font-semibold">GDPR Compliance Check</h3>
                    <p className="text-sm text-gray-600">Due: May 25, 2024</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
