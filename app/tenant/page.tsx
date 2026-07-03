"use client";

import { useEffect, useState } from "react";
import {
  Loader2, Building2, AlertCircle, Upload, Download,
  UtensilsCrossed, CreditCard, ChevronRight, CheckCircle2,
  XCircle, Clock, ArrowUpRight, LogOut, Utensils
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

// ─── Reusable Micro-Components ───────────────────────────────────────────────

function SectionHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h2 className="text-base font-semibold text-black dark:text-white tracking-tight">{title}</h2>
        {description && <p className="text-sm text-[#767676] dark:text-[#a0a0a0] mt-1">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

function DataList({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <dl className={`divide-y divide-[#dedede] dark:divide-white/10 ${className}`}>{children}</dl>;
}

function DataRow({ label, value, valueClass = "" }: { label: string; value: React.ReactNode; valueClass?: string }) {
  return (
    <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
      <dt className="text-sm font-medium text-[#767676] dark:text-[#a0a0a0]">{label}</dt>
      <dd className={`text-sm text-black dark:text-white text-left sm:text-right ${valueClass}`}>{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "PAID":
      return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1a8a10] dark:text-[#58ff48]"><CheckCircle2 className="w-3.5 h-3.5" /> Paid</span>;
    case "PENDING":
      return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-500"><Clock className="w-3.5 h-3.5" /> Pending</span>;
    case "ACTIVE":
      return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-black dark:text-white"><div className="w-2 h-2 rounded-full bg-[#58ff48]" /> Active</span>;
    default:
      return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#767676]">{status.replace(/_/g, " ")}</span>;
  }
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
    <div className="max-w-3xl mx-auto p-6 md:p-10">
      <div className="premium-card p-10 flex flex-col items-center justify-center text-center">
        <Building2 className="w-10 h-10 text-[#767676] mb-4" />
        <h2 className="text-xl font-semibold text-black dark:text-white tracking-tight">No Active Workspace found</h2>
        <p className="text-sm text-[#767676] mt-2 max-w-sm">
          Your account is not currently linked to an active stay. Please contact your hostel administration.
        </p>
      </div>
    </div>
  );

  if (stay.status === "ONBOARDING_PENDING") return (
    <div className="max-w-3xl mx-auto p-6 md:p-10">
      <div className="premium-card p-8 sm:p-10">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-black dark:text-white tracking-tight">Application Under Review</h2>
            <p className="text-sm text-[#767676] mt-1 leading-relaxed">
              Your onboarding request for <strong className="text-black dark:text-white font-medium">{hostel?.name}</strong> is currently being reviewed by the administration. You will be notified once it is approved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  if (stay.status === "APPROVED_AWAITING_PAYMENT") return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 grid gap-8 lg:grid-cols-3 items-start">
      <div className="lg:col-span-2">
        <InitialPaymentForm hostel={hostel} paymentConfig={paymentConfig} remainingBalance={remaining}
          onSuccess={m => { notify.success(m); load(); }} onError={m => notify.error(m)} />
      </div>
      <div className="premium-card p-6">
        <h3 className="text-sm font-semibold text-black dark:text-white tracking-tight mb-4">Initial Invoice</h3>
        <DataList>
          <DataRow label="Admission Fee" value={formatCurrency(stay.admissionFee)} />
          <DataRow label="First Month Rent" value={formatCurrency(stay.monthlyRent)} />
          <DataRow label="Security Deposit" value={formatCurrency(stay.securityDeposit)} />
          {stay.discount > 0 && <DataRow label="Discount" value={`− ${formatCurrency(stay.discount)}`} valueClass="text-[#1a8a10] dark:text-[#58ff48]" />}
        </DataList>
        <div className="pt-4 mt-4 border-t border-[#dedede] dark:border-white/10 flex justify-between items-center">
          <span className="text-sm font-medium text-black dark:text-white">Total Due</span>
          <span className="text-lg font-semibold text-black dark:text-white">{formatCurrency(stay.totalPayable)}</span>
        </div>
      </div>
    </div>
  );

  // ─── Main Dashboard ──────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto w-full pb-20">
      
      {/* ── Page Header & Tabs ── */}
      <header className="px-6 md:px-10 pt-10 pb-0 border-b border-[#dedede] dark:border-white/10 bg-white dark:bg-[#0a0a0a] sticky top-0 z-30">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
          <div className="flex items-center gap-4">
            {tenant?.photoUrl ? (
              <img src={tenant.photoUrl} alt="" className="w-12 h-12 rounded-full object-cover border border-[#dedede] dark:border-white/10" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-black dark:bg-white flex items-center justify-center text-sm font-semibold text-white dark:text-black">
                {tenant?.fullName ? getInitials(tenant.fullName) : "T"}
              </div>
            )}
            <div>
              <h1 className="text-xl font-semibold text-black dark:text-white tracking-tight leading-tight">
                {tenant?.fullName || "Tenant"}
              </h1>
              <p className="text-sm text-[#767676] mt-0.5 flex items-center gap-2">
                <span>{hostel?.name}</span>
                <span className="text-[#dedede] dark:text-white/20">/</span>
                <span>Bed {bed?.roomNumber}–{bed?.label}</span>
              </p>
            </div>
          </div>
          <div>
            <StatusBadge status="ACTIVE" />
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="premium-tab-list">
          {(["overview", "payments", "profile"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`premium-tab ${activeTab === tab ? "active" : ""}`}
            >
              {tab === "overview" ? "Overview" : tab === "payments" ? "Billing & Payments" : "Settings"}
            </button>
          ))}
        </nav>
      </header>

      <main className="px-6 md:px-10 py-8 space-y-8">
        
        {/* ── Alerts ── */}
        {(pendingReqs.length > 0 || revokedReqs.length > 0) && (
          <div className="space-y-3">
            {pendingReqs.map(req => (
              <div key={req.id} className="premium-card border-orange-200 dark:border-orange-900/30 bg-orange-50/50 dark:bg-orange-950/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-black dark:text-white">Payment Required</h4>
                    <p className="text-sm text-[#767676] mt-0.5">An invoice of {formatCurrency(req.amount)} for {req.type.replace(/_/g, " ").toLowerCase()} is pending.</p>
                  </div>
                </div>
                <Link href={`/tenant/service-requests/${req.id}`} className="premium-button-outline whitespace-nowrap text-xs">
                  Pay Now
                </Link>
              </div>
            ))}
            {revokedReqs.map(req => (
              <div key={req.id} className="premium-card border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/10 p-4 flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-black dark:text-white">Service Revoked</h4>
                  <p className="text-sm text-[#767676] mt-0.5">Refund of {formatCurrency(req.amount)} processed. {req.metadata?.revocation?.reason}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────── */}
        {/* TAB: OVERVIEW                                                           */}
        {/* ─────────────────────────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Top Metrics Row */}
            <section>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8">
                <div>
                  <p className="text-xs font-medium text-[#767676] uppercase tracking-wider mb-2">Monthly Rent</p>
                  <p className="text-2xl font-semibold text-black dark:text-white tracking-tight">{formatCurrency(stay.monthlyRent)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#767676] uppercase tracking-wider mb-2">Next Payment</p>
                  <p className="text-2xl font-semibold text-black dark:text-white tracking-tight">{nextDueDate ? formatDate(nextDueDate) : "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#767676] uppercase tracking-wider mb-2">Days Remaining</p>
                  <p className="text-2xl font-semibold text-black dark:text-white tracking-tight">{daysLeft(stay.endDate)}<span className="text-lg text-[#767676] font-normal ml-1">days</span></p>
                </div>
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-xs font-medium text-[#767676] uppercase tracking-wider">Paid to Date</p>
                    <span className="text-xs font-medium text-black dark:text-white">{progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#f0f0f0] dark:bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-black dark:bg-[#58ff48] transition-all duration-1000" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            </section>

            {/* Split Content: Stay Details & Roommates */}
            <div className="grid lg:grid-cols-2 gap-8">
              
              <section>
                <SectionHeader title="Stay Details" />
                <div className="premium-card px-6 py-2">
                  <DataList>
                    <DataRow label="Property" value={hostel?.name || "—"} />
                    <DataRow label="Bed Assignment" value={<span className="font-mono bg-[#f5f5f5] dark:bg-white/5 px-2 py-1 rounded text-xs border border-[#dedede] dark:border-white/10">{bed?.roomNumber} - {bed?.label}</span>} />
                    <DataRow label="Sharing Type" value={bed?.sharingType?.replace(/_/g, " ") || "—"} />
                    <DataRow label="Contract Start" value={formatDate(stay.joiningDate)} />
                    <DataRow label="Contract End" value={formatDate(stay.endDate)} />
                    <DataRow label="Billing Cycle" value={stay.durationType} />
                  </DataList>
                </div>
              </section>

              <section className="space-y-8">
                <div>
                  <SectionHeader title="Roommates" description="People currently sharing your room." />
                  <div className="premium-card">
                    {roommates.length === 0 ? (
                      <div className="p-6 text-sm text-[#767676] text-center">No roommates assigned.</div>
                    ) : (
                      <ul className="divide-y divide-[#dedede] dark:divide-white/10">
                        {roommates.map((rm, i) => (
                          <li key={i} className="p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              {rm.photoUrl ? (
                                <img src={rm.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-[#dedede] dark:border-white/10" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-[#f5f5f5] dark:bg-white/10 border border-[#dedede] dark:border-white/10 flex items-center justify-center text-xs font-semibold text-black dark:text-white">
                                  {getInitials(rm.fullName)}
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium text-black dark:text-white leading-none">{rm.fullName}</p>
                                <p className="text-xs text-[#767676] mt-1">
                                  {rm.occupationType === "STUDENT" ? rm.collegeName || "Student" : `${rm.designation || "Employee"} · ${rm.companyName || "N/A"}`}
                                </p>
                              </div>
                            </div>
                            <span className="font-mono text-xs text-[#767676]">Bed {rm.bedLabel}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div>
                  <SectionHeader title="Services" />
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Link href="/tenant/food" className="premium-card p-5 flex flex-col gap-3 hover:border-black dark:hover:border-white transition-colors group">
                      <div className="flex justify-between items-start">
                        <Utensils className="w-5 h-5 text-[#767676] group-hover:text-black dark:group-hover:text-white transition-colors" />
                        <ArrowUpRight className="w-4 h-4 text-[#dedede] group-hover:text-black dark:group-hover:text-white transition-colors" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-black dark:text-white">Food Plan</p>
                        <p className="text-xs text-[#767676] mt-0.5">{stay.foodPlan === "NOT_INCLUDED" ? "Not included in stay" : "Manage weekly meals"}</p>
                      </div>
                    </Link>
                  </div>
                </div>
              </section>

            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────── */}
        {/* TAB: BILLING & PAYMENTS                                                 */}
        {/* ─────────────────────────────────────────────────────────────────────── */}
        {activeTab === "payments" && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <section className="grid lg:grid-cols-3 gap-8 items-start">
              
              {/* Ledger / Summary */}
              <div className="lg:col-span-1 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-black dark:text-white tracking-tight mb-4">Financial Summary</h3>
                  <div className="premium-card px-5 py-2">
                    <DataList>
                      <DataRow label="Monthly Rent" value={formatCurrency(stay.monthlyRent)} />
                      {stay.foodCharges > 0 && <DataRow label="Food Charges" value={formatCurrency(stay.foodCharges)} />}
                      <DataRow label="Security Deposit" value={formatCurrency(stay.securityDeposit)} />
                      {stay.admissionFee > 0 && <DataRow label="Admission Fee" value={formatCurrency(stay.admissionFee)} />}
                      {stay.discount > 0 && <DataRow label="Discounts" value={`− ${formatCurrency(stay.discount)}`} valueClass="text-[#1a8a10] dark:text-[#58ff48]" />}
                    </DataList>
                    <div className="py-4 border-t border-[#dedede] dark:border-white/10 mt-2 flex justify-between">
                      <span className="text-sm font-medium text-black dark:text-white">Total Ledger</span>
                      <span className="text-sm font-semibold text-black dark:text-white font-mono">{formatCurrency(stay.totalPayable)}</span>
                    </div>
                  </div>
                </div>

                <div className="premium-card p-6 bg-[#fafafa] dark:bg-white/[0.02]">
                  <p className="text-xs font-medium text-[#767676] uppercase tracking-wider mb-2">Current Balance Due</p>
                  <p className="text-3xl font-semibold tracking-tight text-black dark:text-white mb-4">
                    {formatCurrency(remaining)}
                  </p>
                  {remaining > 0 && (
                    <form onSubmit={handleUploadPayment} className="space-y-4 pt-4 border-t border-[#dedede] dark:border-white/10">
                      <div>
                        <label className="block text-xs font-medium text-[#767676] mb-1.5">Amount (₹)</label>
                        <input
                          type="number" required min="1" value={uploadAmount} onChange={e => setUploadAmount(e.target.value)}
                          className="w-full h-9 px-3 bg-white dark:bg-transparent border border-[#dedede] dark:border-white/20 rounded-sm text-sm text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#767676] mb-1.5">Transaction Reference</label>
                        <input
                          type="text" required value={uploadRef} onChange={e => setUploadRef(e.target.value)}
                          className="w-full h-9 px-3 bg-white dark:bg-transparent border border-[#dedede] dark:border-white/20 rounded-sm text-sm text-black dark:text-white font-mono focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                          placeholder="UPI UTR or Bank Ref"
                        />
                      </div>
                      <button type="submit" disabled={uploading} className="premium-button w-full flex justify-center items-center gap-2">
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {uploading ? "Submitting..." : "Submit Proof"}
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* Transactions Table */}
              <div className="lg:col-span-2">
                <SectionHeader title="Transaction History" description="A complete ledger of your payments and refunds." />
                <div className="premium-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="premium-table">
                      <thead>
                        <tr className="bg-[#fafafa] dark:bg-white/[0.02]">
                          <th>Date</th>
                          <th>Reference ID</th>
                          <th>Status</th>
                          <th className="text-right">Amount</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-sm text-[#767676]">No transactions found.</td>
                          </tr>
                        ) : (
                          payments.map((p) => {
                            const isNeg = p.amountPaid < 0;
                            return (
                              <tr key={p.id}>
                                <td className="whitespace-nowrap">{formatDate(p.createdAt)}</td>
                                <td className="font-mono text-xs text-[#767676] dark:text-[#a0a0a0]">
                                  {p.transactionRefNo || "—"}
                                </td>
                                <td>
                                  <StatusBadge status={isNeg ? "REFUNDED" : p.paymentStatus} />
                                </td>
                                <td className={`text-right font-mono ${isNeg ? "text-[#767676]" : "text-black dark:text-white"}`}>
                                  {isNeg ? `− ${formatCurrency(Math.abs(p.amountPaid))}` : formatCurrency(p.amountPaid)}
                                </td>
                                <td className="text-right pl-0 pr-4">
                                  {p.paymentStatus === "PAID" && !isNeg && (
                                    <a href={`/api/pdf/receipt/${p.id}`} target="_blank" rel="noopener noreferrer" className="text-[#767676] hover:text-black dark:hover:text-white transition-colors" title="Download Receipt">
                                      <Download className="w-4 h-4" />
                                    </a>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </section>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────── */}
        {/* TAB: SETTINGS / PROFILE                                                 */}
        {/* ─────────────────────────────────────────────────────────────────────── */}
        {activeTab === "profile" && (
          <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            
            <section>
              <h3 className="text-sm font-semibold text-black dark:text-white tracking-tight mb-4">Account</h3>
              <div className="premium-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  {tenant?.photoUrl ? (
                    <img src={tenant.photoUrl} alt="" className="w-16 h-16 rounded-full object-cover border border-[#dedede] dark:border-white/10" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[#f5f5f5] dark:bg-white/10 flex items-center justify-center text-lg font-semibold text-black dark:text-white">
                      {tenant?.fullName ? getInitials(tenant.fullName) : "T"}
                    </div>
                  )}
                  <div>
                    <h4 className="text-base font-semibold text-black dark:text-white">{tenant?.fullName}</h4>
                    <p className="text-sm text-[#767676] mt-0.5">Tenant Account</p>
                  </div>
                </div>
                <button onClick={handleLogout} className="premium-button-outline text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900/30 flex items-center gap-2">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </section>

          </div>
        )}

      </main>
    </div>
  );
}
