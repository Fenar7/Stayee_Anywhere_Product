"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2, ArrowRight, Check, Copy, Key, Shield,
  X, CheckCircle, Clock, AlertCircle, FileText, Ban
} from "lucide-react";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface OnboardItem {
  id: string;
  status: string;
  joiningDate: string;
  endDate: string;
  totalPayable: number;
  hasPendingPayment?: boolean;
  hostel: { id: string; name: string };
  tenant: {
    id: string;
    fullName: string;
    phone: string;
    gender: string;
    hasProfile: boolean;
  };
  bed: {
    id: string;
    label: string;
    roomNumber: string;
    status: string;
  };
  onboardingRequest: { id: string; status: string; createdAt: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });

const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

const STATUS_LABELS: Record<string, string> = {
  ONBOARDING_PENDING: "Pending Review",
  APPROVED_AWAITING_PAYMENT: "Awaiting Payment",
  ACTIVE: "Active",
  EXTENDED: "Extended",
  EARLY_EXIT: "Early Exit",
  CHECKED_OUT: "Checked Out",
  CANCELLED: "Cancelled",
};

const STATUS_STYLES: Record<string, string> = {
  ONBOARDING_PENDING: "bg-[#fffbeb] text-[#d97706]", // amber
  APPROVED_AWAITING_PAYMENT: "bg-[#fefce8] text-[#ca8a04]", // yellow
  ACTIVE: "bg-[#dcfce7] text-[#15803d]", // green
  EXTENDED: "bg-[#dbeafe] text-[#1e40af]", // blue
  EARLY_EXIT: "bg-[#f3e8ff] text-[#7e22ce]", // purple
  CHECKED_OUT: "bg-[#f1f5f9] text-[#475569]", // slate
  CANCELLED: "bg-[#fee2e2] text-[#b91c1c]", // red
};

