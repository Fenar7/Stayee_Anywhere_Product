"use client";

import { useEffect, useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { onboardingLink } from "@/lib/whatsapp/templates";
import { buildWaMeLink } from "@/lib/whatsapp/utils";

interface OnboardingData {
  id: string;
  phone: string;
  hostelName: string;
  bedLabel: string;
}

/**
 * Inner content component that reads searchParams.
 * Must be wrapped in <Suspense> by the default export to satisfy
 * Next.js 15+ requirements for useSearchParams() in client components.
 */
function NewUserContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OnboardingData | null>(null);
  const [error, setError] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (!requestId) {
      setError(
        "Invalid link. No request ID was provided. Please contact your hostel warden."
      );
      setLoading(false);
      return;
    }

    const fetchOnboardingData = async () => {
      try {
        const response = await fetch(
          `/api/public/onboard-request/${requestId}`
        );

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Failed to load onboarding data");
        }

        const result = await response.json();
        setData(result);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchOnboardingData();
  }, [requestId]);

  const handleContinue = () => {
    router.push(`/onboard?id=${requestId}`);
  };

  const handleWhatsAppShare = () => {
    if (!data) return;
    const link = `${window.location.origin}/newuser?id=${data.id}`;
    const message = onboardingLink(link);
    window.open(buildWaMeLink("", message), "_blank");
  };

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/newuser?id=${requestId}`;
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch {
      // Fallback for non-HTTPS / older browsers
      const el = document.createElement("textarea");
      el.value = link;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">
            Loading onboarding information...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md w-full">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:bg-red-900/20">
            <h1 className="text-xl font-bold text-red-800 dark:text-red-200">
              Invalid Link
            </h1>
            <p className="mt-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
            <p className="mt-4 text-sm text-red-600 dark:text-red-400 font-medium">
              This onboarding registration link has expired or was already
              completed. Please contact your hostel warden.
            </p>
            <Button
              onClick={() => router.push("/")}
              className="mt-4"
              variant="outline"
            >
              Return to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="max-w-lg w-full space-y-6">
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="p-8">
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-bold">
                  🏠
                </div>
              </div>
              <h1 className="text-2xl font-bold">Welcome to Anywhere Node!</h1>
              <p className="text-muted-foreground">
                Let&apos;s get your onboarding profile registered.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border bg-muted p-4 text-center">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Assigned Hostel
                </p>
                <p className="text-lg font-bold">{data?.hostelName}</p>
              </div>
              <div className="rounded-lg border bg-muted p-4 text-center">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Assigned Bed
                </p>
                <p className="text-lg font-bold">{data?.bedLabel}</p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <Button onClick={handleContinue} size="lg" className="w-full">
                Set Up Account &amp; Profile
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  size="lg"
                  className="flex-1"
                >
                  {linkCopied ? "✓ Copied!" : "Copy Link"}
                </Button>
                <Button
                  onClick={handleWhatsAppShare}
                  variant="outline"
                  size="lg"
                  className="flex-1 text-green-700 border-green-300 hover:bg-green-50"
                >
                  WhatsApp
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Default export wraps the content in a Suspense boundary.
 * This is required by Next.js 15+ whenever useSearchParams() is used
 * in a client component — without it, the production build will fail.
 */
export default function NewUserPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      }
    >
      <NewUserContent />
    </Suspense>
  );
}