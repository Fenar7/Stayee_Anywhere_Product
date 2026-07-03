"use client";

import { useEffect, useState } from "react";
import {
  Loader2, Building2, BedSingle, AlertCircle, Upload,
  UtensilsCrossed, CreditCard, Download, X, User,
  Users, Utensils, ChevronRight, ArrowUpRight, LogOut, Bell
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { notify } from "@/lib/toast";
import { DashboardSkeleton } from "@/components/shared/DashboardSkeleton";
import { InitialPaymentForm } from "@/components/tenant/InitialPaymentForm";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface TenantDetails { fullName: string; photoUrl: string | null; }
interface PaymentItem {
  id: string; amountPaid: number; paymentMode: string;
  transactionRefNo: string | null; notes?: string | null;
  paymentStatus: string; createdAt: string;
}
interface StayDetails {
  id: string; status: string; durationType: string;
  joiningDate: string; endDate: string; admissionFee: number;
  monthlyRent: number; securityDeposit: number; foodCharges: number;
  foodPlan: string; totalPayable: number; discount: number;
}
interface HostelDetails { id: string; name: string; address: string; }
interface BedDetails { id: string; label: string; roomNumber: string; sharingType: string; }
interface RoommateDetails {
  fullName: string; photoUrl: string | null; occupationType: string;
  collegeName: string | null; companyName: string | null;
  designation: string | null; bedLabel: string;
}
interface ServiceRequestItem {
  id: string; type: string; amount: number; status: string;
  createdAt: string; metadata?: any;
}
interface ApiResponse {
  tenant: TenantDetails | null; stay: StayDetails | null;
  hostel: HostelDetails | null; bed: BedDetails | null;
  payments: PaymentItem[]; roommates: RoommateDetails[];
  nextDueDate: string | null; pendingServiceRequests?: ServiceRequestItem[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function formatCurrency(n: number) { return `₹${n.toLocaleString("en-IN")}`; }
function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
}
function daysLeft(end: string) {
  return Math.ceil((new Date(end).getTime() - Date.now()) / 86400000);
}
function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

// ─── Reusable Components ──────────────────────────────────────────────────────

/** A stat block: small label on top, large value, optional sub-note */
function StatBlock({
  label, value, sub, alert
}: { label: string; value: string; sub?: string; alert?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-[#767676]">{label}</span>
      <span className={`text-[22px] font-bold leading-none tracking-tight ${alert ? "text-red-600" : "text-[#111111] dark:text-white"}`}>
        {value}
      </span>
      {sub && <span className="text-[12px] text-[#767676] font-medium">{sub}</span>}
    </div>
  );
}

/** A clean key-value row */
function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#f0f0f0] last:border-0">
      <span className="text-[13px] text-[#767676] font-medium">{label}</span>
      <span className={`text-[13px] font-semibold text-[#111111] dark:text-white text-right ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}

/** Section wrapper card */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-[#111] border border-[#dedede] dark:border-white/10 rounded-[7px] ${className}`}>
      {children}
    </div>
  );
}

/** Section header inside a card */
function CardHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#eeeeee] dark:border-white/10">
      <span className="text-[12px] font-bold uppercase tracking-widest text-[#767676]">{title}</span>
      {action && action}
    </div>
  );
}

