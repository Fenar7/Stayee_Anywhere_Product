"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, LogOut, Loader2 } from "lucide-react";

interface EarlyExitSheetProps {
  stayId: string;
  joiningDate: Date;
  endDate: Date | null;
}

export default function EarlyExitSheet({
  stayId,
  joiningDate,
  endDate,
}: EarlyExitSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [estimating, setEstimating] = useState(false);

  const [exitDate, setExitDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [estimateData, setEstimateData] = useState<{
    daysUsed: number;
    daysRemaining: number;
    suggestedRefund: number;
  } | null>(null);

  useEffect(() => {
    async function fetchEstimate(dateStr: string) {
      setEstimating(true);
      try {
        const res = await fetch(`/api/warden/stays/${stayId}/refund-estimate?exitDate=${dateStr}`);
        if (res.ok) {
          const data = await res.json();
          setEstimateData(data);
          setRefundAmount((data.suggestedRefund / 100).toFixed(2));
        }
      } catch (error) {
        console.error(error);
      } finally {
        setEstimating(false);
      }
    }

    if (open && exitDate) {
      fetchEstimate(exitDate);
    }
  }, [open, exitDate, stayId]);;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/warden/stays/${stayId}/early-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutDate: exitDate,
          refundAmountPaise: Math.round(parseFloat(refundAmount || "0") * 100),
        }),
      });

      if (!response.ok) throw new Error("Failed to process early checkout");
      
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Error processing early checkout.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="sm" className="gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50" />}>
          <LogOut className="h-4 w-4" />
          Early Exit
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Process Early Exit</SheetTitle>
        </SheetHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground block">Joining Date</span>
                <span className="font-medium">{format(new Date(joiningDate), "PPP")}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Planned End Date</span>
                <span className="font-medium">{endDate ? format(new Date(endDate), "PPP") : "Open-ended stay"}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Actual Exit Date</Label>
              <Input
                type="date"
                value={exitDate}
                onChange={(e) => setExitDate(e.target.value)}
                required
              />
            </div>

            {estimating ? (
              <div className="flex items-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculating estimate...
              </div>
            ) : estimateData ? (
              <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Days Used:</span>
                  <span className="font-medium">{estimateData.daysUsed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Days Remaining:</span>
                  <span className="font-medium">{estimateData.daysRemaining}</span>
                </div>
                <div className="flex justify-between text-primary font-semibold pt-2 border-t mt-2">
                  <span>Suggested Refund:</span>
                  <span>₹{(estimateData.suggestedRefund / 100).toFixed(2)}</span>
                </div>
              </div>
            ) : null}

            <div className="space-y-2 pt-4">
              <Label>Final Refund Amount (₹)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                You can override the calculated estimate.
              </p>
            </div>
          </div>

          <Button type="submit" variant="destructive" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirm Early Checkout
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
