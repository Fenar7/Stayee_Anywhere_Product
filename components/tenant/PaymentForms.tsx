"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CreditCard, Clock } from "lucide-react";

export function PaymentUploadForm({
  remainingBalance,
  onSuccess,
  onError,
  title = "Step 2: Submit Payment Details",
  description
}: {
  remainingBalance: number;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  title?: string;
  description?: string;
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
    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <Upload className="h-5 w-5 text-primary" /> {title}
      </h2>
      <p className="text-xs text-muted-foreground">
        {description || (paymentMode === "UPI"
          ? "Once the transfer is complete, please upload the transaction receipt screenshot below to request Warden verification."
          : "Enter the cash payment amount below to notify the warden for verification.")}
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
  );
}

export function RentRenewalForm({
  stay,
  paymentConfig,
  nextDueDate,
  formatDate,
  onSuccess,
  onError
}: {
  stay: any;
  paymentConfig: any;
  nextDueDate: string | null;
  formatDate: (dateStr: string) => string;
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
    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-primary" /> Rent Renewal
      </h2>
      {nextDueDate ? (
        <div className="rounded-lg bg-muted/20 p-3 text-sm space-y-1">
          <span className="text-xs text-muted-foreground block">Next Rent Due Date</span>
          <span className="font-bold text-base flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-primary" />
            {formatDate(nextDueDate)}
          </span>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Due date calculation not available for your stay type.</p>
      )}

      <div className="border-t pt-4">
        <div className="mb-3 rounded-lg bg-primary/5 px-3 py-2 text-sm">
          <span className="text-xs text-muted-foreground">Expected Monthly Rent</span>
          <p className="font-bold text-primary">₹ {stay.monthlyRent.toLocaleString("en-IN")}</p>
        </div>

        <div className="flex gap-2 p-1 rounded-lg bg-muted/30 w-fit mb-4">
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

        {paymentMode === "UPI" && paymentConfig?.upiId && (
          <div className="rounded-lg border p-3 bg-muted/10 mb-4 text-xs">
            <span className="text-muted-foreground block">UPI ID</span>
            <span className="font-bold">{paymentConfig.upiId}</span>
            {paymentConfig.qrCodeUrl && (
              <img src={paymentConfig.qrCodeUrl} alt="QR" className="h-20 w-20 mt-2 object-contain rounded border" />
            )}
          </div>
        )}

        <form onSubmit={handleUploadReceipt} className="space-y-3 text-sm">
          <div>
            <label className="text-xs font-semibold">Amount Paid (₹)</label>
            <input
              type="number"
              step="0.01"
              placeholder="Enter amount"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              className="mt-1 flex h-9 w-full rounded border bg-transparent px-3 py-1.5 text-xs focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold">Transaction Reference (UTR)</label>
            <input
              type="text"
              placeholder={paymentMode === "CASH" ? "Cash receipt / note ref" : "UPI UTR number"}
              value={transactionRefNo}
              onChange={(e) => setTransactionRefNo(e.target.value)}
              className="mt-1 flex h-9 w-full rounded border bg-transparent px-3 py-1.5 text-xs focus:outline-none"
            />
          </div>

          {paymentMode === "UPI" && (
            <div className="border border-dashed rounded-lg p-4 bg-muted/15 flex flex-col items-center justify-center gap-2">
              {screenshotFile && previewUrl ? (
                <div className="text-center space-y-1">
                  <img
                    src={previewUrl}
                    alt="Receipt preview"
                    className="max-h-24 rounded object-contain mx-auto border"
                  />
                  <span className="font-bold text-[10px] max-w-32 truncate block">{screenshotFile.name}</span>
                  <Button type="button" variant="secondary" size="sm" onClick={() => { setScreenshotFile(null); setPreviewUrl(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>Remove</Button>
                </div>
              ) : (
                <div className="text-center space-y-1">
                  <Upload className="h-6 w-6 text-muted-foreground mx-auto" />
                  <span className="text-[10px] font-medium block">Receipt screenshot</span>
                  <div className="relative inline-block mt-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      required
                    />
                    <Button type="button" size="sm">Browse</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <Button type="submit" disabled={submitting} className="w-full" size="sm">
            {submitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
            {paymentMode === "CASH" ? "Submit Cash Payment" : "Submit Payment"}
          </Button>
        </form>
      </div>
    </div>
  );
}
