"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { notify } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Check, X, CreditCard, ShieldCheck, AlertCircle, FileText, ExternalLink, MessageSquare, Clipboard, Upload } from "lucide-react";
import { applicationApprovedPaymentRequest } from "@/lib/whatsapp/templates";
import { normalizePhoneNumber, buildWaMeLink } from "@/lib/whatsapp/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DocumentItem {
  id: string;
  documentType: string;
  fileSizeBytes: number;
  createdAt: string;
  signedUrl: string | null;
}

interface PaymentItem {
  id: string;
  amountPaid: number;
  paymentMode: string;
  transactionRefNo: string | null;
  receivedBy: string | null;
  paymentStatus: string;
  createdAt: string;
  screenshotUrl: string | null;
}

interface StayDetails {
  id: string;
  status: string;
  durationType: string;
  joiningDate: string;
  endDate: string;
  isNewAdmission: boolean;
  admissionFee: number;
  monthlyRent: number;
  securityDeposit: number;
  foodCharges: number;
  foodPlan: string;
  totalPayable: number;
  discount: number;
}

interface TenantDetails {
  id: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  placeOfBirth: string;
  permanentAddress: string;
  emergencyContactName: string;
  relationship: string;
  emergencyContactNumber: string;
  parentGuardianName: string;
  parentGuardianContact: string;
  occupationType: string;
  collegeName: string | null;
  courseOrBranch: string | null;
  companyName: string | null;
  designation: string | null;
  purposeOfStay: string;
  phone: string;
  email: string;
  plainTextPassword?: string | null;
  documents: DocumentItem[];
}

interface BedDetails {
  id: string;
  label: string;
  roomNumber: string;
  sharingType: string;
}

