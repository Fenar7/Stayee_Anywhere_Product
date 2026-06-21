"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2, CreditCard, Upload, CheckCircle, AlertCircle,
  FileText, Landmark, Clock, LogOut, Users,
  CalendarDays, Building2, BedSingle, UtensilsCrossed
} from "lucide-react";
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

interface RoommateDetails {
  fullName: string;
  photoUrl: string | null;
  occupationType: string;
  collegeName: string | null;
  companyName: string | null;
  designation: string | null;
  bedLabel: string;
}

interface ApiResponse {
  stay: StayDetails | null;
  hostel: HostelDetails | null;
  bed: BedDetails | null;
  payments: PaymentItem[];
  roommates: RoommateDetails[];
  nextDueDate: string | null;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function RoommateAvatar({ photoUrl, fullName }: { photoUrl: string | null; fullName: string }) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={fullName}
        className="h-10 w-10 rounded-full object-cover border-2 border-border"
      />
    );
  }
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary border-2 border-border">
      {initials}
    </div>
  );
}

export default function TenantDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [stay, setStay] = useState<StayDetails | null>(null);
  const [hostel, setHostel] = useState<HostelDetails | null>(null);
  const [bed, setBed] = useState<BedDetails | null>(null);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [roommates, setRoommates] = useState<RoommateDetails[]>([]);
  const [nextDueDate, setNextDueDate] = useState<string | null>(null);

  const [amountPaid, setAmountPaid] = useState("");
  const [transactionRefNo, setTransactionRefNo] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStayDetails = async () => {
    try {
      const response = await fetch("/api/tenant/stay");
      if (!response.ok) {
        throw new Error("Failed to load dashboard details");
      }
      const data: ApiResponse = await response.json();
      setStay(data.stay);
      setHostel(data.hostel);
      setBed(data.bed);
      setPayments(data.payments || []);
      setRoommates(data.roommates || []);
      setNextDueDate(data.nextDueDate || null);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStayDetails();
  }, []);

  useEffect(() => {
    if (!screenshotFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(screenshotFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [screenshotFile]);

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
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
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
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-primary" /> Step 1: Transfer Payment
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your profile has been approved! Please transfer the required booking deposit to the hostel account below via any UPI app (GPay, PhonePay, Paytm, etc.).
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
                    {screenshotFile && previewUrl ? (
                      <div className="text-center space-y-2">
                        <img
                          src={previewUrl}
                          alt="Receipt preview"
                          className="max-h-40 rounded-lg object-contain mx-auto border"
                        />
                        <span className="font-bold text-xs max-w-xs truncate block">{screenshotFile.name}</span>
                        <Button type="button" variant="secondary" size="xs" onClick={() => { setScreenshotFile(null); setPreviewUrl(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>Remove</Button>
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
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" /> Current Stay Details
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 text-sm">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground block">Hostel</span>
                    <span className="font-semibold">{hostel?.name || "—"}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground block">Room</span>
                    <span className="font-semibold flex items-center gap-1">
                      <BedSingle className="h-3.5 w-3.5 text-muted-foreground" />
                      {bed?.roomNumber} – {bed?.label} ({bed?.sharingType})
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground block">Duration Type</span>
                    <span className="font-semibold">{stay.durationType}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground block">Monthly Rent</span>
                    <span className="font-semibold">₹ {stay.monthlyRent.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground block">Security Deposit</span>
                    <span className="font-semibold">₹ {stay.securityDeposit.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground block">Food Plan</span>
                    <span className="font-semibold flex items-center gap-1">
                      <UtensilsCrossed className="h-3.5 w-3.5 text-muted-foreground" />
                      {stay.foodPlan?.replace(/_/g, " ") || "Not Included"}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground block">Joining Date</span>
                    <span className="font-semibold flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatDate(stay.joiningDate)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground block">Check-out Date</span>
                    <span className="font-semibold flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatDate(stay.endDate)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Roommates
                </h2>
                {roommates.length > 0 ? (
                  <div className="space-y-3">
                    {roommates.map((rm, idx) => (
                      <div key={idx} className="flex items-center gap-3 rounded-lg border p-3 bg-muted/10">
                        <RoommateAvatar photoUrl={rm.photoUrl} fullName={rm.fullName} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{rm.fullName}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {rm.occupationType === "STUDENT"
                              ? `Student at ${rm.collegeName || "—"}`
                              : `Working at ${rm.companyName || "—"}${rm.designation ? ` as ${rm.designation}` : ""}`}
                          </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">Bed {rm.bedLabel}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No roommates currently registered in your room.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-6">
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
                        placeholder="UPI UTR number"
                        value={transactionRefNo}
                        onChange={(e) => setTransactionRefNo(e.target.value)}
                        className="mt-1 flex h-9 w-full rounded border bg-transparent px-3 py-1.5 text-xs focus:outline-none"
                      />
                    </div>

                    <div className="border border-dashed rounded-lg p-4 bg-muted/15 flex flex-col items-center justify-center gap-2">
                      {screenshotFile && previewUrl ? (
                        <div className="text-center space-y-1">
                          <img
                            src={previewUrl}
                            alt="Receipt preview"
                            className="max-h-24 rounded object-contain mx-auto border"
                          />
                          <span className="font-bold text-[10px] max-w-32 truncate block">{screenshotFile.name}</span>
                          <Button type="button" variant="secondary" size="xs" onClick={() => { setScreenshotFile(null); setPreviewUrl(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>Remove</Button>
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
                            <Button type="button" size="xs">Browse</Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <Button type="submit" disabled={submitting} className="w-full" size="sm">
                      {submitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
                      Submit Payment
                    </Button>
                  </form>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" /> Ledger History
                </h2>
                {payments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left pb-2 font-semibold">Amount</th>
                          <th className="text-left pb-2 font-semibold">Date</th>
                          <th className="text-left pb-2 font-semibold hidden sm:table-cell">UTR</th>
                          <th className="text-right pb-2 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((pmt) => (
                          <tr key={pmt.id} className="border-b last:border-0">
                            <td className="py-2.5 font-semibold">₹ {pmt.amountPaid.toLocaleString("en-IN")}</td>
                            <td className="py-2.5 text-muted-foreground">{formatDate(pmt.createdAt)}</td>
                            <td className="py-2.5 text-muted-foreground hidden sm:table-cell max-w-24 truncate">{pmt.transactionRefNo || "—"}</td>
                            <td className="py-2.5 text-right">
                              <span
                                className={
                                  pmt.paymentStatus === "PENDING"
                                    ? "inline-block rounded-full bg-yellow-100 px-2 py-0.5 text-[9px] font-bold text-yellow-800 uppercase dark:bg-yellow-900/30 dark:text-yellow-400"
                                    : pmt.paymentStatus === "PAID"
                                    ? "inline-block rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-bold text-green-800 uppercase dark:bg-green-900/30 dark:text-green-400"
                                    : "inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800 uppercase dark:bg-amber-900/30 dark:text-amber-400"
                                }
                              >
                                {pmt.paymentStatus === "PENDING" ? "Verifying" : pmt.paymentStatus === "PAID" ? "Settled" : "Partial"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">No payment records found.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
