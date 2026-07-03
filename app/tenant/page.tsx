"use client";

import { useEffect, useState } from "react";
import { Loader2, Building2, BedSingle, AlertCircle, Upload, UtensilsCrossed, CalendarDays, CreditCard, Download, X, User, TrendingUp, Clock, CheckCircle2, ChevronRight, Utensils, Users, ArrowUpRight } from "lucide-react";
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

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
}

function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const MetricBlock = ({
  label,
  value,
  sub,
  accent,
  urgent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  urgent?: boolean;
}) => (
  <div className="flex flex-col gap-1.5 p-5 border-r border-[#dedede] dark:border-white/10 last:border-r-0">
    <span className="text-[11px] font-semibold uppercase tracking-widest text-[#767676] dark:text-[#a0a0a0]">
      {label}
    </span>
    <span
      className={`text-[22px] font-bold leading-tight tracking-tight ${
        urgent
          ? "text-red-600 dark:text-red-400"
          : accent
          ? "text-[#222222] dark:text-white"
          : "text-[#222222] dark:text-white"
      }`}
    >
      {value}
    </span>
    {sub && (
      <span className="text-[12px] text-[#767676] dark:text-[#a0a0a0] font-medium">
        {sub}
      </span>
    )}
  </div>
);

const StatusPill = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; cls: string; dot: string }> = {
    ACTIVE: {
      label: "Active",
      cls: "bg-[#58ff48]/10 text-[#1a8a10] dark:text-[#58ff48] border-[#58ff48]/30",
      dot: "bg-[#58ff48]",
    },
    ONBOARDING_PENDING: {
      label: "Pending Review",
      cls: "bg-amber-50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
      dot: "bg-amber-500",
    },
    APPROVED_AWAITING_PAYMENT: {
      label: "Awaiting Payment",
      cls: "bg-blue-50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
      dot: "bg-blue-500",
    },
  };
  const cfg = map[status] ?? {
    label: status,
    cls: "bg-[#f5f5f5] text-[#767676] border-[#dedede]",
    dot: "bg-[#767676]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] border text-[12px] font-semibold ${cfg.cls}`}
    >
      <span className={`size-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

const PaymentStatusBadge = ({
  status,
  isRefund,
}: {
  status: string;
  isRefund?: boolean;
}) => {
  if (isRefund)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] border text-[11px] font-bold uppercase tracking-wider bg-red-50 dark:bg-red-950/20 text-red-600 border-red-200 dark:border-red-800">
        Refunded
      </span>
    );
  const map: Record<string, string> = {
    PAID: "bg-[#58ff48]/10 text-[#1a8a10] dark:text-[#58ff48] border-[#58ff48]/30",
    PENDING:
      "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    PARTIALLY_PAID:
      "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-[3px] border text-[11px] font-bold uppercase tracking-wider ${
        map[status] ?? "bg-[#f5f5f5] text-[#767676] border-[#dedede]"
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
};

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="px-5 py-3 border-b border-[#dedede] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.02]">
    <span className="text-[11px] font-bold uppercase tracking-widest text-[#767676] dark:text-[#a0a0a0]">
      {children}
    </span>
  </div>
);

const InfoRow = ({
  label,
  value,
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) => (
  <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#dedede]/60 dark:border-white/5 last:border-0">
    <span className="text-[13px] text-[#767676] dark:text-[#a0a0a0] font-medium">{label}</span>
    <span
      className={`text-[13px] font-semibold ${
        highlight ? "text-[#222222] dark:text-white" : "text-[#444444] dark:text-[#dddddd]"
      }`}
    >
      {value}
    </span>
  </div>
);

// ─── Main Page ──────────────────────────────────────────────────────────────

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

  const [uploadAmount, setUploadAmount] = useState("");
  const [uploadRef, setUploadRef] = useState("");
  const [uploading, setUploading] = useState(false);

  const [activeTab, setActiveTab] = useState("overview");

  const fetchStayDetails = async () => {
    try {
      const response = await fetch("/api/tenant/stay");
      if (!response.ok) throw new Error("Failed to load dashboard details");
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
          if (pcRes.ok) setHostelPaymentConfig(await pcRes.json());
        } catch { /* non-critical */ }
      }
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchHomeNotifications = async () => {
    try {
      const res = await fetch("/api/tenant/notifications");
      if (res.ok) {
        const json = await res.json();
        setHomeNotifications(
          (json.notifications || []).filter((n: any) => !n.read && !n.dismissedFromHome)
        );
      }
    } catch { /* non-critical */ }
  };

  const handleDismissNotification = async (id: string) => {
    setHomeNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await fetch(`/api/tenant/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissedFromHome: true }),
      });
    } catch { /* non-critical */ }
  };

  useEffect(() => {
    fetchStayDetails();
    fetchHomeNotifications();
  }, []);

  const handleUploadPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stay) return;
    setUploading(true);
    try {
      const amountPaise = Math.round(parseFloat(uploadAmount) * 100);
      if (isNaN(amountPaise) || amountPaise <= 0) throw new Error("Please enter a valid amount.");
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
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <DashboardSkeleton />
      </div>
    );
  }

  // ─── Computed values ─────────────────────────────────────────────────────

  const verifiedPaid = payments
    .filter((p) => p.paymentStatus === "PAID" || p.paymentStatus === "PARTIALLY_PAID")
    .reduce((sum, p) => sum + p.amountPaid, 0);
  const remainingBalance = stay ? stay.totalPayable - verifiedPaid : 0;
  const pendingRequests = pendingServiceRequests.filter((r) => r.status === "PENDING_PAYMENT");
  const revokedRequests = pendingServiceRequests.filter((r) => r.status === "REVOKED");
  const daysRemaining = stay ? getDaysRemaining(stay.endDate) : null;
  let daysUntilDue: number | null = null;
  if (nextDueDate) {
    const diff = new Date(nextDueDate).getTime() - new Date().getTime();
    daysUntilDue = Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  const paymentProgress = stay ? Math.min(100, Math.round((verifiedPaid / stay.totalPayable) * 100)) : 0;

  // ─── Empty / Pending states ───────────────────────────────────────────────

  if (!stay) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-8">
        <div className="premium-card max-w-sm w-full p-10 text-center space-y-5">
          <div className="mx-auto size-16 rounded-sm bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center text-3xl">
            🏠
          </div>
          <div className="space-y-2">
            <h2 className="text-[18px] font-bold text-[#222222] dark:text-white">No Active Stay</h2>
            <p className="text-[13px] text-[#767676] leading-relaxed">
              You are logged in, but no active stay is registered. Please contact your warden.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (stay.status === "ONBOARDING_PENDING") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-8">
        <div className="premium-card max-w-md w-full overflow-hidden">
          <div className="p-8 text-center space-y-4">
            <div className="mx-auto size-14 rounded-sm bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
              <Clock className="size-7 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-[20px] font-bold text-[#222222] dark:text-white">
                Under Review
              </h2>
              <p className="text-[13px] text-[#767676] leading-relaxed max-w-xs mx-auto">
                Your documents are submitted. The warden is verifying them. You'll receive a
                notification once approved.
              </p>
            </div>
          </div>
          <div className="border-t border-[#dedede] dark:border-white/10 px-6 py-4 bg-[#fafafa] dark:bg-white/[0.02] flex items-center gap-3">
            <Building2 className="size-4 text-[#767676]" />
            <span className="text-[13px] font-semibold text-[#222222] dark:text-white">
              {hostel?.name}
            </span>
            <span className="text-[#dedede] dark:text-white/20">·</span>
            <span className="text-[13px] text-[#767676]">
              Bed {bed?.roomNumber}-{bed?.label}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (stay.status === "APPROVED_AWAITING_PAYMENT") {
    return (
      <div className="p-4 md:p-6 xl:p-8">
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
          <div className="premium-card overflow-hidden h-fit">
            <SectionLabel>Stay Summary</SectionLabel>
            <InfoRow label="Hostel" value={hostel?.name} />
            <InfoRow label="Bed" value={`${bed?.roomNumber} - ${bed?.label}`} />
            <div className="border-t border-[#dedede] dark:border-white/10 mt-1" />
            <InfoRow label="Admission Fee" value={formatCurrency(stay.admissionFee)} />
            <InfoRow label="Rent" value={formatCurrency(stay.monthlyRent)} />
            <InfoRow label="Security Deposit" value={formatCurrency(stay.securityDeposit)} />
            {stay.discount > 0 && (
              <InfoRow label="Discount" value={`− ${formatCurrency(stay.discount)}`} />
            )}
            <div className="px-5 py-4 border-t border-[#dedede] dark:border-white/10 flex justify-between">
              <span className="text-[14px] font-bold text-[#222222] dark:text-white">Total Due</span>
              <span className="text-[16px] font-bold text-[#222222] dark:text-white">
                {formatCurrency(stay.totalPayable)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Active Dashboard ────────────────────────────────────────────────────

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "payments", label: "Payments" },
    { id: "food", label: "Food Plan" },
    { id: "roommates", label: "Roommates" },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a]">

      {/* ── Alert Banners ── */}
      {(pendingRequests.length > 0 || revokedRequests.length > 0 || homeNotifications.length > 0) && (
        <div className="px-4 md:px-6 xl:px-8 pt-5 space-y-2.5">
          {pendingRequests.map((req) => (
            <div
              key={req.id}
              className="flex items-center justify-between gap-4 p-3.5 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/50 rounded-sm"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="size-4 text-orange-600 dark:text-orange-400 shrink-0" />
                <span className="text-[13px] font-semibold text-orange-900 dark:text-orange-200">
                  Payment pending · {req.type.replace(/_/g, " ")} ·{" "}
                  <span className="font-bold">₹{req.amount}</span>
                </span>
              </div>
              <Link
                href={`/tenant/service-requests/${req.id}`}
                className="shrink-0 text-[12px] font-bold text-orange-700 dark:text-orange-400 flex items-center gap-1 hover:gap-2 transition-all"
              >
                Pay now <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          ))}
          {revokedRequests.map((req) => (
            <div
              key={req.id}
              className="flex items-center gap-3 p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-sm"
            >
              <AlertCircle className="size-4 text-red-600 shrink-0" />
              <span className="text-[13px] font-medium text-red-800 dark:text-red-200">
                Food plan revoked · Refund of{" "}
                <strong className="font-bold">₹{req.amount}</strong> processed.
                {req.metadata?.revocation?.reason && ` Reason: ${req.metadata.revocation.reason}`}
              </span>
            </div>
          ))}
          {homeNotifications.map((notif) => (
            <div
              key={notif.id}
              className="flex items-start justify-between gap-4 p-3.5 bg-white dark:bg-white/5 border border-[#dedede] dark:border-white/10 border-l-2 border-l-[#222222] dark:border-l-white rounded-sm"
            >
              <div className="flex-1 min-w-0">
                <span className="text-[13px] font-semibold text-[#222222] dark:text-white">
                  {notif.title}
                </span>
                <p className="text-[12px] text-[#767676] mt-0.5 truncate">{notif.message}</p>
              </div>
              <button
                onClick={() => handleDismissNotification(notif.id)}
                className="text-[#767676] hover:text-[#222222] dark:hover:text-white transition-colors shrink-0"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Hero Identity Block ── */}
      <div className="px-4 md:px-6 xl:px-8 pt-6">
        <div className="bg-white dark:bg-[#111111] border border-[#dedede] dark:border-white/10 rounded-sm overflow-hidden">
          
          {/* Top section: Avatar + Name + Badge */}
          <div className="p-5 md:p-6 flex items-center gap-4 border-b border-[#dedede] dark:border-white/10">
            {/* Avatar */}
            <div className="shrink-0">
              {tenant?.photoUrl ? (
                <img
                  src={tenant.photoUrl}
                  alt="Profile"
                  className="size-[52px] rounded-[6px] border border-[#dedede] dark:border-white/10 object-cover"
                />
              ) : (
                <div className="size-[52px] rounded-[6px] border border-[#dedede] dark:border-white/10 bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center">
                  <span className="text-[18px] font-bold text-[#767676] dark:text-[#a0a0a0] leading-none">
                    {tenant?.fullName ? getInitials(tenant.fullName) : <User className="size-5" />}
                  </span>
                </div>
              )}
            </div>

            {/* Name + location */}
            <div className="flex-1 min-w-0">
              <h1 className="text-[20px] font-bold text-[#222222] dark:text-white tracking-tight leading-tight truncate">
                {tenant?.fullName || "Tenant"}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="flex items-center gap-1.5 text-[12px] text-[#767676] dark:text-[#a0a0a0] font-medium">
                  <Building2 className="size-3.5 shrink-0" />
                  {hostel?.name}
                </span>
                <span className="text-[#dedede] dark:text-white/20 select-none">·</span>
                <span className="flex items-center gap-1.5 text-[12px] text-[#767676] dark:text-[#a0a0a0] font-medium">
                  <BedSingle className="size-3.5 shrink-0" />
                  Bed {bed?.roomNumber}–{bed?.label}
                </span>
              </div>
            </div>

            {/* Status badge */}
            <div className="shrink-0 hidden sm:block">
              <StatusPill status={stay.status} />
            </div>
          </div>

          {/* Metrics strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-[#dedede] dark:divide-white/10">
            <MetricBlock
              label="Stay Status"
              value={stay.status === "ACTIVE" ? "Active" : stay.status.replace(/_/g, " ")}
              sub={`Since ${formatDate(stay.joiningDate)}`}
              accent
            />
            <MetricBlock
              label="Days Remaining"
              value={daysRemaining !== null ? `${daysRemaining}d` : "—"}
              sub={`Until ${formatDate(stay.endDate)}`}
              urgent={daysRemaining !== null && daysRemaining <= 30}
            />
            <MetricBlock
              label="Next Payment"
              value={nextDueDate ? formatDate(nextDueDate) : "—"}
              sub={
                daysUntilDue !== null
                  ? daysUntilDue <= 0
                    ? "Overdue"
                    : `In ${daysUntilDue} days`
                  : undefined
              }
              urgent={daysUntilDue !== null && daysUntilDue <= 7}
            />
            <MetricBlock
              label="Monthly Rent"
              value={formatCurrency(stay.monthlyRent)}
              sub={stay.durationType}
            />
          </div>

          {/* Payment progress bar */}
          {stay.totalPayable > 0 && (
            <div className="px-5 py-3.5 border-t border-[#dedede] dark:border-white/10 flex items-center gap-4 bg-[#fafafa] dark:bg-white/[0.02]">
              <span className="text-[12px] text-[#767676] dark:text-[#a0a0a0] font-medium shrink-0">
                Payment collected
              </span>
              <div className="flex-1 h-1.5 bg-[#dedede] dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#222222] dark:bg-[#58ff48] rounded-full transition-all duration-700"
                  style={{ width: `${paymentProgress}%` }}
                />
              </div>
              <span className="text-[12px] font-bold text-[#222222] dark:text-white shrink-0">
                {paymentProgress}%
              </span>
              <span className="text-[12px] text-[#767676] dark:text-[#a0a0a0] font-medium shrink-0 hidden sm:block">
                {formatCurrency(verifiedPaid)} of {formatCurrency(stay.totalPayable)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="px-4 md:px-6 xl:px-8 mt-5">
        <div className="flex items-center gap-0.5 border-b border-[#dedede] dark:border-white/10 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-1 pb-3 mr-5 text-[14px] font-medium whitespace-nowrap transition-all border-b-2 relative top-[1px] ${
                activeTab === tab.id
                  ? "border-[#222222] dark:border-white text-[#222222] dark:text-white font-semibold"
                  : "border-transparent text-[#767676] dark:text-[#a0a0a0] hover:text-[#222222] dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="px-4 md:px-6 xl:px-8 py-5 pb-16">

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="grid gap-4 lg:grid-cols-2">
            
            {/* Stay Details */}
            <div className="bg-white dark:bg-[#111111] border border-[#dedede] dark:border-white/10 rounded-sm overflow-hidden">
              <SectionLabel>Stay Details</SectionLabel>
              <InfoRow label="Joining Date" value={formatDate(stay.joiningDate)} />
              <InfoRow label="End Date" value={formatDate(stay.endDate)} />
              <InfoRow label="Duration Type" value={stay.durationType} />
              <InfoRow
                label="Sharing"
                value={bed?.sharingType?.replace(/_/g, " ") ?? "—"}
              />
              <InfoRow label="Room" value={`${bed?.roomNumber} · Bed ${bed?.label}`} />
            </div>

            {/* Billing Summary */}
            <div className="bg-white dark:bg-[#111111] border border-[#dedede] dark:border-white/10 rounded-sm overflow-hidden">
              <SectionLabel>Billing Summary</SectionLabel>
              <InfoRow label="Monthly Rent" value={formatCurrency(stay.monthlyRent)} highlight />
              {stay.foodCharges > 0 && (
                <InfoRow label="Food Charges" value={formatCurrency(stay.foodCharges)} />
              )}
              <InfoRow label="Security Deposit" value={formatCurrency(stay.securityDeposit)} />
              {stay.admissionFee > 0 && (
                <InfoRow label="Admission Fee" value={formatCurrency(stay.admissionFee)} />
              )}
              {stay.discount > 0 && (
                <InfoRow label="Discount Applied" value={`− ${formatCurrency(stay.discount)}`} />
              )}
              <div className="px-5 py-4 border-t border-[#dedede] dark:border-white/10 flex justify-between items-center bg-[#fafafa] dark:bg-white/[0.02]">
                <span className="text-[13px] font-semibold text-[#767676]">Total Payable</span>
                <span className="text-[16px] font-bold text-[#222222] dark:text-white">
                  {formatCurrency(stay.totalPayable)}
                </span>
              </div>
            </div>

            {/* Quick actions */}
            <div className="lg:col-span-2 grid sm:grid-cols-3 gap-3">
              <button
                onClick={() => setActiveTab("payments")}
                className="bg-white dark:bg-[#111111] border border-[#dedede] dark:border-white/10 rounded-sm p-4 flex items-center justify-between gap-3 hover:bg-[#fafafa] dark:hover:bg-white/5 transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-sm bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center">
                    <CreditCard className="size-4 text-[#767676]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#222222] dark:text-white">Pay Rent</p>
                    <p className="text-[11px] text-[#767676] mt-0.5">Upload payment proof</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-[#dedede] dark:text-white/20 group-hover:text-[#767676] transition-colors" />
              </button>

              <button
                onClick={() => setActiveTab("food")}
                className="bg-white dark:bg-[#111111] border border-[#dedede] dark:border-white/10 rounded-sm p-4 flex items-center justify-between gap-3 hover:bg-[#fafafa] dark:hover:bg-white/5 transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-sm bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center">
                    <Utensils className="size-4 text-[#767676]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#222222] dark:text-white">Food Plan</p>
                    <p className="text-[11px] text-[#767676] mt-0.5">
                      {stay.foodPlan === "NOT_INCLUDED" ? "Not included" : "Manage meals"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-[#dedede] dark:text-white/20 group-hover:text-[#767676] transition-colors" />
              </button>

              <button
                onClick={() => setActiveTab("roommates")}
                className="bg-white dark:bg-[#111111] border border-[#dedede] dark:border-white/10 rounded-sm p-4 flex items-center justify-between gap-3 hover:bg-[#fafafa] dark:hover:bg-white/5 transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-sm bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center">
                    <Users className="size-4 text-[#767676]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#222222] dark:text-white">Roommates</p>
                    <p className="text-[11px] text-[#767676] mt-0.5">
                      {roommates.length === 0 ? "No roommates" : `${roommates.length} sharing`}
                    </p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-[#dedede] dark:text-white/20 group-hover:text-[#767676] transition-colors" />
              </button>
            </div>
          </div>
        )}

        {/* PAYMENTS TAB */}
        {activeTab === "payments" && (
          <div className="grid gap-5 lg:grid-cols-3">
            
            {/* Payment history */}
            <div className="lg:col-span-2 bg-white dark:bg-[#111111] border border-[#dedede] dark:border-white/10 rounded-sm overflow-hidden">
              <SectionLabel>Payment History</SectionLabel>
              {payments.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="mx-auto size-12 rounded-sm bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center mb-4">
                    <CreditCard className="size-5 text-[#767676]" />
                  </div>
                  <p className="text-[14px] font-semibold text-[#222222] dark:text-white mb-1">
                    No payments yet
                  </p>
                  <p className="text-[13px] text-[#767676]">
                    Your payment records will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-[#dedede] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.02]">
                        <th className="px-5 py-3 font-semibold text-[11px] uppercase tracking-widest text-[#767676]">Date</th>
                        <th className="px-5 py-3 font-semibold text-[11px] uppercase tracking-widest text-[#767676]">Amount</th>
                        <th className="px-5 py-3 font-semibold text-[11px] uppercase tracking-widest text-[#767676] hidden sm:table-cell">Ref No.</th>
                        <th className="px-5 py-3 font-semibold text-[11px] uppercase tracking-widest text-[#767676]">Status</th>
                        <th className="px-5 py-3 font-semibold text-[11px] uppercase tracking-widest text-[#767676] text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => {
                        const isNeg = p.amountPaid < 0;
                        return (
                          <tr
                            key={p.id}
                            className="border-b border-[#dedede]/60 dark:border-white/5 last:border-0 hover:bg-[#fafafa] dark:hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="px-5 py-4 text-[#767676] dark:text-[#a0a0a0] font-medium whitespace-nowrap">
                              {formatDate(p.createdAt)}
                            </td>
                            <td
                              className={`px-5 py-4 font-bold whitespace-nowrap ${
                                isNeg ? "text-red-600 dark:text-red-400" : "text-[#222222] dark:text-white"
                              }`}
                            >
                              {isNeg
                                ? `− ${formatCurrency(Math.abs(p.amountPaid))}`
                                : formatCurrency(p.amountPaid)}
                            </td>
                            <td className="px-5 py-4 text-[#767676] hidden sm:table-cell">
                              {p.transactionRefNo ? (
                                <span className="font-mono text-[12px]">{p.transactionRefNo}</span>
                              ) : (
                                <span className="text-[#dedede] dark:text-white/20">—</span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <PaymentStatusBadge status={p.paymentStatus} isRefund={isNeg} />
                            </td>
                            <td className="px-5 py-4 text-right">
                              {p.paymentStatus === "PAID" && !isNeg ? (
                                <a
                                  href={`/api/pdf/receipt/${p.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#767676] hover:text-[#222222] dark:hover:text-white transition-colors"
                                >
                                  <Download className="size-3.5" />
                                  <span className="hidden sm:inline">Download</span>
                                </a>
                              ) : (
                                <span className="text-[#dedede] dark:text-white/20">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Upload payment */}
            <div className="bg-white dark:bg-[#111111] border border-[#dedede] dark:border-white/10 rounded-sm overflow-hidden h-fit">
              <SectionLabel>Submit Payment</SectionLabel>
              <div className="p-5">
                <form onSubmit={handleUploadPayment} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[#767676]">
                      Amount Paid (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 15000"
                      value={uploadAmount}
                      onChange={(e) => setUploadAmount(e.target.value)}
                      required
                      min="1"
                      className="premium-input w-full"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[#767676]">
                      Transaction Ref / UTR
                    </label>
                    <input
                      type="text"
                      placeholder="12-digit UPI ref no."
                      value={uploadRef}
                      onChange={(e) => setUploadRef(e.target.value)}
                      required
                      className="premium-input w-full"
                    />
                  </div>
                  <button
                    type="submit"
                    className="premium-button w-full justify-center flex items-center gap-2 mt-2"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    {uploading ? "Submitting…" : "Submit Payment"}
                  </button>
                </form>
              </div>

              {/* Balance summary */}
              {stay.totalPayable > 0 && (
                <div className="border-t border-[#dedede] dark:border-white/10">
                  <div className="px-5 py-3 flex justify-between items-center border-b border-[#dedede]/60 dark:border-white/5">
                    <span className="text-[12px] text-[#767676]">Total payable</span>
                    <span className="text-[13px] font-semibold text-[#222222] dark:text-white">
                      {formatCurrency(stay.totalPayable)}
                    </span>
                  </div>
                  <div className="px-5 py-3 flex justify-between items-center border-b border-[#dedede]/60 dark:border-white/5">
                    <span className="text-[12px] text-[#767676]">Paid so far</span>
                    <span className="text-[13px] font-semibold text-[#1a8a10] dark:text-[#58ff48]">
                      {formatCurrency(verifiedPaid)}
                    </span>
                  </div>
                  <div className="px-5 py-3 flex justify-between items-center">
                    <span className="text-[12px] font-semibold text-[#767676]">Balance</span>
                    <span
                      className={`text-[14px] font-bold ${
                        remainingBalance > 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-[#1a8a10] dark:text-[#58ff48]"
                      }`}
                    >
                      {remainingBalance > 0
                        ? formatCurrency(remainingBalance)
                        : "Fully Paid"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FOOD TAB */}
        {activeTab === "food" && (
          <div>
            {stay.foodPlan === "NOT_INCLUDED" ? (
              <div className="bg-white dark:bg-[#111111] border border-[#dedede] dark:border-white/10 rounded-sm overflow-hidden">
                <div className="p-12 text-center">
                  <div className="mx-auto size-14 rounded-sm bg-[#f5f5f5] dark:bg-white/5 border border-[#dedede] dark:border-white/10 flex items-center justify-center mb-5">
                    <UtensilsCrossed className="size-7 text-[#767676]" />
                  </div>
                  <h2 className="text-[17px] font-bold text-[#222222] dark:text-white mb-2">
                    Food Not Included
                  </h2>
                  <p className="text-[13px] text-[#767676] max-w-xs mx-auto leading-relaxed">
                    Your current stay plan does not include hostel food. Contact your warden to
                    upgrade.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#111111] border border-[#dedede] dark:border-white/10 rounded-sm overflow-hidden">
                <div className="p-8 text-center space-y-5">
                  <div className="mx-auto size-14 rounded-sm bg-[#f5f5f5] dark:bg-white/5 border border-[#dedede] dark:border-white/10 flex items-center justify-center">
                    <Utensils className="size-7 text-[#222222] dark:text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <h2 className="text-[17px] font-bold text-[#222222] dark:text-white">
                      Weekly Meal Plan
                    </h2>
                    <p className="text-[13px] text-[#767676] max-w-xs mx-auto leading-relaxed">
                      Manage your breakfast, lunch, and dinner preferences for the upcoming week.
                    </p>
                  </div>
                  <Link href="/tenant/food" className="premium-button inline-flex items-center gap-2">
                    <Utensils className="size-4" />
                    Manage Food Orders
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ROOMMATES TAB */}
        {activeTab === "roommates" && (
          <div>
            {roommates.length === 0 ? (
              <div className="bg-white dark:bg-[#111111] border border-[#dedede] dark:border-white/10 rounded-sm overflow-hidden">
                <div className="p-12 text-center">
                  <div className="mx-auto size-14 rounded-sm bg-[#f5f5f5] dark:bg-white/5 border border-[#dedede] dark:border-white/10 flex items-center justify-center mb-5">
                    <Users className="size-7 text-[#767676]" />
                  </div>
                  <h2 className="text-[17px] font-bold text-[#222222] dark:text-white mb-2">
                    No Roommates
                  </h2>
                  <p className="text-[13px] text-[#767676] leading-relaxed">
                    You have no roommates in your room currently.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {roommates.map((rm, idx) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-[#111111] border border-[#dedede] dark:border-white/10 rounded-sm overflow-hidden"
                  >
                    <div className="p-5 flex items-center gap-4">
                      {rm.photoUrl ? (
                        <img
                          src={rm.photoUrl}
                          alt={rm.fullName}
                          className="size-11 rounded-[5px] border border-[#dedede] dark:border-white/10 object-cover shrink-0"
                        />
                      ) : (
                        <div className="size-11 rounded-[5px] border border-[#dedede] dark:border-white/10 bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center shrink-0">
                          <span className="text-[14px] font-bold text-[#767676] dark:text-[#a0a0a0]">
                            {getInitials(rm.fullName)}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[15px] font-bold text-[#222222] dark:text-white truncate">
                          {rm.fullName}
                        </p>
                        <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-[3px] border border-[#dedede] dark:border-white/10 font-semibold text-[#767676] dark:text-[#a0a0a0] uppercase tracking-wider">
                          Bed {rm.bedLabel}
                        </span>
                      </div>
                    </div>
                    <div className="px-5 py-3 border-t border-[#dedede] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.02]">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#767676] mb-1">
                        {rm.occupationType === "STUDENT" ? "Student" : "Professional"}
                      </p>
                      <p className="text-[13px] font-medium text-[#222222] dark:text-white truncate">
                        {rm.occupationType === "STUDENT"
                          ? rm.collegeName || "N/A"
                          : `${rm.designation || "Employee"} · ${rm.companyName || "N/A"}`}
                      </p>
                    </div>
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
