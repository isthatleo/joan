"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PhoneNumberInput } from "@/components/forms/PhoneNumberInput";
import { AddressFields } from "@/components/forms/AddressFields";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  Users,
  TrendingUp,
  FileText,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Loader2,
  Edit2,
  MoreVertical,
  Trash2,
  RotateCcw,
  MessageSquare,
  ShieldCheck,
  Activity,
  Database,
  Server,
  GitBranch,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Fallback Skeleton component if not available
function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-muted animate-pulse rounded ${className}`} />;
}

const orange = "#F97316";

type TenantDetails = {
  tenant: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    city?: string;
    country?: string;
    logoUrl?: string;
    isActive: boolean;
    createdAt: string;
    adminUserId?: string;
    deletedAt?: string | null;
    scheduledPurgeAt?: string | null;
    provisioningStatus?: string | null;
  };
  admin?: {
    id: string;
    email: string;
    fullName?: string;
    avatar?: string;
    isActive: boolean;
  } | null;
  users: {
    list: Array<{
      id: string;
      email: string;
      fullName?: string;
      avatar?: string | null;
      role?: string | null;
      isActive: boolean;
      createdAt: string;
    }>;
    count: number;
    active: number;
  };
  billing: {
    metrics: {
      totalBilled: string;
      totalPaid: string;
      pendingAmount: string;
      paymentCount?: number;
    };
    invoiceStats: {
      total: number;
      paid: number;
      pending: number;
      overdue: number;
    };
    invoices: Array<{
      id: string;
      status: string;
      totalAmount: string;
      createdAt: string;
      updatedAt: string;
    }>;
  };
  usage: {
    totalPatients: number;
    totalAppointments: number;
    todayAppointments: number;
    totalVisits: number;
    departments: number;
    activity30d: number;
  };
  departments?: Array<{ id: string; name: string | null; staffCount: number }>;
  recentActivity?: Array<{ id: string; action: string; description: string | null; status: string | null; timestamp: string | null }>;
  recentAudit?: Array<{ id: string; action: string | null; entity: string | null; createdAt: string | null }>;
  provisioningHistory?: Array<{ id: string; status: string; stage: string | null; errorMessage: string | null; startedAt: string | null; completedAt: string | null }>;
  lifecycle?: {
    isDeleted: boolean;
    deletedAt: string | null;
    scheduledPurgeAt: string | null;
    daysUntilPurge: number | null;
  };
};

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-orange-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">
          {value}
          {unit && <span className="text-base font-normal text-muted-foreground ml-1">{unit}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TenantDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const [details, setDetails] = useState<TenantDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    city: "",
    country: "",
    plan: "",
  });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/tenants/${slug}/details`);
        if (!res.ok) throw new Error("Failed to fetch details");
        const data = await res.json();
        setDetails(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load details");
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchDetails();
  }, [slug]);

  const handleEditOpen = () => {
    if (details?.tenant) {
      setEditForm({
        name: details.tenant.name,
        contactEmail: details.tenant.contactEmail || "",
        contactPhone: details.tenant.contactPhone || "",
        address: details.tenant.address || "",
        city: details.tenant.city || "",
        country: details.tenant.country || "",
        plan: details.tenant.plan,
      });
      setShowEditModal(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!details?.tenant) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/tenants/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setShowEditModal(false);
        toast.success("Tenant updated successfully");
        const refreshRes = await fetch(`/api/tenants/${slug}/details`);
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setDetails(data);
        }
      } else {
        toast.error("Failed to update tenant");
      }
    } catch (error) {
      console.error("Failed to update tenant:", error);
      toast.error("Failed to update tenant");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!details?.tenant) return;

    const input = document.querySelector('input[placeholder="' + details.tenant.name + '"]') as HTMLInputElement;
    if (input?.value !== details.tenant.name) {
      toast.error("Please type the tenant name to confirm deletion");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/tenants/${slug}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Tenant archived successfully");
        window.location.href = "/tenants";
      } else {
        toast.error("Failed to delete tenant");
      }
    } catch (error) {
      console.error("Failed to delete tenant:", error);
      toast.error("Failed to delete tenant");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreTenant = async () => {
    if (!details?.tenant) return;
    const confirmText = prompt(`Restore "${details.tenant.name}"?\n\nType the tenant slug "${details.tenant.slug}" to confirm:`);
    if (confirmText !== details.tenant.slug) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tenants/${details.tenant.slug}/restore`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to restore tenant");
      toast.success("Tenant restored successfully");
      const refreshRes = await fetch(`/api/tenants/${details.tenant.slug}/details`, { cache: "no-store" });
      if (refreshRes.ok) setDetails(await refreshRes.json());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to restore tenant");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!details?.tenant) return;
    const daysUntilPurge = details.lifecycle?.daysUntilPurge;
    if (typeof daysUntilPurge === "number" && daysUntilPurge > 0) {
      toast.error(`Permanent deletion is locked for ${daysUntilPurge} more day(s).`);
      return;
    }
    const confirmText = prompt(`Permanently delete "${details.tenant.name}"?\n\nThis cannot be undone. Type "DELETE ${details.tenant.slug}" to confirm:`);
    if (confirmText !== `DELETE ${details.tenant.slug}`) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tenants/${details.tenant.slug}?purge=true`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to permanently delete tenant");
      toast.success("Tenant permanently deleted");
      router.push("/tenants/deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to permanently delete tenant");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-subtle -m-6 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center gap-3 mb-8">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="flex flex-col">
                <CardHeader className="pb-3">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="min-h-screen bg-subtle -m-6 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/tenants"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-8"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Tenants
          </Link>
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
            <p className="text-foreground font-semibold mb-1">Failed to Load Details</p>
            <p className="text-muted-foreground text-sm">{error || "Tenant not found"}</p>
          </div>
        </div>
      </div>
    );
  }

  const { tenant, admin, users, billing, usage } = details;
  const PLAN_COLOR: Record<string, string> = {
    Basic: "bg-slate-100 text-slate-700",
    Standard: "bg-blue-50 text-blue-700",
    Premium: "bg-purple-50 text-purple-700",
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "bg-green-50 text-green-700 border border-green-200";
      case "pending":
        return "bg-yellow-50 text-yellow-700 border border-yellow-200";
      case "overdue":
        return "bg-red-50 text-red-700 border border-red-200";
      default:
        return "bg-muted text-muted-foreground border border-border";
    }
  };

  const getPlanBadgeColor = (plan: string) => {
    return PLAN_COLOR[plan] || "bg-muted text-muted-foreground";
  };
  const activationRate = users.count ? Math.round((users.active / users.count) * 100) : 0;
  const collectionRate = Number(billing.metrics.totalBilled) ? Math.round((Number(billing.metrics.totalPaid) / Number(billing.metrics.totalBilled)) * 100) : 0;
  const latestProvision = details.provisioningHistory?.[0];
  const latestAudit = details.recentAudit?.[0];

  return (
    <div className="min-h-screen bg-subtle -m-6 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <Link
            href="/tenants"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Tenants
          </Link>

          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex items-start gap-4 flex-1">
                <div className="size-16 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shadow-sm border border-border overflow-hidden">
                  {tenant.logoUrl ? (
                    <img src={tenant.logoUrl} alt={`${tenant.name} logo`} className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-8 w-8" />
                  )}
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-foreground mb-2">{tenant.name}</h1>
                  <p className="text-muted-foreground text-sm mb-3">
                    Managed since {new Date(tenant.createdAt).toLocaleDateString()}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={`${getPlanBadgeColor(tenant.plan)} border`}>
                      {tenant.plan} Plan
                    </Badge>
                    <Badge
                      className={
                        details.lifecycle?.isDeleted
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : tenant.isActive
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-muted text-muted-foreground border border-border"
                      }
                    >
                      {details.lifecycle?.isDeleted ? "Archived" : tenant.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {details.lifecycle?.isDeleted && (
                      <Badge className="bg-orange-50 text-orange-700 border border-orange-200">
                        {details.lifecycle.daysUntilPurge === 0 ? "Purge available" : `${details.lifecycle.daysUntilPurge} day(s) until purge`}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3 items-end">
                <div className="flex gap-2">
                  <button
                    className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
                    title="Edit tenant"
                    onClick={handleEditOpen}
                    disabled={details.lifecycle?.isDeleted}
                  >
                    <Edit2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                  {details.lifecycle?.isDeleted ? (
                    <>
                      <button className="p-2 rounded-lg border border-border hover:bg-muted transition-colors" title="Restore tenant" onClick={handleRestoreTenant} disabled={actionLoading}>
                        <RotateCcw className="h-4 w-4 text-emerald-600" />
                      </button>
                      <button className="p-2 rounded-lg border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50" title="Permanently delete tenant" onClick={handlePermanentDelete} disabled={actionLoading || (details.lifecycle.daysUntilPurge ?? 1) > 0}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </>
                  ) : (
                    <button className="p-2 rounded-lg border border-border hover:bg-muted transition-colors" title="More options" onClick={() => setShowDeleteModal(true)}>
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Slug
                  </p>
                  <p className="font-mono text-sm text-foreground bg-muted/50 px-3 py-2 rounded-lg border border-border">
                    {tenant.slug}
                  </p>
                </div>
              </div>
            </div>

            {/* Tenant Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-border">
              {tenant.contactEmail && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Contact Email</p>
                    <p className="text-sm font-medium text-foreground">{tenant.contactEmail}</p>
                  </div>
                </div>
              )}
              {tenant.contactPhone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Phone</p>
                    <p className="text-sm font-medium text-foreground">{tenant.contactPhone}</p>
                  </div>
                </div>
              )}
              {tenant.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Address</p>
                    <p className="text-sm font-medium text-foreground">
                      {tenant.address}
                      {tenant.city && `, ${tenant.city}`}
                      {tenant.country && `, ${tenant.country}`}
                    </p>
                  </div>
                </div>
              )}
              {tenant.createdAt && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Provisioned</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(tenant.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Users" value={users.count} unit="active" />
          <StatCard icon={Users} label="Active Users" value={users.active} unit={`of ${users.count}`} />
          <StatCard icon={TrendingUp} label="Total Patients" value={usage.totalPatients} />
          <StatCard icon={FileText} label="Total Invoices" value={billing.invoiceStats.total} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Calendar} label="Appointments" value={usage.totalAppointments} unit={`${usage.todayAppointments} today`} />
          <StatCard icon={Building2} label="Departments" value={usage.departments} />
          <StatCard icon={TrendingUp} label="Visits" value={usage.totalVisits} />
          <StatCard icon={Clock} label="Activity 30d" value={usage.activity30d} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <Card className="overflow-hidden border-border bg-gradient-to-br from-slate-950 to-slate-800 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-white/80"><Server className="h-4 w-4" /> Tenant Runtime</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black">{tenant.isActive && !details.lifecycle?.isDeleted ? "Online" : "Paused"}</p>
              <p className="mt-2 text-xs text-white/60">Slug access, sessions, and tenant shell availability.</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-semibold"><Activity className="h-4 w-4 text-orange-500" /> User Activation</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-black">{activationRate}%</p>
              <div className="mt-3 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-orange-500" style={{ width: `${Math.min(100, activationRate)}%` }} /></div>
              <p className="mt-2 text-xs text-muted-foreground">{users.active} active of {users.count} total users.</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-semibold"><Database className="h-4 w-4 text-emerald-500" /> Data Footprint</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-black">{(usage.totalPatients + usage.totalAppointments + usage.totalVisits).toLocaleString()}</p>
              <p className="mt-2 text-xs text-muted-foreground">Patients, appointments, and visits tracked for this tenant.</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-semibold"><CreditCard className="h-4 w-4 text-blue-500" /> Collection Rate</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-black">{collectionRate}%</p>
              <p className="mt-2 text-xs text-muted-foreground">{formatCurrency(billing.metrics.totalPaid)} collected from {formatCurrency(billing.metrics.totalBilled)} billed.</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-1">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-lg"><GitBranch className="h-5 w-5" /> Lifecycle</CardTitle>
              <CardDescription>Provisioning, archive, and operational state.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-5 text-sm">
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2"><span>Status</span><Badge>{details.lifecycle?.isDeleted ? "Archived" : tenant.isActive ? "Active" : "Inactive"}</Badge></div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2"><span>Provisioning</span><span className="font-semibold">{tenant.provisioningStatus || latestProvision?.status || "completed"}</span></div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2"><span>Latest stage</span><span className="font-semibold">{latestProvision?.stage || "ready"}</span></div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2"><span>Grace purge</span><span className="font-semibold">{details.lifecycle?.scheduledPurgeAt ? new Date(details.lifecycle.scheduledPurgeAt).toLocaleDateString() : "Not scheduled"}</span></div>
            </CardContent>
          </Card>
          <Card className="xl:col-span-1">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="h-5 w-5" /> Governance</CardTitle>
              <CardDescription>Audit and administrative confidence.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-5 text-sm">
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2"><p className="text-xs text-muted-foreground">Latest audit action</p><p className="mt-1 font-semibold">{latestAudit?.action || "No audit action found"}</p></div>
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2"><p className="text-xs text-muted-foreground">Latest audit entity</p><p className="mt-1 font-semibold">{latestAudit?.entity || "Not recorded"}</p></div>
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2"><p className="text-xs text-muted-foreground">Audit timestamp</p><p className="mt-1 font-semibold">{latestAudit?.createdAt ? new Date(latestAudit.createdAt).toLocaleString() : "No recent audit"}</p></div>
            </CardContent>
          </Card>
          <Card className="xl:col-span-1">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-lg"><Building2 className="h-5 w-5" /> Department Load</CardTitle>
              <CardDescription>Staff distribution across configured departments.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-5">
              {(details.departments || []).slice(0, 5).map((department) => (
                <div key={department.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                  <span className="font-semibold">{department.name || "Unnamed department"}</span>
                  <span className="text-muted-foreground">{department.staffCount} staff</span>
                </div>
              ))}
              {(details.departments || []).length === 0 ? <p className="text-sm text-muted-foreground">No departments found.</p> : null}
            </CardContent>
          </Card>
        </div>

        {/* Admin Details Section */}
        {admin && (
          <Card className="border-border shadow-sm overflow-hidden">
            <div className="md:flex">
              <div className="p-8 md:flex-1">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-orange-100 p-2 rounded-lg">
                    <ShieldCheck className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Tenant Administrator</h2>
                    <p className="text-sm text-muted-foreground">Primary contact and system administrator</p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                  <Avatar className="h-20 w-20 border-2 border-border shadow-sm">
                    <AvatarImage src={admin.avatar} alt={admin.fullName || admin.email} />
                    <AvatarFallback className="bg-orange-50 text-orange-700 text-xl font-bold">
                      {(admin.fullName || admin.email).substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="space-y-1 flex-1">
                    <h3 className="text-lg font-semibold text-foreground">{admin.fullName || "Unnamed Admin"}</h3>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="text-sm">{admin.email}</span>
                    </div>
                    <div className="pt-1">
                      <Badge className={admin.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}>
                        {admin.isActive ? "Active Account" : "Inactive Account"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <Button 
                      className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
                      onClick={() => {
                        router.push(`/messages?userId=${admin.id}`);
                      }}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Chat with Admin
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Users */}
          <div className="lg:col-span-1 space-y-6">
            {/* Users Section */}
            <Card>
              <CardHeader className="border-b border-border">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" /> Users
                  </CardTitle>
                  <Badge variant="secondary">{users.count}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                    <span className="text-sm font-medium text-foreground">Active Users</span>
                    <span className="text-lg font-bold text-green-600">{users.active}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                    <span className="text-sm font-medium text-foreground">Inactive</span>
                    <span className="text-lg font-bold text-muted-foreground">{users.count - users.active}</span>
                  </div>
                </div>
                <div className="h-px bg-border my-4" />
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Recent Users
                  </h4>
                  {users.list.slice(0, 5).map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {user.fullName || user.email}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        {user.isActive ? (
                          <div className="size-2 rounded-full bg-green-500" />
                        ) : (
                          <div className="size-2 rounded-full bg-slate-400" />
                        )}
                      </div>
                    </div>
                  ))}
                  {users.count > 5 && (
                    <Link
                      href={`/tenants/${slug}/users`}
                      className="text-xs font-medium text-orange-600 hover:text-orange-700 block pt-2"
                    >
                      View all {users.count} users →
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Usage Section */}
            <Card>
              <CardHeader className="border-b border-border">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" /> Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                    <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide font-semibold mb-1">
                      System Health
                    </p>
                    <div className="flex items-end gap-2">
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{tenant.isActive && !details.lifecycle?.isDeleted ? "Online" : "Paused"}</p>
                      <p className="text-sm text-blue-600/70 dark:text-blue-400/70 mb-1">Tenant access</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
                    <p className="text-xs text-green-600 dark:text-green-400 uppercase tracking-wide font-semibold mb-1">
                      Data Security
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">{usage.activity30d.toLocaleString()} auditable events in 30 days</p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20">
                    <p className="text-xs text-purple-600 dark:text-purple-400 uppercase tracking-wide font-semibold mb-1">
                      Database
                    </p>
                    <p className="text-sm text-purple-600 dark:text-purple-400">{usage.departments.toLocaleString()} departments configured</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Billing & Invoices */}
          <div className="lg:col-span-2 space-y-6">
            {/* Billing Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Total Billed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(billing.metrics.totalBilled)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Total Paid
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(billing.metrics.totalPaid)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    Pending
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-yellow-600">
                    {formatCurrency(billing.metrics.pendingAmount)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Invoice Stats */}
            <Card>
              <CardHeader className="border-b border-border">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" /> Invoice Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50 border border-border/50 text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total</p>
                    <p className="text-2xl font-bold text-foreground">{billing.invoiceStats.total}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 border border-border/50 text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Paid</p>
                    <p className="text-2xl font-bold text-green-600">{billing.invoiceStats.paid}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 border border-border/50 text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">{billing.invoiceStats.pending}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 border border-border/50 text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Overdue</p>
                    <p className="text-2xl font-bold text-red-600">{billing.invoiceStats.overdue}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Invoices */}
            <Card>
              <CardHeader className="border-b border-border">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="h-5 w-5" /> Recent Invoices
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/tenants/${slug}/invoices`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-sm font-medium shadow-md hover:opacity-90 transition-all active:scale-95"
                      style={{ backgroundColor: orange }}
                    >
                      <FileText className="h-4 w-4" />
                      Manage Invoices
                    </Link>
                    <Badge variant="secondary">{billing.invoices.length}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {billing.invoices.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No invoices yet</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {billing.invoices.slice(0, 8).map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-border transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate font-mono">
                            INV-{invoice.id.slice(0, 8).toUpperCase()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(invoice.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm font-semibold text-foreground text-right">
                            {formatCurrency(invoice.totalAmount)}
                          </span>
                          <Badge
                            className={`${getStatusColor(invoice.status)} text-xs`}
                            variant="outline"
                          >
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {billing.invoices.length > 8 && (
                      <Link
                        href={`/tenants/${slug}/invoices`}
                        className="text-xs font-medium text-orange-600 hover:text-orange-700 block pt-2 text-center"
                      >
                        View all {billing.invoices.length} invoices →
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Edit Tenant Modal */}
        {showEditModal && details && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Edit Tenant</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Hospital Name *
                    </label>
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={editForm.contactEmail}
                      onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Contact Phone
                    </label>
                    <PhoneNumberInput
                      value={editForm.contactPhone}
                      onChange={(value) => setEditForm({ ...editForm, contactPhone: value })}
                      className="focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-100 dark:focus-within:ring-orange-900/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Address
                    </label>
                    <input
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/20"
                    />
                  </div>
                  <AddressFields
                    includeAddress={false}
                    value={{ city: editForm.city, country: editForm.country }}
                    onChange={(next) => setEditForm({ ...editForm, city: next.city, country: next.country })}
                    className="grid grid-cols-2 gap-3"
                  />
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Plan *
                    </label>
                    <select
                      value={editForm.plan}
                      onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300"
                    >
                      <option value="Basic">Basic</option>
                      <option value="Standard">Standard</option>
                      <option value="Premium">Premium</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={actionLoading}
                  style={{ backgroundColor: orange }}
                  className="text-white"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Tenant Modal */}
        {showDeleteModal && details && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Archive Tenant</h2>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 p-6">
                <div className="text-center">
                  <div className="size-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Archive {details.tenant.name}?
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                      This deactivates the tenant slug, logs active tenant sessions out, and hides it from default views. Data remains restorable during the 60-day grace period.
                  </p>
                  <ul className="text-sm text-muted-foreground text-left space-y-1 mb-6">
                    <li>- Tenant users are blocked from dashboard access</li>
                    <li>- Existing sessions are invalidated</li>
                    <li>- Branding, patients, appointments, invoices, and settings are preserved</li>
                    <li>- Permanent deletion is locked until the grace period expires</li>
                  </ul>
                  <ul className="hidden">
                    <li>• All users and their data</li>
                    <li>• All patients and medical records</li>
                    <li>• All appointments and visits</li>
                    <li>• All invoices and billing data</li>
                    <li>• All OTPs and password resets</li>
                    <li>• All settings and configurations</li>
                  </ul>
                  <p className="text-sm font-medium text-destructive mb-3">
                    Type "{details.tenant.name}" to confirm:
                  </p>
                  <input
                    type="text"
                    placeholder={details.tenant.name}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/20"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Archive Tenant
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
