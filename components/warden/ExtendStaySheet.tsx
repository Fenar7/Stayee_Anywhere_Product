"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, addMonths, addWeeks, addDays } from "date-fns";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, Loader2 } from "lucide-react";

interface ExtendStaySheetProps {
  stayId: string;
  currentEndDate: Date;
  balancePaise: number;
}

export default function ExtendStaySheet({
  stayId,
  currentEndDate,
  balancePaise,
}: ExtendStaySheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [durationType, setDurationType] = useState<"MONTHLY" | "WEEKLY" | "CUSTOM">("MONTHLY");
  const [customDays, setCustomDays] = useState("1");
  const [rentAmount, setRentAmount] = useState("");
  const [foodAmount, setFoodAmount] = useState("0");
  const [discountAmount, setDiscountAmount] = useState("0");

  let newEndDate = new Date(currentEndDate);
  if (durationType === "MONTHLY") {
    newEndDate = addMonths(newEndDate, 1);
  } else if (durationType === "WEEKLY") {
    newEndDate = addWeeks(newEndDate, 1);
  } else if (durationType === "CUSTOM") {
    const days = parseInt(customDays, 10);
    if (!isNaN(days) && days > 0) {
      newEndDate = addDays(newEndDate, days);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(\`/api/warden/stays/\${stayId}/extend\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationType,
          customDays: durationType === "CUSTOM" ? parseInt(customDays, 10) : undefined,
          newEndDate: newEndDate.toISOString(),
          rentAddedPaise: Math.round(parseFloat(rentAmount || "0") * 100),
          foodAddedPaise: Math.round(parseFloat(foodAmount || "0") * 100),
          discountAddedPaise: Math.round(parseFloat(discountAmount || "0") * 100),
        }),
      });

      if (!response.ok) throw new Error("Failed to extend stay");
      
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Error extending stay.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <CalendarDays className="h-4 w-4" />
          Extend
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Extend Stay</SheetTitle>
        </SheetHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="space-y-4">
            <div>
              <Label>Current End Date</Label>
              <div className="text-sm font-medium mt-1">
                {format(new Date(currentEndDate), "PPP")}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Duration Type</Label>
              <Select
                value={durationType}
                onValueChange={(val: any) => setDurationType(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">1 Month</SelectItem>
                  <SelectItem value="WEEKLY">1 Week</SelectItem>
                  <SelectItem value="CUSTOM">Custom Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {durationType === "CUSTOM" && (
              <div className="space-y-2">
                <Label>Number of Days</Label>
                <Input
                  type="number"
                  min="1"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <Label>Calculated New End Date</Label>
              <div className="text-sm font-medium mt-1 text-primary">
                {format(newEndDate, "PPP")}
              </div>
            </div>

            <div className="pt-4 border-t space-y-4">
              <h4 className="text-sm font-semibold">Additional Charges (₹)</h4>
              <div className="space-y-2">
                <Label>Rent Add-on</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 5000"
                  value={rentAmount}
                  onChange={(e) => setRentAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Food Charges Add-on</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={foodAmount}
                  onChange={(e) => setFoodAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Discount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading || !rentAmount}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirm Extension
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
