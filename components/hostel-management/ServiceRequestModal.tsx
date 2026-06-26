"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, ExternalLink, Copy } from "lucide-react";

export function ServiceRequestModal({ stayId, tenantPhone }: { stayId: string; tenantPhone?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [foodType, setFoodType] = useState("BREAKFAST_DINNER");
  const [duration, setDuration] = useState("30");
  const [amount, setAmount] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [generatedLink, setGeneratedLink] = useState("");
  const [paymentLink, setPaymentLink] = useState("");

  const getEndDate = (start: string, daysStr: string) => {
    if (!start || !daysStr) return "";
    const days = parseInt(daysStr, 10);
    if (isNaN(days) || days <= 0) return "";
    const date = new Date(start);
    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0];
  };

  const endDate = getEndDate(startDate, duration);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/warden/stays/${stayId}/service-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "FOOD_PLAN_UPGRADE",
          amount: parseFloat(amount),
          metadata: {
            foodPlan: foodType,
            days: parseInt(duration, 10),
            startDate,
            endDate,
          },
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create service request");
      }

      const data = await res.json();
      
      toast.success("Service request initiated successfully!");
      router.refresh();
      
      // Deep link to exact service request
      const siteUrl = window.location.origin;
      const exactPaymentLink = `${siteUrl}/tenant/service-requests/${data.serviceRequest.id}`;
      setPaymentLink(exactPaymentLink);

      const text = `Hi, your request for a Food Plan Upgrade (${foodType.replace("_", " ")}) for ${duration} days (from ${startDate} to ${endDate}) has been initiated. Please pay ₹${amount} and upload proof here: ${exactPaymentLink}`;
      
      if (tenantPhone) {
        let phoneNum = tenantPhone.replace(/[^0-9]/g, "");
        if (phoneNum.length === 10) {
          phoneNum = `91${phoneNum}`;
        }
        const whatsappUrl = `https://wa.me/${phoneNum}?text=${encodeURIComponent(text)}`;
        setGeneratedLink(whatsappUrl);
      }

    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (!v) {
        setGeneratedLink("");
        setPaymentLink("");
      }
    }}>
      <DialogTrigger className="w-full mt-3 flex items-center justify-center rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
        <Plus className="h-4 w-4 mr-2" /> Upgrade Food Plan
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Initiate Food Plan Upgrade</DialogTitle>
        </DialogHeader>

        {!generatedLink && !paymentLink ? (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Food Plan Type</Label>
              <Select value={foodType} onValueChange={(v) => v && setFoodType(v)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BREAKFAST_ONLY">Breakfast Only</SelectItem>
                  <SelectItem value="BREAKFAST_DINNER">Breakfast & Dinner</SelectItem>
                  <SelectItem value="BLD">Breakfast, Lunch & Dinner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Duration (Days)</Label>
              <Input 
                type="number" 
                min="1" 
                value={duration} 
                onChange={(e) => setDuration(e.target.value)} 
                required 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input 
                  type="date" 
                  value={endDate} 
                  disabled 
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input 
                type="number" 
                min="1" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                required 
                placeholder="e.g. 1500"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Initiate Request
            </Button>
          </form>
        ) : (
          <div className="space-y-6 mt-4 text-center">
            <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
              <p className="font-semibold">Request Created!</p>
              <p className="text-sm mt-1">Send the payment link to the tenant.</p>
            </div>
            
            <div className="flex flex-col gap-3">
              {generatedLink ? (
                <Button 
                  className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white" 
                  onClick={() => {
                    window.open(generatedLink, "_blank");
                    setOpen(false);
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Send via WhatsApp
                </Button>
              ) : (
                <div className="p-3 bg-amber-50 text-amber-800 text-sm rounded-lg border border-amber-200">
                  No valid phone number found for this tenant to send a WhatsApp message.
                </div>
              )}
              
              <Button 
                variant="outline"
                className="w-full" 
                onClick={() => {
                  navigator.clipboard.writeText(paymentLink);
                  toast.success("Link copied to clipboard!");
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Payment Link
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
