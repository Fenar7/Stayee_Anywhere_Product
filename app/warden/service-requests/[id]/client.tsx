"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/toast";
import Image from "next/image";
import { CheckCircle2, XCircle, Loader2, ArrowLeft } from "lucide-react";

interface VerificationData {
  id: string;
  type: string;
  amount: number;
  metadata: Record<string, unknown> | null;
  status: string;
  tenantName: string;
  roomNumber: string;
  bedLabel: string;
  screenshotUrl: string | null;
}

export default function WardenServiceRequestVerificationClient({
  data,
}: {
  data: VerificationData;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  const handleAction = async (action: "approve" | "reject") => {
    try {
      setLoading(action);
      const res = await fetch(`/api/warden/service-requests/${data.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || "Failed to process request");
      }

      notify.success(
        action === "approve"
          ? "Payment verified successfully"
          : "Payment rejected successfully"
      );
      router.push("/warden/worklists");
      router.refresh();
    } catch (err: unknown) {
      notify.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Verify Ad-Hoc Payment</h1>
          <p className="text-sm text-muted-foreground">
            {data.tenantName} - Room {data.roomNumber}, Bed {data.bedLabel}
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 space-y-6">
        <div>
          <h3 className="font-semibold text-lg">Request Details</h3>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-medium">{data.type.replace(/_/g, " ")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Amount Paid</p>
              <p className="font-medium">₹{data.amount.toLocaleString("en-IN")}</p>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold text-lg mb-4">Payment Screenshot</h3>
          {data.screenshotUrl ? (
            <div className="relative aspect-[3/4] w-full max-w-md mx-auto rounded-lg overflow-hidden border">
              <Image
                src={data.screenshotUrl}
                alt="Payment Screenshot"
                fill
                className="object-contain bg-muted"
                unoptimized
              />
            </div>
          ) : (
            <div className="p-8 text-center border rounded-lg bg-muted/50">
              <p className="text-muted-foreground">No screenshot uploaded</p>
            </div>
          )}
        </div>

        {data.status === "PAYMENT_UPLOADED" && (
          <div className="flex gap-4 pt-6 border-t">
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => handleAction("reject")}
              disabled={!!loading}
            >
              {loading === "reject" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Reject Payment
            </Button>
            <Button
              className="flex-1"
              onClick={() => handleAction("approve")}
              disabled={!!loading}
            >
              {loading === "approve" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Approve Payment
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
