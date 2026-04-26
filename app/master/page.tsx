"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";

/**
 * Master / Super Admin login. Same Better Auth call — the only difference
 * is the visual treatment and a hard role check that this account is super_admin.
 */
export default function MasterLoginPage() {
  const router = useRouter();
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
    setError("");
    setLoading(true);
    try {
      const result: any = await authClient.signIn.email({ email, password });
      if (result?.error) {
        setError(result.error.message || "Sign-in failed");
        setLoading(false);
        return;
      }
      const roleRes = await fetch("/api/auth/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const { role } = await roleRes.json();
      if (role !== "super_admin") {
        setError("This account does not have super admin privileges.");
        await authClient.signOut();
        setLoading(false);
        return;
      }
      router.push("/");
    } catch (err: any) {
      setError(err?.message || "Sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-foreground p-6">
      <div className="w-full max-w-md">
        <Link href="/login" className="mb-6 inline-block text-sm text-background/60 hover:text-background">
          ← Back to hospital login
        </Link>
        <div className="rounded-2xl border border-background/10 bg-background p-8 shadow-2xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Super Admin Console</h2>
            <p className="mt-1 text-sm text-muted-foreground">Platform-level access only</p>
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
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Password</label>
              <input
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Authenticating…" : "Enter Console"}
            </button>
          </form>
          {isFirstUser && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              No accounts exist yet. <Link href="/signup" className="text-primary hover:underline">Create the first Super Admin →</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
