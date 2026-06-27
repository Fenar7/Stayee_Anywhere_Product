"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/toast";
import { MessageSquare, ShieldCheck, FileText, Clock, CreditCard, ClipboardList, RefreshCw } from "lucide-react";
import { rentDueReminder } from "@/lib/whatsapp/templates";
import { buildWaMeLink } from "@/lib/whatsapp/utils";
import { DashboardSkeleton } from "@/components/shared/DashboardSkeleton";
import { cn } from "@/lib/utils";

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

interface ServiceRequestPending {
  id: string;
  type: string;
  amount: number;
  metadata: any;
  stay: {
    id: string;
    tenantName: string;
    bedLabel: string;
    roomNumber: string;
  };
  payment: {
    id: string;
    screenshotDocumentId: string | null;
  } | null;
}

type TabKey = "rent" | "payments" | "applications" | "adhoc";

export default function HostelWorklistsView({
  hostelId,
  baseRoute,
}: {
  hostelId: string | null;
  baseRoute: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("rent");
  const [rentFilter, setRentFilter] = useState<3 | 7 | 14>(14);

  const [rentDueStays, setRentDueStays] = useState<RentDueStay[]>([]);
  const [paymentsPending, setPaymentsPending] = useState<PaymentPendingStay[]>([]);
  const [applicationsPending, setApplicationsPending] = useState<ApplicationPendingStay[]>([]);
  const [serviceRequestsPending, setServiceRequestsPending] = useState<ServiceRequestPending[]>([]);

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
      setServiceRequestsPending(data.serviceRequestsPending || []);
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleRentReminder = (stay: RentDueStay) => {
    const dueDateStr = formatDate(stay.endDate);
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
    { key: "rent", label: "Rent Due Soon", count: rentDueStays.length, icon: <Clock className="size-4" /> },
    { key: "payments", label: "Pending Verification", count: paymentsPending.length, icon: <CreditCard className="size-4" /> },
    { key: "applications", label: "Applications", count: applicationsPending.length, icon: <ClipboardList className="size-4" /> },
    { key: "adhoc", label: "Pending Ad-Hoc Payments", count: serviceRequestsPending.length, icon: <CreditCard className="size-4" /> },
  ];

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-white w-full max-w-[1400px] mx-auto px-4 py-5">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pb-6">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-black flex items-center gap-2">
            Worklists <span className="text-[24px]">👋</span>
          </h1>
          <p className="text-[#767676] text-[14px] font-medium mt-0.5">
            Action items requiring your attention
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="flex items-center justify-center h-10 px-5 border border-[#dedede] rounded-[6px] bg-white text-black text-[15px] font-semibold hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            <RefreshCw className="mr-2 size-4 text-[#5c5c5c]" />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center justify-center h-10 px-4 rounded-[6px] text-[14px] font-semibold transition-colors whitespace-nowrap border",
              activeTab === tab.key
                ? "bg-[#282828] text-[#58ff48] border-[#282828] hover:bg-black"
                : "bg-white text-black border-[#dedede] hover:bg-gray-50"
            )}
          >
            <span className="mr-2 text-current opacity-80">{tab.icon}</span>
            {tab.label}
            <span
              className={cn(
                "ml-2 flex h-[20px] min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
                activeTab === tab.key
                  ? "bg-[#58ff48]/20 text-[#58ff48]"
                  : "bg-[#f2f2f2] text-[#767676]"
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="rounded-[7px] border border-[#dedede] bg-white p-5 w-full">
        
        {/* Rent Due Soon */}
        {activeTab === "rent" && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f2f2f2] pb-4">
              <h3 className="text-[16px] font-semibold text-black">Rent Due Soon</h3>
              <div className="flex gap-2 bg-[#f2f2f2] p-1 rounded-[5px]">
                {([3, 7, 14] as const).map((days) => (
                  <button
                    key={days}
                    onClick={() => setRentFilter(days)}
                    className={cn(
                      "rounded-[4px] px-3 py-1.5 text-[12px] font-semibold transition-colors",
                      rentFilter === days
                        ? "bg-white text-black shadow-sm"
                        : "text-[#767676] hover:text-black"
                    )}
                  >
                    {days} days ({rentDueStays.filter((s) => s.daysRemaining <= days).length})
                  </button>
                ))}
              </div>
            </div>

            {filteredRentDue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="size-12 rounded-full bg-[#f2f2f2] flex items-center justify-center mb-3">
                  <Clock className="size-6 text-[#a1a1a1]" />
                </div>
                <p className="text-[14px] text-[#767676] font-medium">No stays due within {rentFilter} days.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRentDue.map((stay) => (
                  <div
                    key={stay.id}
                    className="flex flex-col justify-between gap-4 p-4 rounded-[6px] border border-[#dedede] bg-white hover:border-[#a1a1a1] transition-colors"
                  >
                    <div>
                      <p className="text-[15px] font-semibold text-black leading-snug">{stay.tenant.fullName}</p>
                      <p className="text-[12px] text-[#767676] mt-1 leading-snug">
                        Room {stay.bed.roomNumber} &middot; Bed {stay.bed.label} &middot; Checkout: {formatDate(stay.endDate)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[13px] font-bold text-black">₹{stay.rentAmount.toLocaleString("en-IN")}</span>
                        <span className="text-[#dedede]">|</span>
                        <span
                          className={cn(
                            "text-[12px] font-semibold",
                            stay.daysRemaining <= 3 ? "text-red-500" : stay.daysRemaining <= 7 ? "text-yellow-600" : "text-[#767676]"
                          )}
                        >
                          {stay.daysRemaining} day{stay.daysRemaining !== 1 ? "s" : ""} left
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRentReminder(stay)}
                      className="w-full h-[36px] rounded-[5px] bg-[#282828] hover:bg-black text-[#58ff48] text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      <MessageSquare className="size-4" />
                      Send WhatsApp Reminder
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Payments Pending Verification */}
        {activeTab === "payments" && (
          <div className="space-y-5">
            <div className="border-b border-[#f2f2f2] pb-4">
              <h3 className="text-[16px] font-semibold text-black">Payments Pending Verification</h3>
            </div>
            
            {paymentsPending.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="size-12 rounded-full bg-[#f2f2f2] flex items-center justify-center mb-3">
                  <CreditCard className="size-6 text-[#a1a1a1]" />
                </div>
                <p className="text-[14px] text-[#767676] font-medium">No payments pending verification.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paymentsPending.map((stay) => (
                  <div
                    key={stay.id}
                    className="flex flex-col justify-between gap-4 p-4 rounded-[6px] border border-[#dedede] bg-white hover:border-[#a1a1a1] transition-colors"
                  >
                    <div>
                      <p className="text-[15px] font-semibold text-black leading-snug">{stay.tenant.fullName}</p>
                      <p className="text-[12px] text-[#767676] mt-1 leading-snug">
                        Room {stay.bed.roomNumber} &middot; Bed {stay.bed.label}
                      </p>
                      <div className="mt-3 space-y-1.5">
                        {stay.pendingPayments.map((pmt) => (
                          <div key={pmt.id} className="flex justify-between items-center text-[12px] font-medium bg-[#f2f2f2] rounded px-2 py-1">
                            <span className="text-[#767676]">Amount: <span className="text-black">₹{pmt.amount.toLocaleString("en-IN")}</span></span>
                            {pmt.transactionRefNo && (
                              <span className="font-mono text-[#a1a1a1]">Ref: {pmt.transactionRefNo}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`${baseRoute}/onboards/${stay.id}`)}
                      className="w-full h-[36px] rounded-[5px] border border-[#dedede] bg-white hover:bg-gray-50 text-black text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      <ShieldCheck className="size-4 text-[#5c5c5c]" />
                      Verify Payment
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Applications Awaiting Review */}
        {activeTab === "applications" && (
          <div className="space-y-5">
            <div className="border-b border-[#f2f2f2] pb-4">
              <h3 className="text-[16px] font-semibold text-black">Applications Awaiting Review</h3>
            </div>
            
            {applicationsPending.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="size-12 rounded-full bg-[#f2f2f2] flex items-center justify-center mb-3">
                  <ClipboardList className="size-6 text-[#a1a1a1]" />
                </div>
                <p className="text-[14px] text-[#767676] font-medium">No applications awaiting review.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {applicationsPending.map((stay) => (
                  <div
                    key={stay.id}
                    className="flex flex-col justify-between gap-4 p-4 rounded-[6px] border border-[#dedede] bg-white hover:border-[#a1a1a1] transition-colors"
                  >
                    <div>
                      <p className="text-[15px] font-semibold text-black leading-snug">{stay.tenant.fullName}</p>
                      <p className="text-[12px] text-[#767676] mt-1 leading-snug">
                        Room {stay.bed.roomNumber} &middot; Bed {stay.bed.label}
                      </p>
                      <div className="mt-2 space-y-0.5">
                         <p className="text-[12px] font-medium text-[#767676]">Joining: <span className="text-black">{formatDate(stay.joiningDate)}</span></p>
                         {stay.tenant.phone && (
                           <p className="text-[12px] font-medium text-[#767676]">Phone: <span className="text-black">{stay.tenant.phone}</span></p>
                         )}
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`${baseRoute}/onboards/${stay.id}`)}
                      className="w-full h-[36px] rounded-[5px] border border-[#dedede] bg-white hover:bg-gray-50 text-black text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      <FileText className="size-4 text-[#5c5c5c]" />
                      Review Application
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pending Ad-Hoc Payments */}
        {activeTab === "adhoc" && (
          <div className="space-y-5">
            <div className="border-b border-[#f2f2f2] pb-4">
              <h3 className="text-[16px] font-semibold text-black">Pending Ad-Hoc Payments</h3>
            </div>
            
            {serviceRequestsPending.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="size-12 rounded-full bg-[#f2f2f2] flex items-center justify-center mb-3">
                  <CreditCard className="size-6 text-[#a1a1a1]" />
                </div>
                <p className="text-[14px] text-[#767676] font-medium">No ad-hoc payments pending verification.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {serviceRequestsPending.map((sr) => (
                  <div
                    key={sr.id}
                    className="flex flex-col justify-between gap-4 p-4 rounded-[6px] border border-[#dedede] bg-white hover:border-[#a1a1a1] transition-colors"
                  >
                    <div>
                      <p className="text-[15px] font-semibold text-black leading-snug">{sr.stay.tenantName}</p>
                      <p className="text-[12px] text-[#767676] mt-1 leading-snug">
                        Room {sr.stay.roomNumber} &middot; Bed {sr.stay.bedLabel}
                      </p>
                      <p className="text-[13px] font-medium text-black mt-2">
                        Type: <span className="capitalize font-normal text-[#767676]">{sr.type.replace(/_/g, " ").toLowerCase()}</span>
                      </p>
                      <p className="text-[13px] font-bold text-black mt-0.5">
                        Amount: ₹{sr.amount.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <button
                      onClick={() => router.push(`${baseRoute}/service-requests/${sr.id}`)}
                      className="w-full h-[36px] rounded-[5px] border border-[#dedede] bg-white hover:bg-gray-50 text-black text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      <ShieldCheck className="size-4 text-[#5c5c5c]" />
                      Verify Ad-Hoc
                    </button>
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