export default function OnboardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const stayId = params.id as string;

  const [loading, setLoading] = useState(true);
  
  // Data state
  const [stay, setStay] = useState<StayDetails | null>(null);
  const [tenant, setTenant] = useState<TenantDetails | null>(null);
  const [bed, setBed] = useState<BedDetails | null>(null);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [upiId, setUpiId] = useState<string | null>(null);

  // Action pending states
  const [processingApprove, setProcessingApprove] = useState(false);
  const [processingReject, setProcessingReject] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [processingVerify, setProcessingVerify] = useState<string | null>(null);

  // Form states for Warden recording payment
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [transactionRefNo, setTransactionRefNo] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Success dialog state for WhatsApp request
  const [showPaymentRequest, setShowPaymentRequest] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  const fetchDetails = async () => {
    try {
      const response = await fetch(`/api/warden/onboards/${stayId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch onboard details");
      }
      const data = await response.json();
      setStay(data.stay);
      setTenant(data.tenant);
      setBed(data.bed);
      setPayments(data.payments);
      setUpiId(data.upiId || null);
    } catch (err: any) {
      notify.error(err.message || "An error occurred while loading details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [stayId]);

  const handleApprove = async () => {
    setProcessingApprove(true);
    try {
      const response = await fetch(`/api/warden/onboards/${stayId}/approve`, {
        method: "POST",
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Approval failed");
      }
      notify.success("Profile approved. Payment request ready.");
      setShowPaymentRequest(true);
      await fetchDetails();
    } catch (err: any) {
      notify.error(err.message || "An error occurred during approval");
    } finally {
      setProcessingApprove(false);
    }
  };

  const handleReject = async () => {
    setShowRejectConfirm(false);
    setProcessingReject(true);
    try {
      const response = await fetch(`/api/warden/onboards/${stayId}/reject`, {
        method: "POST",
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Rejection failed");
      }
      notify.success("Registration request rejected successfully.");
      router.push("/warden/onboards");
    } catch (err: any) {
      notify.error(err.message || "An error occurred during rejection");
    } finally {
      setProcessingReject(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountPaid || parseFloat(amountPaid) <= 0) {
      notify.error("Please provide a valid payment amount");
      return;
    }
    if (paymentMode !== "CASH" && !transactionRefNo.trim()) {
      notify.error("Transaction reference number is required for bank or UPI transfer");
      return;
    }

    setProcessingPayment(true);

    try {
      const formData = new FormData();
      formData.append("amountPaid", amountPaid);
      formData.append("paymentMode", paymentMode);
      formData.append("transactionRefNo", transactionRefNo);
      formData.append("receivedBy", receivedBy || "Warden Dashboard");
      if (screenshotFile) {
        formData.append("screenshot", screenshotFile);
      }

      const response = await fetch(`/api/warden/onboards/${stayId}/payment`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to record payment");
      }

      notify.success("Payment recorded successfully, awaiting verification");
      // Reset form
      setAmountPaid("");
      setTransactionRefNo("");
      setReceivedBy("");
      setScreenshotFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      await fetchDetails();
    } catch (err: any) {
      notify.error(err.message || "An error occurred while recording payment");
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleVerifyPayment = async (paymentId: string) => {
    setProcessingVerify(paymentId);
    try {
      const response = await fetch(`/api/warden/onboards/${stayId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Payment verification failed");
      }

      if (data.activated) {
        notify.success("Payment verified! Stay has been activated and Bed status updated to OCCUPIED.");
      } else {
        notify.success("Partial payment verified. Awaiting balance payments to activate stay.");
      }

      await fetchDetails();
    } catch (err: any) {
      notify.error(err.message || "An error occurred during verification");
    } finally {
      setProcessingVerify(null);
    }
  };

  // Pre-filled WhatsApp message generation helpers
  const getWhatsAppMessage = () => {
    if (!stay || !tenant) return "";
    const portalLink = `${window.location.origin}/login`;
    return applicationApprovedPaymentRequest({
      name: tenant.fullName,
      amount: stay.totalPayable,
      paymentUrl: portalLink,
      upiId: upiId || undefined,
      breakdown: {
        admissionFee: stay.admissionFee,
        monthlyRent: stay.monthlyRent,
        securityDeposit: stay.securityDeposit,
        foodCharges: stay.foodCharges,
        discount: stay.discount,
        roomBedLabel: bed ? `${bed.roomNumber}-${bed.label}` : undefined,
      },
    });
  };

  const handleCopyRequestLink = async () => {
    try {
      await navigator.clipboard.writeText(getWhatsAppMessage());
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement("textarea");
      el.value = getWhatsAppMessage();
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleWhatsAppShare = () => {
    if (!tenant) return;
    const normalized = normalizePhoneNumber(tenant.phone);
    window.open(buildWaMeLink(normalized, getWhatsAppMessage()), "_blank");
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const profilePhoto = tenant?.documents.find((d) => d.documentType === "PROFILE_PHOTO");
  const idDocuments = tenant?.documents.filter((d) => d.documentType !== "PROFILE_PHOTO");

  const totalPaid = payments
    .filter((p) => p.paymentStatus === "PAID" || p.paymentStatus === "PARTIALLY_PAID")
    .reduce((sum, p) => sum + p.amountPaid, 0);

  const balanceAmount = stay ? stay.totalPayable - totalPaid : 0;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button
          onClick={() => router.push("/warden/onboards")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-semibold"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Onboard Management
        </button>

        {stay?.status === "ACTIVE" && (
          <div className="rounded bg-green-500/10 border border-green-500/20 px-3 py-1.5 text-xs text-green-600 font-bold flex items-center gap-1.5">
            <Check className="h-4 w-4" /> Activated &amp; Occupying Room {bed?.roomNumber}
          </div>
        )}
      </div>

      {/* WHATSAPP PAYMENT REQUEST MODAL/ALERT */}
      {showPaymentRequest && (
        <div className="rounded-xl border border-blue-200 bg-blue-500/5 p-6 space-y-4 max-w-2xl dark:border-blue-900/30">
          <div className="flex items-center gap-2 text-primary font-bold">
            <MessageSquare className="h-5 w-5" /> WhatsApp Payment Request Message
          </div>
          <p className="text-xs text-muted-foreground">Send this message template to the tenant to request their deposit payment.</p>
          <div className="bg-muted p-4 rounded-lg text-xs leading-relaxed font-mono whitespace-pre-wrap select-all">
            {getWhatsAppMessage()}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleWhatsAppShare} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
              Send on WhatsApp
            </Button>
            <Button onClick={handleCopyRequestLink} size="sm" variant="outline" className="flex items-center gap-2">
              <Clipboard className="h-4 w-4" /> {copiedLink ? "Copied!" : "Copy Template"}
            </Button>
            <Button onClick={() => setShowPaymentRequest(false)} size="sm" variant="ghost">Dismiss</Button>
          </div>
        </div>
      )}

      {/* PENDING PAYMENT NOTICE BANNER */}
      {payments.some((p) => p.paymentStatus === "PENDING") && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-xl border border-amber-200 bg-amber-500/10 p-5 max-w-7xl dark:border-amber-900/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-800 dark:text-amber-300 text-sm">Action Required: Verify Tenant Deposit Payment</h4>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                The tenant has submitted a payment receipt. Please inspect the screenshot and details under the <strong>Logged Payments</strong> section at the bottom, and click <strong>Verify Payment</strong> to activate this resident stay.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              const el = document.getElementById("logged-payments-section");
              if (el) {
                el.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shrink-0 self-end sm:self-center"
          >
            Review Payment Now
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT COLUMN: Profile Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-6 border-b pb-6">
              {profilePhoto?.signedUrl ? (
                <div
                  onClick={() => setShowLightbox(true)}
                  className="group/avatar relative h-24 w-24 rounded-xl overflow-hidden border-2 bg-muted shadow hover:shadow-md cursor-zoom-in transition-all duration-200"
                  title="Click to view full screen"
                >
                  <img
                    src={profilePhoto.signedUrl}
                    alt="Profile"
                    className="h-full w-full object-cover group-hover/avatar:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold">
                    View Full
                  </div>
                </div>
              ) : (
                <div className="h-24 w-24 rounded-xl bg-muted flex items-center justify-center text-muted-foreground border text-xs font-semibold">
                  No Photo
                </div>
              )}
              <div className="text-center sm:text-left space-y-1">
                <h2 className="text-2xl font-bold">{tenant?.fullName}</h2>
                <p className="text-sm text-muted-foreground">Phone: {tenant?.phone || stay?.id}</p>
                {tenant?.email && <p className="text-xs text-muted-foreground">Email: {tenant.email}</p>}
                {tenant?.plainTextPassword && (
                  <p className="text-xs text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5 mt-1">
                    Password: <span className="font-mono bg-muted/80 dark:bg-muted/30 px-1.5 py-0.5 rounded border text-foreground font-bold select-all">{tenant.plainTextPassword}</span>
                  </p>
                )}
                <p className="text-xs mt-1">
                  Occupation: <span className="font-semibold">{tenant?.occupationType}</span>
                </p>
              </div>
            </div>

            {/* General details */}
            <div className="grid gap-6 sm:grid-cols-2 text-sm">
              <div>
                <h3 className="font-bold text-muted-foreground uppercase text-xs tracking-wider mb-2">Personal Information</h3>
                <div className="space-y-2">
                  <p><span className="text-muted-foreground">Date of Birth:</span> {tenant ? new Date(tenant.dateOfBirth).toLocaleDateString("en-IN") : ""}</p>
                  <p><span className="text-muted-foreground">Gender:</span> {tenant?.gender}</p>
                  <p><span className="text-muted-foreground">Place of Birth:</span> {tenant?.placeOfBirth}</p>
                  <p><span className="text-muted-foreground">Permanent Address:</span> {tenant?.permanentAddress}</p>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-muted-foreground uppercase text-xs tracking-wider mb-2">Emergency Contacts</h3>
                <div className="space-y-2">
                  <p><span className="text-muted-foreground">Emergency Contact:</span> {tenant?.emergencyContactName} ({tenant?.relationship})</p>
                  <p><span className="text-muted-foreground">Contact No:</span> {tenant?.emergencyContactNumber}</p>
                  <p><span className="text-muted-foreground">Parent / Guardian:</span> {tenant?.parentGuardianName}</p>
                  <p><span className="text-muted-foreground">Parent Contact:</span> {tenant?.parentGuardianContact}</p>
                </div>
              </div>

              {tenant?.occupationType === "STUDENT" ? (
                <div className="sm:col-span-2 border-t pt-4">
                  <h3 className="font-bold text-muted-foreground uppercase text-xs tracking-wider mb-2">Academic Profile</h3>
                  <p><span className="text-muted-foreground">College:</span> {tenant.collegeName}</p>
                  <p><span className="text-muted-foreground">Course/Branch:</span> {tenant.courseOrBranch}</p>
                  <p><span className="text-muted-foreground">Purpose of Stay:</span> {tenant.purposeOfStay}</p>
                </div>
              ) : (
                <div className="sm:col-span-2 border-t pt-4">
                  <h3 className="font-bold text-muted-foreground uppercase text-xs tracking-wider mb-2">Professional Profile</h3>
                  <p><span className="text-muted-foreground">Company:</span> {tenant?.companyName}</p>
                  <p><span className="text-muted-foreground">Designation:</span> {tenant?.designation}</p>
                  <p><span className="text-muted-foreground">Purpose of Stay:</span> {tenant?.purposeOfStay}</p>
                </div>
              )}
            </div>
          </div>

          {/* ID Documents */}
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-lg">Verification Documents</h3>
            {idDocuments && idDocuments.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {idDocuments.map((doc) => {
                  const isPdf = doc.signedUrl?.includes(".pdf");
                  return (
                    <div key={doc.id} className="border rounded-lg p-4 flex flex-col justify-between bg-muted/10">
                      <div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          <span className="font-bold text-sm">{doc.documentType}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Size: {(doc.fileSizeBytes / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      
                      {doc.signedUrl && !isPdf && (
                        <div className="mt-3 rounded border overflow-hidden max-h-28 flex items-center bg-black">
                          <img src={doc.signedUrl} alt={doc.documentType} className="w-full object-cover" />
                        </div>
                      )}

                      <div className="mt-4">
                        {doc.signedUrl ? (
                          <a href={doc.signedUrl} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="w-full flex items-center gap-2 text-xs">
                              View Full Document <ExternalLink className="h-3 w-3" />
                            </Button>
                          </a>
                        ) : (
                          <Button size="sm" variant="outline" disabled className="w-full text-xs">
                            Unavailable
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-6 text-center">
                No identity verification documents uploaded yet.
              </p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Action panel / Stay billing / Payments */}
        <div className="space-y-6">
          {/* Stay & Bed assignment details */}
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-lg border-b pb-2">Assigned Booking</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status:</span>
                {stay?.status === "APPROVED_AWAITING_PAYMENT" && payments.some((p) => p.paymentStatus === "PENDING") ? (
                  <span className="rounded bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-bold text-amber-800 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                    ⚡ Verify Payment
                  </span>
                ) : (
                  <span className="font-bold uppercase text-xs text-foreground bg-muted px-2 py-0.5 rounded">{stay?.status}</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bed Code:</span>
                <span className="font-bold text-foreground">{bed?.roomNumber} - {bed?.label} ({bed?.sharingType})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-semibold">{stay?.durationType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stay Dates:</span>
                <span className="font-semibold">
                  {stay ? new Date(stay.joiningDate).toLocaleDateString("en-IN") : ""} to {stay ? new Date(stay.endDate).toLocaleDateString("en-IN") : ""}
                </span>
              </div>
            </div>

            {/* Fee summary */}
            <div className="border-t pt-4 space-y-2.5 text-xs">
              <h4 className="font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Fee Components</h4>
              <div className="flex justify-between">
                <span>Admission Fee:</span>
                <span>₹ {stay?.admissionFee.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span>Monthly Stay Rent:</span>
                <span>₹ {stay?.monthlyRent.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span>Refundable Deposit:</span>
                <span>₹ {stay?.securityDeposit.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span>Food Plan Charges:</span>
                <span>₹ {stay?.foodCharges.toLocaleString("en-IN")} ({stay?.foodPlan})</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Discount Applied:</span>
                <span>- ₹ {stay?.discount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t pt-2 border-dashed">
                <span>Total Payable:</span>
                <span className="text-primary">₹ {stay?.totalPayable.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* ONBOARDING ACTION PANEL */}
          {stay?.status === "ONBOARDING_PENDING" && tenant?.id && (
            <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-lg">Process Onboarding</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Review the profile information and ID proof. If everything is valid, click Approve to notify the tenant for deposit payment.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={handleApprove}
                  disabled={processingApprove || processingReject || !tenant.fullName || tenant.fullName.startsWith("Prospect ")}
                  className="flex-1 bg-primary hover:bg-primary/95 text-white"
                >
                  {processingApprove ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Approve Profile
                </Button>
                <Button
                  onClick={() => setShowRejectConfirm(true)}
                  disabled={processingApprove || processingReject}
                  variant="outline"
                  className="border-destructive hover:bg-destructive/5 text-destructive"
                >
                  {processingReject ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Reject
                </Button>
              </div>
              {tenant && tenant.fullName.startsWith("Prospect ") && (
                <p className="text-[10px] text-yellow-600 font-semibold mt-1">
                  Tenant has not submitted their registration profile details yet.
                </p>
              )}
            </div>
          )}

          {/* PAYMENT RECORDING PANEL (Stay: APPROVED_AWAITING_PAYMENT) */}
          {stay?.status === "APPROVED_AWAITING_PAYMENT" && (
            <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
              <div className="border-b pb-4 space-y-2">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" /> Record Admission Payment
                </h3>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Verified Paid:</span>
                    <span className="font-bold">₹ {totalPaid.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-primary font-semibold">
                    <span>Remaining Balance:</span>
                    <span>₹ {balanceAmount.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {payments.some((p) => p.paymentStatus === "PENDING") && (
                <div className="rounded-lg border border-amber-200 bg-amber-500/10 p-3 text-xs text-amber-800 dark:border-amber-900/30 dark:text-amber-300">
                  <div className="font-bold mb-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> Pending Uploaded Payment
                  </div>
                  A tenant has uploaded a payment receipt. Please scroll down to <strong>Logged Payments</strong> to review the receipt and verify it.
                </div>
              )}

              <form onSubmit={handleRecordPayment} className="space-y-4 text-sm">
                <div>
                  <label className="text-xs font-semibold">Amount Paid (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={balanceAmount.toString()}
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="mt-1 flex h-9 w-full rounded border bg-transparent px-3 py-1.5 text-xs focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="mt-1 flex h-9 w-full rounded border bg-transparent px-3 py-1.5 text-xs"
                  >
                    <option value="UPI">UPI Transfer</option>
                    <option value="CASH">Cash Payment</option>
                    <option value="BANK_TRANSFER">Bank/Wire Transfer</option>
                    <option value="COMPANY_ACCOUNT">Company Corporate Account</option>
                  </select>
                </div>

                {paymentMode !== "CASH" && (
                  <div>
                    <label className="text-xs font-semibold">Transaction Reference Number</label>
                    <input
                      type="text"
                      placeholder="UTR / UPI Ref Number"
                      value={transactionRefNo}
                      onChange={(e) => setTransactionRefNo(e.target.value)}
                      className="mt-1 flex h-9 w-full rounded border bg-transparent px-3 py-1.5 text-xs"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold">Received / Logged By</label>
                  <input
                    type="text"
                    placeholder="Warden name or ref"
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    className="mt-1 flex h-9 w-full rounded border bg-transparent px-3 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1">Receipt Screenshot (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                    className="text-xs w-full"
                  />
                </div>

                <Button type="submit" disabled={processingPayment} className="w-full">
                  {processingPayment ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Record Entry Payment
                </Button>
              </form>
            </div>
          )}

          {/* LIST OF LOGGED PAYMENTS */}
          {payments.length > 0 && (
            <div id="logged-payments-section" className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-lg border-b pb-2">Logged Payments</h3>
              <div className="space-y-3">
                {payments.map((pmt) => (
                  <div key={pmt.id} className="border rounded-lg p-3 space-y-3 bg-muted/10 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-sm">₹ {pmt.amountPaid.toLocaleString("en-IN")}</span>
                        <span className="text-[10px] block text-muted-foreground">{pmt.paymentMode} &middot; {new Date(pmt.createdAt).toLocaleDateString("en-IN")}</span>
                      </div>
                      <div>
                        {pmt.paymentStatus === "PAID" ? (
                          <span className="rounded bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-green-800 uppercase dark:bg-green-900/30 dark:text-green-400">Verified</span>
                        ) : pmt.paymentStatus === "PARTIALLY_PAID" ? (
                          <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-[9px] font-bold text-yellow-800 uppercase dark:bg-yellow-900/30 dark:text-yellow-400">Partial verified</span>
                        ) : (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 uppercase dark:bg-amber-900/30 dark:text-amber-400">Awaiting Verify</span>
                        )}
                      </div>
                    </div>

                    {pmt.transactionRefNo && (
                      <p className="font-mono text-[10px]"><span className="text-muted-foreground">Ref No:</span> {pmt.transactionRefNo}</p>
                    )}

                    {pmt.screenshotUrl && (
                      <div className="flex gap-2">
                        <a href={pmt.screenshotUrl} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] flex items-center gap-1">
                            <Upload className="h-3 w-3" /> View Receipt Screenshot
                          </Button>
                        </a>
                      </div>
                    )}

                    {pmt.paymentStatus === "PENDING" && (
                      <Button
                        onClick={() => handleVerifyPayment(pmt.id)}
                        disabled={processingVerify !== null}
                        size="sm"
                        className="w-full bg-green-600 hover:bg-green-700 text-white h-7 text-[10px]"
                      >
                        {processingVerify === pmt.id ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                        )}
                        Verify Payment &amp; Activate Resident
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {showLightbox && profilePhoto?.signedUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 cursor-zoom-out"
          onClick={() => setShowLightbox(false)}
        >
          <button
            onClick={() => setShowLightbox(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 rounded-full p-2 bg-black/40 hover:bg-black/60 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="max-w-4xl max-h-[85vh] overflow-hidden rounded-xl bg-muted shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={profilePhoto.signedUrl}
              alt="Fullscreen Profile"
              className="max-h-[85vh] max-w-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Reject Confirm Dialog */}
      <AlertDialog open={showRejectConfirm} onOpenChange={setShowRejectConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Registration Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this registration request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processingReject}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleReject();
              }}
              disabled={processingReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processingReject ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
