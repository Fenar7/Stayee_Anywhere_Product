"use client";

import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Loader2, LogOut, Clock, Building2, BedSingle, AlertCircle, CheckCircle, Upload, UtensilsCrossed, Calendar, CalendarDays, CreditCard, Download, X, User } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { notify } from "@/lib/toast";
import { DashboardSkeleton } from "@/components/shared/DashboardSkeleton";
import { InitialPaymentForm } from "@/components/tenant/InitialPaymentForm";

// -- Interfaces --

interface TenantDetails {
  fullName: string;
  photoUrl: string | null;
}

interface PaymentItem {
  id: string;
  amountPaid: number;
  paymentMode: string;
  transactionRefNo: string | null;
  notes?: string | null;
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

interface HostelPaymentConfig {
  upiId: string | null;
  qrCodeUrl: string | null;
}

interface ServiceRequestItem {
  id: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
  metadata?: any;
}

interface ApiResponse {
  tenant: TenantDetails | null;
  stay: StayDetails | null;
  hostel: HostelDetails | null;
  bed: BedDetails | null;
  payments: PaymentItem[];
  roommates: RoommateDetails[];
  nextDueDate: string | null;
  pendingServiceRequests?: ServiceRequestItem[];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
}

// Helper components for layout
const DataRow = ({ label, value, icon: Icon }: { label: string, value: string | React.ReactNode, icon?: any }) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3">
    <div className="w-[160px] shrink-0 text-[12px] font-semibold text-[#767676] dark:text-[#a0a0a0] uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
      {Icon && <Icon className="size-3.5" />}
      {label}
    </div>
    <div className="flex-1 text-[14px] font-medium text-[#222222] dark:text-white break-words">
      {value}
    </div>
  </div>
);

const SectionHeader = ({ title, icon: Icon }: { title: string, icon: any }) => (
  <div className="bg-[#fcfcfc] dark:bg-white/5 border-b border-[#dedede] dark:border-white/10 px-6 py-4">
    <h3 className="font-bold text-[14px] text-[#222222] dark:text-white uppercase tracking-wider flex items-center gap-2">
      <Icon className="size-4 text-[#767676] dark:text-[#a0a0a0]" /> {title}
    </h3>
  </div>
);

