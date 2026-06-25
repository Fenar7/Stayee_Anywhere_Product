/* eslint-disable react-hooks/exhaustive-deps, react-hooks/rules-of-hooks, react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const toLocalISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
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


type StayDetail = {
  id: string;
  status: string;
  joiningDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  foodPlan: string;
  foodCharges: number;
  totalPayable: number;
  tenant: {
    id: string;
    fullName: string;
    phone: string;
    user: { email: string | null } | null;
    dateOfBirth?: string;
    gender?: string;
    placeOfBirth?: string;
    permanentAddress?: string;
    emergencyContactName?: string;
    emergencyContactNumber?: string;
    relationship?: string;
    parentGuardianName?: string;
    parentGuardianContact?: string;
    photoUrl?: string;
    idDocumentUrl?: string;
    idDocumentType?: string;
    occupationType?: string;
    collegeName?: string;
    courseOrBranch?: string;
    companyName?: string;
    designation?: string;
  };
  bed: {
    label: string;
    room: {
      roomNumber: string;
      floor: { name: string };
    };
  };
  refundInvoices?: { id: string }[];
  payments: {
    id: string;
    amountPaise: number;
    paymentStatus: string;
    createdAt: string;
  }[];
};

export function StayLifecycleModal({
  stayId,
  onClose,
  onSuccess
}: {
  stayId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [stay, setStay] = useState<StayDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "profile" | "extend" | "checkout">("details");

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

  

  async function fetchStayDetails() {
useEffect(() => {
    // replaced();
  }, [stayId]);

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
      if (!data.stay?.refundInvoices) {
        data.stay.refundInvoices = [];
      }

      const currentEnd = new Date(data.stay.endDate);
      const nextMonthEnd = new Date(currentEnd);
      nextMonthEnd.setMonth(nextMonthEnd.getMonth() + 1);
      setNewEndDate(toLocalISODate(nextMonthEnd));

      const todayStr = toLocalISODate(new Date());
      setCheckoutDate(todayStr);
    } catch (e: unknown) { const eMsg = e instanceof Error ? e.message : String(e);
      setError(eMsg || "An unexpected error occurred");
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
      setTimeout(() => setDaysInfo(null), 0);
      return;
    }

    const msPerDay = 24 * 60 * 60 * 1000;
    const totalDays = Math.max(1, Math.round((eDate.getTime() - jDate.getTime()) / msPerDay));
    const daysUsed = Math.max(0, Math.round((cDate.getTime() - jDate.getTime()) / msPerDay));
    const daysRemaining = Math.max(0, totalDays - daysUsed);

    const verifiedPaid = stay.payments
      .filter((p: StayDetail["payments"][0]) => p.paymentStatus === "PAID")
      .reduce((sum: number, p: StayDetail["payments"][0]) => sum + p.amountPaise, 0);

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
    } catch (err: unknown) { const errMsg = err instanceof Error ? err.message : String(err);
      setActionError(errMsg || "Failed to process extension");
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
    } catch (err: unknown) { const errMsg = err instanceof Error ? err.message : String(err);
      setActionError(errMsg || "Failed to process checkout");
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
    } catch (err: unknown) { const errMsg = err instanceof Error ? err.message : String(err);
      setPrintError(errMsg || "Failed to print registration form");
    } finally {
      setPrinting(false);
    }
  };

  const handleDownloadRefundInvoice = async () => {
    setPrinting(true);
    setPrintError("");
    try {
      const refundInvoice = stay?.refundInvoices?.[0];
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
    } catch (err: unknown) { const errMsg = err instanceof Error ? err.message : String(err);
      setPrintError(errMsg || "Failed to download refund invoice");
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
                Tenant: <span className="font-semibold text-foreground">{stay.tenant.fullName}</span> &middot; Bed: {stay.bed.room.roomNumber}-{stay.bed.label}
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
                onClick={() => setActiveTab("profile")}
                className={`flex-1 py-3 text-center border-b-2 transition ${activeTab === "profile" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                Tenant Profile
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
                        ₹ {stay.payments.filter((p: StayDetail["payments"][0]) => p.paymentStatus === "PAID").reduce((sum: number, p: StayDetail["payments"][0]) => sum + p.amountPaise, 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-sm flex items-center gap-1">
                      <FileText className="h-4 w-4 text-muted-foreground" /> Payment Ledger
                    </h4>
                    {stay.payments.length > 0 ? (
                      <div className="border rounded-lg divide-y text-xs max-h-40 overflow-y-auto">
                        {stay.payments.map((p: StayDetail["payments"][0]) => (
                          <div key={p.id} className="p-3 flex justify-between items-center bg-card">
                            <div>
                              <p className="font-semibold">₹ {p.amountPaise.toLocaleString("en-IN")} ({(p as unknown as Record<string, string>).paymentMode})</p>
                              <p className="text-[10px] text-muted-foreground">{formatDate(p.createdAt)} UTR: {(p as unknown as Record<string, string>).transactionRefNo || "—"}</p>
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

              {activeTab === "profile" && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex gap-4 items-center mb-4">
                    {stay.tenant.photoUrl ? (
                      <img src={stay.tenant.photoUrl} alt="Profile" className="h-20 w-20 rounded-full border shadow-sm object-cover" />
                    ) : (
                      <div className="h-20 w-20 rounded-full border shadow-sm flex items-center justify-center bg-muted text-muted-foreground">
                        <User className="h-8 w-8" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-lg">{stay.tenant.fullName}</h3>
                      <p className="text-sm text-muted-foreground">{stay.tenant.phone} {stay.tenant.user?.email ? `• ${stay.tenant.user.email}` : ""}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-sm border-b pb-1">Personal Details</h4>
                    <div className="grid gap-3 grid-cols-2 text-sm bg-muted/10 p-4 rounded-lg">
                      <div>
                        <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Date of Birth</span>
                        <span className="font-semibold">{stay.tenant.dateOfBirth ? formatDate(stay.tenant.dateOfBirth) : "—"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Gender</span>
                        <span className="font-semibold">{stay.tenant.gender || "—"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Place of Birth</span>
                        <span className="font-semibold">{stay.tenant.placeOfBirth || "—"}</span>
                      </div>
                      <div className="col-span-2 mt-2">
                        <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Permanent Address</span>
                        <span className="font-semibold">{stay.tenant.permanentAddress || "—"}</span>
                      </div>
                    </div>

                    <h4 className="font-bold text-sm border-b pb-1 mt-6">Emergency & Guardian Contacts</h4>
                    <div className="grid gap-3 grid-cols-2 text-sm bg-muted/10 p-4 rounded-lg">
                      <div>
                        <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Emergency Contact</span>
                        <span className="font-semibold block">{stay.tenant.emergencyContactName || "—"}</span>
                        <span className="text-xs text-muted-foreground">{stay.tenant.emergencyContactNumber} {stay.tenant.relationship ? `(${stay.tenant.relationship})` : ""}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Parent / Guardian</span>
                        <span className="font-semibold block">{stay.tenant.parentGuardianName || "—"}</span>
                        <span className="text-xs text-muted-foreground">{stay.tenant.parentGuardianContact}</span>
                      </div>
                    </div>

                    <h4 className="font-bold text-sm border-b pb-1 mt-6">Academic / Professional</h4>
                    <div className="grid gap-3 grid-cols-2 text-sm bg-muted/10 p-4 rounded-lg">
                      <div className="col-span-2">
                        <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Occupation Status</span>
                        <span className="font-semibold">{stay.tenant.occupationType?.replace("_", " ") || "—"}</span>
                      </div>
                      {stay.tenant.occupationType === "STUDENT" && (
                        <>
                          <div>
                            <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">College / University</span>
                            <span className="font-semibold">{stay.tenant.collegeName || "—"}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Course / Branch</span>
                            <span className="font-semibold">{stay.tenant.courseOrBranch || "—"}</span>
                          </div>
                        </>
                      )}
                      {stay.tenant.occupationType === "WORKING_PROFESSIONAL" && (
                        <>
                          <div>
                            <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Company Name</span>
                            <span className="font-semibold">{stay.tenant.companyName || "—"}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Designation</span>
                            <span className="font-semibold">{stay.tenant.designation || "—"}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {stay.tenant.idDocumentUrl && (
                      <>
                        <h4 className="font-bold text-sm border-b pb-1 mt-6">Identity Document</h4>
                        <div className="bg-muted/10 p-4 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <span className="font-semibold text-sm">{stay.tenant.idDocumentType || "ID Document"}</span>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => window.open(stay.tenant?.idDocumentUrl, "_blank")}>
                            View Document
                          </Button>
                        </div>
                      </>
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
                    <Label className="text-xs font-semibold text-muted-foreground block mb-2">New Checkout End Date</Label>
                    <Input
                      type="date"
                      value={newEndDate}
                      onChange={(e) => setNewEndDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-4 grid-cols-2">
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground block mb-2">Additional Rent (₹)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={additionalRent}
                        onChange={(e) => setAdditionalRent(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground block mb-2">Additional Food Charges (₹)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={additionalFoodCharges}
                        onChange={(e) => setAdditionalFoodCharges(e.target.value)}
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
                    <Label className="text-xs font-semibold text-muted-foreground block mb-2">Early Checkout Date</Label>
                    <Input
                      type="date"
                      max={toLocalISODate(new Date())}
                      value={checkoutDate}
                      onChange={(e) => setCheckoutDate(e.target.value)}
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
                      <Label className="text-xs font-semibold text-muted-foreground block mb-2">
                        Refund Amount (₹) {daysInfo && <span className="text-[10px] text-muted-foreground">(Suggested: ₹{daysInfo.suggestedRefund})</span>}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
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
                    <Label className="text-xs font-semibold text-muted-foreground block mb-2">Refund Processing Notes / Reasons</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Reason for early checkout or refund particulars..."
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
