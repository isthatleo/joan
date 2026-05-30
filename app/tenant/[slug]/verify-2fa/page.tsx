"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { withTenantPrefix } from "@/lib/tenant-routing";

export default function TenantVerifyTwoFactorPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [setup, setSetup] = useState<any>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const redirectPath = useMemo(() => {
    const requested = searchParams.get("redirect");
    if (requested && requested.startsWith("/")) return requested;
    return withTenantPrefix("/patient", slug, typeof window !== "undefined" ? window.location.hostname : undefined);
  }, [searchParams, slug]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setSetupLoading(true);
      try {
        const sessionResponse = await fetch(`/api/tenant/${slug}/security/session`, {
          credentials: "include",
          cache: "no-store",
        });
        const sessionData = await sessionResponse.json().catch(() => ({}));
        if (sessionResponse.ok && sessionData?.twoFactorSetupRequired) {
          const setupResponse = await fetch(`/api/tenant/${slug}/security/2fa/setup`, {
            credentials: "include",
            cache: "no-store",
          });
          const setupData = await setupResponse.json().catch(() => ({}));
          if (!setupResponse.ok) throw new Error(setupData?.error || "Failed to start authenticator setup");
          if (mounted) {
            setSetupRequired(true);
            setSetup(setupData);
          }
        }
      } catch (error: any) {
        toast.error(error?.message || "Failed to load two-factor setup");
      } finally {
        if (mounted) setSetupLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [slug]);

  const verify = async () => {
    const submittedCode = recoveryCode.trim() || code;
    if ((!recoveryCode.trim() && code.length !== 6) || loading) return;
    setLoading(true);
    try {
      const response = await fetch(setupRequired ? `/api/tenant/${slug}/security/2fa/setup` : `/api/tenant/${slug}/security/2fa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: submittedCode }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Verification failed");
      if (setupRequired && Array.isArray(data?.backupCodes)) {
        setBackupCodes(data.backupCodes);
        setSetupRequired(false);
        setCode("");
        setRecoveryCode("");
        toast.success("Authenticator 2FA enabled. Save your recovery codes.");
        return;
      }
      toast.success("Verification complete");
      router.replace(redirectPath);
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-subtle p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Verify Access</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {setupRequired
              ? "Set up Google Authenticator, Microsoft Authenticator, Authy, or another TOTP app before continuing."
              : "Enter the six-digit code from your authenticator app."}
          </p>
        </div>

        <div className="space-y-5">
          {setupLoading && <p className="text-center text-sm text-muted-foreground">Resolving two-factor requirements...</p>}

          {setupRequired && setup && (
            <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex justify-center">
                <img src={setup.qrCodeUrl} alt="Authenticator QR code" className="h-44 w-44 rounded-lg bg-white p-2" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Manual setup key</p>
                <p className="mt-1 break-all rounded-md border border-border bg-background px-3 py-2 font-mono text-sm">{setup.secret}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Scan the QR code or enter the manual key in your authenticator app, then enter the generated six-digit code below.
              </p>
            </div>
          )}

          {backupCodes.length > 0 && (
            <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <div>
                <p className="font-semibold">Save these recovery codes now</p>
                <p className="text-xs">Each code can be used once if you lose your authenticator device.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((item) => (
                  <span key={item} className="rounded bg-white px-2 py-1 font-mono text-xs">{item}</span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  router.replace(redirectPath);
                  router.refresh();
                }}
                className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700"
              >
                I saved my recovery codes
              </button>
            </div>
          )}

          <div className="flex justify-center">
            <InputOTP maxLength={6} value={code} onChange={setCode}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {!setupRequired && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Recovery code</label>
              <input
                value={recoveryCode}
                onChange={(event) => setRecoveryCode(event.target.value)}
                placeholder="ABCDE-12345"
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
              />
              <p className="mt-1 text-xs text-muted-foreground">Use a recovery code only if you cannot access your authenticator app.</p>
            </div>
          )}

          <button
            type="button"
            disabled={loading || setupLoading || (!recoveryCode.trim() && code.length !== 6) || backupCodes.length > 0}
            onClick={verify}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Verifying..." : setupRequired ? "Enable 2FA and Continue" : "Verify and Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
