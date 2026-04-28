"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Stethoscope, HeartPulse, Microscope, Pill, DollarSign,
  Users, UserCheck, ShieldCheck, Baby, Building2, GraduationCap,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { ROLE_HOME, type AppRole } from "@/lib/rbac";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
];

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFirstUser, setIsFirstUser] = useState(false);

  useEffect(() => {
    fetch("/api/auth/first-user")
      .then((r) => r.json())
      .then((d) => setIsFirstUser(!!d.isFirst))
      .catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setLoading(true);
    setError("");
    try {
      const result: any = await authClient.signIn.email({ email, password });
      if (result?.error) {
        setError(result.error.message || "Sign-in failed");
        setLoading(false);
        return;
      }
      // Verify role matches selection
      const roleRes = await fetch("/api/auth/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const { role } = await roleRes.json();
      if (role && role !== selectedRole) {
        setError(`This account is registered as ${role.replace(/_/g, " ")}, not ${selectedRole.replace(/_/g, " ")}.`);
        await authClient.signOut();
        setLoading(false);
        return;
      }
      window.location.assign(ROLE_HOME[role as AppRole] ?? "/");
    } catch (err: any) {
      setError(err?.message || "Sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  if (!selectedRole) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-subtle p-6">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Joan Healthcare OS</h1>
          <p className="mt-2 text-lg text-muted-foreground">Select your role to continue</p>
        </div>

        {/* Role Cards Grid */}
        <div className="grid w-full max-w-5xl grid-cols-2 gap-3 md:grid-cols-3">
          {ROLES.map(({ key, label, icon: Icon, description, color, bg }) => (
            <Card
              key={key}
              className="group cursor-pointer transition-all duration-200 border-2 hover:border-primary/40 hover:shadow-lg"
              onClick={() => setSelectedRole(key)}
            >
              <CardHeader className="pb-1 pt-4 text-center">
                <div className={`mx-auto mb-1.5 rounded-xl p-2.5 ${bg} transition-colors ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-base font-bold">{label}</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <CardDescription className="mb-2 min-h-[28px] text-center text-xs">
                  {description}
                </CardDescription>
                <Button
                  className="w-full text-xs font-semibold"
                  variant="outline"
                  type="button"
                >
                  Login as {label}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 flex flex-col items-center gap-3 text-sm">
          <Link href="/master" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
            <ShieldCheck className="h-4 w-4" /> Super Admin Access
          </Link>
          {isFirstUser && (
            <Link href="/signup" className="text-primary hover:underline">
              First time setup? Create the Super Admin account →
            </Link>
          )}
        </div>
      </div>
    );
  }

  const roleConfig = ROLES.find((r) => r.key === selectedRole)!;
  const RoleIcon = roleConfig.icon;

  return (
    <div className="flex min-h-screen items-center justify-center bg-subtle p-6">
      <div className="w-full max-w-md">
        <button
          onClick={() => { setSelectedRole(null); setError(""); }}
          className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to roles
        </button>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <RoleIcon className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">{roleConfig.label} Login</h2>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to your hospital account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive-soft p-3 text-sm text-destructive-soft-foreground">
                {error}
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
