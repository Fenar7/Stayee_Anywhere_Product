"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

interface OnboardingData {
  id: string;
  phone: string;
  hostelName: string;
  bedLabel: string;
}

export default function NewUserPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OnboardingData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!requestId) {
      setError("Invalid link. Please contact your hostel warden.");
      setLoading(false);
      return;
    }

    const fetchOnboardingData = async () => {
      try {
        const response = await fetch(`/api/public/onboard-request/${requestId}`);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to load onboarding data");
        }

        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message);
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

    const message = `Hello! Welcome to Next Home. Please click this link to complete your profile registration: ${window.location.origin}/newuser?id=${data.id}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const copyLink = () => {
    const link = `${window.location.origin}/newuser?id=${requestId}`;
    navigator.clipboard.writeText(link);
    alert("Link copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading onboarding information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="max-w-md space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:bg-red-900/20 dark:text-red-200">
            <h2 className="text-xl font-bold text-red-800 dark:text-red-200">Invalid Link</h2>
            <p className="mt-2 text-red-700 dark:text-red-300">{error}</p>
            <Button onClick={() => router.push("/")} className="mt-4">
              Return to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="rounded-lg border bg-card shadow-sm">
            <div className="p-6">
              <div className="text-center space-y-4">
                <h1 className="text-3xl font-bold">Welcome to Next Home!</h1>
                <p className="text-lg text-muted-foreground">
                  Let's get your onboarding profile registered.
                </p>

                <div className="mt-8 space-y-4 rounded-lg border bg-muted p-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Assigned Hostel</p>
                    <p className="text-xl font-semibold">{data?.hostelName}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Selected Bed</p>
                    <p className="text-xl font-semibold">{data?.bedLabel}</p>
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-3">
                  <Button onClick={handleContinue} size="lg" className="w-full">
                    Set Up Account & Profile
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      onClick={copyLink}
                      variant="outline"
                      size="lg"
                      className="flex-1"
                    >
                      Copy Link
                    </Button>
                    <Button
                      onClick={handleWhatsAppShare}
                      variant="outline"
                      size="lg"
                      className="flex-1"
                    >
                      Share on WhatsApp
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}