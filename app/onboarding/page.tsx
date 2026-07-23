"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Shield, ArrowRight } from "lucide-react";

function OnboardingEntryInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const requestId = searchParams.get("id") || searchParams.get("reqId") || searchParams.get("onboardingId");
  const [phone, setPhone] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hostelName, setHostelName] = useState<string | null>(null);
  const [bedLabel, setBedLabel] = useState<string | null>(null);
  const [fetchingInfo, setFetchingInfo] = useState(false);

  useEffect(() => {
    if (!requestId) return;
    // Check if tenant already validated gate previously on this device
    try {
      const existingSession = localStorage.getItem(`stayee_session_${requestId}`);
      if (existingSession === "true") {
        router.push(`/onboard?id=${requestId}`);
        return;
      }
    } catch {
      // LocalStorage access fallback
    }

    setFetchingInfo(true);
    fetch(`/api/public/onboarding/${requestId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          if (data.phone) {
            const raw = String(data.phone).trim();
            const digits = raw.replace(/\D/g, "");
            const formatted = raw.startsWith("+")
              ? raw
              : digits.length === 10
              ? `+91${digits}`
              : `+${digits}`;
            setPhone(formatted);
            setTimeout(() => passwordInputRef.current?.focus(), 150);
          }
          if (data.hostelName) setHostelName(data.hostelName);
          if (data.bedLabel) setBedLabel(data.bedLabel);
        }
      })
      .catch(() => {})
      .finally(() => setFetchingInfo(false));
  }, [requestId, router]);

  const handleValidate = async () => {
    if (!phone || !tempPassword) {
      setError("Please enter both phone number and access password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/public/onboarding/${requestId}/validate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, tempPassword }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Validation failed");
      }

      try {
        if (requestId) localStorage.setItem(`stayee_session_${requestId}`, "true");
      } catch {
        // Storage write fallback
      }

      router.push(data.redirectUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Shield className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">Welcome to Anywhere Node</h1>
          {hostelName ? (
            <div className="inline-flex flex-col items-center gap-1">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {hostelName} · Bed {bedLabel}
              </span>
              <p className="text-muted-foreground text-xs pt-1">
                Your phone number is auto-filled. Enter your Access Password to enter.
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Enter the phone number and access password provided by your hostel
              warden to begin your onboarding.
            </p>
          )}
        </div>

        <div className="rounded-lg border bg-card shadow-sm p-6 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium mb-1.5 block" htmlFor="phone-input">
                Phone Number
              </label>
              {phone && hostelName && (
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                  ✓ Auto-filled
                </span>
              )}
            </div>
            <PhoneInput
              id="phone-input"
              value={phone}
              onChange={(val) => {
                setPhone(val);
                setError("");
              }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="password-input">
              Access Password
            </label>
            <input
              ref={passwordInputRef}
              id="password-input"
              type="password"
              placeholder="Enter the password from your warden"
              value={tempPassword}
              onChange={(e) => {
                setTempPassword(e.target.value);
                setError("");
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              This was shared with you when the warden created your onboarding
              request.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
              {error}
            </div>
          )}

          <Button
            onClick={handleValidate}
            disabled={loading || !phone || !tempPassword}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="mr-2 h-4 w-4" />
            )}
            {loading ? "Verifying..." : "Continue Onboarding"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingEntryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      }
    >
      <OnboardingEntryInner />
    </Suspense>
  );
}
