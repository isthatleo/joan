"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, KeyRound, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { useTenantPath } from "@/hooks/useTenantPath";

function getPasswordChecks(password: string, confirmPassword: string) {
  return [
    { key: "length", label: "At least 8 characters", met: password.length >= 8 },
    { key: "uppercase", label: "At least one uppercase letter", met: /[A-Z]/.test(password) },
    { key: "lowercase", label: "At least one lowercase letter", met: /[a-z]/.test(password) },
    { key: "number", label: "At least one number", met: /[0-9]/.test(password) },
    { key: "special", label: "At least one special character", met: /[^A-Za-z0-9\s]/.test(password) },
    { key: "spaces", label: "No spaces", met: password.length > 0 && !/\s/.test(password) },
    { key: "match", label: "Passwords match", met: password.length > 0 && password === confirmPassword },
  ];
}

export default function CompleteAccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toTenantPath = useTenantPath();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const redirect = searchParams.get("redirect") || toTenantPath("/");
  const passwordChecks = getPasswordChecks(password, confirmPassword);
  const passwordReady = passwordChecks.every((check) => check.met);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (!passwordReady) {
        throw new Error("Complete every password requirement before continuing.");
      }

      const response = await fetch("/api/users/complete-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          password,
          confirmPassword,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to save the new password.");
      }

      router.replace(redirect);
      router.refresh();
    } catch (submitError: any) {
      setError(submitError?.message || "Failed to save the new password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-subtle p-6">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Set Your New Password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your temporary password cannot be reused. Set a new password before you enter the patient dashboard.
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Password requirements</p>
          <ul className="mt-2 space-y-1">
            {passwordChecks.map((check) => (
              <li key={check.key} className={`flex items-center gap-2 ${check.met ? "text-emerald-600 dark:text-emerald-300" : "text-muted-foreground"}`}>
                {check.met ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                <span>{check.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive-soft p-3 text-sm text-destructive-soft-foreground">
              {error}
            </div>
          ) : null}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">New password</label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Enter a new password"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Confirm password</label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Re-enter the new password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !passwordReady}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save new password
          </button>
        </form>
      </div>
    </div>
  );
}
