"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, Eye, AlertCircle, FileText, CheckCircle, Clock, XCircle, Key, Copy, Check } from "lucide-react";
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
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { notify } from "@/lib/toast";
import { PageHeader } from "@/components/shared/PageHeader";

interface OnboardItem {
  id: string;
  status: string;
  joiningDate: string;
  endDate: string;
  totalPayable: number;
  hasPendingPayment?: boolean;
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
  };
  onboardingRequest?: {
    id: string;
    status: string;
    createdAt: string;
  } | null;
}

export default function WardenOnboardsPage() {
  const [onboards, setOnboards] = useState<OnboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  // Password modal
  const [passwordModal, setPasswordModal] = useState<{
    onboardingReqId: string;
    phone: string;
  } | null>(null);
  const [revealedPassword, setRevealedPassword] = useState("");
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const fetchOnboards = async () => {
    try {
      const response = await fetch("/api/warden/onboards");
      if (!response.ok) {
        throw new Error("Failed to fetch onboarding list");
      }
      const data = await response.json();
      setOnboards(data.onboards);
    } catch (err: any) {
      notify.error(err.message || "An error occurred while loading lists");
    } finally {
      setLoading(false);
    }
  };

  const executeCancel = async () => {
    if (!confirmCancelId) return;
    const id = confirmCancelId;
    setConfirmCancelId(null);
    setCancellingId(id);
    try {
      const response = await fetch(`/api/admin/onboards/${id}/cancel`, {
        method: "POST",
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to cancel");
      }
      await fetchOnboards();
      notify.success("Request cancelled successfully");
    } catch (err: any) {
      notify.error(err.message || "Failed to cancel onboarding request");
    } finally {
      setCancellingId(null);
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
    } catch (err: any) {
      notify.error(err.message || "An error occurred");
    } finally {
      setPasswordLoading(false);
    }
  };

  useEffect(() => {
    fetchOnboards();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="border-b pb-6">
          <div className="h-8 w-64 bg-muted rounded animate-pulse mb-2" />
          <div className="h-4 w-96 bg-muted rounded animate-pulse" />
        </div>
        <TableSkeleton />
      </div>
    );
  }

  // Filter stays into categories
  const awaitingTenant = onboards.filter(
    (item) => item.status === "ONBOARDING_PENDING" && !item.tenant.hasProfile
  );
  
  const awaitingReview = onboards.filter(
    (item) => item.status === "ONBOARDING_PENDING" && item.tenant.hasProfile
  );

  const awaitingPayment = onboards.filter(
    (item) => item.status === "APPROVED_AWAITING_PAYMENT"
  );

  const activeStays = onboards.filter(
    (item) => item.status === "ACTIVE" || item.status === "EXTENDED"
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string, hasPendingPayment?: boolean) => {
    switch (status) {
      case "ONBOARDING_PENDING":
        return <span className="inline-flex items-center gap-1 rounded bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"><Clock className="h-3 w-3" /> Awaiting Form</span>;
      case "APPROVED_AWAITING_PAYMENT":
        if (hasPendingPayment) {
          return (
            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-500/30 animate-pulse">
              ⚡ Verify Payment
            </span>
          );
        }
        return <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"><FileText className="h-3 w-3" /> Awaiting Payment</span>;
      case "ACTIVE":
      case "EXTENDED":
        return <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="h-3 w-3" /> Active</span>;
      default:
        return <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-800">{status}</span>;
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        title="Onboarding Applications"
        description="Verify documents, record deposits, activate resident stays and retrieve access passwords."
        actions={
          <a
            href="/warden/onboard"
            className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground hover:bg-primary/80 transition-colors"
          >
            + Onboard New Tenant
          </a>
        }
      />
      <div className="space-y-10 p-6">

      {/* 1. AWAITING WARDEN REVIEW (Tenant form completed) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-xl font-bold flex items-center gap-2.5 text-foreground">
            <span>📋 Awaiting Warden Review</span>
            <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              {awaitingReview.length}
            </span>
          </h2>
        </div>
        {awaitingReview.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm bg-card/25 shadow-sm">
            No registration forms awaiting review right now.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {awaitingReview.map((item) => (
              <Link
                href={`/warden/onboards/${item.id}`}
                key={item.id}
                className="group relative flex flex-col justify-between rounded-xl border bg-card p-6 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer duration-200 overflow-hidden"
              >
                <div>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                        Application Form Complete
                      </span>
                      <h3 className="font-extrabold text-lg text-foreground group-hover:text-primary transition-colors">
                        {item.tenant.fullName}
                      </h3>
                      <p className="text-sm text-muted-foreground font-mono mt-0.5">{item.tenant.phone}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(item.status)}
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-4 text-xs border-t pt-4 border-muted/50">
                    <div>
                      <span className="text-muted-foreground block mb-0.5">Assigned Bed</span>
                      <span className="font-semibold text-foreground bg-muted px-2 py-0.5 rounded inline-block">
                        {item.bed.roomNumber} - {item.bed.label}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-0.5">Expected Stay</span>
                      <span className="font-semibold text-foreground">
                        {formatDate(item.joiningDate)} to {formatDate(item.endDate)}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 2. AWAITING PAYMENT (Approved by Warden) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-xl font-bold flex items-center gap-2.5 text-foreground">
            <span>💳 Awaiting Deposit Payment</span>
            <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              {awaitingPayment.length}
            </span>
          </h2>
        </div>
        {awaitingPayment.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm bg-card/25 shadow-sm">
            No approved applications awaiting payments.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {awaitingPayment.map((item) => (
              <Link
                href={`/warden/onboards/${item.id}`}
                key={item.id}
                className="group relative flex flex-col justify-between rounded-xl border bg-card p-6 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer duration-200 overflow-hidden"
              >
                <div>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                        Approved Stay &amp; Rent Set
                      </span>
                      <h3 className="font-extrabold text-lg text-foreground group-hover:text-primary transition-colors">
                        {item.tenant.fullName}
                      </h3>
                      <p className="text-sm text-muted-foreground font-mono mt-0.5">{item.tenant.phone}</p>
                      {item.hasPendingPayment && (
                        <div className="mt-2">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-2.5 py-1 text-[10px] font-extrabold text-amber-700 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                            ⚡ Payment Uploaded (Verify Now)
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(item.status, item.hasPendingPayment)}
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-4 text-xs border-t pt-4 border-muted/50">
                    <div>
                      <span className="text-muted-foreground block mb-0.5">Total Amount Due</span>
                      <span className="font-bold text-sm text-primary">
                        ₹ {item.totalPayable.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-0.5">Bed Assignment</span>
                      <span className="font-semibold text-foreground bg-muted px-2 py-0.5 rounded inline-block">
                        {item.bed.roomNumber} - {item.bed.label}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 3. AWAITING TENANT FORM SUBMISSION */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-xl font-bold flex items-center gap-2.5 text-muted-foreground">
            <span>⏳ Link Sent, Awaiting Registration Form</span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
              {awaitingTenant.length}
            </span>
          </h2>
        </div>
        {awaitingTenant.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm bg-card/25 shadow-sm">
            All sent onboarding links have been acted upon.
          </div>
        ) : (
          <div className="border rounded-xl bg-card divide-y overflow-hidden shadow-sm">
            {awaitingTenant.map((item) => (
              <div
                key={item.id}
                className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 hover:bg-muted/20 transition-all duration-150"
              >
                <Link
                  href={`/warden/onboards/${item.id}`}
                  className="flex-1 min-w-0 pr-4"
                >
                  <div className="flex items-center gap-2.5">
                    <Clock className="h-4 w-4 text-yellow-500 shrink-0" />
                    <p className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                      Prospect: {item.tenant.phone}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Bed: {item.bed.roomNumber} - {item.bed.label} &middot; Expected Joining: {formatDate(item.joiningDate)} &middot; Created: {item.onboardingRequest ? formatDate(item.onboardingRequest.createdAt) : "—"}
                  </p>
                </Link>
                <div className="flex items-center gap-2 shrink-0 z-10 self-end sm:self-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      handleViewPassword(
                        item.onboardingRequest?.id || "",
                        item.tenant.phone
                      )
                    }
                    disabled={!item.onboardingRequest?.id}
                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20 text-xs font-semibold"
                  >
                    <Key className="h-4 w-4 mr-1.5" />
                    Reveal Password
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmCancelId(item.id)}
                    disabled={cancellingId === item.id}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs font-semibold"
                  >
                    {cancellingId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-1.5" />
                    )}
                    Cancel Request
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. ACTIVE RESIDENTS HISTORY */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-xl font-bold flex items-center gap-2.5 text-foreground">
            <span>✅ Recently Activated Stays</span>
            <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-bold text-green-600 dark:bg-green-900/30 dark:text-green-400">
              {activeStays.length}
            </span>
          </h2>
        </div>
        {activeStays.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm bg-card/25 shadow-sm">
            No recently activated stays to show.
          </div>
        ) : (
          <div className="border rounded-xl bg-card divide-y overflow-hidden shadow-sm">
            {activeStays.map((item) => (
              <Link
                key={item.id}
                href={`/warden/onboards/${item.id}`}
                className="group relative flex items-center justify-between gap-4 p-5 hover:bg-muted/20 transition-all duration-150"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                    {item.tenant.fullName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Bed: {item.bed.roomNumber} - {item.bed.label} &middot; Term: {formatDate(item.joiningDate)} to {formatDate(item.endDate)}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {getStatusBadge(item.status)}
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Password Reveal Modal */}
      {passwordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="max-w-sm w-full rounded-xl border bg-card shadow-2xl overflow-hidden transform scale-100 transition-all duration-200">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 className="font-extrabold text-sm flex items-center gap-2.5">
                <Key className="h-4 w-4 text-amber-500" />
                Access Password
              </h3>
              <button
                onClick={() => {
                  setPasswordModal(null);
                  setRevealedPassword("");
                }}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted transition-colors"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-xs text-muted-foreground">
                Phone Number: <span className="font-mono text-foreground font-semibold">{passwordModal.phone}</span>
              </p>

              {passwordLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : revealedPassword ? (
                <>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-900/30 p-5 text-center">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">
                      One-time Portal Password
                    </p>
                    <p className="text-3xl font-extrabold font-mono tracking-wider text-amber-900 dark:text-amber-200 select-all">
                      {revealedPassword}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-normal">
                    This password was generated fresh. Old passwords are invalidated. Provide it to the prospect to log in.
                  </p>
                  <Button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(revealedPassword);
                        setPasswordCopied(true);
                        setTimeout(() => setPasswordCopied(false), 3000);
                      } catch {
                        const el = document.createElement("textarea");
                        el.value = revealedPassword;
                        document.body.appendChild(el);
                        el.select();
                        document.execCommand("copy");
                        document.body.removeChild(el);
                        setPasswordCopied(true);
                        setTimeout(() => setPasswordCopied(false), 3000);
                      }
                    }}
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2 border-amber-300 dark:border-amber-900 text-amber-800 dark:text-amber-300 font-semibold"
                  >
                    {passwordCopied ? (
                      <>
                        <Check className="h-4 w-4" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" /> Copy Password
                      </>
                    )}
                  </Button>
                </>
              ) : null}
            </div>
            {revealedPassword && (
              <div className="flex justify-end border-t px-6 py-3.5 bg-muted/20">
                <Button
                  onClick={() => {
                    setPasswordModal(null);
                    setRevealedPassword("");
                  }}
                  size="sm"
                >
                  Done
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <AlertDialog open={!!confirmCancelId} onOpenChange={(open) => !open && setConfirmCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Onboarding Request?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this onboarding request? The bed will be freed back to the available pool.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirm Cancellation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}
