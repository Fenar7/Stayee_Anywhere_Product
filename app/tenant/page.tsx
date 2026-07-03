"use client";

import { useEffect, useState } from "react";
import {
  Loader2, Building2, AlertCircle, Upload, Download,
  UtensilsCrossed, CreditCard, ChevronRight, CheckCircle2,
  XCircle, Clock, ArrowUpRight, LogOut, Utensils,
  MapPin, BedSingle, Search, Bell, Settings, User as UserIcon
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { notify } from "@/lib/toast";
import { DashboardSkeleton } from "@/components/shared/DashboardSkeleton";
import { InitialPaymentForm } from "@/components/tenant/InitialPaymentForm";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface TenantDetails { fullName: string; photoUrl: string | null; gender?: "MALE" | "FEMALE" | "OTHER"; }
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

// ─── Formatting Helpers ──────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}
function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
}
function daysLeft(end: string) {
  return Math.max(0, Math.ceil((new Date(end).getTime() - Date.now()) / 86400000));
}

// ─── Micro-Components (Consumer/Fintech Style) ───────────────────────────────

function SoftCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-[#121212] rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(255,255,255,0.02)] border border-[#f0f0f0] dark:border-white/5 p-6 ${className}`}>
      {children}
    </div>
  );
}

function PillButton({ children, onClick, variant = "primary", className = "", type = "button", disabled = false }: any) {
  const base = "h-14 px-8 rounded-full font-bold text-[15px] flex items-center justify-center gap-2 transition-all duration-200 w-full active:scale-[0.98]";
  const variants = {
    primary: "bg-[#111111] dark:bg-[#58ff48] text-white dark:text-black hover:bg-black/90",
    secondary: "bg-[#f5f5f5] dark:bg-white/10 text-[#111111] dark:text-white hover:bg-[#eeeeee]",
    outline: "bg-transparent border-[1.5px] border-[#dedede] dark:border-white/20 text-[#111111] dark:text-white hover:border-[#111111]",
    danger: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant as keyof typeof variants]} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}>
      {children}
    </button>
  );
}

