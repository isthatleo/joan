"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Baby,
  Building2,
  DollarSign,
  GraduationCap,
  HeartPulse,
  Microscope,
  Pill,
  Stethoscope,
  UserCheck,
  Users,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { getTenantDashboardPath, withTenantPrefix } from "@/lib/tenant-routing";
import { type AppRole } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ROLES = [
  {
    key: "doctor",
    label: "Doctor",
    icon: Stethoscope,
    description: "Manage patient consultations and medical records",
    color: "text-blue-600",
    bg: "bg-blue-50 group-hover:bg-blue-100",
  },
  {
    key: "nurse",
    label: "Nurse",
    icon: HeartPulse,
    description: "Monitor patient care and vital statistics",
    color: "text-red-600",
    bg: "bg-red-50 group-hover:bg-red-100",
  },
  {
    key: "lab_technician",
    label: "Lab Technician",
    icon: Microscope,
    description: "Process lab tests and manage results",
    color: "text-purple-600",
    bg: "bg-purple-50 group-hover:bg-purple-100",
  },
  {
    key: "pharmacist",
    label: "Pharmacist",
    icon: Pill,
    description: "Manage medications and pharmacy inventory",
    color: "text-green-600",
    bg: "bg-green-50 group-hover:bg-green-100",
  },
  {
    key: "accountant",
    label: "Accountant",
    icon: DollarSign,
    description: "Handle billing and financial management",
    color: "text-amber-600",
    bg: "bg-amber-50 group-hover:bg-amber-100",
  },
  {
    key: "receptionist",
    label: "Receptionist",
    icon: UserCheck,
    description: "Schedule appointments and manage admissions",
    color: "text-cyan-600",
    bg: "bg-cyan-50 group-hover:bg-cyan-100",
  },
  {
    key: "patient",
    label: "Patient",
    icon: Users,
    description: "Access your health records and appointments",
    color: "text-emerald-600",
    bg: "bg-emerald-50 group-hover:bg-emerald-100",
  },
  {
    key: "guardian",
    label: "Guardian",
    icon: Baby,
    description: "Manage dependent care and medical records",
    color: "text-pink-600",
    bg: "bg-pink-50 group-hover:bg-pink-100",
  },
  {
    key: "hospital_admin",
    label: "Hospital Admin",
    icon: Building2,
    description: "Full hospital administration and management",
    color: "text-indigo-600",
    bg: "bg-indigo-50 group-hover:bg-indigo-100",
  },
] as const;

type TenantRoleLoginProps = {
  slug: string;
  tenantId?: string | null;
  tenantName: string;
  backHref?: string;
};

export function formatTenantName(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function TenantRoleLogin({
  slug,
  tenantId,
  tenantName,
  backHref = "/login",
}: TenantRoleLoginProps) {
  const searchParams = useSearchParams();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const accessAudience = searchParams.get("audience") === "patient-access";
  const requestedRole = searchParams.get("role");

  const visibleRoles = useMemo(() => {
    if (!accessAudience) {
      return ROLES;
    }

    return ROLES.filter((role) => role.key === "patient" || role.key === "guardian");
  }, [accessAudience]);

  useEffect(() => {
    try {
      document.cookie = `x-tenant-slug=${slug}; path=/; SameSite=Lax`;
      sessionStorage.setItem("active_tenant_slug", slug);
      sessionStorage.setItem("active_tenant_name", tenantName || formatTenantName(slug));

      if (tenantId) {
        sessionStorage.setItem("active_tenant_id", tenantId);
      }
    } catch {}
  }, [slug, tenantId, tenantName]);

  useEffect(() => {
    if (!requestedRole) {
      return;
    }

    const matchingRole = visibleRoles.find((role) => role.key === requestedRole);
    if (!matchingRole) {
      return;
    }

    setSelectedRole((current) => current ?? matchingRole.key);
  }, [requestedRole, visibleRoles]);

  const roleConfig = useMemo(
    () => visibleRoles.find((role) => role.key === selectedRole) ?? null,
    [selectedRole, visibleRoles],
  );

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedRole || loading) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await authClient.signIn.email({ email, password });

      if ((result as any)?.error) {
        setError((result as any).error.message || "Sign-in failed");
        return;
      }

      const roleResponse = await fetch("/api/auth/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, tenantSlug: slug }),
      });

      const { role } = await roleResponse.json();

      if (role && role !== selectedRole) {
        setError(
          `This account is registered as ${role.replace(/_/g, " ")}, not ${selectedRole.replace(/_/g, " ")}.`,
        );
        await authClient.signOut();
        return;
      }

      const resolvedRole = (role as AppRole | null) ?? (selectedRole as AppRole);
      const dashboardPath = getTenantDashboardPath(slug, resolvedRole, window.location.hostname);

      const settingsResponse = await fetch("/api/users/settings", {
        cache: "no-store",
        credentials: "include",
      });

      if (settingsResponse.ok) {
        const settings = await settingsResponse.json().catch(() => null);
        if (settings?.security?.forcePasswordChange) {
          const activationPath = withTenantPrefix("/complete-access", slug, window.location.hostname);
          const params = new URLSearchParams({
            redirect: dashboardPath,
            role: resolvedRole,
          });
          window.location.assign(`${activationPath}?${params.toString()}`);
          return;
        }
      }

      window.location.assign(dashboardPath);
    } catch (loginError: any) {
      setError(loginError?.message || "Sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  if (!selectedRole) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-subtle p-6">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">{tenantName || "Hospital Login"}</h1>
          <p className="mt-2 text-lg text-muted-foreground">Select your role to continue</p>
        </div>

        <div className="grid w-full max-w-5xl grid-cols-2 gap-3 md:grid-cols-3">
          {visibleRoles.map(({ key, label, icon: Icon, description, color, bg }) => (
            <Card
              key={key}
              className="group cursor-pointer border-2 transition-all duration-200 hover:border-primary/40 hover:shadow-lg"
              onClick={() => setSelectedRole(key)}
            >
              <CardHeader className="pb-1 pt-4 text-center">
                <div className={`mx-auto mb-1.5 rounded-xl p-2.5 transition-colors ${bg} ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-base font-bold">{label}</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <CardDescription className="mb-2 min-h-[28px] text-center text-xs">{description}</CardDescription>
                <Button className="w-full text-xs font-semibold" variant="outline" type="button">
                  Login as {label}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {!accessAudience ? (
          <div className="mt-8 flex flex-col items-center gap-3 text-sm">
            <Link href={backHref} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
              Back to Main Login
            </Link>
          </div>
        ) : null}
      </div>
    );
  }

  if (!roleConfig) {
    return null;
  }

  const RoleIcon = roleConfig.icon;

  return (
    <div className="flex min-h-screen items-center justify-center bg-subtle p-6">
      <div className="w-full max-w-md">
        <button
          onClick={() => {
            setSelectedRole(null);
            setError("");
          }}
          className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          type="button"
        >
          Back to roles
        </button>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <RoleIcon className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">{roleConfig.label} Login</h2>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to {tenantName || "your workspace"}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive-soft p-3 text-sm text-destructive-soft-foreground">
                {error}
              </div>
            ) : null}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="you@hospital.com"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
