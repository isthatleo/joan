"use client";

import { useMemo, useState } from "react";
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
  const [loading, setLoading] = useState(false);

  const redirectPath = useMemo(() => {
    const requested = searchParams.get("redirect");
    if (requested && requested.startsWith("/")) return requested;
    return withTenantPrefix("/patient", slug, typeof window !== "undefined" ? window.location.hostname : undefined);
  }, [searchParams, slug]);

  const verify = async () => {
    if (code.length !== 6 || loading) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/tenant/${slug}/security/2fa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Verification failed");
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
            Enter the six-digit code sent to your configured email or phone.
          </p>
        </div>

        <div className="space-y-5">
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

          <button
            type="button"
            disabled={loading || code.length !== 6}
            onClick={verify}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify and Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
