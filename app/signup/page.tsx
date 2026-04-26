"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";

/**
 * First-time setup. Only allows account creation when there are zero users yet —
 * that account is auto-assigned the super_admin role server-side.
 * After bootstrap, all subsequent users are created by the Super Admin from inside the app.
 */
export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFirstUser, setIsFirstUser] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/first-user")
      .then((r) => r.json())
      .then((d) => setIsFirstUser(!!d.isFirst))
      .catch(() => setIsFirstUser(false));
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result: any = await authClient.signUp.email({ email, password, name });
      if (result?.error) {
        setError(result.error.message || "Signup failed");
        setLoading(false);
        return;
      }
      const userId = result?.data?.user?.id;
      // Auto-assign super_admin since this is the first user
      if (userId) {
        await fetch("/api/auth/assign-role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, roleName: "super_admin" }),
        });
      }
      router.push("/");
    } catch (err: any) {
      setError(err?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  if (isFirstUser === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-subtle text-sm text-muted-foreground">
        Checking platform state…
      </div>
    );
  }

  if (!isFirstUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-subtle p-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-warning-soft text-warning-soft-foreground">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Public sign-up disabled</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            New accounts must be created by your Super Admin or Hospital Admin from inside Joan.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-subtle p-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Create Super Admin</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              First account on this platform — gets full system access.
            </p>
          </div>
          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive-soft p-3 text-sm text-destructive-soft-foreground">
                {error}
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Full name</label>
              <input required value={name} onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Password</label>
              <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
              <p className="mt-1 text-xs text-muted-foreground">Minimum 8 characters.</p>
            </div>
            <button type="submit" disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
              {loading ? "Creating…" : "Create Super Admin"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
