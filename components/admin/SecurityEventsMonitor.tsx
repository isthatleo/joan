"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, AlertCircle, AlertOctagon, RefreshCw, Shield, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface SecurityEvent {
  id: string;
  eventType: string;
  severity: "low" | "medium" | "high" | "critical";
  description?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  isResolved: boolean;
  createdAt: Date;
  resolvedAt?: Date;
  notes?: string;
  metadata?: Record<string, any>;
}

export function SecurityEventsMonitor({ tenantId }: { tenantId: string }) {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolveNotes, setResolveNotes] = useState("");
  const [filter, setFilter] = useState<{ severity?: string; resolved?: string; hoursBack?: number }>({
    severity: "all",
    resolved: "false",
    hoursBack: 24,
  });

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tenantId,
        limit: "100",
        hoursBack: filter.hoursBack?.toString() || "24",
      });

      if (filter.severity && filter.severity !== "all") {
        params.append("severity", filter.severity);
      }

      if (filter.resolved && filter.resolved !== "all") {
        params.append("resolved", filter.resolved);
      }

      const response = await fetch(`/api/security-events?${params}`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error("Failed to fetch security events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [filter]);

  const handleResolveEvent = async () => {
    if (!selectedEvent) return;

    try {
      const response = await fetch(`/api/security-events?eventId=${selectedEvent.id}&resolvedBy=admin`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: resolveNotes }),
      });

      if (response.ok) {
        setShowResolveDialog(false);
        setResolveNotes("");
        setSelectedEvent(null);
        fetchEvents();
      }
    } catch (error) {
      console.error("Failed to resolve event:", error);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertOctagon className="h-5 w-5 text-red-600" />;
      case "high":
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case "medium":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const unresolvedEvents = events.filter((e) => !e.isResolved);
  const criticalEvents = events.filter((e) => e.severity === "critical" && !e.isResolved);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Critical Events</p>
                <p className="text-3xl font-bold text-red-600">{criticalEvents.length}</p>
              </div>
              <AlertOctagon className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Unresolved Events</p>
                <p className="text-3xl font-bold text-orange-600">{unresolvedEvents.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Resolved Events</p>
                <p className="text-3xl font-bold text-green-600">
                  {events.filter((e) => e.isResolved).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <div>
                <CardTitle>Security Events</CardTitle>
                <CardDescription>Track and manage security incidents</CardDescription>
              </div>
            </div>
            <Button onClick={fetchEvents} disabled={loading} size="sm">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-4">
            <div className="flex gap-2 flex-wrap">
              <select
                value={filter.severity || "all"}
                onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select
                value={filter.resolved || "false"}
                onChange={(e) => setFilter({ ...filter, resolved: e.target.value })}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="false">Unresolved Only</option>
                <option value="true">Resolved Only</option>
                <option value="all">All Events</option>
              </select>

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
          </div>

          {events.length === 0 ? (
            <p className="text-sm text-gray-500">No security events</p>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className={`border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    !event.isResolved ? "bg-red-50" : "bg-gray-50"
                  }`}
                  onClick={() => {
                    setSelectedEvent(event);
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3 flex-1">
                      {getSeverityIcon(event.severity)}
                      <div className="flex-1">
                        <div className="font-medium text-sm">{event.eventType}</div>
                        {event.description && (
                          <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getSeverityColor(event.severity)}>
                        {event.severity}
                      </Badge>
                      <Badge
                        className={event.isResolved ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                      >
                        {event.isResolved ? "Resolved" : "Unresolved"}
                      </Badge>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 space-y-1">
                    {event.ipAddress && <div>IP: {event.ipAddress}</div>}
                    <div>Time: {new Date(event.createdAt).toLocaleString()}</div>
                  </div>

                  {!event.isResolved && (
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(event);
                        setShowResolveDialog(true);
                      }}
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Security Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedEvent && (
              <>
                <div>
                  <p className="text-sm font-medium">Event Type</p>
                  <p className="text-sm text-gray-600">{selectedEvent.eventType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Resolution Notes</label>
                  <textarea
                    value={resolveNotes}
                    onChange={(e) => setResolveNotes(e.target.value)}
                    placeholder="Add notes about how this event was resolved..."
                    className="w-full mt-1 p-2 border rounded-md text-sm"
                    rows={4}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleResolveEvent}
                    className="flex-1"
                  >
                    Mark as Resolved
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowResolveDialog(false);
                      setResolveNotes("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