/** Payment status badge */
function StatusBadge({ status, isRefund }: { status: string; isRefund?: boolean }) {
  if (isRefund) return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-200">
      Refunded
    </span>
  );
  const map: Record<string, string> = {
    PAID: "bg-[#58ff48]/10 text-[#1a8a10] border-[#58ff48]/30",
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    PARTIALLY_PAID: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider border ${map[status] ?? "bg-[#f5f5f5] text-[#767676] border-[#dedede]"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

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
  const [activeTab, setActiveTab] = useState<"overview" | "payments" | "profile">("overview");

  const load = async () => {
    try {
      const res = await fetch("/api/tenant/stay");
      if (!res.ok) throw new Error("Failed to load");
      const data: ApiResponse = await res.json();
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
          const pr = await fetch(`/api/public/hostels/${data.hostel.id}/payment-config`);
          if (pr.ok) setHostelPaymentConfig(await pr.json());
        } catch {}
      }
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Error");
    } finally { setLoading(false); }
  };

  const loadNotifs = async () => {
    try {
      const r = await fetch("/api/tenant/notifications");
      if (r.ok) {
        const j = await r.json();
        setHomeNotifications((j.notifications || []).filter((n: any) => !n.read && !n.dismissedFromHome));
      }
    } catch {}
  };

  const dismissNotif = async (id: string) => {
    setHomeNotifications(p => p.filter(n => n.id !== id));
    try {
      await fetch(`/api/tenant/notifications/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissedFromHome: true }),
      });
    } catch {}
  };

  const handleLogout = async () => {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
    router.push("/login");
  };

  const handleUploadPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stay) return;
    setUploading(true);
    try {
      const paise = Math.round(parseFloat(uploadAmount) * 100);
      if (isNaN(paise) || paise <= 0) throw new Error("Enter a valid amount.");
      const r = await fetch("/api/tenant/payment", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stayId: stay.id, amountPaidPaise: paise, paymentMode: "UPI", transactionRefNo: uploadRef.trim() || null }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || "Failed"); }
      notify.success("Payment submitted for verification");
      setUploadAmount(""); setUploadRef(""); load();
    } catch (err) { notify.error(err instanceof Error ? err.message : "Error"); }
    finally { setUploading(false); }
  };

  useEffect(() => { load(); loadNotifs(); }, []);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><DashboardSkeleton /></div>;

  // ─── Computed ─────────────────────────────────────────────────────────────

  const verifiedPaid = payments
    .filter(p => p.paymentStatus === "PAID" || p.paymentStatus === "PARTIALLY_PAID")
    .reduce((s, p) => s + p.amountPaid, 0);
  const remaining = stay ? stay.totalPayable - verifiedPaid : 0;
  const progress = stay?.totalPayable ? Math.min(100, Math.round((verifiedPaid / stay.totalPayable) * 100)) : 0;
  const pendingReqs = pendingServiceRequests.filter(r => r.status === "PENDING_PAYMENT");
  const revokedReqs = pendingServiceRequests.filter(r => r.status === "REVOKED");
  const dl = stay ? daysLeft(stay.endDate) : null;
  const due = nextDueDate ? daysUntil(nextDueDate) : null;

  // ─── States before active stay ────────────────────────────────────────────

  if (!stay) return (
    <div className="p-6 md:p-8">
      <Card className="max-w-sm p-8 text-center space-y-4">
        <div className="w-14 h-14 bg-[#f5f5f5] rounded-[7px] mx-auto flex items-center justify-center text-2xl">🏠</div>
        <h2 className="text-[17px] font-bold text-[#111111]">No Active Stay</h2>
        <p className="text-[13px] text-[#767676] leading-relaxed">No stay found for your account. Contact your warden.</p>
      </Card>
    </div>
  );

  if (stay.status === "ONBOARDING_PENDING") return (
    <div className="p-6 md:p-8">
      <Card className="max-w-md p-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 bg-amber-50 border border-amber-200 rounded-[7px] flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
          </div>
          <h2 className="text-[17px] font-bold text-[#111111]">Application Under Review</h2>
          <p className="text-[13px] text-[#767676] leading-relaxed">Your documents are submitted. The warden is verifying them. You'll be notified once approved.</p>
          <div className="w-full pt-3 border-t border-[#eeeeee] flex items-center gap-3">
            <Building2 className="w-4 h-4 text-[#767676] shrink-0" />
            <span className="text-[13px] font-semibold text-[#222222]">{hostel?.name}</span>
            <span className="text-[#dedede]">·</span>
            <span className="text-[13px] text-[#767676]">Bed {bed?.roomNumber}–{bed?.label}</span>
          </div>
        </div>
      </Card>
    </div>
  );

  if (stay.status === "APPROVED_AWAITING_PAYMENT") return (
    <div className="p-4 md:p-6">
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <InitialPaymentForm hostel={hostel} paymentConfig={paymentConfig} remainingBalance={remaining}
            onSuccess={m => { notify.success(m); load(); }} onError={m => notify.error(m)} />
        </div>
        <Card className="h-fit overflow-hidden">
          <CardHeader title="Stay Summary" />
          <div className="px-5 py-2">
            <Row label="Hostel" value={hostel?.name} />
            <Row label="Bed" value={`${bed?.roomNumber} – ${bed?.label}`} />
            <Row label="Admission Fee" value={formatCurrency(stay.admissionFee)} />
            <Row label="Rent" value={formatCurrency(stay.monthlyRent)} />
            <Row label="Security Deposit" value={formatCurrency(stay.securityDeposit)} />
            {stay.discount > 0 && <Row label="Discount" value={`− ${formatCurrency(stay.discount)}`} />}
          </div>
          <div className="px-5 py-4 border-t border-[#eeeeee] flex justify-between items-center bg-[#fafafa]">
            <span className="text-[13px] font-bold text-[#222222]">Total Due</span>
            <span className="text-[18px] font-bold text-[#111111]">{formatCurrency(stay.totalPayable)}</span>
          </div>
        </Card>
      </div>
    </div>
  );

  // ─── Active Tenant Dashboard ──────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f5f5f5] dark:bg-[#0d0d0d]">

      {/* ── Page Header ── */}
      <div className="bg-white dark:bg-[#111] border-b border-[#dedede] dark:border-white/10 px-4 md:px-6 py-0">
        <div className="flex items-center justify-between pt-12 md:pt-4 pb-0">
          {/* Identity */}
          <div className="flex items-center gap-3.5">
            {tenant?.photoUrl ? (
              <img src={tenant.photoUrl} alt="" className="w-10 h-10 rounded-[7px] object-cover border border-[#dedede]" />
            ) : (
              <div className="w-10 h-10 rounded-[7px] bg-[#111111] dark:bg-[#222] flex items-center justify-center text-[13px] font-bold text-[#58ff48]">
                {tenant?.fullName ? getInitials(tenant.fullName) : "T"}
              </div>
            )}
            <div>
              <p className="text-[16px] font-bold text-[#111111] dark:text-white leading-tight">
                {tenant?.fullName || "Tenant"}
              </p>
              <p className="text-[12px] text-[#767676] flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3 h-3" />{hostel?.name}
                <span className="text-[#dedede]">·</span>
                <BedSingle className="w-3 h-3" />Bed {bed?.roomNumber}–{bed?.label}
              </p>
            </div>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link href="/tenant/notifications"
              className="w-9 h-9 rounded-[7px] border border-[#dedede] bg-white flex items-center justify-center hover:bg-[#f5f5f5] transition-colors relative">
              <Bell className="w-4 h-4 text-[#222222]" />
              {homeNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#58ff48] text-[9px] font-bold text-black flex items-center justify-center">
                  {homeNotifications.length}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-0 mt-4">
          {(["overview", "payments", "profile"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-1 mr-6 pb-3 text-[13px] font-medium capitalize border-b-2 transition-all ${
                activeTab === tab
                  ? "border-[#111111] dark:border-white text-[#111111] dark:text-white font-semibold"
                  : "border-transparent text-[#767676] hover:text-[#222222]"
              }`}
            >
              {tab === "overview" ? "My Stay" : tab === "payments" ? "Payments" : "Profile"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Alert Banners ── */}
      {(pendingReqs.length > 0 || revokedReqs.length > 0 || homeNotifications.length > 0) && (
        <div className="px-4 md:px-6 pt-4 space-y-2">
          {pendingReqs.map(req => (
            <div key={req.id} className="flex items-center justify-between gap-3 bg-white border border-orange-200 border-l-4 border-l-orange-500 rounded-[7px] px-4 py-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertCircle className="w-4 h-4 text-orange-500 shrink-0" />
                <span className="text-[13px] font-semibold text-[#222222] truncate">
                  Payment pending — <strong>₹{req.amount}</strong> · {req.type.replace(/_/g, " ")}
                </span>
              </div>
              <Link href={`/tenant/service-requests/${req.id}`}
                className="shrink-0 text-[12px] font-bold text-orange-600 flex items-center gap-1 whitespace-nowrap">
                Pay <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
          {revokedReqs.map(req => (
            <div key={req.id} className="flex items-center gap-3 bg-white border border-red-200 border-l-4 border-l-red-500 rounded-[7px] px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-[13px] text-[#222222]">
                Food plan revoked · Refund of <strong>₹{req.amount}</strong> processed.
                {req.metadata?.revocation?.reason && ` Reason: ${req.metadata.revocation.reason}`}
              </p>
            </div>
          ))}
          {homeNotifications.map(n => (
            <div key={n.id} className="flex items-start justify-between gap-3 bg-white border border-[#dedede] border-l-4 border-l-[#222222] rounded-[7px] px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-[#222222]">{n.title}</p>
                <p className="text-[12px] text-[#767676] mt-0.5 truncate">{n.message}</p>
              </div>
              <button onClick={() => dismissNotif(n.id)} className="text-[#767676] hover:text-[#222222] transition-colors shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* TAB: MY STAY (Overview)                                                */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="px-4 md:px-6 py-5 space-y-4">

          {/* ── Hero metrics bar ── */}
          <div className="bg-[#111111] dark:bg-[#1a1a1a] rounded-[7px] overflow-hidden">
            {/* Top: big rent amount */}
            <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#767676] mb-1.5">Monthly Rent</p>
                <p className="text-[38px] font-extrabold text-white leading-none tracking-tight">
                  {formatCurrency(stay.monthlyRent)}
                </p>
                <p className="text-[12px] text-[#767676] mt-1.5">{stay.durationType}</p>
              </div>
              {/* Status pill */}
              <div className="flex items-center gap-1.5 bg-[#58ff48]/10 border border-[#58ff48]/25 rounded-full px-3 py-1.5 shrink-0 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#58ff48]" />
                <span className="text-[11px] font-bold text-[#58ff48]">Active</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 divide-x divide-white/10 px-0">
              <div className="px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#767676] mb-1">Days Left</p>
                <p className={`text-[18px] font-bold leading-none ${dl !== null && dl <= 30 ? "text-orange-400" : "text-white"}`}>
                  {dl !== null ? `${dl}d` : "—"}
                </p>
              </div>
              <div className="px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#767676] mb-1">Ends</p>
                <p className="text-[15px] font-bold text-white leading-none">{formatDate(stay.endDate)}</p>
              </div>
              <div className="px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#767676] mb-1">Next Due</p>
                <p className={`text-[15px] font-bold leading-none ${due !== null && due <= 7 ? "text-red-400" : "text-white"}`}>
                  {nextDueDate ? formatDate(nextDueDate) : "—"}
                </p>
              </div>
            </div>

            {/* Payment progress */}
            <div className="px-5 py-4 border-t border-white/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] text-[#767676]">Payment collected</span>
                <span className="text-[11px] font-bold text-[#58ff48]">{progress}%</span>
              </div>
              <div className="h-[3px] bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-[#58ff48] rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-[#555]">{formatCurrency(verifiedPaid)} paid</span>
                <span className="text-[10px] text-[#555]">{formatCurrency(stay.totalPayable)} total</span>
              </div>
            </div>
          </div>

          {/* ── 4 Quick stat cards ── */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-[7px] bg-[#5c5c5c] flex items-center justify-center shrink-0">
                <CreditCard className="w-4.5 h-4.5 text-[#58ff48]" style={{ width: 18, height: 18 }} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-[#767676] uppercase tracking-wider">Balance Due</p>
                <p className={`text-[15px] font-bold truncate ${remaining > 0 ? "text-red-600" : "text-[#1a8a10]"}`}>
                  {remaining > 0 ? formatCurrency(remaining) : "Settled ✓"}
                </p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-[7px] bg-[#5c5c5c] flex items-center justify-center shrink-0">
                <Users className="w-4.5 h-4.5 text-[#58ff48]" style={{ width: 18, height: 18 }} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-[#767676] uppercase tracking-wider">Roommates</p>
                <p className="text-[15px] font-bold text-[#111111]">{roommates.length || "None"}</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-[7px] bg-[#5c5c5c] flex items-center justify-center shrink-0">
                <Utensils className="w-4.5 h-4.5 text-[#58ff48]" style={{ width: 18, height: 18 }} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-[#767676] uppercase tracking-wider">Food Plan</p>
                <p className="text-[15px] font-bold text-[#111111] truncate">
                  {stay.foodPlan === "NOT_INCLUDED" ? "Not Included" : "Included"}
                </p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-[7px] bg-[#5c5c5c] flex items-center justify-center shrink-0">
                <BedSingle className="w-4.5 h-4.5 text-[#58ff48]" style={{ width: 18, height: 18 }} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-[#767676] uppercase tracking-wider">Sharing</p>
                <p className="text-[15px] font-bold text-[#111111]">{bed?.sharingType?.replace(/_/g, " ") || "—"}</p>
              </div>
            </Card>
          </div>

          {/* ── Stay Details ── */}
          <Card className="overflow-hidden">
            <CardHeader title="Stay Details" />
            <div className="px-5 py-1">
              <Row label="Hostel" value={hostel?.name || "—"} />
              <Row label="Bed" value={`${bed?.roomNumber} · ${bed?.label}`} />
              <Row label="Joining Date" value={formatDate(stay.joiningDate)} />
              <Row label="End Date" value={formatDate(stay.endDate)} />
              <Row label="Duration" value={stay.durationType} />
            </div>
          </Card>

          {/* ── Billing ── */}
          <Card className="overflow-hidden">
            <CardHeader title="Billing Summary" />
            <div className="px-5 py-1">
              <Row label="Monthly Rent" value={formatCurrency(stay.monthlyRent)} />
              {stay.foodCharges > 0 && <Row label="Food Charges" value={formatCurrency(stay.foodCharges)} />}
              <Row label="Security Deposit" value={formatCurrency(stay.securityDeposit)} />
              {stay.admissionFee > 0 && <Row label="Admission Fee" value={formatCurrency(stay.admissionFee)} />}
              {stay.discount > 0 && <Row label="Discount" value={`− ${formatCurrency(stay.discount)}`} />}
            </div>
            <div className="px-5 py-4 border-t border-[#eeeeee] dark:border-white/10 flex justify-between items-center bg-[#fafafa] dark:bg-white/[0.02]">
              <span className="text-[13px] font-bold text-[#222222] dark:text-white">Total Payable</span>
              <span className="text-[18px] font-bold text-[#111111] dark:text-white">{formatCurrency(stay.totalPayable)}</span>
            </div>
          </Card>

          {/* ── Roommates ── */}
          {roommates.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader title="Roommates" />
              <div className="divide-y divide-[#f0f0f0]">
                {roommates.map((rm, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4">
                    {rm.photoUrl ? (
                      <img src={rm.photoUrl} className="w-9 h-9 rounded-[7px] border border-[#dedede] object-cover shrink-0" alt={rm.fullName} />
                    ) : (
                      <div className="w-9 h-9 rounded-[7px] bg-[#111111] flex items-center justify-center text-[12px] font-bold shrink-0" style={{ color: "#58ff48" }}>
                        {getInitials(rm.fullName)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-[#111111] dark:text-white truncate">{rm.fullName}</p>
                      <p className="text-[12px] text-[#767676] mt-0.5 truncate">
                        {rm.occupationType === "STUDENT"
                          ? rm.collegeName || "Student"
                          : `${rm.designation || "Employee"} · ${rm.companyName || "N/A"}`}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 border border-[#dedede] rounded-[4px] text-[#767676]">
                      Bed {rm.bedLabel}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ── Food plan ── */}
          <Card className="overflow-hidden">
            <CardHeader title="Food Plan" action={
              stay.foodPlan !== "NOT_INCLUDED" ? (
                <Link href="/tenant/food" className="text-[12px] font-bold text-[#767676] flex items-center gap-0.5 hover:text-[#222222] transition-colors">
                  Manage <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              ) : undefined
            } />
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-[7px] bg-[#f5f5f5] dark:bg-white/5 border border-[#dedede] dark:border-white/10 flex items-center justify-center shrink-0">
                {stay.foodPlan === "NOT_INCLUDED"
                  ? <UtensilsCrossed className="w-4.5 h-4.5 text-[#767676]" style={{ width: 18, height: 18 }} />
                  : <Utensils className="w-4.5 h-4.5 text-[#222222]" style={{ width: 18, height: 18 }} />}
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#222222] dark:text-white">
                  {stay.foodPlan === "NOT_INCLUDED" ? "Food Not Included" : "Meal Plan Active"}
                </p>
                <p className="text-[12px] text-[#767676] mt-0.5">
                  {stay.foodPlan === "NOT_INCLUDED"
                    ? "Contact your warden to upgrade."
                    : "Manage your weekly meal preferences."}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* TAB: PAYMENTS                                                           */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === "payments" && (
        <div className="px-4 md:px-6 py-5 space-y-4">

          {/* Balance overview card */}
          <div className="bg-[#111111] dark:bg-[#1a1a1a] rounded-[7px] px-5 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#767676] mb-1">Balance Due</p>
            <p className={`text-[34px] font-extrabold leading-none tracking-tight ${remaining > 0 ? "text-white" : "text-[#58ff48]"}`}>
              {remaining > 0 ? formatCurrency(remaining) : "Fully Settled"}
            </p>
            {remaining > 0 && <p className="text-[12px] text-red-400 mt-1 font-medium">Pending</p>}
            <div className="flex gap-8 mt-4 pt-4 border-t border-white/10">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#555]">Paid</p>
                <p className="text-[15px] font-bold text-[#58ff48] mt-1">{formatCurrency(verifiedPaid)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#555]">Total Payable</p>
                <p className="text-[15px] font-bold text-white mt-1">{formatCurrency(stay.totalPayable)}</p>
              </div>
            </div>
          </div>

          {/* Upload form */}
          <Card className="overflow-hidden">
            <CardHeader title="Submit Payment" />
            <form onSubmit={handleUploadPayment} className="px-5 py-4 space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#767676] block mb-1.5">Amount Paid (₹)</label>
                <input
                  type="number" placeholder="e.g. 15000" value={uploadAmount}
                  onChange={e => setUploadAmount(e.target.value)} required min="1"
                  className="w-full px-3.5 py-2.5 rounded-[7px] border border-[#dedede] bg-[#fafafa] dark:bg-white/5 text-[14px] font-medium text-[#111111] dark:text-white placeholder:text-[#aaa] outline-none focus:border-[#222222] transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#767676] block mb-1.5">Transaction Ref / UTR</label>
                <input
                  type="text" placeholder="12-digit UPI ref no." value={uploadRef}
                  onChange={e => setUploadRef(e.target.value)} required
                  className="w-full px-3.5 py-2.5 rounded-[7px] border border-[#dedede] bg-[#fafafa] dark:bg-white/5 text-[14px] font-medium text-[#111111] dark:text-white placeholder:text-[#aaa] outline-none focus:border-[#222222] transition-colors"
                />
              </div>
              <button type="submit" disabled={uploading}
                className="premium-button w-full justify-center flex items-center gap-2 h-10">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? "Submitting…" : "Submit Payment"}
              </button>
            </form>
          </Card>

          {/* Payment history */}
          <Card className="overflow-hidden">
            <CardHeader title="Payment History" />
            {payments.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <div className="w-10 h-10 bg-[#f5f5f5] rounded-[7px] mx-auto flex items-center justify-center mb-3">
                  <CreditCard className="w-5 h-5 text-[#767676]" />
                </div>
                <p className="text-[14px] font-semibold text-[#222222] dark:text-white">No payments yet</p>
                <p className="text-[12px] text-[#767676] mt-1">Records appear here after submission.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#fafafa] dark:bg-white/[0.02] border-b border-[#eeeeee] dark:border-white/10">
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-[#767676]">Date</th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-[#767676]">Amount</th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-[#767676] hidden sm:table-cell">Ref No.</th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-[#767676]">Status</th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-[#767676] text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p, i, arr) => {
                      const isNeg = p.amountPaid < 0;
                      return (
                        <tr key={p.id} className={`${i < arr.length - 1 ? "border-b border-[#f5f5f5] dark:border-white/5" : ""} hover:bg-[#fafafa] dark:hover:bg-white/[0.02] transition-colors`}>
                          <td className="px-5 py-3.5 text-[12px] text-[#767676] font-medium whitespace-nowrap">{formatDate(p.createdAt)}</td>
                          <td className={`px-5 py-3.5 text-[13px] font-bold whitespace-nowrap ${isNeg ? "text-red-600" : "text-[#111111] dark:text-white"}`}>
                            {isNeg ? `− ${formatCurrency(Math.abs(p.amountPaid))}` : formatCurrency(p.amountPaid)}
                          </td>
                          <td className="px-5 py-3.5 text-[12px] text-[#767676] font-mono hidden sm:table-cell">
                            {p.transactionRefNo || <span className="text-[#dedede]">—</span>}
                          </td>
                          <td className="px-5 py-3.5">
                            <StatusBadge status={p.paymentStatus} isRefund={isNeg} />
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {p.paymentStatus === "PAID" && !isNeg ? (
                              <a href={`/api/pdf/receipt/${p.id}`} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#767676] hover:text-[#222222] transition-colors">
                                <Download className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">PDF</span>
                              </a>
                            ) : <span className="text-[#dedede] dark:text-white/20">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* TAB: PROFILE                                                            */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === "profile" && (
        <div className="px-4 md:px-6 py-5 space-y-4">

          {/* Identity card */}
          <Card className="overflow-hidden">
            <div className="p-6 flex items-center gap-5 border-b border-[#eeeeee] dark:border-white/10">
              {tenant?.photoUrl ? (
                <img src={tenant.photoUrl} alt="" className="w-16 h-16 rounded-[7px] object-cover border border-[#dedede]" />
              ) : (
                <div className="w-16 h-16 rounded-[7px] bg-[#111111] flex items-center justify-center text-[22px] font-bold shrink-0" style={{ color: "#58ff48" }}>
                  {tenant?.fullName ? getInitials(tenant.fullName) : "T"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-[20px] font-bold text-[#111111] dark:text-white leading-tight">{tenant?.fullName || "Tenant"}</h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#767676] bg-[#f5f5f5] dark:bg-white/5 px-2.5 py-1 rounded-[4px]">
                    <Building2 className="w-3 h-3" /> {hostel?.name}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#767676] bg-[#f5f5f5] dark:bg-white/5 px-2.5 py-1 rounded-[4px]">
                    <BedSingle className="w-3 h-3" /> Bed {bed?.roomNumber}–{bed?.label}
                  </span>
                </div>
              </div>
            </div>
            {/* Stay status row */}
            <div className="px-6 py-4 flex items-center justify-between bg-[#fafafa] dark:bg-white/[0.02]">
              <span className="text-[13px] text-[#767676] font-medium">Stay Status</span>
              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#1a8a10] dark:text-[#58ff48]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#58ff48]" /> {stay.status}
              </span>
            </div>
          </Card>

          {/* Stay info */}
          <Card className="overflow-hidden">
            <CardHeader title="Stay Information" />
            <div className="px-5 py-1">
              <Row label="Hostel" value={hostel?.name || "—"} />
              <Row label="Address" value={hostel?.address || "—"} />
              <Row label="Bed" value={`${bed?.roomNumber} · ${bed?.label}`} />
              <Row label="Sharing Type" value={bed?.sharingType?.replace(/_/g, " ") || "—"} />
              <Row label="Joining Date" value={formatDate(stay.joiningDate)} />
              <Row label="End Date" value={formatDate(stay.endDate)} />
              <Row label="Duration Type" value={stay.durationType} />
              <Row label="Food Plan" value={stay.foodPlan === "NOT_INCLUDED" ? "Not Included" : "Included"} />
            </div>
          </Card>

          {/* Payment summary */}
          <Card className="overflow-hidden">
            <CardHeader title="Payment Overview" />
            <div className="px-5 py-1">
              <Row label="Monthly Rent" value={formatCurrency(stay.monthlyRent)} />
              <Row label="Total Payable" value={formatCurrency(stay.totalPayable)} />
              <Row label="Total Paid" value={formatCurrency(verifiedPaid)} />
              <Row label="Balance Due" value={remaining > 0 ? formatCurrency(remaining) : "Fully Settled"} />
            </div>
            <div className="px-5 py-4 border-t border-[#eeeeee]">
              <div className="flex justify-between mb-2">
                <span className="text-[12px] text-[#767676]">Collection Progress</span>
                <span className="text-[12px] font-bold text-[#222222]">{progress}%</span>
              </div>
              <div className="h-1.5 bg-[#eeeeee] rounded-full overflow-hidden">
                <div className="h-full bg-[#222222] dark:bg-[#58ff48] rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </Card>

          {/* Quick links */}
          <Card className="overflow-hidden">
            <CardHeader title="Quick Links" />
            <div className="divide-y divide-[#f0f0f0]">
              {[
                { label: "Food Orders", href: "/tenant/food", icon: Utensils },
                { label: "Notifications", href: "/tenant/notifications", icon: Bell },
              ].map(item => (
                <Link key={item.href} href={item.href}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-[#fafafa] transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[6px] bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-[#767676]" />
                    </div>
                    <span className="text-[13px] font-semibold text-[#222222] dark:text-white">{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#dedede] group-hover:text-[#767676] transition-colors" />
                </Link>
              ))}
            </div>
          </Card>

          {/* Logout */}
          <button onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[7px] border border-red-200 dark:border-red-900/40 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-[13px] font-bold">
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}
