import { Landmark, Upload, Loader2, CheckCircle2, QrCode } from "lucide-react";
import { useState, useRef } from "react";

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setScreenshotFile(file);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };

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
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      onError(errMsg || "An error occurred while submitting payment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Step 1: Choose Payment Method ── */}
      <div className="bg-white dark:bg-[#121212] border border-[#f0f0f0] dark:border-white/10 rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-black dark:text-white flex items-center gap-2">
            <Landmark className="h-5 w-5 text-emerald-500" /> Step 1: Choose Payment Method
          </h2>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            Instant Verification
          </span>
        </div>

        {/* Mode Selector Segmented Tabs */}
        <div className="flex gap-2 p-1.5 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200/50 dark:border-white/10">
          <button
            type="button"
            onClick={() => { setPaymentMode("UPI"); setScreenshotFile(null); setPreviewUrl(null); }}
            className={`flex-1 py-3 px-4 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
              paymentMode === "UPI"
                ? "bg-black dark:bg-[#58ff48] text-white dark:text-black shadow-md scale-[1.02]"
                : "text-gray-500 hover:text-black dark:hover:text-white font-medium"
            }`}
          >
            <QrCode className="w-4 h-4" /> UPI Payment
          </button>
          <button
            type="button"
            onClick={() => { setPaymentMode("CASH"); setScreenshotFile(null); setPreviewUrl(null); }}
            className={`flex-1 py-3 px-4 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
              paymentMode === "CASH"
                ? "bg-black dark:bg-[#58ff48] text-white dark:text-black shadow-md scale-[1.02]"
                : "text-gray-500 hover:text-black dark:hover:text-white font-medium"
            }`}
          >
            <Landmark className="w-4 h-4" /> Cash Payment
          </button>
        </div>

        {paymentMode === "UPI" ? (
          <div className="space-y-4 pt-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Transfer the initial deposit to the hostel account below via any UPI App (GPay, PhonePe, Paytm, etc.).
            </p>
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 p-5 bg-gray-50/50 dark:bg-white/[0.02] grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Hostel UPI ID</span>
                <span className="font-bold text-black dark:text-white text-sm select-all bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3 py-1.5 rounded-lg inline-block">
                  {paymentConfig?.upiId || "payments@anywherenode.com"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Merchant Name</span>
                <span className="font-bold text-black dark:text-white text-sm block pt-1">
                  {hostel?.name || "Hostel Reception"}
                </span>
              </div>
              {paymentConfig?.qrCodePath && (
                <div className="sm:col-span-2 flex justify-center pt-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={paymentConfig.qrCodePath} alt="UPI QR Code" className="h-44 w-44 object-contain rounded-2xl border border-gray-200 dark:border-white/10 p-2 bg-white" />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-500/20 p-5 bg-amber-500/5 text-center space-y-2">
            <Landmark className="h-8 w-8 text-amber-500 mx-auto mb-1" />
            <p className="text-xs font-semibold text-black dark:text-white leading-relaxed">
              Pay in cash at the hostel reception counter.
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Submit your payment details below so the warden can instantly verify and activate your stay.
            </p>
          </div>
        )}
      </div>

      {/* ── Step 2: Submit Payment Details ── */}
      <div className="bg-white dark:bg-[#121212] border border-[#f0f0f0] dark:border-white/10 rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-5">
        <h2 className="text-base font-bold text-black dark:text-white flex items-center gap-2">
          <Upload className="h-5 w-5 text-emerald-500" /> Step 2: Submit Payment Details
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {paymentMode === "UPI"
            ? "Once payment is complete, upload your transfer screenshot below."
            : "Enter the cash amount paid at the counter to notify the warden."}
        </p>

        <form onSubmit={handleUploadReceipt} className="space-y-4 text-xs">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider block mb-1.5">
                Amount Paid (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                placeholder={remainingBalance ? remainingBalance.toString() : "4000"}
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full h-12 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 text-sm font-semibold text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-[#58ff48] transition-colors"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider block mb-1.5">
                Transaction Reference UTR <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder={paymentMode === "CASH" ? "Receipt No / Counter Note" : "12-digit UPI UTR No"}
                value={transactionRefNo}
                onChange={(e) => setTransactionRefNo(e.target.value)}
                className="w-full h-12 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 text-sm font-semibold text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-[#58ff48] transition-colors"
              />
            </div>
          </div>

          {paymentMode === "UPI" && (
            <div className="border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl p-6 bg-gray-50/50 dark:bg-white/[0.02] flex flex-col items-center justify-center gap-2">
              {screenshotFile && previewUrl ? (
                <div className="text-center space-y-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Receipt preview"
                    className="max-h-44 rounded-xl object-contain mx-auto border border-gray-200 dark:border-white/10"
                  />
                  <span className="font-semibold text-xs max-w-xs truncate block text-black dark:text-white">{screenshotFile.name}</span>
                  <button
                    type="button"
                    onClick={() => { setScreenshotFile(null); setPreviewUrl(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="text-xs font-bold text-red-500 hover:text-red-600 underline"
                  >
                    Remove File
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto" />
                  <span className="text-xs font-bold block text-black dark:text-white">Upload Payment Screenshot</span>
                  <span className="text-[11px] text-gray-400 block">JPG, JPEG or PNG (Max 5MB)</span>
                  <div className="relative inline-block mt-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      required
                    />
                    <button
                      type="button"
                      className="px-5 py-2.5 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-black dark:text-white font-bold text-xs rounded-xl transition-colors"
                    >
                      Browse Files
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-14 rounded-full bg-black dark:bg-[#58ff48] text-white dark:text-black hover:opacity-90 font-bold text-[15px] flex items-center justify-center gap-2 transition-all duration-200 shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                {paymentMode === "CASH" ? "Submit Cash Payment Details" : "Submit Receipt for Verification"}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