export default function TenantDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [tenant, setTenant] = useState<TenantDetails | null>(null);
  const [stay, setStay] = useState<StayDetails | null>(null);
  const [hostel, setHostel] = useState<HostelDetails | null>(null);
  const [bed, setBed] = useState<BedDetails | null>(null);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [roommates, setRoommates] = useState<RoommateDetails[]>([]);
  const [nextDueDate, setNextDueDate] = useState<string | null>(null);
  const [pendingServiceRequests, setPendingServiceRequests] = useState<ServiceRequestItem[]>([]);

  const [paymentConfig, setHostelPaymentConfig] = useState<import("@prisma/client").HostelPaymentConfig | null>(null);
  const [homeNotifications, setHomeNotifications] = useState<any[]>([]);

  // Upload Payment State
  const [uploadAmount, setUploadAmount] = useState("");
  const [uploadRef, setUploadRef] = useState("");
  const [uploading, setUploading] = useState(false);

  // Tabs state
  const [activeTab, setActiveTab] = useState("mystay");

  const fetchStayDetails = async () => {
    try {
      const response = await fetch("/api/tenant/stay");
      if (!response.ok) {
        throw new Error("Failed to load dashboard details");
      }
      const data: ApiResponse = await response.json();
      setTenant(data.tenant || null);
      setStay(data.stay);
      setHostel(data.hostel);
      setBed(data.bed);
      setPayments(data.payments || []);
      setRoommates(data.roommates || []);
      setNextDueDate(data.nextDueDate || null);
      setPendingServiceRequests(data.pendingServiceRequests || []);

      if (data.hostel?.id) {
        try {
          const pcRes = await fetch(`/api/public/hostels/${data.hostel.id}/payment-config`);
          if (pcRes.ok) {
            const pcData = await pcRes.json();
            setHostelPaymentConfig(pcData);
          }
        } catch { /* non-critical */ }
      }
    } catch (err) { const errorMsg = err instanceof Error ? err.message : String(err);
      notify.error(errorMsg || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchHomeNotifications = async () => {
    try {
      const res = await fetch("/api/tenant/notifications");
      if (res.ok) {
        const json = await res.json();
        const filtered = (json.notifications || []).filter(
          (n: any) => !n.read && !n.dismissedFromHome
        );
        setHomeNotifications(filtered);
      }
    } catch { /* non-critical */ }
  };

  const handleDismissNotification = async (id: string) => {
    try {
      setHomeNotifications((prev) => prev.filter((n) => n.id !== id));
      await fetch(`/api/tenant/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissedFromHome: true }),
      });
    } catch (err) {
      console.error("Failed to dismiss notification", err);
    }
  };

  useEffect(() => {
    fetchStayDetails();
    fetchHomeNotifications();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const handleUploadPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stay) return;
    setUploading(true);
    try {
      const amountPaise = Math.round(parseFloat(uploadAmount) * 100);
      if (isNaN(amountPaise) || amountPaise <= 0) {
        throw new Error("Please enter a valid amount.");
      }

      const res = await fetch("/api/tenant/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stayId: stay.id,
          amountPaidPaise: amountPaise,
          paymentMode: "UPI",
          transactionRefNo: uploadRef.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit payment");
      }

      notify.success("Payment submitted for verification");
      setUploadAmount("");
      setUploadRef("");
      fetchStayDetails();
    } catch (err) { const errorMsg = err instanceof Error ? err.message : String(err);
      notify.error(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent">
        <DashboardSkeleton />
      </div>
    );
  }

  const verifiedPaid = payments
    .filter((p) => p.paymentStatus === "PAID" || p.paymentStatus === "PARTIALLY_PAID")
    .reduce((sum, p) => sum + p.amountPaid, 0);

  const remainingBalance = stay ? stay.totalPayable - verifiedPaid : 0;

  const pendingRequests = pendingServiceRequests.filter((r) => r.status === "PENDING_PAYMENT");
  const revokedRequests = pendingServiceRequests.filter((r) => r.status === "REVOKED");

  let daysUntilDue = null;
  if (nextDueDate) {
    const due = new Date(nextDueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="min-h-screen bg-transparent pb-16">
      
      {/* 1. Global Premium Top Bar */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 md:px-6 xl:px-8 py-2.5 border-b border-[#dedede] dark:border-white/10 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          <span className="text-[18px] font-bold tracking-tight text-[#222222] dark:text-white">
            Anywhere Node
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-sm border font-bold uppercase tracking-wider bg-[#f5f5f5] dark:bg-white/5 text-[#767676] dark:text-[#a0a0a0] border-[#dedede] dark:border-white/10">
            Tenant
          </span>
        </div>
        
        <div className="flex items-center gap-2 mt-3 sm:mt-0">
          <button onClick={handleLogout} className="premium-button-outline h-9 px-4 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 dark:border-red-900/30">
            <LogOut className="h-4 w-4 mr-2" /> Log Out
          </button>
        </div>
      </header>

      <main className="w-full px-4 md:px-6 xl:px-8 py-6 space-y-6">
        
        {/* Notifications */}
        {homeNotifications.length > 0 && (
          <div className="space-y-3">
            {homeNotifications.map((notif) => (
              <div key={notif.id} className="relative flex items-start gap-4 p-4 premium-card border-l-4 border-l-[#222222] dark:border-l-white">
                <div className="flex-1 pr-8">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-[14px] text-[#222222] dark:text-white">{notif.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-sm border font-bold uppercase tracking-wider bg-[#f5f5f5] dark:bg-white/5 text-[#767676] dark:text-[#a0a0a0]">
                      {notif.type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#767676] dark:text-[#a0a0a0]">{notif.message}</p>
                </div>
                <button
                  onClick={() => handleDismissNotification(notif.id)}
                  className="absolute top-3 right-3 text-[#767676] hover:text-[#222222] dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {!stay ? (
          <div className="premium-card p-10 text-center space-y-4 max-w-md mx-auto mt-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f5f5f5] dark:bg-white/5 text-[#767676] text-3xl">
              🏠
            </div>
            <h2 className="text-[20px] font-bold text-[#222222] dark:text-white">Welcome to Anywhere Node!</h2>
            <p className="text-[14px] text-[#767676] dark:text-[#a0a0a0]">
              You are logged in, but there is no active stay registered for your account. Please contact your warden.
            </p>
          </div>
        ) : stay.status === "ONBOARDING_PENDING" ? (
          <div className="premium-card p-10 text-center space-y-6 max-w-2xl mx-auto mt-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-sm bg-amber-50 dark:bg-amber-900/10 text-amber-600 border border-amber-200 dark:border-amber-900/30">
              <Clock className="h-8 w-8" />
            </div>
            <div className="space-y-3">
              <h2 className="text-[24px] font-bold text-[#222222] dark:text-white">Application Under Review</h2>
              <p className="text-[14px] text-[#767676] dark:text-[#a0a0a0] max-w-md mx-auto">
                Your documents and details are submitted successfully. The warden is currently verifying them.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 text-[12px] font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider">
                <Building2 className="h-4 w-4" /> {hostel?.name} &middot; Bed {bed?.roomNumber}-{bed?.label}
              </div>
            </div>
          </div>
        ) : stay.status === "APPROVED_AWAITING_PAYMENT" ? (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <InitialPaymentForm
                hostel={hostel}
                paymentConfig={paymentConfig}
                remainingBalance={remainingBalance}
                onSuccess={(msg) => { notify.success(msg); fetchStayDetails(); }}
                onError={(msg) => notify.error(msg)}
              />
            </div>
            <div>
              <div className="premium-card flex flex-col divide-y divide-[#dedede] dark:divide-white/10">
                <SectionHeader title="Stay Billing" icon={AlertCircle} />
                <div className="p-6 space-y-3">
                  <div className="flex justify-between text-[14px] font-medium">
                    <span className="text-[#767676]">Hostel</span>
                    <span className="text-[#222222] dark:text-white">{hostel?.name}</span>
                  </div>
                  <div className="flex justify-between text-[14px] font-medium">
                    <span className="text-[#767676]">Bed</span>
                    <span className="text-[#222222] dark:text-white">{bed?.roomNumber} - {bed?.label}</span>
                  </div>
                  <div className="flex justify-between text-[14px] font-medium pt-3 border-t border-[#dedede] dark:border-white/10">
                    <span className="text-[#767676]">Admission Fee</span>
                    <span className="text-[#222222] dark:text-white">₹ {stay.admissionFee.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-[14px] font-medium">
                    <span className="text-[#767676]">Stay Rent</span>
                    <span className="text-[#222222] dark:text-white">₹ {stay.monthlyRent.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-[14px] font-medium">
                    <span className="text-[#767676]">Security Deposit</span>
                    <span className="text-[#222222] dark:text-white">₹ {stay.securityDeposit.toLocaleString("en-IN")}</span>
                  </div>
                  {stay.discount > 0 && (
                    <div className="flex justify-between text-[14px] font-medium text-red-600">
                      <span>Discount Applied</span>
                      <span>- ₹ {stay.discount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[16px] font-bold pt-3 border-t border-[#dedede] dark:border-white/10">
                    <span className="text-[#222222] dark:text-white">Total Due</span>
                    <span className="text-[#222222] dark:text-white">₹ {stay.totalPayable.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Action Banners */}
            {pendingRequests.map((req) => (
              <div key={req.id} className="premium-card bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/50 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <div>
                    <h4 className="font-bold text-[14px] text-orange-900 dark:text-orange-200">Pending Payment Required</h4>
                    <p className="text-[13px] text-orange-800/80 dark:text-orange-300/80">Unpaid {req.type.replace(/_/g, ' ').toLowerCase()} of ₹{req.amount}.</p>
                  </div>
                </div>
                <Link href={`/tenant/service-requests/${req.id}`} className="premium-button bg-orange-600 hover:bg-orange-700 text-white shrink-0">
                  Pay Now
                </Link>
              </div>
            ))}

            {revokedRequests.map((req) => (
              <div key={req.id} className="premium-card bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[14px] text-red-900 dark:text-red-200">Food Plan Revoked</h4>
                  <p className="text-[13px] text-red-800/80 dark:text-red-300/80">
                    A refund of <strong>₹{req.amount}</strong> was processed. {req.metadata?.revocation?.reason && `Reason: ${req.metadata.revocation.reason}`}
                  </p>
                </div>
              </div>
            ))}

            {/* 2. Unified Master Header Card */}
            <div className="premium-card flex flex-col md:flex-row items-stretch">
              {/* Identity Block */}
              <div className="p-6 md:w-2/5 border-b md:border-b-0 md:border-r border-[#dedede] dark:border-white/10 flex items-center gap-5">
                <div className="relative shrink-0">
                  {tenant?.photoUrl ? (
                    <img src={tenant.photoUrl} alt="Profile" className="size-20 rounded-sm border border-[#dedede] dark:border-white/10 object-cover bg-white" />
                  ) : (
                    <div className="size-20 rounded-sm border border-[#dedede] dark:border-white/10 flex items-center justify-center bg-[#f5f5f5] dark:bg-white/5 text-[#767676] dark:text-[#a0a0a0]">
                      <User className="size-8" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-[22px] font-bold text-[#222222] dark:text-white leading-tight tracking-tight">{tenant?.fullName || "Tenant User"}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] font-semibold text-[#767676] dark:text-[#a0a0a0] uppercase tracking-wider">
                    <span className="flex items-center gap-1.5"><Building2 className="size-3.5" /> {hostel?.name}</span>
                    <span className="w-1 h-1 rounded-full bg-[#dedede]" />
                    <span className="flex items-center gap-1.5"><BedSingle className="size-3.5" /> {bed?.roomNumber}-{bed?.label}</span>
                  </div>
                </div>
              </div>

              {/* Metrics Block */}
              <div className="flex-1 flex items-center p-6 bg-[#fcfcfc] dark:bg-white/5">
                <div className="flex-1">
                  <h4 className="text-[11px] font-bold text-[#767676] dark:text-[#a0a0a0] uppercase tracking-wider mb-1">Stay Status</h4>
                  <p className="text-[18px] font-bold text-[#222222] dark:text-white flex items-center gap-2">
                    {stay.status}
                    <span className="flex h-2.5 w-2.5 rounded-full bg-[#58ff48]" />
                  </p>
                </div>
                {nextDueDate && (
                  <div className="flex-1 border-l border-[#dedede] dark:border-white/10 pl-6">
                    <h4 className="text-[11px] font-bold text-[#767676] dark:text-[#a0a0a0] uppercase tracking-wider mb-1">Next Payment</h4>
                    <p className={`text-[18px] font-bold ${daysUntilDue !== null && daysUntilDue <= 7 ? "text-red-600" : "text-[#222222] dark:text-white"}`}>
                      {formatDate(nextDueDate)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Flat Tab Navigation */}
            <div className="border-b border-[#dedede] dark:border-white/10 flex gap-6 overflow-x-auto no-scrollbar pt-2">
              <button 
                onClick={() => setActiveTab("mystay")} 
                className={`pb-3 text-[14px] font-bold whitespace-nowrap transition-colors border-b-2 ${activeTab === "mystay" ? "border-[#222222] dark:border-white text-[#222222] dark:text-white" : "border-transparent text-[#767676] hover:text-[#222222] dark:hover:text-white"}`}
              >
                My Stay
              </button>
              <button 
                onClick={() => setActiveTab("payments")} 
                className={`pb-3 text-[14px] font-bold whitespace-nowrap transition-colors border-b-2 ${activeTab === "payments" ? "border-[#222222] dark:border-white text-[#222222] dark:text-white" : "border-transparent text-[#767676] hover:text-[#222222] dark:hover:text-white"}`}
              >
                Payments Ledger
              </button>
              <button 
                onClick={() => setActiveTab("food")} 
                className={`pb-3 text-[14px] font-bold whitespace-nowrap transition-colors border-b-2 ${activeTab === "food" ? "border-[#222222] dark:border-white text-[#222222] dark:text-white" : "border-transparent text-[#767676] hover:text-[#222222] dark:hover:text-white"}`}
              >
                Food Plan
              </button>
              <button 
                onClick={() => setActiveTab("roommates")} 
                className={`pb-3 text-[14px] font-bold whitespace-nowrap transition-colors border-b-2 ${activeTab === "roommates" ? "border-[#222222] dark:border-white text-[#222222] dark:text-white" : "border-transparent text-[#767676] hover:text-[#222222] dark:hover:text-white"}`}
              >
                Roommates
              </button>
            </div>

            {/* Tab Content */}
            <div className="pt-2">
              
              {/* TAB: MY STAY */}
              {activeTab === "mystay" && (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="premium-card flex flex-col divide-y divide-[#dedede] dark:divide-white/10">
                    <SectionHeader title="Stay Timeline" icon={CalendarDays} />
                    <div className="p-6 space-y-2">
                      <DataRow label="Joining Date" value={formatDate(stay.joiningDate)} />
                      <DataRow label="End Date" value={formatDate(stay.endDate)} />
                      <DataRow label="Duration Type" value={stay.durationType} />
                    </div>
                  </div>

                  <div className="premium-card flex flex-col divide-y divide-[#dedede] dark:divide-white/10">
                    <SectionHeader title="Billing Baseline" icon={CreditCard} />
                    <div className="p-6 space-y-2">
                      <DataRow label="Monthly Rent" value={`₹ ${stay.monthlyRent.toLocaleString("en-IN")}`} />
                      <DataRow label="Food Charges" value={`₹ ${stay.foodCharges.toLocaleString("en-IN")}`} />
                      <DataRow label="Security Deposit" value={`₹ ${stay.securityDeposit.toLocaleString("en-IN")}`} />
                      <DataRow label="Admission Fee" value={`₹ ${stay.admissionFee.toLocaleString("en-IN")}`} />
                      {stay.discount > 0 && <DataRow label="Discount Applied" value={`- ₹ ${stay.discount.toLocaleString("en-IN")}`} />}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: PAYMENTS */}
              {activeTab === "payments" && (
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2 premium-card flex flex-col divide-y divide-[#dedede] dark:divide-white/10">
                    <SectionHeader title="Payment History" icon={CreditCard} />
                    <div className="overflow-x-auto">
                      {payments.length === 0 ? (
                        <div className="p-10 text-center text-[14px] text-[#767676] font-medium">No payments recorded yet.</div>
                      ) : (
                        <table className="premium-table w-full">
                          <thead className="bg-[#fcfcfc] dark:bg-white/5">
                            <tr>
                              <th>Date</th>
                              <th>Amount</th>
                              <th>Ref No</th>
                              <th className="text-right">Status</th>
                              <th className="text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {payments.map((p) => {
                              const isNegative = p.amountPaid < 0;
                              return (
                                <tr key={p.id}>
                                  <td className="font-medium text-[13px]">{formatDate(p.createdAt)}</td>
                                  <td className={`font-bold text-[14px] ${isNegative ? "text-red-600" : ""}`}>
                                    {isNegative ? `-₹ ${Math.abs(p.amountPaid).toLocaleString("en-IN")}` : `₹ ${p.amountPaid.toLocaleString("en-IN")}`}
                                  </td>
                                  <td className="text-[13px] text-[#767676]">
                                    {p.transactionRefNo || "—"}
                                    {isNegative && p.notes && <span className="block text-[11px] text-red-500 mt-1">Refund: {p.notes}</span>}
                                  </td>
                                  <td className="text-right">
                                    <span className={`px-2 py-0.5 text-[10px] rounded-sm font-bold uppercase tracking-wider border ${
                                      p.paymentStatus === "PAID" ? (isNegative ? "bg-red-50 text-red-700 border-red-200" : "bg-[#58ff48]/10 text-green-700 dark:text-[#58ff48] border-[#58ff48]/30") :
                                      p.paymentStatus === "PENDING" ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-[#f5f5f5] text-[#767676] border-[#dedede]"
                                    }`}>
                                      {isNegative ? "Refunded" : p.paymentStatus}
                                    </span>
                                  </td>
                                  <td className="text-right">
                                    {p.paymentStatus === "PAID" && !isNegative && (
                                      <a href={`/api/pdf/receipt/${p.id}`} target="_blank" rel="noopener noreferrer" className="text-[12px] font-bold text-[#222222] dark:text-white hover:underline flex items-center justify-end gap-1">
                                        <Download className="size-3" /> Receipt
                                      </a>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  <div className="premium-card flex flex-col divide-y divide-[#dedede] dark:divide-white/10 h-fit">
                    <SectionHeader title="Upload Payment" icon={Upload} />
                    <div className="p-6">
                      <form onSubmit={handleUploadPayment} className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[12px] font-bold text-[#767676] uppercase tracking-wider">Amount Paid (₹)</label>
                          <input
                            type="number"
                            placeholder="e.g. 5000"
                            value={uploadAmount}
                            onChange={(e) => setUploadAmount(e.target.value)}
                            required
                            min="1"
                            className="premium-input w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[12px] font-bold text-[#767676] uppercase tracking-wider">Transaction Ref / UTR</label>
                          <input
                            type="text"
                            placeholder="12-digit UPI Ref"
                            value={uploadRef}
                            onChange={(e) => setUploadRef(e.target.value)}
                            required
                            className="premium-input w-full"
                          />
                        </div>
                        <button type="submit" className="premium-button w-full justify-center" disabled={uploading}>
                          {uploading ? <Loader2 className="size-4 animate-spin mr-2" /> : <Upload className="size-4 mr-2" />}
                          Submit Payment
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: FOOD */}
              {activeTab === "food" && (
                <div className="premium-card p-10 text-center">
                  {stay.foodPlan === "NOT_INCLUDED" ? (
                    <div className="max-w-md mx-auto space-y-4">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-sm bg-[#f5f5f5] dark:bg-white/5 text-[#767676]">
                        <UtensilsCrossed className="size-8" />
                      </div>
                      <h2 className="text-[20px] font-bold text-[#222222] dark:text-white">Food Not Included</h2>
                      <p className="text-[14px] text-[#767676]">Your stay plan does not include hostel food. Contact your warden to upgrade.</p>
                    </div>
                  ) : (
                    <div className="max-w-md mx-auto space-y-6">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-sm bg-[#f5f5f5] dark:bg-white/5 text-[#222222] dark:text-white">
                        <UtensilsCrossed className="size-8" />
                      </div>
                      <div>
                        <h2 className="text-[20px] font-bold text-[#222222] dark:text-white">Weekly Meal Plan</h2>
                        <p className="text-[14px] text-[#767676] mt-2">Manage your breakfast, lunch, and dinner preferences for the upcoming week.</p>
                      </div>
                      <Link href="/tenant/food" className="premium-button justify-center w-full">
                        Manage Food Orders
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: ROOMMATES */}
              {activeTab === "roommates" && (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {roommates.length === 0 ? (
                    <div className="col-span-full premium-card p-10 text-center space-y-4">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-sm bg-[#f5f5f5] dark:bg-white/5 text-[#767676]">
                        <BedSingle className="size-8" />
                      </div>
                      <h2 className="text-[20px] font-bold text-[#222222] dark:text-white">No Roommates</h2>
                      <p className="text-[14px] text-[#767676]">You currently do not have any roommates in this room.</p>
                    </div>
                  ) : (
                    roommates.map((rm, idx) => (
                      <div key={idx} className="premium-card flex flex-col divide-y divide-[#dedede] dark:divide-white/10">
                        <div className="p-6 flex items-center gap-4">
                          {rm.photoUrl ? (
                            <img src={rm.photoUrl} alt="RM" className="size-14 rounded-sm border border-[#dedede] object-cover" />
                          ) : (
                            <div className="size-14 rounded-sm border border-[#dedede] flex items-center justify-center bg-[#fcfcfc] font-bold text-[#767676]">
                              {getInitials(rm.fullName)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-[16px] text-[#222222] dark:text-white">{rm.fullName}</p>
                            <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-sm border border-[#dedede] font-bold uppercase tracking-wider text-[#767676]">
                              Bed {rm.bedLabel}
                            </span>
                          </div>
                        </div>
                        <div className="p-4 bg-[#fcfcfc] dark:bg-white/5">
                          {rm.occupationType === "STUDENT" ? (
                            <div className="space-y-1">
                              <p className="text-[11px] font-bold text-[#767676] uppercase tracking-wider">Student</p>
                              <p className="text-[13px] font-medium text-[#222222] dark:text-white truncate">{rm.collegeName || "N/A"}</p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <p className="text-[11px] font-bold text-[#767676] uppercase tracking-wider">Professional</p>
                              <p className="text-[13px] font-medium text-[#222222] dark:text-white truncate">{rm.designation || "Employee"} at {rm.companyName || "N/A"}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
              
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
