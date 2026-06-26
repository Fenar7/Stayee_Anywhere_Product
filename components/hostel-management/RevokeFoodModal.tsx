"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";

interface RevokeFoodModalProps {
  stayId: string;
}

export function RevokeFoodModal({ stayId }: RevokeFoodModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  
  // Refund states
  const [refundAmount, setRefundAmount] = useState("");
  const [proRataAmount, setProRataAmount] = useState(0);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState<{
    amountPaid: number;
    totalDays: number;
    unusedDays: number;
    hasActiveUpgrade: boolean;
  } | null>(null);

  useEffect(() => {
    if (open) {
      fetchRefundDetails();
    }
  }, [open]);

  const fetchRefundDetails = async () => {
    setFetching(true);
    try {
      const res = await fetch(`/api/warden/stays/${stayId}/revoke-food`);
      if (!res.ok) throw new Error("Failed to fetch refund details");
      const data = await res.json();
      if (data.hasActiveUpgrade) {
        setDetails(data);
        setProRataAmount(data.proRataRefund);
        setRefundAmount(data.proRataRefund.toString());
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not retrieve refund details";
      toast.error(msg);
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedRefund = parseFloat(refundAmount);
    if (details && parsedRefund > details.amountPaid) {
      toast.error(`Refund amount cannot exceed the amount paid (₹${details.amountPaid})`);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/warden/stays/${stayId}/revoke-food`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refundAmount: parsedRefund,
          reason,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to revoke food plan");
      }

      toast.success("Food plan revoked and refund logged successfully!");
      setOpen(false);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="w-full mt-3 flex items-center justify-center rounded-md bg-destructive text-destructive-foreground px-3 py-2 text-sm font-medium hover:bg-destructive/90 shadow">
        <AlertTriangle className="h-4 w-4 mr-2" /> Revoke Food Plan
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> Revoke Food Plan
          </DialogTitle>
        </DialogHeader>

        {fetching ? (
          <div className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Calculating pro-rata refund...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {details && (
              <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Original Charge:</span>
                  <span className="font-semibold">₹{details.amountPaid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Days:</span>
                  <span className="font-semibold">{details.totalDays} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unused Days:</span>
                  <span className="font-semibold">{details.unusedDays} days</span>
                </div>
                <div className="flex justify-between border-t pt-2 border-border font-medium">
                  <span>Pro-rata Refund:</span>
                  <span className="text-green-600 dark:text-green-400">₹{proRataAmount.toLocaleString()}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Refund Amount (₹)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={details ? details.amountPaid : undefined}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Modify if a manual override is needed. Otherwise, keep the pro-rata amount. Capped at original charge.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Revocation Reason</Label>
              <Input
                type="text"
                placeholder="e.g. Tenant requested cancellation mid-cycle"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Confirm Revocation
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
