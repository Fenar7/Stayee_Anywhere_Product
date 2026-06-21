"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, Upload, CheckCircle, AlertCircle, FileText, Landmark, Key, Clock, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

interface PaymentItem {
  id: string;
  amountPaid: number;
  paymentMode: string;
  transactionRefNo: string | null;
  paymentStatus: string;
  createdAt: string;
}

interface StayDetails {
  id: string;
  status: string;
  durationType: string;
  joiningDate: string;
  endDate: string;
  admissionFee: number;
  monthlyRent: number;
  securityDeposit: number;
  foodCharges: number;
  foodPlan: string;
  totalPayable: number;
  discount: number;
}

interface HostelDetails {
  id: string;
  name: string;
  address: string;
}

interface BedDetails {
  id: string;
  label: string;
  roomNumber: string;
  sharingType: string;
}

export default function TenantDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Data
  const [stay, setStay] = useState<StayDetails | null>(null);
  const [hostel, setHostel] = useState<HostelDetails | null>(null);
  const [bed, setBed] = useState<BedDetails | null>(null);
  const [payments, setPayments] = useState<PaymentItem[]>([]);

  // Form states
  const [amountPaid, setAmountPaid] = useState("");
  const [transactionRefNo, setTransactionRefNo] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);

  const fetchStayDetails = async () => {
    try {
      const response = await fetch("/api/tenant/stay");
      if (!response.ok) {
        throw new Error("Failed to load dashboard details");
      }
      const data = await response.json();
      setStay(data.stay);
      setHostel(data.hostel);
      setBed(data.bed);
      setPayments(data.payments || []);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStayDetails();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const handleUploadReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screenshotFile) {
      setError("Please select your receipt screenshot file");
      return;
    }
    if (!amountPaid || parseFloat(amountPaid) <= 0) {
      setError("Please provide a valid payment amount");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      const formData = new FormData();
      formData.append("screenshot", screenshotFile);
      formData.append("amountPaid", amountPaid);
      formData.append("transactionRefNo", transactionRefNo);

      const response = await fetch("/api/tenant/payment/screenshot", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to submit screenshot");
      }

      setSuccessMsg("Receipt uploaded successfully! Your warden will verify this payment shortly.");
      setAmountPaid("");
      setTransactionRefNo("");
      setScreenshotFile(null);
      await fetchStayDetails();
    } catch (err: any) {
      setError(err.message || "An error occurred while uploading screenshot");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium">Loading your portal dashboard...</p>
        </div>
      </div>
    );
  }

  const verifiedPaid = payments
    .filter((p) => p.paymentStatus === "PAID" || p.paymentStatus === "PARTIALLY_PAID")
    .reduce((sum, p) => sum + p.amountPaid, 0);

  const remainingBalance = stay ? stay.totalPayable - verifiedPaid : 0;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Header bar */}
      <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">NextHome Portal</span>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary font-semibold">Tenant</span>
          </div>
          <Button onClick={handleLogout} variant="ghost" size="sm" className="flex items-center gap-2">
            <LogOut className="h-4 w-4" /> Log Out
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive max-w-xl">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-500/10 p-4 text-sm text-green-600 max-w-xl dark:border-green-900/30">
            <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>{successMsg}</div>
          </div>
        )}

        {/* CASE A: No active stays or onboarding request */}
        {!stay ? (
          <div className="max-w-md mx-auto border rounded-xl bg-card p-8 shadow-sm text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground text-xl">
              🏠
            </div>
            <h2 className="text-xl font-bold">Welcome to NextHome!</h2>
            <p className="text-sm text-muted-foreground">
              You are currently logged in, but there is no active stay registered for your account. Please contact your hostel warden to initiate onboarding.
            </p>
          </div>
        ) : stay.status === "ONBOARDING_PENDING" ? (
          /* CASE B: Awaiting Warden Review */
          <div className="max-w-2xl mx-auto border rounded-xl bg-card p-8 shadow-md text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-500">
              <Clock className="h-10 w-10 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Application Under Review</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Thank you! Your profile documents and self-registration details have been submitted.
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                Hostel: {hostel?.name} &middot; Bed: {bed?.roomNumber}-{bed?.label}
              </div>
            </div>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Warden review is pending. We will enable the payment portal as soon as the warden approves your registration. Please stay tuned!
            </p>
          </div>
        ) : stay.status === "APPROVED_AWAITING_PAYMENT" ? (
          /* CASE C: Approved & awaiting payment (Primary focus of Sprint 2.3) */
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Payment Details / Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* UPI info */}
              <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-primary" /> Step 1: Transfer Payment
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your profile has been approved! Please transfer the required booking deposit to the hostel account below via any UPI app (GPay, PhonePe, Paytm, etc.).
                </p>
                <div className="rounded-lg border p-4 bg-muted/10 grid gap-4 sm:grid-cols-2 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block uppercase">UPI ID</span>
                    <span className="font-bold text-foreground">payment@nexthome</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block uppercase">Hostel Merchant Name</span>
                    <span className="font-bold text-foreground">{hostel?.name}</span>
                  </div>
                </div>
              </div>

              {/* Upload Form */}
              <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" /> Step 2: Upload Screenshot
                </h2>
                <p className="text-xs text-muted-foreground">
                  Once the transfer is complete, please upload the transaction receipt screenshot below to request Warden verification.
                </p>

                <form onSubmit={handleUploadReceipt} className="space-y-4 text-sm mt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold">Amount Transferred (₹)</label>
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
                      <label className="text-xs font-semibold">Transaction Reference UTR (Optional)</label>
                      <input
                        type="text"
                        placeholder="UPI UTR number"
                        value={transactionRefNo}
                        onChange={(e) => setTransactionRefNo(e.target.value)}
                        className="mt-1 flex h-9 w-full rounded border bg-transparent px-3 py-1.5 text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="border border-dashed rounded-lg p-6 bg-muted/15 flex flex-col items-center justify-center gap-2">
                    {screenshotFile ? (
                      <div className="text-center space-y-2">
                        <FileText className="h-8 w-8 text-primary mx-auto" />
                        <span className="font-bold text-xs max-w-xs truncate block">{screenshotFile.name}</span>
                        <Button type="button" variant="secondary" size="xs" onClick={() => setScreenshotFile(null)}>Remove</Button>
                      </div>
                    ) : (
                      <div className="text-center space-y-2">
                        <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
                        <span className="text-xs font-medium block">Select transaction screenshot file</span>
                        <span className="text-[10px] text-muted-foreground block">JPG, JPEG or PNG (Max 5MB)</span>
                        <div className="relative inline-block mt-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            required
                          />
                          <Button type="button" size="xs">Browse Files</Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Submit Screenshot for Verification
                  </Button>
                </form>
              </div>
            </div>

            {/* Bill Summary Sidebar */}
            <div className="space-y-6">
              <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-lg border-b pb-2">Stay Billing</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hostel:</span>
                    <span className="font-bold">{hostel?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bed:</span>
                    <span className="font-semibold">{bed?.roomNumber} - {bed?.label}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Admission Fee:</span>
                    <span>₹ {stay.admissionFee.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stay Rent:</span>
                    <span>₹ {stay.monthlyRent.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Security Deposit:</span>
                    <span>₹ {stay.securityDeposit.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Food Charges:</span>
                    <span>₹ {stay.foodCharges.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Discount Applied:</span>
                    <span>- ₹ {stay.discount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-bold text-base">
                    <span>Total Due:</span>
                    <span className="text-primary">₹ {stay.totalPayable.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2 text-xs border-dashed">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Verified Paid:</span>
                    <span>₹ {verifiedPaid.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-primary font-bold text-sm">
                    <span>Remaining Due:</span>
                    <span>₹ {remainingBalance.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* Upload history */}
              {payments.length > 0 && (
                <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-base border-b pb-2">Upload History</h3>
                  <div className="space-y-3">
                    {payments.map((pmt) => (
                      <div key={pmt.id} className="border rounded p-3 text-xs flex justify-between items-center bg-muted/10">
                        <div>
                          <p className="font-bold">₹ {pmt.amountPaid.toLocaleString("en-IN")}</p>
                          <p className="text-[10px] text-muted-foreground">{formatDate(pmt.createdAt)}</p>
                        </div>
                        <div>
                          {pmt.paymentStatus === "PENDING" ? (
                            <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-[9px] font-bold text-yellow-800 uppercase dark:bg-yellow-900/30 dark:text-yellow-400">Verifying</span>
                          ) : pmt.paymentStatus === "PAID" ? (
                            <span className="rounded bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-green-800 uppercase dark:bg-green-900/30 dark:text-green-400">Verified</span>
                          ) : (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 uppercase dark:bg-amber-900/30 dark:text-amber-400">Partial</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* CASE D: Active Resident */
          <div className="max-w-2xl mx-auto border rounded-xl bg-card p-8 shadow-md text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-500">
              <Key className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Active Stay Dashboard</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Welcome to your NextHome Stay! Your profile is verified, payments are settled, and stay is fully active.
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-400">
                Hostel: {hostel?.name} &middot; Room: {bed?.roomNumber} &middot; Bed: {bed?.label}
              </div>
            </div>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Full Tenant Portal stay parameters, payments ledgers, affidavits download, and daily food order management will be built in **Phase 3 (Tenant Portal &amp; Stays)**. Have a wonderful stay!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
