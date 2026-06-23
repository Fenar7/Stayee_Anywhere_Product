"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2, CreditCard, Upload, CheckCircle, AlertCircle,
  FileText, Landmark, Clock, LogOut, Users,
  CalendarDays, Building2, BedSingle, UtensilsCrossed
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StayCard } from "@/components/tenant/StayCard";
import { RoommatesCard } from "@/components/tenant/RoommatesCard";
import { PaymentHistory } from "@/components/tenant/PaymentHistory";
import { PaymentUploadForm, RentRenewalForm } from "@/components/tenant/PaymentForms";
import { InitialPaymentForm } from "@/components/tenant/InitialPaymentForm";
import { notify } from "@/lib/toast";
import { DashboardSkeleton } from "@/components/shared/DashboardSkeleton";

interface PaymentItem {
  id: string;
  amountPaid: number;
  paymentMode: string;
  transactionRefNo: string | null;
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

interface PaymentConfig {
  upiId: string | null;
  qrCodeUrl: string | null;
}

interface ApiResponse {
  stay: StayDetails | null;
  hostel: HostelDetails | null;
  bed: BedDetails | null;
  payments: PaymentItem[];
  roommates: RoommateDetails[];
  nextDueDate: string | null;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}



export default function TenantDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [stay, setStay] = useState<StayDetails | null>(null);
  const [hostel, setHostel] = useState<HostelDetails | null>(null);
  const [bed, setBed] = useState<BedDetails | null>(null);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [roommates, setRoommates] = useState<RoommateDetails[]>([]);
  const [nextDueDate, setNextDueDate] = useState<string | null>(null);

  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);

  const fetchStayDetails = async () => {
    try {
      const response = await fetch("/api/tenant/stay");
      if (!response.ok) {
        throw new Error("Failed to load dashboard details");
      }
      const data: ApiResponse = await response.json();
      setStay(data.stay);
      setHostel(data.hostel);
      setBed(data.bed);
      setPayments(data.payments || []);
      setRoommates(data.roommates || []);
      setNextDueDate(data.nextDueDate || null);

      if (data.hostel?.id) {
        try {
          const pcRes = await fetch(`/api/public/hostels/${data.hostel.id}/payment-config`);
          if (pcRes.ok) {
            const pcData = await pcRes.json();
            setPaymentConfig(pcData);
          }
        } catch { /* non-critical */ }
      }
    } catch (err: any) {
      notify.error(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStayDetails();
  }, []);



  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };



  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <DashboardSkeleton />
      </div>
    );
  }

  const verifiedPaid = payments
    .filter((p) => p.paymentStatus === "PAID" || p.paymentStatus === "PARTIALLY_PAID")
    .reduce((sum, p) => sum + p.amountPaid, 0);

  const remainingBalance = stay ? stay.totalPayable - verifiedPaid : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">NextHome Portal</span>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary font-semibold">Tenant</span>
          </div>
          <Button onClick={handleLogout} variant="ghost" size="sm" className="flex items-center gap-2">
            <LogOut className="h-4 w-4" /> Log Out
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">

        {!stay ? (
          <div className="max-w-md mx-auto border rounded-xl bg-card p-8 shadow-sm text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground text-xl">
              🏠
            </div>
            <h2 className="text-xl font-bold">Welcome to NextHome!</h2>
            <p className="text-sm text-muted-foreground">
              You are currently logged in, but there is no active stay registered for your account. Please contact your hostel warden to initiate onboarding.
            </p>
          </div>
        ) : stay.status === "ONBOARDING_PENDING" ? (
          <div className="max-w-2xl mx-auto border rounded-xl bg-card p-8 shadow-md text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-500">
              <Clock className="h-10 w-10 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Application Under Review</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Thank you! Your profile documents and self-registration details have been submitted.
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                Hostel: {hostel?.name} &middot; Bed: {bed?.roomNumber}-{bed?.label}
              </div>
            </div>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Warden review is pending. We will enable the payment portal as soon as the warden approves your registration. Please stay tuned!
            </p>
          </div>
        ) : stay.status === "APPROVED_AWAITING_PAYMENT" ? (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <InitialPaymentForm
                hostel={hostel}
                paymentConfig={paymentConfig}
                remainingBalance={remainingBalance}
                onSuccess={(msg) => {
                  notify.success(msg);
                  fetchStayDetails();
                }}
                onError={(msg) => {
                  notify.error(msg);
                }}
              />
            </div>

            <div className="space-y-6">
              <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-lg border-b pb-2">Stay Billing</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hostel:</span>
                    <span className="font-bold">{hostel?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bed:</span>
                    <span className="font-semibold">{bed?.roomNumber} - {bed?.label}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Admission Fee:</span>
                    <span>₹ {stay.admissionFee.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stay Rent:</span>
                    <span>₹ {stay.monthlyRent.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Security Deposit:</span>
                    <span>₹ {stay.securityDeposit.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Food Charges:</span>
                    <span>₹ {stay.foodCharges.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Discount Applied:</span>
                    <span>- ₹ {stay.discount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-bold text-base">
                    <span>Total Due:</span>
                    <span className="text-primary">₹ {stay.totalPayable.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2 text-xs border-dashed">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Verified Paid:</span>
                    <span>₹ {verifiedPaid.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-primary font-bold text-sm">
                    <span>Remaining Due:</span>
                    <span>₹ {remainingBalance.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {payments.length > 0 && (
                <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-base border-b pb-2">Upload History</h3>
                  <div className="space-y-3">
                    {payments.map((pmt) => (
                      <div key={pmt.id} className="border rounded p-3 text-xs flex justify-between items-center bg-muted/10">
                        <div>
                          <p className="font-bold">₹ {pmt.amountPaid.toLocaleString("en-IN")}</p>
                          <p className="text-[10px] text-muted-foreground">{formatDate(pmt.createdAt)}</p>
                        </div>
                        <div>
                          {pmt.paymentStatus === "PENDING" ? (
                            <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-[9px] font-bold text-yellow-800 uppercase dark:bg-yellow-900/30 dark:text-yellow-400">Verifying</span>
                          ) : pmt.paymentStatus === "PAID" ? (
                            <span className="rounded bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-green-800 uppercase dark:bg-green-900/30 dark:text-green-400">Verified</span>
                          ) : (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 uppercase dark:bg-amber-900/30 dark:text-amber-400">Partial</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <StayCard
                stay={stay}
                hostel={hostel}
                bed={bed}
                formatDate={formatDate}
              />
              <RoommatesCard roommates={roommates} />
            </div>

            <div className="space-y-6">
              <RentRenewalForm
                stay={stay}
                paymentConfig={paymentConfig}
                nextDueDate={nextDueDate}
                formatDate={formatDate}
                onSuccess={(msg) => {
                  notify.success(msg);
                  fetchStayDetails();
                }}
                onError={(msg) => {
                  notify.error(msg);
                }}
              />
              <PaymentHistory payments={payments} formatDate={formatDate} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
