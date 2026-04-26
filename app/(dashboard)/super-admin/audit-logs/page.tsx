"use client";

import { useEffect, useState, useMemo } from "react";
import {
  PageHeader,
  StatCard,
  SectionCard,
  StatusPill,
  Skeleton,
} from "@/components/ui";
import {
  AlertCircle,
  Search,
  Download,
  FileText,
  Shield,
  User,
  Database,
  Settings,
  Activity,
} from "lucide-react";

interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

type Severity = "info" | "warning" | "destructive" | "success";

const SEVERITY_MAP: Record<string, Severity> = {
  "created": "success",
  "updated": "info",
  "deleted": "destructive",
  "suspended": "warning",
  "activated": "success",
  "failed": "destructive",
};

const CATEGORY_ICON = {
  auth: Shield,
  user: User,
  data: Database,
  config: Settings,
};

export default function SuperAdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");

  // Fetch audit logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/audit-logs?limit=100");
        if (res.ok) {
          setLogs(await res.json());
        }
      } catch (error) {
        console.error("Failed to fetch audit logs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const filtered = useMemo(() => {
    return logs.filter((e) => {
      const matchSearch =
        !search ||
        e.userId?.toLowerCase().includes(search.toLowerCase()) ||
        e.action.toLowerCase().includes(search.toLowerCase()) ||
        e.entity.toLowerCase().includes(search.toLowerCase());
      const matchAction = !action || e.action === action;
      const matchEntity = !entity || e.entity === entity;
      return matchSearch && matchAction && matchEntity;
    });
  }, [logs, search, action, entity]);

  const stats = useMemo(() => {
    const total = logs.length;
    const critical = logs.filter(e => e.action.includes("delete") || e.action.includes("suspend")).length;
    const warnings = logs.filter(e => e.action.includes("update")).length;
    const info = logs.filter(e => e.action.includes("created") || e.action.includes("activated")).length;

    return { total, critical, warnings, info };
  }, [logs]);

  const uniqueActions = useMemo(() => {
    return Array.from(new Set(logs.map(l => l.action)));
  }, [logs]);

  const uniqueEntities = useMemo(() => {
    return Array.from(new Set(logs.map(l => l.entity)));
  }, [logs]);

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        subtitle="Complete trail of system actions and privileged operations"
        actions={
          <button className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition">
            <Download className="h-4 w-4" />
            Export
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Events"
          value={stats.total.toLocaleString()}
          subtitle="Last 24 hours"
          icon={Activity}
          tone="info"
        />
        <StatCard
          title="Critical"
          value={stats.critical}
          subtitle="Requires review"
          icon={AlertCircle}
          tone="destructive"
        />
        <StatCard
          title="Updates"
          value={stats.warnings}
          subtitle="Elevated activity"
          icon={AlertCircle}
          tone="warning"
        />
        <StatCard
          title="Informational"
          value={stats.info}
          subtitle="Normal operations"
          icon={FileText}
          tone="success"
        />
      </div>

      {/* Filters */}
      <SectionCard className="mb-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by user, action, or entity..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Actions</option>
            {uniqueActions.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Entities</option>
            {uniqueEntities.map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
      </SectionCard>

      {/* Events Table */}
      <SectionCard
        title="Event Log"
        description={`${filtered.length} event${filtered.length === 1 ? "" : "s"}`}
        flush
      >
        {loading ? (
          <div className="space-y-2 p-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">User</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Entity</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((e) => {
                  const severity = SEVERITY_MAP[e.action] || "info";
                  return (
                    <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info-soft text-info-soft-foreground">
                            <Database className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{e.action}</p>
                            <p className="text-xs text-muted-foreground">{e.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{e.userId || "System"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{e.entity}</td>
                      <td className="px-6 py-4">
                        <StatusPill tone={severity}>
                          {severity === "destructive" ? "Critical" : severity === "warning" ? "Warning" : severity === "success" ? "Success" : "Info"}
                        </StatusPill>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {new Date(e.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
