"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, XCircle, Key, Copy, Check, Eye, ArrowRight } from "lucide-react";
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

export default function AdminOnboardsPage() {
  const [onboards, setOnboards] = useState<OnboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<{stayId: string, hostelId: string} | null>(null);

  // Password modal
  const [passwordModal, setPasswordModal] = useState<{
    onboardingReqId: string;
    phone: string;
  } | null>(null);
  const [revealedPassword, setRevealedPassword] = useState("");
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const fetchOnboards = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/onboards");
      if (!response.ok) throw new Error("Failed to fetch onboarding list");
      const data = await response.json();
      setOnboards(data.onboards);
    } catch (err: any) {
      notify.error(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOnboards();
  }, [fetchOnboards]);

  const executeCancel = async () => {
    if (!confirmCancel) return;
    const { stayId, hostelId } = confirmCancel;
    
    setConfirmCancel(null);
    setCancelling(stayId);

    try {
      const response = await fetch(`/api/admin/onboards/${stayId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostelId }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to cancel");
      }

      fetchOnboards();
      notify.success("Request cancelled successfully");
    } catch (err: any) {
      notify.error(err.message || "Failed to cancel onboarding request");
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
    } catch (err: any) {
      notify.error(err.message || "An error occurred");
    } finally {
      setPasswordLoading(false);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });

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

  return (
    <div className="space-y-10 max-w-7xl mx-auto px-4 py-6">
      <div className="border-b pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
          Onboarding Management
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Oversee, review, cancel and manage all tenant onboarding flows across all portfolio hostels.
        </p>
      </div>

      {/* 1. LINK SENT, AWAITING FORM */}
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
                    <span className="h-2 w-2 rounded-full bg-yellow-500 shrink-0" />
                    <p className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                      {item.hostel.name} &mdash; {item.tenant.phone}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Bed: {item.bed.roomNumber}-{item.bed.label}
                    {item.bed.status === "ON_HOLD" && (
                      <span className="ml-2 text-amber-600 font-semibold">(ON HOLD)</span>
                    )}
                    &middot; Sent: {item.onboardingRequest ? formatDate(item.onboardingRequest.createdAt) : "—"}
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
                    variant="ghost"
                    size="sm"
                    disabled={cancelling === item.id}
                    onClick={() => setConfirmCancel({stayId: item.id, hostelId: item.hostel.id})}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs font-semibold"
                  >
                    {cancelling === item.id ? (
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

      {/* 2. AWAITING REVIEW */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-xl font-bold flex items-center gap-2.5 text-foreground">
            <span>📋 Awaiting Application Review</span>
            <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              {awaitingReview.length}
            </span>
          </h2>
        </div>
        {awaitingReview.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm bg-card/25 shadow-sm">
            No forms awaiting review.
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
                        {item.hostel.name}
                      </span>
                      <h3 className="font-extrabold text-lg text-foreground group-hover:text-primary transition-colors">
                        {item.tenant.fullName}
                      </h3>
                      <p className="text-sm text-muted-foreground font-mono mt-0.5">{item.tenant.phone}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 px-2.5 py-0.5 text-xs font-semibold text-yellow-800 dark:text-yellow-400">
                        Awaiting Review
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-4 text-xs border-t pt-4 border-muted/50">
                    <div>
                      <span className="text-muted-foreground block mb-0.5">Assigned Bed</span>
                      <span className="font-semibold text-foreground bg-muted px-2 py-0.5 rounded inline-block">
                        {item.bed.roomNumber}-{item.bed.label}
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

      {/* 3. AWAITING PAYMENT */}
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
                        {item.hostel.name}
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
                      {item.hasPendingPayment ? (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                          ⚡ Verify Payment
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:text-blue-400">
                          Awaiting Payment
                        </span>
                      )}
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-4 text-xs border-t pt-4 border-muted/50">
                    <div>
                      <span className="text-muted-foreground block mb-0.5">Total Payable</span>
                      <span className="font-bold text-sm text-primary">
                        ₹ {item.totalPayable.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-0.5">Bed Assignment</span>
                      <span className="font-semibold text-foreground bg-muted px-2 py-0.5 rounded inline-block">
                        {item.bed.roomNumber}-{item.bed.label}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 4. ACTIVE STAYS */}
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
            No active stays.
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
                    {item.hostel.name} &middot; Bed: {item.bed.roomNumber}-{item.bed.label}
                    &middot; Term: {formatDate(item.joiningDate)} to {formatDate(item.endDate)}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-xs font-semibold text-green-800 dark:text-green-400">
                    Active
                  </span>
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
                    This password was generated fresh. Old passwords are invalidated.
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

      <AlertDialog open={!!confirmCancel} onOpenChange={(open) => !open && setConfirmCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Onboarding Request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently cancel the onboarding request. The assigned bed will be freed back to the AVAILABLE pool.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Continue Cancellation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
