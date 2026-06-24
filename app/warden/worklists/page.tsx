"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { notify } from "@/lib/toast";
import { Loader2, MessageSquare, ShieldCheck, FileText, Clock, CreditCard, ClipboardList } from "lucide-react";
import { rentDueReminder, applicationApprovedPaymentRequest } from "@/lib/whatsapp/templates";
import { buildWaMeLink, normalizePhoneNumber } from "@/lib/whatsapp/utils";
import { getStartOfDayIST, addDays, diffInDays } from "@/lib/dates";
import { DashboardSkeleton } from "@/components/shared/DashboardSkeleton";

export const dynamic = "force-dynamic";

interface RentDueStay {
  id: string;
  status: string;
  joiningDate: string;
  endDate: string;
  daysRemaining: number;
  rentAmount: number;
  tenant: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
  };
  bed: {
    id: string;
    label: string;
    roomNumber: string;
  };
}

interface PaymentPendingStay {
  id: string;
  status: string;
  totalPayable: number;
  tenant: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
  };
  bed: {
    id: string;
    label: string;
    roomNumber: string;
  };
  pendingPayments: {
    id: string;
    amountPaise: number;
    amount: number;
    transactionRefNo: string | null;
    paymentStatus: string;
  }[];
}

interface ApplicationPendingStay {
  id: string;
  status: string;
  joiningDate: string;
  endDate: string;
  tenant: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
  };
  bed: {
    id: string;
    label: string;
    roomNumber: string;
  };
}

type TabKey = "rent" | "payments" | "applications";

export default function WardenWorklistsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hostelId = searchParams.get("hostelId");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("rent");
  const [rentFilter, setRentFilter] = useState<3 | 7 | 14>(14);

  const [rentDueStays, setRentDueStays] = useState<RentDueStay[]>([]);
  const [paymentsPending, setPaymentsPending] = useState<PaymentPendingStay[]>([]);
  const [applicationsPending, setApplicationsPending] = useState<ApplicationPendingStay[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const query = hostelId ? `?hostelId=${hostelId}` : "";
      const res = await fetch(`/api/warden/worklists${query}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch worklists");
      }
      const data = await res.json();
      setRentDueStays(data.rentDueStays);
      setPaymentsPending(data.paymentsPending);
      setApplicationsPending(data.applicationsPending);
    } catch (err: unknown) {
      notify.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [hostelId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredRentDue = rentDueStays.filter((s) => s.daysRemaining <= rentFilter);

  const handleRentReminder = (stay: RentDueStay) => {
    const dueDateStr = new Date(stay.endDate).toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const paymentUrl = `${window.location.origin}/tenant`;
    const phone = stay.tenant.phone ?? "";
    const message = rentDueReminder({
      name: stay.tenant.fullName,
      dueDate: dueDateStr,
      amount: stay.rentAmount,
      paymentUrl,
      daysRemaining: stay.daysRemaining,
    });
    window.open(buildWaMeLink(phone, message), "_blank");
  };

  const tabs: { key: TabKey; label: string; count: number; icon: React.ReactNode }[] = [
    { key: "rent", label: "Rent Due Soon", count: rentDueStays.length, icon: <Clock className="h-4 w-4" /> },
    { key: "payments", label: "Pending Verification", count: paymentsPending.length, icon: <CreditCard className="h-4 w-4" /> },
    { key: "applications", label: "Applications", count: applicationsPending.length, icon: <ClipboardList className="h-4 w-4" /> },
  ];

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Warden Worklists</h1>
        <p className="text-muted-foreground">Action items requiring your attention</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-card-foreground hover:bg-muted"
            }`}
          >
            {tab.icon}
            {tab.label}
            <span
              className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                activeTab === tab.key
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="rounded-lg border bg-card shadow-sm">
        {/* Rent Due Soon */}
        {activeTab === "rent" && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Rent Due Soon</h2>
            </div>

            {/* Sub-filters */}
            <div className="flex gap-2">
              {([3, 7, 14] as const).map((days) => (
                <button
                  key={days}
                  onClick={() => setRentFilter(days)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    rentFilter === days
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {days} days ({rentDueStays.filter((s) => s.daysRemaining <= days).length})
                </button>
              ))}
            </div>

            {filteredRentDue.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No stays due within {rentFilter} days.
              </p>
            ) : (
              <div className="space-y-3">
                {filteredRentDue.map((stay) => (
                  <div
                    key={stay.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{stay.tenant.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        Room {stay.bed.roomNumber} &middot; Bed {stay.bed.label} &middot; Rent: ₹{stay.rentAmount.toLocaleString("en-IN")} &middot; Checkout:{" "}
                        {new Date(stay.endDate).toLocaleDateString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      <p
                        className={`text-xs font-semibold ${
                          stay.daysRemaining <= 3 ? "text-red-600" : stay.daysRemaining <= 7 ? "text-amber-600" : "text-muted-foreground"
                        }`}
                      >
                        {stay.daysRemaining} day{stay.daysRemaining !== 1 ? "s" : ""} remaining
                      </p>
                    </div>
                    <Button
                      onClick={() => handleRentReminder(stay)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1.5"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Send WhatsApp Reminder
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Payments Pending Verification */}
        {activeTab === "payments" && (
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Payments Pending Verification</h2>
            {paymentsPending.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No payments pending verification.
              </p>
            ) : (
              <div className="space-y-3">
                {paymentsPending.map((stay) => (
                  <div
                    key={stay.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{stay.tenant.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        Room {stay.bed.roomNumber} &middot; Bed {stay.bed.label}
                      </p>
                      <div className="space-y-0.5">
                        {stay.pendingPayments.map((pmt) => (
                          <p key={pmt.id} className="text-xs text-muted-foreground">
                            Pending: ₹{pmt.amount.toLocaleString("en-IN")}
                            {pmt.transactionRefNo && (
                              <span className="ml-1 font-mono">Ref: {pmt.transactionRefNo}</span>
                            )}
                          </p>
                        ))}
                      </div>
                    </div>
                    <Button
                      onClick={() => router.push(`/warden/onboards/${stay.id}`)}
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1.5"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Verify Payment
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Applications Awaiting Review */}
        {activeTab === "applications" && (
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Applications Awaiting Review</h2>
            {applicationsPending.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No applications awaiting review.
              </p>
            ) : (
              <div className="space-y-3">
                {applicationsPending.map((stay) => (
                  <div
                    key={stay.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{stay.tenant.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        Room {stay.bed.roomNumber} &middot; Bed {stay.bed.label} &middot; Joining:{" "}
                        {new Date(stay.joiningDate).toLocaleDateString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      {stay.tenant.phone && (
                        <p className="text-xs text-muted-foreground">Phone: {stay.tenant.phone}</p>
                      )}
                    </div>
                    <Button
                      onClick={() => router.push(`/warden/onboards/${stay.id}`)}
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1.5"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Review Application
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