// Default 3D-style avatars from DiceBear (fallback if no photoUrl)
function getAvatarUrl(gender?: string, name?: string) {
  const seed = name || "User";
  if (gender === "FEMALE") {
    return `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&hair=long14,long15,long16,long02&hairColor=000000,85c2c6`;
  }
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&hair=short01,short02,short03&hairColor=000000`;
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

  useEffect(() => { load(); }, []);

  if (loading) return <div className="p-8"><DashboardSkeleton /></div>;

  // ─── Computed Data ───────────────────────────────────────────────────────

  const verifiedPaid = payments
    .filter(p => p.paymentStatus === "PAID" || p.paymentStatus === "PARTIALLY_PAID")
    .reduce((s, p) => s + p.amountPaid, 0);
  const remaining = stay ? Math.max(0, stay.totalPayable - verifiedPaid) : 0;
  const progress = stay?.totalPayable ? Math.min(100, Math.round((verifiedPaid / stay.totalPayable) * 100)) : 0;
  const pendingReqs = pendingServiceRequests.filter(r => r.status === "PENDING_PAYMENT");
  const revokedReqs = pendingServiceRequests.filter(r => r.status === "REVOKED");

  // ─── Edge States (No Stay / Pending) ─────────────────────────────────────

  if (!stay) return (
    <div className="max-w-md mx-auto p-6 md:p-10 min-h-[80vh] flex items-center justify-center">
      <SoftCard className="text-center w-full py-12">
        <div className="w-20 h-20 bg-gray-50 dark:bg-white/5 rounded-full mx-auto flex items-center justify-center mb-6">
          <Building2 className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-black dark:text-white mb-2">No Active Stay</h2>
        <p className="text-gray-500 mb-8 leading-relaxed">
          You aren't linked to a property yet. Check with your warden for onboarding.
        </p>
        <PillButton onClick={handleLogout} variant="outline">Sign Out</PillButton>
      </SoftCard>
    </div>
  );

  if (stay.status === "ONBOARDING_PENDING") return (
    <div className="max-w-md mx-auto p-6 md:p-10 min-h-[80vh] flex items-center justify-center">
      <SoftCard className="text-center w-full py-12 border-amber-100 shadow-[0_20px_40px_rgb(245,158,11,0.05)]">
        <div className="w-20 h-20 bg-amber-50 dark:bg-amber-500/10 rounded-full mx-auto flex items-center justify-center mb-6">
          <Clock className="w-8 h-8 text-amber-500" />
        </div>
        <h2 className="text-2xl font-bold text-black dark:text-white mb-2">Under Review</h2>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Your request for <strong>{hostel?.name}</strong> is being processed. We'll notify you soon.
        </p>
      </SoftCard>
    </div>
  );

  if (stay.status === "APPROVED_AWAITING_PAYMENT") return (
    <div className="max-w-lg mx-auto p-6 md:p-10 pt-12">
      <h1 className="text-3xl font-bold mb-8">Welcome! 🎉<br/><span className="text-gray-500 text-xl font-medium">Let's settle your first invoice.</span></h1>
      <SoftCard className="mb-6 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/10 dark:to-[#121212] border-blue-100 dark:border-blue-900/30">
        <div className="flex justify-between items-center mb-6">
          <span className="text-gray-500 font-medium">Total Due</span>
          <span className="text-3xl font-bold">{formatCurrency(stay.totalPayable)}</span>
        </div>
        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-sm"><span className="text-gray-500">Rent</span><span className="font-semibold">{formatCurrency(stay.monthlyRent)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-500">Deposit</span><span className="font-semibold">{formatCurrency(stay.securityDeposit)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-500">Admission</span><span className="font-semibold">{formatCurrency(stay.admissionFee)}</span></div>
        </div>
      </SoftCard>
      <InitialPaymentForm hostel={hostel} paymentConfig={paymentConfig} remainingBalance={remaining} onSuccess={m => { notify.success(m); load(); }} onError={m => notify.error(m)} />
    </div>
  );

  // ─── Main Dashboard (Consumer / Fintech Vibe) ─────────────────────────────

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0A] pb-24 text-[#111111] dark:text-white font-sans">
      
      {/* ── Top App Bar ── */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between sticky top-0 bg-[#FAFAFA]/80 dark:bg-[#0A0A0A]/80 backdrop-blur-xl z-40">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 shadow-inner">
            <img 
              src={tenant?.photoUrl || getAvatarUrl(tenant?.gender, tenant?.fullName)} 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-gray-500 tracking-wide uppercase">Welcome back</p>
            <h1 className="text-[20px] font-bold leading-tight">{tenant?.fullName?.split(" ")[0] || "Guest"}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/tenant/notifications" className="w-12 h-12 rounded-full bg-white dark:bg-[#1A1A1A] shadow-sm border border-gray-100 dark:border-white/5 flex items-center justify-center relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-[#1A1A1A]"></span>
          </Link>
        </div>
      </header>

      {/* ── Segmented Control (Tabs) ── */}
      <div className="px-6 mb-8">
        <div className="p-1 bg-gray-100 dark:bg-[#1A1A1A] rounded-full flex relative shadow-inner">
          {(["overview", "payments", "profile"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-[14px] font-bold rounded-full transition-all duration-300 relative z-10 capitalize ${
                activeTab === tab ? "text-[#111111] dark:text-black shadow-sm bg-white dark:bg-[#58ff48]" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <main className="px-6">
        
        {/* ─────────────────────────────────────────────────────────────────────── */}
        {/* TAB: OVERVIEW (Finance App Vibe)                                        */}
        {/* ─────────────────────────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Hero Card */}
            <div className="bg-[#111111] dark:bg-[#1A1A1A] text-white rounded-[32px] p-8 shadow-[0_20px_40px_rgb(0,0,0,0.15)] relative overflow-hidden">
              {/* Decorative background circle */}
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#58ff48]/10 blur-3xl rounded-full"></div>
              
              <div className="relative z-10">
                <p className="text-white/60 font-medium mb-1">Monthly Rent</p>
                <h2 className="text-5xl font-black tracking-tight mb-8">{formatCurrency(stay.monthlyRent)}</h2>
                
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm font-semibold text-white/80">Payment Progress</span>
                  <span className="text-sm font-bold text-[#58ff48] ml-auto">{progress}%</span>
                </div>
                
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-[#58ff48] rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                </div>
                
                <div className="mt-6 flex gap-4 pt-6 border-t border-white/10">
                  <div className="flex-1">
                    <p className="text-xs text-white/50 font-semibold uppercase mb-1">Status</p>
                    <p className="text-sm font-bold text-[#58ff48] flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4"/> Active</p>
                  </div>
                  <div className="flex-1 border-l border-white/10 pl-4">
                    <p className="text-xs text-white/50 font-semibold uppercase mb-1">Next Due</p>
                    <p className="text-sm font-bold">{nextDueDate ? formatDate(nextDueDate) : "—"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions / Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <SoftCard className="p-5 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Days Left</p>
                  <p className="text-xl font-bold">{daysLeft(stay.endDate)}</p>
                </div>
              </SoftCard>
              
              <SoftCard className="p-5 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 text-purple-500 rounded-full flex items-center justify-center">
                  <BedSingle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Bed</p>
                  <p className="text-[16px] font-bold">{bed?.roomNumber}-{bed?.label}</p>
                </div>
              </SoftCard>
            </div>

            {/* Stay Info List */}
            <div className="mt-8">
              <h3 className="text-lg font-bold mb-4 px-2">Your Location</h3>
              <SoftCard className="p-0 overflow-hidden">
                <div className="p-5 flex items-center gap-4 border-b border-gray-100 dark:border-white/5">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center shrink-0">
                    <Building2 className="w-6 h-6 text-[#111111] dark:text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-[16px]">{hostel?.name}</p>
                    <p className="text-sm text-gray-500 truncate mt-0.5">{hostel?.address}</p>
                  </div>
                </div>
                <div className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center shrink-0">
                    <Utensils className="w-6 h-6 text-[#111111] dark:text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-[16px]">Food Plan</p>
                    <p className="text-sm text-gray-500 mt-0.5">{stay.foodPlan === "NOT_INCLUDED" ? "No plan active" : "Weekly meals included"}</p>
                  </div>
                  {stay.foodPlan !== "NOT_INCLUDED" && (
                    <Link href="/tenant/food" className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                      <ChevronRight className="w-5 h-5" />
                    </Link>
                  )}
                </div>
              </SoftCard>
            </div>

          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────── */}
        {/* TAB: PAYMENTS                                                           */}
        {/* ─────────────────────────────────────────────────────────────────────── */}
        {activeTab === "payments" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Balance Target Card */}
            <SoftCard className="bg-[#111111] dark:bg-white border-0 text-white dark:text-black">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <p className="text-white/60 dark:text-black/50 font-medium mb-1">Balance Due</p>
                  <h2 className="text-4xl font-black">{formatCurrency(remaining)}</h2>
                </div>
                {remaining > 0 && <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">PENDING</span>}
              </div>
              
              {remaining > 0 && (
                <div className="bg-white/10 dark:bg-black/5 p-5 rounded-[20px] mt-6">
                  <h3 className="font-bold mb-4 text-[15px]">Submit Payment</h3>
                  <form onSubmit={handleUploadPayment} className="space-y-4">
                    <input
                      type="number" required min="1" value={uploadAmount} onChange={e => setUploadAmount(e.target.value)}
                      className="w-full h-14 px-5 bg-white dark:bg-white rounded-full text-[16px] font-bold text-black placeholder:text-gray-400 focus:outline-none shadow-inner"
                      placeholder="Amount (₹)"
                    />
                    <input
                      type="text" required value={uploadRef} onChange={e => setUploadRef(e.target.value)}
                      className="w-full h-14 px-5 bg-white dark:bg-white rounded-full text-[16px] font-bold text-black placeholder:text-gray-400 focus:outline-none shadow-inner"
                      placeholder="Reference Number (UTR)"
                    />
                    <PillButton type="submit" disabled={uploading} className="bg-white dark:bg-black text-black dark:text-white mt-2">
                      {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Details"}
                    </PillButton>
                  </form>
                </div>
              )}
            </SoftCard>

            <div>
              <div className="flex justify-between items-center mb-4 px-2">
                <h3 className="text-lg font-bold">Recent Transactions</h3>
                <span className="text-sm font-bold text-gray-500">See all</span>
              </div>
              
              <div className="space-y-3">
                {payments.length === 0 ? (
                  <SoftCard className="text-center py-10">
                    <p className="text-gray-500 font-medium">No transactions yet.</p>
                  </SoftCard>
                ) : (
                  payments.map((p) => {
                    const isNeg = p.amountPaid < 0;
                    return (
                      <SoftCard key={p.id} className="p-4 flex items-center justify-between hover:scale-[1.01] transition-transform cursor-pointer">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isNeg ? "bg-red-50 text-red-500" : "bg-[#58ff48]/20 text-[#1a8a10] dark:text-[#58ff48]"}`}>
                            {isNeg ? <Download className="w-6 h-6 rotate-180" /> : <ArrowUpRight className="w-6 h-6" />}
                          </div>
                          <div>
                            <p className="font-bold text-[16px] leading-tight">{isNeg ? "Refund" : "Rent Payment"}</p>
                            <p className="text-[13px] text-gray-500 font-medium mt-0.5">{formatDate(p.createdAt)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-black text-[16px] ${isNeg ? "text-red-500" : "text-black dark:text-white"}`}>
                            {isNeg ? `−${formatCurrency(Math.abs(p.amountPaid))}` : `+${formatCurrency(p.amountPaid)}`}
                          </p>
                          <p className="text-[12px] font-bold text-gray-400 mt-1 uppercase">{p.paymentStatus.replace("_", " ")}</p>
                        </div>
                      </SoftCard>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────── */}
        {/* TAB: PROFILE (Glassmorphism / Overlapping Avatar)                       */}
        {/* ─────────────────────────────────────────────────────────────────────── */}
        {activeTab === "profile" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pt-16">
            
            {/* Avatar overlapping the card */}
            <div className="relative flex flex-col items-center z-10">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-[#FAFAFA] dark:border-[#0A0A0A] shadow-xl z-20 -mb-16">
                <img 
                  src={tenant?.photoUrl || getAvatarUrl(tenant?.gender, tenant?.fullName)} 
                  alt="Profile" 
                  className="w-full h-full object-cover bg-gradient-to-b from-blue-100 to-purple-100"
                />
              </div>
              
              <SoftCard className="w-full pt-20 pb-8 text-center bg-white/90 dark:bg-[#121212]/90 backdrop-blur-xl relative z-10">
                <h2 className="text-2xl font-black mb-1">{tenant?.fullName}</h2>
                <p className="text-gray-500 font-medium mb-6">Tenant Account</p>
                
                <div className="flex justify-center gap-4 mb-8">
                  <div className="bg-gray-50 dark:bg-white/5 px-4 py-2 rounded-full flex items-center gap-2 border border-gray-100 dark:border-white/10">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-bold">{hostel?.name}</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-white/5 px-4 py-2 rounded-full flex items-center gap-2 border border-gray-100 dark:border-white/10">
                    <BedSingle className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-bold">{bed?.label}</span>
                  </div>
                </div>

                <div className="w-full h-px bg-gray-100 dark:bg-white/10 mb-6"></div>

                <div className="grid grid-cols-2 gap-4 text-left px-4">
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Contract Start</p>
                    <p className="font-bold">{formatDate(stay.joiningDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Contract End</p>
                    <p className="font-bold">{formatDate(stay.endDate)}</p>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Duration</p>
                    <p className="font-bold capitalize">{stay.durationType.toLowerCase()}</p>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Roommates</p>
                    <p className="font-bold">{roommates.length}</p>
                  </div>
                </div>
              </SoftCard>
            </div>

            <div className="mt-6 space-y-4">
              <SoftCard className="p-0 overflow-hidden">
                <button className="w-full p-5 flex items-center justify-between border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center">
                      <Settings className="w-5 h-5 text-black dark:text-white" />
                    </div>
                    <span className="font-bold text-[16px]">Account Settings</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
                <button onClick={handleLogout} className="w-full p-5 flex items-center justify-between hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <LogOut className="w-5 h-5 text-red-500" />
                    </div>
                    <span className="font-bold text-[16px] text-red-500">Sign Out</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-red-300" />
                </button>
              </SoftCard>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
