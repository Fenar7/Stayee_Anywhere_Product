import { Landmark } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";

export function InitialPaymentForm({
  hostel,
  paymentConfig,
  remainingBalance,
  onSuccess,
  onError
}: {
  hostel: { id: string; name: string } | null;
  paymentConfig: import("@prisma/client").HostelPaymentConfig | null;
  remainingBalance: number;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [paymentMode, setPaymentMode] = useState<"UPI" | "CASH">("UPI");
  const [amountPaid, setAmountPaid] = useState("");
  const [transactionRefNo, setTransactionRefNo] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!screenshotFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(screenshotFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [screenshotFile]);

  const handleUploadReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMode === "UPI" && !screenshotFile) {
      onError("Please select your receipt screenshot file");
      return;
    }
    if (!amountPaid || parseFloat(amountPaid) <= 0) {
      onError("Please provide a valid payment amount");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("paymentMode", paymentMode);
      if (screenshotFile) {
        formData.append("screenshot", screenshotFile);
      }
      formData.append("amountPaid", amountPaid);
      formData.append("transactionRefNo", transactionRefNo);

      const response = await fetch("/api/tenant/payment/screenshot", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to submit payment");
      }

      onSuccess(
        paymentMode === "CASH"
          ? "Cash payment submitted successfully! Your warden will verify it shortly."
          : "Receipt uploaded successfully! Your warden will verify this payment shortly."
      );
      setAmountPaid("");
      setTransactionRefNo("");
      setScreenshotFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) { const errMsg = err instanceof Error ? err.message : String(err);
      onError(errMsg || "An error occurred while submitting payment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" /> Step 1: Choose Payment Method
        </h2>

        <div className="flex gap-2 p-1 rounded-lg bg-muted/30 w-fit">
          <button
            type="button"
            onClick={() => { setPaymentMode("UPI"); setScreenshotFile(null); setPreviewUrl(null); }}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${paymentMode === "UPI" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            UPI Payment
          </button>
          <button
            type="button"
            onClick={() => { setPaymentMode("CASH"); setScreenshotFile(null); setPreviewUrl(null); }}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${paymentMode === "CASH" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Cash Payment
          </button>
        </div>

        {paymentMode === "UPI" ? (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your profile has been approved! Please transfer the required booking deposit to the hostel account below via any UPI app (GPay, PhonePay, Paytm, etc.).
            </p>
            <div className="rounded-lg border p-4 bg-muted/10 grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block uppercase">UPI ID</span>
                <span className="font-bold text-foreground">{paymentConfig?.upiId || "payments@anywherenode.com"}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block uppercase">Hostel Merchant Name</span>
                <span className="font-bold text-foreground">{hostel?.name}</span>
              </div>
              {paymentConfig?.qrCodePath && (
                <div className="sm:col-span-2 flex justify-center pt-2">
                  <img src={paymentConfig.qrCodePath} alt="UPI QR Code" className="h-40 w-40 object-contain rounded-lg border" />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-lg border p-6 bg-muted/10 text-center space-y-3">
            <Landmark className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your profile has been approved! You can pay the booking deposit in cash at the hostel reception.
            </p>
            <p className="text-xs text-muted-foreground">
              After making the cash payment, submit the details below so the warden can verify and confirm your booking.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" /> Step 2: Submit Payment Details
        </h2>
        <p className="text-xs text-muted-foreground">
          {paymentMode === "UPI"
            ? "Once the transfer is complete, please upload the transaction receipt screenshot below to request Warden verification."
            : "Enter the cash payment amount below to notify the warden for verification."}
        </p>

        <form onSubmit={handleUploadReceipt} className="space-y-4 text-sm mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold">Amount Paid (₹)</label>
              <input
                type="number"
                step="0.01"
                placeholder={remainingBalance.toString()}
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="mt-1 flex h-9 w-full rounded border bg-transparent px-3 py-1.5 text-xs focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold">Transaction Reference UTR {paymentMode === "CASH" ? "(Optional)" : "(Optional)"}</label>
              <input
                type="text"
                placeholder={paymentMode === "CASH" ? "Cash receipt / note ref" : "UPI UTR number"}
                value={transactionRefNo}
                onChange={(e) => setTransactionRefNo(e.target.value)}
                className="mt-1 flex h-9 w-full rounded border bg-transparent px-3 py-1.5 text-xs focus:outline-none"
              />
            </div>
          </div>

          {paymentMode === "UPI" && (
            <div className="border border-dashed rounded-lg p-6 bg-muted/15 flex flex-col items-center justify-center gap-2">
              {screenshotFile && previewUrl ? (
                <div className="text-center space-y-2">
                  <img
                    src={previewUrl}
                    alt="Receipt preview"
                    className="max-h-40 rounded-lg object-contain mx-auto border"
                  />
                  <span className="font-bold text-xs max-w-xs truncate block">{screenshotFile.name}</span>
                  <Button type="button" variant="secondary" size="sm" onClick={() => { setScreenshotFile(null); setPreviewUrl(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>Remove</Button>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
                  <span className="text-xs font-medium block">Select transaction screenshot file</span>
                  <span className="text-[10px] text-muted-foreground block">JPG, JPEG or PNG (Max 5MB)</span>
                  <div className="relative inline-block mt-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      required
                    />
                    <Button type="button" size="sm">Browse Files</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {paymentMode === "CASH" ? "Submit Cash Payment" : "Submit Screenshot for Verification"}
          </Button>
        </form>
      </div>
    </>
  );
}
