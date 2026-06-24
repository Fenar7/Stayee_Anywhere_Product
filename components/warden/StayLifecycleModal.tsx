"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  X,
  Clock,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileText,
  User,
  Utensils,
  Printer,
  Download
} from "lucide-react";

export function StayLifecycleModal({
  stayId,
  onClose,
  onSuccess
}: {
  stayId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [stay, setStay] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "extend" | "checkout">("details");

  // Extension Form States
  const [newEndDate, setNewEndDate] = useState("");
  const [additionalRent, setAdditionalRent] = useState("0");
  const [additionalFoodCharges, setAdditionalFoodCharges] = useState("0");

  // Early Checkout Form States
  const [checkoutDate, setCheckoutDate] = useState("");
  const [refundAmount, setRefundAmount] = useState("0");
  const [notes, setNotes] = useState("");

  // Days Calculation for Early Checkout
  const [daysInfo, setDaysInfo] = useState<{
    totalDays: number;
    daysUsed: number;
    daysRemaining: number;
    suggestedRefund: number;
  } | null>(null);

  // Print actions state
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState("");

  useEffect(() => {
    fetchStayDetails();
  }, [stayId]);

  const fetchStayDetails = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/warden/stays/${stayId}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load stay details");
      }
      const data = await res.json();
      setStay(data.stay);
      if (!data.stay.refundInvoices) {
        data.stay.refundInvoices = [];
      }

      const currentEnd = new Date(data.stay.endDate);
      const nextMonthEnd = new Date(currentEnd);
      nextMonthEnd.setMonth(nextMonthEnd.getMonth() + 1);
      setNewEndDate(nextMonthEnd.toISOString().split("T")[0]);

      const todayStr = new Date().toISOString().split("T")[0];
      setCheckoutDate(todayStr);
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!stay || activeTab !== "checkout" || !checkoutDate) return;

    const jDate = new Date(stay.joiningDate);
    const eDate = new Date(stay.endDate);
    const cDate = new Date(checkoutDate);

    if (cDate.getTime() < jDate.getTime() || cDate.getTime() >= eDate.getTime()) {
      setDaysInfo(null);
      return;
    }

    const msPerDay = 24 * 60 * 60 * 1000;
    const totalDays = Math.max(1, Math.round((eDate.getTime() - jDate.getTime()) / msPerDay));
    const daysUsed = Math.max(0, Math.round((cDate.getTime() - jDate.getTime()) / msPerDay));
    const daysRemaining = Math.max(0, totalDays - daysUsed);

    const verifiedPaid = stay.payments
      .filter((p: any) => p.paymentStatus === "PAID")
      .reduce((sum: number, p: any) => sum + p.amountPaid, 0);

    const proRataAmount = Math.max(0, verifiedPaid * (daysRemaining / totalDays));
    const suggestedRefund = parseFloat(proRataAmount.toFixed(2));

    setDaysInfo({
      totalDays,
      daysUsed,
      daysRemaining,
      suggestedRefund
    });
    setRefundAmount(suggestedRefund.toString());
  }, [checkoutDate, activeTab, stay]);

  const handleExtend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setActionError("");
    setActionSuccess("");

    try {
      const res = await fetch(`/api/warden/stays/${stayId}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newEndDate,
          additionalRent: parseFloat(additionalRent) || 0,
          additionalFoodCharges: parseFloat(additionalFoodCharges) || 0
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to extend stay");

      setActionSuccess("Stay extended successfully!");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setActionError(err.message || "Failed to process extension");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setActionError("");
    setActionSuccess("");

    try {
      const res = await fetch(`/api/warden/stays/${stayId}/early-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutDate,
          refundAmount: parseFloat(refundAmount) || 0,
          notes
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process early checkout");

      setActionSuccess("Early checkout processed successfully!");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setActionError(err.message || "Failed to process checkout");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintRegistrationForm = async () => {
    setPrinting(true);
    setPrintError("");
    try {
      const res = await fetch(`/api/pdf/registration-form/${stayId}`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate registration form");
      }
      const { documentId } = await res.json();
      const dlRes = await fetch(`/api/pdf/download/${documentId}`);
      if (!dlRes.ok) throw new Error("Failed to get download link");
      const { signedUrl } = await dlRes.json();
      window.open(signedUrl, "_blank");
    } catch (err: any) {
      setPrintError(err.message || "Failed to print registration form");
    } finally {
      setPrinting(false);
    }
  };

  const handleDownloadRefundInvoice = async () => {
    setPrinting(true);
    setPrintError("");
    try {
      const refundInvoice = stay.refundInvoices?.[0];
      if (!refundInvoice) throw new Error("No refund invoice found for this stay");

      const res = await fetch(`/api/pdf/refund-invoice/${refundInvoice.id}`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate refund invoice");
      }
      const { documentId } = await res.json();
      const dlRes = await fetch(`/api/pdf/download/${documentId}`);
      if (!dlRes.ok) throw new Error("Failed to get download link");
      const { signedUrl } = await dlRes.json();
      window.open(signedUrl, "_blank");
    } catch (err: any) {
      setPrintError(err.message || "Failed to download refund invoice");
    } finally {
      setPrinting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-card w-full max-w-2xl rounded-xl border shadow-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        <div className="border-b px-6 py-4 flex items-center justify-between bg-muted/15">
          <div>
            <h3 className="font-bold text-lg text-foreground flex items-center gap-1.5">
              <User className="h-5 w-5 text-primary" /> Stay Lifecycle Management
            </h3>
            {stay && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Tenant: <span className="font-semibold text-foreground">{stay.tenant.fullName}</span> &middot; Bed: {stay.bed.roomNumber}-{stay.bed.label}
              </p>
            )}
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading && (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground font-medium">Fetching stay records...</p>
          </div>
        )}

        {error && (
          <div className="p-8 text-center space-y-4">
            <div className="rounded-full bg-red-100 p-3 w-fit mx-auto text-red-600">
              <AlertCircle className="h-8 w-8" />
            </div>
            <p className="text-sm font-semibold text-destructive">{error}</p>
            <Button onClick={onClose}>Close Portal</Button>
          </div>
        )}

        {stay && !loading && !error && (
          <>
            <div className="border-b flex text-sm font-medium bg-muted/5">
              <button
                onClick={() => setActiveTab("details")}
                className={`flex-1 py-3 text-center border-b-2 transition ${activeTab === "details" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                Stay Details
              </button>
              <button
                onClick={() => setActiveTab("extend")}
                className={`flex-1 py-3 text-center border-b-2 transition ${activeTab === "extend" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                Extend Stay
              </button>
              <button
                onClick={() => setActiveTab("checkout")}
                className={`flex-1 py-3 text-center border-b-2 transition ${activeTab === "checkout" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                Early Checkout
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {actionError && (
                <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <div>{actionError}</div>
                </div>
              )}
              {actionSuccess && (
                <div className="flex items-start gap-2.5 rounded-lg border border-green-200 bg-green-500/5 p-3 text-xs text-green-600 dark:border-green-950">
                  <CheckCircle2 className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <div>{actionSuccess}</div>
                </div>
              )}

              {activeTab === "details" && (
                <div className="space-y-6">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handlePrintRegistrationForm}
                      disabled={printing}
                      className="flex items-center gap-1.5"
                    >
                      {printing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
                      Print Registration Form
                    </Button>
                    {stay.status === "EARLY_EXIT" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDownloadRefundInvoice}
                        disabled={printing}
                        className="flex items-center gap-1.5"
                      >
                        {printing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                        Download Refund Invoice
                      </Button>
                    )}
                  </div>
                  {printError && (
                    <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>{printError}</div>
                    </div>
                  )}
                  <div className="grid gap-4 grid-cols-2 text-sm">
                    <div className="rounded-lg border p-3 space-y-1">
                      <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Joining Date</span>
                      <span className="font-semibold">{formatDate(stay.joiningDate)}</span>
                    </div>
                    <div className="rounded-lg border p-3 space-y-1">
                      <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Check-out Date</span>
                      <span className="font-semibold">{formatDate(stay.endDate)}</span>
                    </div>
                    <div className="rounded-lg border p-3 space-y-1">
                      <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Monthly Rent</span>
                      <span className="font-semibold">₹ {stay.monthlyRent.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="rounded-lg border p-3 space-y-1">
                      <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Deposit Amount</span>
                      <span className="font-semibold">₹ {stay.securityDeposit.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="rounded-lg border p-3 space-y-1">
                      <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Food Plan</span>
                      <span className="font-semibold flex items-center gap-1">
                        <Utensils className="h-3.5 w-3.5 text-muted-foreground" />
                        {stay.foodPlan?.replace(/_/g, " ") || "Not Included"}
                      </span>
                    </div>
                    <div className="rounded-lg border p-3 space-y-1">
                      <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Stay Status</span>
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary font-bold w-fit block mt-1 uppercase">
                        {stay.status}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4 bg-muted/10 space-y-3 text-xs">
                    <h4 className="font-bold text-sm border-b pb-1">Billing Summary</h4>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Initial Payable:</span>
                      <span className="font-semibold">₹ {stay.totalPayable.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Payments Verified:</span>
                      <span className="font-semibold text-green-600">
                        ₹ {stay.payments.filter((p: any) => p.paymentStatus === "PAID").reduce((sum: number, p: any) => sum + p.amountPaid, 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-sm flex items-center gap-1">
                      <FileText className="h-4 w-4 text-muted-foreground" /> Payment Ledger
                    </h4>
                    {stay.payments.length > 0 ? (
                      <div className="border rounded-lg divide-y text-xs max-h-40 overflow-y-auto">
                        {stay.payments.map((p: any) => (
                          <div key={p.id} className="p-3 flex justify-between items-center bg-card">
                            <div>
                              <p className="font-semibold">₹ {p.amountPaid.toLocaleString("en-IN")} ({p.paymentMode})</p>
                              <p className="text-[10px] text-muted-foreground">{formatDate(p.createdAt)} UTR: {p.transactionRefNo || "—"}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.paymentStatus === "PAID" ? "bg-green-100 text-green-800" : p.paymentStatus === "PENDING" ? "bg-yellow-100 text-yellow-800 font-medium" : "bg-red-100 text-red-800"}`}>
                              {p.paymentStatus}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground py-2 text-center bg-muted/10 rounded-lg">No payment ledger records found.</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "extend" && (
                <form onSubmit={handleExtend} className="space-y-4 text-sm">
                  <div className="rounded-lg border bg-blue-500/5 p-4 flex gap-2.5 text-xs text-blue-700 leading-relaxed border-blue-200">
                    <Clock className="h-4.5 w-4.5 shrink-0 text-blue-500" />
                    <div>
                      Extending a stay sets the checkout date further out and transitions the status to <span className="font-bold">EXTENDED</span>. The system generates a new pending payment record for additional rent.
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">New Checkout End Date</label>
                    <input
                      type="date"
                      value={newEndDate}
                      onChange={(e) => setNewEndDate(e.target.value)}
                      className="flex h-9 w-full rounded border bg-transparent px-3 py-2 text-xs focus:outline-none focus:border-primary"
                      required
                    />
                  </div>

                  <div className="grid gap-4 grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Additional Rent (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={additionalRent}
                        onChange={(e) => setAdditionalRent(e.target.value)}
                        className="flex h-9 w-full rounded border bg-transparent px-3 py-2 text-xs focus:outline-none focus:border-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Additional Food Charges (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={additionalFoodCharges}
                        onChange={(e) => setAdditionalFoodCharges(e.target.value)}
                        className="flex h-9 w-full rounded border bg-transparent px-3 py-2 text-xs focus:outline-none focus:border-primary"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={submitting} className="w-full mt-2">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save Extension & Request Payment
                  </Button>
                </form>
              )}

              {activeTab === "checkout" && (
                <form onSubmit={handleCheckout} className="space-y-4 text-sm">
                  <div className="rounded-lg border bg-amber-500/5 p-4 flex gap-2.5 text-xs text-amber-700 leading-relaxed border-amber-200">
                    <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-amber-500" />
                    <div>
                      Processing early checkout immediately sets the stay status to <span className="font-bold">EARLY_EXIT</span>, frees the bed, cancels future food orders, and creates a refund record.
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Early Checkout Date</label>
                    <input
                      type="date"
                      max={new Date().toISOString().split("T")[0]}
                      value={checkoutDate}
                      onChange={(e) => setCheckoutDate(e.target.value)}
                      className="flex h-9 w-full rounded border bg-transparent px-3 py-2 text-xs focus:outline-none focus:border-primary"
                      required
                    />
                  </div>

                  {daysInfo && (
                    <div className="grid gap-3 grid-cols-3 bg-muted/10 p-3 rounded-lg text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Total Days</span>
                        <span className="font-semibold">{daysInfo.totalDays} days</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Days Used</span>
                        <span className="font-semibold">{daysInfo.daysUsed} days</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Remaining Days</span>
                        <span className="font-semibold text-primary">{daysInfo.daysRemaining} days</span>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 grid-cols-3 items-end">
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">
                        Refund Amount (₹) {daysInfo && <span className="text-[10px] text-muted-foreground">(Suggested: ₹{daysInfo.suggestedRefund})</span>}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        className="flex h-9 w-full rounded border bg-transparent px-3 py-2 text-xs focus:outline-none focus:border-primary"
                        required
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => daysInfo && setRefundAmount(daysInfo.suggestedRefund.toString())}
                      className="text-xs h-9"
                    >
                      Use Suggested
                    </Button>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Refund Processing Notes / Reasons</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Reason for early checkout or refund particulars..."
                      className="flex min-h-16 w-full rounded border bg-transparent px-3 py-2 text-xs focus:outline-none focus:border-primary"
                    />
                  </div>

                  <Button type="submit" disabled={submitting} className="w-full mt-2" variant="destructive">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Confirm Checkout & Issue Refund
                  </Button>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