type FilterTab = "ALL" | "FORM" | "REVIEW" | "PAYMENT" | "ACTIVE" | "CANCELLED";

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminOnboardsPage() {
  const router = useRouter();
  const [onboards, setOnboards] = useState<OnboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");

  // Cancel modal
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<{ stayId: string; hostelId: string } | null>(null);

  // Password modal
  const [passwordModal, setPasswordModal] = useState<{ onboardingReqId: string; phone: string } | null>(null);
  const [revealedPassword, setRevealedPassword] = useState("");
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const fetchOnboards = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/onboards");
      if (!res.ok) throw new Error("Failed to fetch onboarding list");
      const data = await res.json();
      setOnboards(data.onboards);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOnboards(); }, [fetchOnboards]);

  const executeCancel = async () => {
    if (!confirmCancel) return;
    const { stayId, hostelId } = confirmCancel;

    setCancelling(stayId);
    try {
      const res = await fetch(`/api/admin/onboards/${stayId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostelId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to cancel");
      }
      notify.success("Request cancelled successfully");
      fetchOnboards();
      setConfirmCancel(null);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Failed to cancel onboarding request");
    } finally {
      setCancelling(null);
    }
  };

  const handleViewPassword = async (onboardingReqId: string, phone: string) => {
    setPasswordModal({ onboardingReqId, phone });
    setRevealedPassword("");
    setPasswordCopied(false);
    setPasswordLoading(true);
    try {
      const res = await fetch(
        `/api/warden/onboarding-requests/${onboardingReqId}/regenerate-password`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get password");
      setRevealedPassword(data.tempPassword);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setPasswordLoading(false);
    }
  };

  // ─── Filter Logic ───
  const awaitingForm = useMemo(() => onboards.filter((i) => i.status === "ONBOARDING_PENDING" && !i.tenant.hasProfile), [onboards]);
  const awaitingReview = useMemo(() => onboards.filter((i) => i.status === "ONBOARDING_PENDING" && i.tenant.hasProfile), [onboards]);
  const awaitingPayment = useMemo(() => onboards.filter((i) => i.status === "APPROVED_AWAITING_PAYMENT"), [onboards]);
  const activeStays = useMemo(() => onboards.filter((i) => i.status === "ACTIVE" || i.status === "EXTENDED"), [onboards]);
  const cancelled = useMemo(() => onboards.filter((i) => i.status === "CANCELLED"), [onboards]);

  const filteredItems = useMemo(() => {
    switch (activeTab) {
      case "FORM": return awaitingForm;
      case "REVIEW": return awaitingReview;
      case "PAYMENT": return awaitingPayment;
      case "ACTIVE": return activeStays;
      case "CANCELLED": return cancelled;
      default: return onboards;
    }
  }, [activeTab, onboards, awaitingForm, awaitingReview, awaitingPayment, activeStays, cancelled]);

  const TABS: { id: FilterTab; label: string; count: number }[] = [
    { id: "ALL", label: "All Stays", count: onboards.length },
    { id: "FORM", label: "Awaiting Form", count: awaitingForm.length },
    { id: "REVIEW", label: "Awaiting Review", count: awaitingReview.length },
    { id: "PAYMENT", label: "Awaiting Payment", count: awaitingPayment.length },
    { id: "ACTIVE", label: "Active", count: activeStays.length },
    { id: "CANCELLED", label: "Cancelled", count: cancelled.length },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full px-4 md:px-6 xl:px-8 py-5 bg-white dark:bg-black min-h-screen">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pb-5 border-b border-[#dedede]">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-black dark:text-white">Portfolio Onboarding</h1>
          <p className="text-[#767676] text-[14px] mt-0.5">Monitor all onboarding applications, verifications, and active stays across all properties.</p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="py-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-hide">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "h-9 px-4 rounded-[6px] text-[13px] font-semibold transition-all flex items-center gap-2 whitespace-nowrap",
                activeTab === t.id
                  ? "bg-[#282828] text-white"
                  : "border border-[#dedede] text-[#767676] hover:text-black hover:border-[#c0c0c0] bg-white"
              )}
            >
              {t.label}
              <span className={cn(
                "text-[11px] px-1.5 py-0.5 rounded-full",
                activeTab === t.id ? "bg-white/20 text-white" : "bg-[#f2f2f2] text-[#767676]"
              )}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <LoadingSkeleton />
      ) : filteredItems.length === 0 ? (
        <EmptyOnboards tab={activeTab} />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-[7px] border border-[#dedede] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-[#f2f2f2] bg-[#fafafa]">
                    {["Tenant", "Hostel", "Status", "Stay Info", "Actions"].map((h, i) => (
                      <th
                        key={h}
                        className={cn(
                          "px-4 py-3 text-[12px] font-semibold text-[#767676] uppercase tracking-wide text-left",
                          i === 4 && "text-right"
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, idx) => {
                    const label = STATUS_LABELS[item.status] || item.status;
                    const style = STATUS_STYLES[item.status] || "bg-[#f2f2f2] text-[#767676]";
                    const needsPaymentVerify = item.status === "APPROVED_AWAITING_PAYMENT" && item.hasPendingPayment;

                    return (
                      <tr
                        key={item.id}
                        onClick={() => router.push(`/admin/onboards/${item.id}?hostelId=${item.hostel.id}`)}
                        className="border-b border-[#f2f2f2] last:border-0 bg-white hover:bg-[#fafafa] transition-colors cursor-pointer group"
                      >
                        {/* Tenant */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-full bg-[#e0e0e0] flex items-center justify-center text-[12px] font-bold text-[#5c5c5c] shrink-0">
                              {getInitials(item.tenant.fullName)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[14px] font-semibold text-black dark:text-white truncate">{item.tenant.fullName}</p>
                              <p className="text-[12px] font-mono text-[#767676]">{item.tenant.phone}</p>
                            </div>
                          </div>
                        </td>

                        {/* Hostel */}
                        <td className="px-4 py-3">
                          <p className="text-[14px] font-semibold text-black dark:text-white">{item.hostel.name}</p>
                          <p className="text-[12px] text-[#767676] mt-0.5">
                            {item.bed.roomNumber} - {item.bed.label}
                          </p>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-start gap-1.5">
                            <span className={cn("text-[11px] font-bold px-2.5 py-1 rounded-full", style)}>
                              {label}
                            </span>
                            {needsPaymentVerify && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fee2e2] text-[#b91c1c] animate-pulse flex items-center gap-1">
                                <AlertCircle className="size-3" />
                                Verify Payment
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Stay Info */}
                        <td className="px-4 py-3">
                          <span className="text-[13px] text-[#767676]">
                            {formatDate(item.joiningDate)} to {formatDate(item.endDate)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {item.status === "ONBOARDING_PENDING" && !item.tenant.hasProfile && item.onboardingRequest && (
                              <button
                                onClick={() => handleViewPassword(item.onboardingRequest!.id, item.tenant.phone)}
                                className="flex items-center gap-1.5 h-8 px-3 rounded-[6px] border border-[#dedede] text-[12px] font-semibold text-[#767676] hover:text-black hover:border-[#c0c0c0] transition-colors bg-white"
                              >
                                <Key className="size-3.5" /> Key
                              </button>
                            )}
                            {item.status === "ONBOARDING_PENDING" && (
                              <button
                                onClick={() => setConfirmCancel({ stayId: item.id, hostelId: item.hostel.id })}
                                className="flex items-center gap-1.5 h-8 px-3 rounded-[6px] text-[12px] font-semibold text-[#e23030] hover:bg-[#fee2e2] transition-colors"
                              >
                                Cancel
                              </button>
                            )}
                            <Link
                              href={`/admin/onboards/${item.id}?hostelId=${item.hostel.id}`}
                              className="size-8 rounded-[6px] border border-[#dedede] flex items-center justify-center text-[#767676] hover:text-black hover:border-[#c0c0c0] transition-colors bg-white"
                            >
                              <ArrowRight className="size-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden flex flex-col gap-3">
            {filteredItems.map((item) => {
              const label = STATUS_LABELS[item.status] || item.status;
              const style = STATUS_STYLES[item.status] || "bg-[#f2f2f2] text-[#767676]";
              const needsPaymentVerify = item.status === "APPROVED_AWAITING_PAYMENT" && item.hasPendingPayment;

              return (
                <div
                  key={item.id}
                  onClick={() => router.push(`/admin/onboards/${item.id}?hostelId=${item.hostel.id}`)}
                  className="rounded-[7px] border border-[#dedede] bg-white p-4 cursor-pointer hover:border-[#c0c0c0] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-10 rounded-full bg-[#e0e0e0] flex items-center justify-center text-[13px] font-bold text-[#5c5c5c] shrink-0">
                        {getInitials(item.tenant.fullName)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-bold text-black truncate">{item.tenant.fullName}</p>
                        <p className="text-[12px] font-mono text-[#767676]">{item.tenant.phone}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={cn("text-[11px] font-bold px-2.5 py-1 rounded-full", style)}>
                        {label}
                      </span>
                      {needsPaymentVerify && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#fee2e2] text-[#b91c1c] animate-pulse">
                          Verify Payment
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-1.5 text-[13px] text-[#767676]">
                    <p className="flex items-center gap-2">
                      <span className="font-semibold text-black dark:text-white">{item.hostel.name}</span>
                      <span>·</span>
                      <span>{item.bed.roomNumber} - {item.bed.label}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock className="size-3.5" />
                      {formatDate(item.joiningDate)} to {formatDate(item.endDate)}
                    </p>
                  </div>

                  <div className="mt-4 flex gap-2 pt-3 border-t border-[#f2f2f2]" onClick={(e) => e.stopPropagation()}>
                    {item.status === "ONBOARDING_PENDING" && !item.tenant.hasProfile && item.onboardingRequest && (
                      <button
                        onClick={() => handleViewPassword(item.onboardingRequest!.id, item.tenant.phone)}
                        className="flex-1 h-9 rounded-[6px] border border-[#dedede] text-[13px] font-semibold text-[#767676] hover:text-black transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Key className="size-3.5" /> Key
                      </button>
                    )}
                    {item.status === "ONBOARDING_PENDING" && (
                      <button
                        onClick={() => setConfirmCancel({ stayId: item.id, hostelId: item.hostel.id })}
                        className="flex-1 h-9 rounded-[6px] border border-[#dedede] text-[13px] font-semibold text-[#e23030] hover:bg-[#fee2e2] hover:border-transparent transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Ban className="size-3.5" /> Cancel
                      </button>
                    )}
                    <Link
                      href={`/admin/onboards/${item.id}?hostelId=${item.hostel.id}`}
                      className="flex-1 h-9 rounded-[6px] bg-[#282828] text-[13px] font-semibold text-white hover:bg-black transition-colors flex items-center justify-center gap-1.5"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[12px] text-[#a1a1a1] mt-3">
            Showing {filteredItems.length} onboards
          </p>
        </>
      )}

      {/* ── Cancel Confirmation Modal ── */}
      {confirmCancel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => { if (!cancelling) setConfirmCancel(null); }}
        >
          <div
            className="w-full max-w-md rounded-[10px] border border-[#dedede] bg-white shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-2">
              <h2 className="text-[18px] font-bold text-black">Cancel Onboarding Request?</h2>
              <button
                onClick={() => { if (!cancelling) setConfirmCancel(null); }}
                className="size-8 rounded-[6px] border border-[#dedede] flex items-center justify-center text-[#767676] hover:text-black transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
            
            <p className="text-[14px] text-[#767676] mb-6">
              This will mark the application as cancelled and immediately free up the reserved bed. The tenant will no longer be able to log in or complete this form.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmCancel(null)}
                disabled={!!cancelling}
                className="flex-1 h-10 rounded-[6px] border border-[#dedede] text-[14px] font-semibold text-[#767676] hover:text-black transition-colors disabled:opacity-50"
              >
                Keep Request
              </button>
              <button
                onClick={executeCancel}
                disabled={!!cancelling}
                className="flex-1 h-10 rounded-[6px] bg-[#e23030] text-white text-[14px] font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cancelling && <Loader2 className="size-4 animate-spin" />}
                Cancel Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Password Modal ── */}
      {passwordModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => { if (!passwordLoading) { setPasswordModal(null); setRevealedPassword(""); } }}
        >
          <div
            className="w-full max-w-md rounded-[10px] border border-[#dedede] bg-white shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-[18px] font-bold text-black">Tenant Login Details</h2>
                <p className="text-[13px] text-[#767676] mt-0.5">
                  Provide this temporary password to the tenant so they can log in via their phone number.
                </p>
              </div>
              <button
                onClick={() => { if (!passwordLoading) { setPasswordModal(null); setRevealedPassword(""); } }}
                className="size-8 rounded-[6px] border border-[#dedede] flex items-center justify-center text-[#767676] hover:text-black transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <div className="rounded-[7px] border border-[#dedede] p-3 bg-[#fafafa] flex justify-between items-center">
                <span className="text-[13px] font-semibold text-[#767676]">Phone:</span>
                <span className="font-mono text-[14px] font-bold text-black">{passwordModal.phone}</span>
              </div>
              
              <div className="rounded-[7px] border border-[#dedede] p-3 bg-[#fafafa] flex justify-between items-center">
                <span className="text-[13px] font-semibold text-[#767676]">Password:</span>
                <div className="flex items-center gap-2">
                  {passwordLoading ? (
                    <Loader2 className="size-4 animate-spin text-[#767676]" />
                  ) : (
                    <>
                      <span className="font-mono text-[18px] font-bold tracking-widest text-black">{revealedPassword}</span>
                      <button
                        onClick={() => {
                          if (revealedPassword) {
                            navigator.clipboard.writeText(revealedPassword).catch(() => {});
                            setPasswordCopied(true);
                            setTimeout(() => setPasswordCopied(false), 2000);
                          }
                        }}
                        className="size-8 rounded-[6px] border border-[#dedede] flex items-center justify-center text-[#767676] hover:text-black transition-colors bg-white"
                      >
                        {passwordCopied ? <Check className="size-4 text-[#18b92b]" /> : <Copy className="size-4" />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => { setPasswordModal(null); setRevealedPassword(""); }}
              className="w-full h-10 rounded-[6px] bg-[#282828] text-white text-[14px] font-semibold hover:bg-black transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="rounded-[7px] border border-[#dedede] overflow-hidden mt-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-[#f2f2f2] last:border-0 animate-pulse">
          <div className="size-9 rounded-full bg-[#f2f2f2] shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 rounded bg-[#f2f2f2]" />
            <div className="h-3 w-24 rounded bg-[#f2f2f2]" />
          </div>
          <div className="h-6 w-20 rounded-full bg-[#f2f2f2]" />
          <div className="h-6 w-24 rounded bg-[#f2f2f2]" />
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyOnboards({ tab }: { tab: FilterTab }) {
  const getMessage = () => {
    switch (tab) {
      case "FORM": return "No tenants currently filling out forms.";
      case "REVIEW": return "No applications pending warden review.";
      case "PAYMENT": return "No approved applications waiting for payment.";
      case "ACTIVE": return "No active stays found.";
      case "CANCELLED": return "No cancelled applications found.";
      default: return "No onboarding applications or stays found.";
    }
  };

  return (
    <div className="mt-16 flex flex-col items-center justify-center gap-4 text-center">
      <div className="size-16 rounded-[10px] bg-[#5c5c5c] flex items-center justify-center">
        <FileText className="size-8 text-[#58ff48]" />
      </div>
      <div>
        <h3 className="text-[18px] font-bold text-black dark:text-white">No Records Found</h3>
        <p className="text-[14px] text-[#767676] mt-1">{getMessage()}</p>
      </div>
    </div>
  );
}
