"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface FoodPricingHistory {
  id: string;
  hostelId: string | null;
  hostel?: { name: string } | null;
  breakfastPricePaise: number;
  lunchPricePaise: number;
  dinnerPricePaise: number;
  effectiveFrom: Date;
  createdAt: Date;
  createdByUser: { firstName: string; lastName: string };
}

interface Hostel {
  id: string;
  name: string;
}

export default function FoodPricingClient({
  history,
  hostels,
}: {
  history: FoodPricingHistory[];
  hostels: Hostel[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    hostelId: "ALL",
    breakfastPrice: "",
    lunchPrice: "",
    dinnerPrice: "",
    effectiveFrom: format(new Date(), "yyyy-MM-dd"),
  });

  const todayIST = new Date();
  todayIST.setUTCHours(todayIST.getUTCHours() + 5, todayIST.getUTCMinutes() + 30);
  
  const activePricing = history.find((record) => {
    return new Date(record.effectiveFrom) <= todayIST;
  }) || history[0]; // Fallback to latest if somehow all are in the future

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/food-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostelId: formData.hostelId === "ALL" ? null : formData.hostelId,
          breakfastPricePaise: Math.round(parseFloat(formData.breakfastPrice) * 100),
          lunchPricePaise: Math.round(parseFloat(formData.lunchPrice) * 100),
          dinnerPricePaise: Math.round(parseFloat(formData.dinnerPrice) * 100),
          effectiveFrom: formData.effectiveFrom,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update pricing");
      }

      toast.success("Food pricing updated successfully");
      setIsOpen(false);
      setFormData({
        hostelId: "ALL",
        breakfastPrice: "",
        lunchPrice: "",
        dinnerPrice: "",
        effectiveFrom: format(new Date(), "yyyy-MM-dd"),
      });
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-zinc-200/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Breakfast (Current)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activePricing
                ? `₹${(activePricing.breakfastPricePaise / 100).toFixed(2)}`
                : "Not Set"}
            </div>
          </CardContent>
        </Card>
        <Card className="border border-zinc-200/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lunch (Current)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activePricing
                ? `₹${(activePricing.lunchPricePaise / 100).toFixed(2)}`
                : "Not Set"}
            </div>
          </CardContent>
        </Card>
        <Card className="border border-zinc-200/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dinner (Current)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activePricing
                ? `₹${(activePricing.dinnerPricePaise / 100).toFixed(2)}`
                : "Not Set"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Pricing History</h3>
          <p className="text-sm text-muted-foreground">
            Audit log of all historical meal price changes.
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Update Prices
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={onSubmit}>
              <DialogHeader>
                <DialogTitle>Update Meal Prices</DialogTitle>
                <DialogDescription>
                  Enter the new prices per meal. Changes take effect from the date specified.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Target Location</Label>
                  <Select
                    value={formData.hostelId}
                    onValueChange={(val) => setFormData({ ...formData, hostelId: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select target location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Hostels (Default)</SelectItem>
                      {hostels.map((h) => (
                        <SelectItem key={h.id} value={h.id}>
                          {h.name} (Override)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>Breakfast (₹)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="1000"
                      required
                      value={formData.breakfastPrice}
                      onChange={(e) =>
                        setFormData({ ...formData, breakfastPrice: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Lunch (₹)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="1000"
                      required
                      value={formData.lunchPrice}
                      onChange={(e) =>
                        setFormData({ ...formData, lunchPrice: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Dinner (₹)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="1000"
                      required
                      value={formData.dinnerPrice}
                      onChange={(e) =>
                        setFormData({ ...formData, dinnerPrice: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Effective From</Label>
                  <Input
                    type="date"
                    required
                    value={formData.effectiveFrom}
                    onChange={(e) =>
                      setFormData({ ...formData, effectiveFrom: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Prices cannot be backdated. Must be today or future.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save Pricing"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border border-zinc-200/50">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Effective Date</TableHead>
              <TableHead>Target</TableHead>
              <TableHead className="text-right">Breakfast</TableHead>
              <TableHead className="text-right">Lunch</TableHead>
              <TableHead className="text-right">Dinner</TableHead>
              <TableHead className="text-right">Set By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No pricing history found.
                </TableCell>
              </TableRow>
            ) : (
              history.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">
                    {format(new Date(record.effectiveFrom), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>{record.hostel ? record.hostel.name : "All Hostels"}</TableCell>
                  <TableCell className="text-right">
                    ₹{(record.breakfastPricePaise / 100).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    ₹{(record.lunchPricePaise / 100).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    ₹{(record.dinnerPricePaise / 100).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {record.createdByUser.firstName} {record.createdByUser.lastName}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
