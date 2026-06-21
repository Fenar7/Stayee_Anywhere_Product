"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, Eye, AlertCircle, FileText, CheckCircle, Clock } from "lucide-react";

interface OnboardItem {
  id: string;
  status: string;
  joiningDate: string;
  endDate: string;
  totalPayable: number;
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
}

export default function WardenOnboardsPage() {
  const [onboards, setOnboards] = useState<OnboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOnboards = async () => {
    try {
      const response = await fetch("/api/warden/onboards");
      if (!response.ok) {
        throw new Error("Failed to fetch onboarding list");
      }
      const data = await response.json();
      setOnboards(data.onboards);
    } catch (err: any) {
      setError(err.message || "An error occurred while loading lists");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnboards();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive max-w-lg mx-auto">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <div>{error}</div>
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ONBOARDING_PENDING":
        return <span className="inline-flex items-center gap-1 rounded bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"><Clock className="h-3 w-3" /> Awaiting Form</span>;
      case "APPROVED_AWAITING_PAYMENT":
        return <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"><FileText className="h-3 w-3" /> Awaiting Payment</span>;
      case "ACTIVE":
      case "EXTENDED":
        return <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="h-3 w-3" /> Active</span>;
      default:
        return <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-800">{status}</span>;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Onboarding Requests &amp; Applications</h1>
        <p className="text-muted-foreground">Review registrations, record payments and activate stays</p>
      </div>

      {/* 1. AWAITING WARDEN REVIEW (Tenant form completed) */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          📋 Awaiting Review <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{awaitingReview.length}</span>
        </h2>
        {awaitingReview.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
            No registration forms awaiting review right now.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {awaitingReview.map((item) => (
              <div key={item.id} className="rounded-lg border bg-card p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="font-bold text-lg">{item.tenant.fullName}</h3>
                      <p className="text-sm text-muted-foreground">{item.tenant.phone}</p>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs border-t pt-4">
                    <div>
                      <span className="text-muted-foreground block">Assigned Bed</span>
                      <span className="font-semibold">{item.bed.roomNumber} - {item.bed.label}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Expected Stay</span>
                      <span className="font-semibold">{formatDate(item.joiningDate)} to {formatDate(item.endDate)}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <Link href={`/warden/onboards/${item.id}`}>
                    <Button className="w-full flex items-center justify-center gap-2">
                      <Eye className="h-4 w-4" /> Review Profile &amp; Documents
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. AWAITING PAYMENT (Approved by Warden) */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          💳 Awaiting Payment <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">{awaitingPayment.length}</span>
        </h2>
        {awaitingPayment.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
            No approved applications awaiting payments.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {awaitingPayment.map((item) => (
              <div key={item.id} className="rounded-lg border bg-card p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="font-bold text-lg">{item.tenant.fullName}</h3>
                      <p className="text-sm text-muted-foreground">{item.tenant.phone}</p>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs border-t pt-4">
                    <div>
                      <span className="text-muted-foreground block">Total Amount Due</span>
                      <span className="font-semibold text-sm text-primary">₹ {item.totalPayable.toLocaleString("en-IN")}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Bed Assignment</span>
                      <span className="font-semibold">{item.bed.roomNumber} - {item.bed.label}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <Link href={`/warden/onboards/${item.id}`}>
                    <Button variant="outline" className="w-full flex items-center justify-center gap-2 border-blue-200 text-blue-800 hover:bg-blue-50 dark:border-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/20">
                      Record Payment &amp; Activate <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. AWAITING TENANT FORM SUBMISSION */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2 text-muted-foreground">
          ⏳ Pending Tenant Registration <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{awaitingTenant.length}</span>
        </h2>
        {awaitingTenant.length > 0 && (
          <div className="border rounded-lg bg-card/40 divide-y overflow-hidden shadow-sm">
            {awaitingTenant.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between gap-4 text-sm">
                <div>
                  <p className="font-bold text-foreground">Phone: {item.tenant.phone}</p>
                  <p className="text-xs text-muted-foreground">Assigned bed: {item.bed.roomNumber} - {item.bed.label} &middot; Expected Joining: {formatDate(item.joiningDate)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Link sent, awaiting form...</span>
                  <Link href={`/warden/onboards/${item.id}`}>
                    <Button size="sm" variant="ghost">View Details</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. ACTIVE RESIDENTS HISTORY */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          ✅ Recently Activated Stays <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-400">{activeStays.length}</span>
        </h2>
        {activeStays.length > 0 ? (
          <div className="border rounded-lg bg-card divide-y overflow-hidden shadow-sm">
            {activeStays.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between gap-4 text-sm">
                <div>
                  <p className="font-semibold text-foreground">{item.tenant.fullName}</p>
                  <p className="text-xs text-muted-foreground">Bed: {item.bed.roomNumber} - {item.bed.label} &middot; Term: {formatDate(item.joiningDate)} to {formatDate(item.endDate)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(item.status)}
                  <Link href={`/warden/onboards/${item.id}`}>
                    <Button size="sm" variant="outline">View Stay</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
            No recently activated stays to show.
          </div>
        )}
      </div>
    </div>
  );
}
