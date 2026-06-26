"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notify } from "@/lib/toast";
import { Loader2, Upload, Copy, Landmark, Calendar, Utensils } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

function formatFoodPlan(plan: string) {
  if (plan === "BREAKFAST_ONLY") return "Breakfast Only";
  if (plan === "BREAKFAST_DINNER") return "Breakfast & Dinner";
  if (plan === "BLD") return "Breakfast, Lunch & Dinner";
  return plan.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatDateString(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PaymentForm({
  serviceRequestId,
  amount,
  typeLabel,
  hostelName,
  upiId,
  qrCodePath,
  foodPlan,
  durationDays,
  startDate,
  endDate,
}: {
  serviceRequestId: string;
  amount: number;
  typeLabel: string;
  hostelName: string;
  upiId: string | null;
  qrCodePath: string | null;
  foodPlan: string | null;
  durationDays: number | null;
  startDate: string | null;
  endDate: string | null;
}) {
  const router = useRouter();
  const [paymentMode, setPaymentMode] = useState<"UPI" | "CASH">("UPI");
  const [refNo, setRefNo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    if (selectedFile) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleCopyUPI = () => {
    const targetUpi = upiId || "payments@anywherenode.com";
    navigator.clipboard.writeText(targetUpi);
    notify.success("UPI ID copied to clipboard!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append("paymentMode", paymentMode);
      
      if (refNo) {
        formData.append("transactionRefNo", refNo);
      }
      if (paymentMode === "UPI" && file) {
        formData.append("screenshot", file);
      }

      const res = await fetch(`/api/tenant/service-requests/${serviceRequestId}/payment`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit payment details.");
      }

      notify.success("Payment details submitted successfully. Pending verification.");
      router.push("/tenant");
      router.refresh();
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-xl mx-auto shadow-xl ring-1 ring-border/50 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 overflow-hidden">
      <CardHeader className="text-center border-b bg-muted/20 pb-6">
        <CardTitle className="text-2xl font-extrabold tracking-tight">Pending Payment</CardTitle>
        <CardDescription className="text-muted-foreground mt-1">
          Complete the payment process for your {typeLabel}
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6 pt-6">
          {/* Service Request & Food Plan Details Summary */}
          {(foodPlan || durationDays || startDate || endDate) && (
            <div className="rounded-xl border p-4 bg-muted/10 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-4">
                {foodPlan && (
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
                      <Utensils className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase font-medium">Food Plan Type</span>
                      <span className="font-bold text-foreground">{formatFoodPlan(foodPlan)}</span>
                    </div>
                  </div>
                )}
                {durationDays && (
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase font-medium">Duration</span>
                      <span className="font-bold text-foreground">{durationDays} Days</span>
                    </div>
                  </div>
                )}
              </div>
              
              {(startDate || endDate) && (
                <div className="pt-2.5 border-t border-muted/50 grid grid-cols-2 gap-4">
                  {startDate && (
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase font-medium">Start Date</span>
                      <span className="font-bold text-foreground">{formatDateString(startDate)}</span>
                    </div>
                  )}
                  {endDate && (
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase font-medium">End Date</span>
                      <span className="font-bold text-foreground">{formatDateString(endDate)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Amount Box */}
          <div className="rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/50 p-5 text-center shadow-sm">
            <p className="text-xs font-bold text-orange-800 dark:text-orange-300 uppercase tracking-wider">Amount Due</p>
            <p className="text-4xl font-extrabold text-orange-600 dark:text-orange-400 mt-1">
              ₹{amount.toLocaleString("en-IN")}
            </p>
          </div>

          {/* Payment Mode Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-bold">Choose Payment Method</Label>
            <div className="flex gap-2 p-1 rounded-lg bg-muted/30 w-fit">
              <button
                type="button"
                onClick={() => { setPaymentMode("UPI"); setFile(null); setPreviewUrl(null); }}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  paymentMode === "UPI" 
                    ? "bg-orange-600 text-white shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                UPI Payment
              </button>
              <button
                type="button"
                onClick={() => { setPaymentMode("CASH"); setFile(null); setPreviewUrl(null); }}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  paymentMode === "CASH" 
                    ? "bg-orange-600 text-white shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Cash Payment
              </button>
            </div>
          </div>

          {paymentMode === "UPI" ? (
            /* UPI payment details block */
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Landmark className="h-4 w-4 text-primary" /> Step 1: Transfer via UPI
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Transfer the exact amount above to the hostel's merchant account using any UPI app (GPay, PhonePe, Paytm, etc.).
              </p>
              
              <div className="rounded-lg border p-4 bg-muted/10 grid gap-3 sm:grid-cols-2 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-medium">UPI ID</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-bold text-foreground break-all">
                      {upiId || "payments@anywherenode.com"}
                    </span>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 shrink-0" 
                      onClick={handleCopyUPI}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-medium">Hostel Merchant Name</span>
                  <span className="font-bold text-foreground block mt-1">{hostelName}</span>
                </div>
                {qrCodePath && (
                  <div className="sm:col-span-2 flex flex-col items-center justify-center pt-2 border-t mt-2">
                    <span className="text-[10px] text-muted-foreground block uppercase font-medium mb-2">Scan QR Code to Pay</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={qrCodePath} 
                      alt="UPI QR Code" 
                      className="h-36 w-36 object-contain rounded-lg border bg-white p-1" 
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Cash payment details block */
            <div className="rounded-xl border bg-card p-5 text-center space-y-3">
              <Landmark className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm font-semibold text-foreground">Cash Payment Selected</p>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
                Please pay the cash at the hostel reception. After paying, click "Submit Payment" below to notify your warden to verify and activate your request.
              </p>
            </div>
          )}

          {/* Step 2: Submit details (Optional fields) */}
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Upload className="h-4 w-4 text-primary" /> Step {paymentMode === "UPI" ? "2" : "1"}: Submit Payment Details
            </h3>
            <p className="text-xs text-muted-foreground">
              {paymentMode === "UPI" 
                ? "Once the transfer is complete, enter the UPI transaction ref (UTR) and upload the receipt screenshot (both are optional; your warden can verify manually if left blank)." 
                : "Enter the cash receipt number or payment note below (optional)."}
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="refNo" className="text-xs font-semibold">
                  Transaction Ref No / Receipt No <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Input 
                  id="refNo" 
                  placeholder={paymentMode === "UPI" ? "e.g. 12-digit UPI UTR number" : "e.g. Cash Receipt Ref"} 
                  value={refNo} 
                  onChange={(e) => setRefNo(e.target.value)} 
                  className="bg-background shadow-sm text-xs h-9"
                />
              </div>

              {paymentMode === "UPI" && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">
                    Payment Screenshot <span className="text-muted-foreground font-normal">(Optional)</span>
                  </Label>
                  
                  <div className="border border-dashed rounded-lg p-5 bg-muted/5 flex flex-col items-center justify-center gap-2">
                    {file && previewUrl ? (
                      <div className="text-center space-y-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewUrl}
                          alt="Receipt preview"
                          className="max-h-36 rounded-lg object-contain mx-auto border bg-background"
                        />
                        <span className="font-semibold text-xs max-w-xs truncate block">{file.name}</span>
                        <Button 
                          type="button" 
                          variant="secondary" 
                          size="sm" 
                          className="h-7 text-xs"
                          onClick={() => { 
                            setFile(null); 
                            setPreviewUrl(null); 
                            if (fileInputRef.current) fileInputRef.current.value = ""; 
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center space-y-2">
                        <Upload className="h-6 w-6 text-muted-foreground mx-auto" />
                        <span className="text-xs font-semibold block">Select transaction screenshot</span>
                        <span className="text-[10px] text-muted-foreground block">JPG, JPEG or PNG (Max 5MB)</span>
                        <div className="relative inline-block mt-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <Button type="button" size="sm" variant="outline" className="h-8 text-xs">
                            Browse Files
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>

        <CardFooter className="bg-muted/10 border-t pt-4">
          <Button 
            type="submit" 
            className="w-full font-bold shadow-sm h-11 text-sm bg-orange-600 hover:bg-orange-700 text-white" 
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {paymentMode === "CASH" ? "Submit Cash Payment Notice" : "Submit Payment details"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
