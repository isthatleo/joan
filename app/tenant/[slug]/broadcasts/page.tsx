"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Megaphone, Plus, Send, Eye, Users, Clock, CheckCircle,
  AlertTriangle, Info, Bell, Loader2, Search, Filter,
  Calendar, Target, TrendingUp
} from "lucide-react";

const orange = "#F97316";

interface Broadcast {
  id: string;
  title: string;
  message: string;
  type: "announcement" | "alert" | "reminder" | "update";
  priority: "low" | "normal" | "high" | "urgent";
  targetAudience: string[];
  status: "draft" | "scheduled" | "sent" | "cancelled";
  scheduledFor?: string;
  sentAt?: string;
  recipientCount: number;
  readCount: number;
  createdBy: {
    id: string;
    name: string;
    role: string;
  };
  createdAt: string;
}

export default function BroadcastsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "drafts" | "scheduled" | "sent">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchBroadcasts();
  }, [activeTab]);

  const fetchBroadcasts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/${slug}/broadcasts?status=${activeTab}`);
      if (res.ok) {
        setBroadcasts(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch broadcasts:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "all", label: "All Broadcasts", icon: Megaphone },
    { id: "drafts", label: "Drafts", icon: Clock },
    { id: "scheduled", label: "Scheduled", icon: Calendar },
    { id: "sent", label: "Sent", icon: CheckCircle }
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "alert": return <AlertTriangle className="size-4 text-red-600" />;
      case "announcement": return <Megaphone className="size-4 text-blue-600" />;
      case "reminder": return <Bell className="size-4 text-orange-600" />;
      case "update": return <Info className="size-4 text-green-600" />;
      default: return <Megaphone className="size-4 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "text-red-600 bg-red-50 border-red-200";
      case "high": return "text-orange-600 bg-orange-50 border-orange-200";
      case "normal": return "text-blue-600 bg-blue-50 border-blue-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent": return "text-green-600 bg-green-50";
      case "scheduled": return "text-blue-600 bg-blue-50";
      case "draft": return "text-gray-600 bg-gray-50";
      case "cancelled": return "text-red-600 bg-red-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const filteredBroadcasts = broadcasts.filter(broadcast =>
    broadcast.title.toLowerCase().includes(search.toLowerCase()) ||
    broadcast.message.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Communication</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Broadcasts</h1>
          <p className="text-sm text-muted-foreground mt-1">Send announcements and alerts to staff and patients.</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all">
            <Filter className="size-4" />
            Filter
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90" style={{ backgroundColor: orange }}>
            <Plus className="size-4" />
            New Broadcast
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Megaphone className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Broadcasts</p>
              <p className="text-2xl font-bold text-foreground">{broadcasts.length}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">All time broadcasts sent</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
              <Eye className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Reach</p>
              <p className="text-2xl font-bold text-foreground">
                {broadcasts.reduce((sum, b) => sum + b.recipientCount, 0).toLocaleString()}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Messages delivered</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avg Read Rate</p>
              <p className="text-2xl font-bold text-foreground">
                {broadcasts.length > 0
                  ? Math.round(broadcasts.reduce((sum, b) => sum + (b.readCount / b.recipientCount * 100), 0) / broadcasts.length)
                  : 0}%
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Messages read by recipients</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Scheduled</p>
              <p className="text-2xl font-bold text-foreground">
                {broadcasts.filter(b => b.status === 'scheduled').length}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Upcoming broadcasts</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
        <input
          type="text"
          placeholder="Search broadcasts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="size-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 text-orange-500 animate-spin mx-auto" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredBroadcasts.length === 0 ? (
            <div className="col-span-full flex items-center justify-center py-16">
              <div className="text-center text-muted-foreground">
                <Megaphone className="size-12 mx-auto mb-4 opacity-50" />
                <p>No broadcasts found</p>
                <p className="text-sm">Create your first broadcast to get started</p>
              </div>
            </div>
          ) : (
            filteredBroadcasts.map((broadcast) => (
              <div key={broadcast.id} className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getTypeIcon(broadcast.type)}
                    <div>
                      <h3 className="font-semibold text-foreground">{broadcast.title}</h3>
                      <p className="text-xs text-muted-foreground capitalize">{broadcast.type}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(broadcast.status)}`}>
                    {broadcast.status}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{broadcast.message}</p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Priority:</span>
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${getPriorityColor(broadcast.priority)}`}>
                      {broadcast.priority}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Recipients:</span>
                    <span className="font-medium">{broadcast.recipientCount.toLocaleString()}</span>
                  </div>

                  {broadcast.status === 'sent' && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Read:</span>
                      <span className="font-medium text-green-600">
                        {broadcast.recipientCount > 0 ? Math.round((broadcast.readCount / broadcast.recipientCount) * 100) : 0}%
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Created by:</span>
                    <span className="font-medium">{broadcast.createdBy.name}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {broadcast.status === 'scheduled' ? 'Scheduled for:' : 'Sent:'}
                    </span>
                    <span className="font-medium">
                      {broadcast.status === 'scheduled'
                        ? new Date(broadcast.scheduledFor!).toLocaleDateString()
                        : broadcast.sentAt
                        ? new Date(broadcast.sentAt).toLocaleDateString()
                        : new Date(broadcast.createdAt).toLocaleDateString()
                      }
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all">
                    <Eye className="size-4" />
                    View
                  </button>
                  {broadcast.status === 'draft' && (
                    <button className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90" style={{ backgroundColor: orange }}>
                      <Send className="size-4" />
                      Send
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
