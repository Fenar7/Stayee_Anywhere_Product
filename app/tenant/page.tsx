"use client";

import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogOut, Clock, CalendarDays, Building2, BedSingle, AlertCircle, CheckCircle, Upload, UtensilsCrossed, Calendar, CreditCard, Download } from "lucide-react";
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

  // Upload Payment State
  const [uploadAmount, setUploadAmount] = useState("");
  const [uploadRef, setUploadRef] = useState("");
  const [uploading, setUploading] = useState(false);

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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <DashboardSkeleton />
      </div>
    );
  }

  const verifiedPaid = payments
    .filter((p) => p.paymentStatus === "PAID" || p.paymentStatus === "PARTIALLY_PAID")
    .reduce((sum, p) => sum + p.amountPaid, 0);

  const remainingBalance = stay ? stay.totalPayable - verifiedPaid : 0;

  let daysUntilDue = null;
  if (nextDueDate) {
    const due = new Date(nextDueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b bg-white/70 dark:bg-slate-900/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Anywhere Node
            </span>
            <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider">Tenant</Badge>
          </div>
          <Button onClick={handleLogout} variant="ghost" size="sm" className="flex items-center gap-2 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950">
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Log Out</span>
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {!stay ? (
          <div className="max-w-md mx-auto border rounded-2xl bg-card p-10 shadow-sm text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground text-3xl">
              🏠
            </div>
            <h2 className="text-2xl font-bold">Welcome to Anywhere Node!</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You are currently logged in, but there is no active stay registered for your account. Please contact your hostel warden to initiate onboarding.
            </p>
          </div>
        ) : stay.status === "ONBOARDING_PENDING" ? (
          <div className="max-w-2xl mx-auto border rounded-2xl bg-card p-10 shadow-lg text-center space-y-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-500 ring-8 ring-yellow-500/5">
              <Clock className="h-10 w-10 animate-pulse" />
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-extrabold">Application Under Review</h2>
              <p className="text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
                Thank you! Your profile documents and self-registration details have been submitted successfully.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-yellow-100 px-4 py-1.5 text-sm font-semibold text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                <Building2 className="h-4 w-4" /> {hostel?.name} &middot; Bed {bed?.roomNumber}-{bed?.label}
              </div>
            </div>
          </div>
        ) : stay.status === "APPROVED_AWAITING_PAYMENT" ? (
          <div className="grid gap-8 lg:grid-cols-3">
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
              <Card className="shadow-md border-border/50">
                <CardHeader className="bg-muted/30 pb-4 border-b">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-primary" /> Stay Billing
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hostel:</span>
                    <span className="font-medium text-right">{hostel?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bed:</span>
                    <span className="font-semibold">{bed?.roomNumber} - {bed?.label}</span>
                  </div>
                  <div className="flex justify-between border-t pt-3">
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
                  <div className="flex justify-between text-red-600">
                    <span>Discount Applied:</span>
                    <span>- ₹ {stay.discount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between border-t pt-3 font-bold text-lg">
                    <span>Total Due:</span>
                    <span className="text-primary">₹ {stay.totalPayable.toLocaleString("en-IN")}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* PENDING SERVICE REQUESTS BANNER */}
            {pendingServiceRequests.map((req) => (
              <div key={req.id} className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3 text-orange-800 dark:text-orange-300">
                  <AlertCircle className="h-6 w-6 shrink-0" />
                  <div>
                    <h4 className="font-semibold">Pending Payment Required</h4>
                    <p className="text-sm">You have an unpaid {req.type.replace(/_/g, ' ').toLowerCase()} of ₹{req.amount}. Please clear this immediately.</p>
                  </div>
                </div>
                <Link href={`/tenant/service-requests/${req.id}`} className={buttonVariants({ variant: "default", className: "shrink-0 bg-orange-600 hover:bg-orange-700 text-white shadow-sm" })}>
                  Pay Now
                </Link>
              </div>
            ))}

            {/* HERO CARD */}
            <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 ring-1 ring-border/50">
              <div className="h-32 bg-gradient-to-r from-primary/80 to-blue-600/80"></div>
              <CardContent className="p-6 sm:p-8 pt-0 relative">
                <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                  <Avatar className="h-28 w-28 border-4 border-background shadow-lg -mt-14 bg-white">
                    <AvatarImage src={tenant?.photoUrl || undefined} className="object-cover" />
                    <AvatarFallback className="text-3xl font-light text-primary">{tenant?.fullName ? getInitials(tenant.fullName) : "TN"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-center sm:text-left pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">{tenant?.fullName || "Tenant User"}</h1>
                        <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-sm text-muted-foreground font-medium">
                          <span className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-md">
                            <Building2 className="h-4 w-4" /> {hostel?.name}
                          </span>
                          <span className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-md">
                            <BedSingle className="h-4 w-4" /> {bed?.roomNumber}-{bed?.label} ({bed?.sharingType})
                          </span>
                        </div>
                      </div>
                      <Badge variant="default" className="w-fit mx-auto sm:mx-0 px-3 py-1 bg-green-500 hover:bg-green-600 shadow-sm text-xs uppercase tracking-widest font-bold">
                        {stay.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* TABS */}
            <Tabs defaultValue="mystay" className="w-full">
              <TabsList className="grid w-full max-w-xl grid-cols-4 mx-auto mb-8 h-12 bg-muted/50 p-1 rounded-xl">
                <TabsTrigger value="mystay" className="rounded-lg font-medium text-sm data-[state=active]:shadow-sm">My Stay</TabsTrigger>
                <TabsTrigger value="payments" className="rounded-lg font-medium text-sm data-[state=active]:shadow-sm">Payments</TabsTrigger>
                <TabsTrigger value="food" className="rounded-lg font-medium text-sm data-[state=active]:shadow-sm">Food</TabsTrigger>
                <TabsTrigger value="roommates" className="rounded-lg font-medium text-sm data-[state=active]:shadow-sm">Roommates</TabsTrigger>
              </TabsList>

              {/* TAB: MY STAY */}
              <TabsContent value="mystay" className="space-y-6 focus-visible:outline-none">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  
                  {/* Next Due Highlight */}
                  {nextDueDate && (
                    <Card className={`lg:col-span-3 border-l-4 ${daysUntilDue !== null && daysUntilDue <= 7 ? "border-l-red-500 bg-red-50/50 dark:bg-red-950/20" : "border-l-primary bg-primary/5"} shadow-sm`}>
                      <CardContent className="flex items-center justify-between p-6">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-full ${daysUntilDue !== null && daysUntilDue <= 7 ? "bg-red-100 text-red-600 dark:bg-red-900" : "bg-primary/20 text-primary"}`}>
                            <Calendar className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Next Payment Due</p>
                            <p className="text-xl font-bold">{formatDate(nextDueDate)}</p>
                          </div>
                        </div>
                        {daysUntilDue !== null && daysUntilDue <= 7 && daysUntilDue > 0 && (
                          <Badge variant="destructive" className="px-3 py-1.5 text-sm font-bold shadow-sm animate-pulse">
                            Due in {daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        {daysUntilDue !== null && daysUntilDue <= 0 && (
                          <Badge variant="destructive" className="px-3 py-1.5 text-sm font-bold shadow-sm">
                            Overdue
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  <Card className="shadow-sm">
                    <CardHeader className="pb-3 border-b border-muted/50 mb-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-muted-foreground" /> Stay Timeline
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Joining Date</p>
                        <p className="font-semibold text-lg">{formatDate(stay.joiningDate)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">End Date</p>
                        <p className="font-semibold text-lg">{formatDate(stay.endDate)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Duration Type</p>
                        <p className="font-medium inline-block bg-muted px-2 py-0.5 rounded text-sm mt-1">{stay.durationType}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm">
                    <CardHeader className="pb-3 border-b border-muted/50 mb-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-muted-foreground" /> Billing Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Monthly Rent</span>
                        <span className="font-medium">₹ {stay.monthlyRent.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Food Charges</span>
                        <span className="font-medium">₹ {stay.foodCharges.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-muted-foreground">Security Deposit</span>
                        <span className="font-medium">₹ {stay.securityDeposit.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Admission Fee</span>
                        <span className="font-medium">₹ {stay.admissionFee.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>Discount</span>
                        <span>- ₹ {stay.discount.toLocaleString("en-IN")}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* TAB: PAYMENTS */}
              <TabsContent value="payments" className="space-y-6 focus-visible:outline-none">
                <div className="grid gap-6 lg:grid-cols-3">
                  <Card className="lg:col-span-2 shadow-sm order-2 lg:order-1">
                    <CardHeader>
                      <CardTitle className="text-xl">Payment History</CardTitle>
                      <CardDescription>A record of all your transactions.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {payments.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                          <p>No payments recorded yet.</p>
                        </div>
                      ) : (
                        <div className="rounded-md border overflow-hidden">
                          <Table>
                            <TableHeader className="bg-muted/50">
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Ref No</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                                <TableHead className="text-right"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {payments.map((p) => (
                                <TableRow key={p.id}>
                                  <TableCell className="font-medium text-xs whitespace-nowrap">{formatDate(p.createdAt)}</TableCell>
                                  <TableCell>₹ {p.amountPaid.toLocaleString("en-IN")}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground">{p.transactionRefNo || "-"}</TableCell>
                                  <TableCell className="text-right">
                                    {p.paymentStatus === "PAID" ? (
                                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Verified</Badge>
                                    ) : p.paymentStatus === "PENDING" ? (
                                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Verifying</Badge>
                                    ) : (
                                      <Badge variant="outline">{p.paymentStatus}</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {p.paymentStatus === "PAID" && (
                                      <a 
                                        href={`/api/pdf/receipt/${p.id}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-xs font-medium text-primary hover:underline flex items-center justify-end gap-1"
                                      >
                                        <Download className="h-3 w-3" />
                                        Receipt
                                      </a>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="shadow-md border-primary/20 order-1 lg:order-2 bg-gradient-to-b from-card to-muted/10">
                    <CardHeader>
                      <CardTitle className="text-xl">Upload Payment</CardTitle>
                      <CardDescription>Submit transaction details after paying via UPI.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleUploadPayment} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="amount">Amount Paid (₹)</Label>
                          <Input
                            id="amount"
                            type="number"
                            placeholder="e.g. 5000"
                            value={uploadAmount}
                            onChange={(e) => setUploadAmount(e.target.value)}
                            required
                            min="1"
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ref">Transaction Ref / UTR</Label>
                          <Input
                            id="ref"
                            type="text"
                            placeholder="12-digit UPI Ref"
                            value={uploadRef}
                            onChange={(e) => setUploadRef(e.target.value)}
                            required
                            className="bg-background"
                          />
                        </div>
                        <Button type="submit" className="w-full font-bold shadow-sm" disabled={uploading}>
                          {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                          Submit Payment
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* TAB: FOOD */}
              <TabsContent value="food" className="focus-visible:outline-none">
                {stay.foodPlan === "NOT_INCLUDED" ? (
                  <div className="py-16 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed">
                    <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium text-foreground">Food Not Included</p>
                    <p className="max-w-xs mx-auto text-sm mt-1">
                      Your stay plan does not include hostel food. Contact your warden to upgrade your plan.
                    </p>
                  </div>
                ) : (
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 overflow-hidden relative">
                    <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
                      <UtensilsCrossed className="w-64 h-64 -mt-10 -mr-10" />
                    </div>
                    <CardContent className="p-10 flex flex-col items-center text-center relative z-10 space-y-6">
                      <div className="p-4 bg-white dark:bg-slate-900 rounded-full shadow-sm mb-2">
                        <UtensilsCrossed className="h-10 w-10 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="text-3xl font-bold tracking-tight text-amber-900 dark:text-amber-100">Weekly Meal Plan</h3>
                        <p className="text-amber-700 dark:text-amber-400 max-w-md mx-auto mt-3 text-lg">
                          Manage your breakfast, lunch, and dinner preferences for the upcoming week.
                        </p>
                      </div>
                      <Link href="/tenant/food" passHref>
                        <Button size="lg" className="bg-amber-600 hover:bg-amber-700 text-white rounded-full px-8 shadow-md mt-4 text-base font-semibold">
                          Manage Food Orders
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* TAB: ROOMMATES */}
              <TabsContent value="roommates" className="focus-visible:outline-none">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {roommates.length === 0 ? (
                    <div className="col-span-full py-16 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed">
                      <BedSingle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-medium text-foreground">No Roommates</p>
                      <p>You currently do not have any roommates in this room.</p>
                    </div>
                  ) : (
                    roommates.map((rm, idx) => (
                      <Card key={idx} className="shadow-sm hover:shadow-md transition-shadow group border-border/50">
                        <CardContent className="p-6">
                          <div className="flex flex-col items-center text-center space-y-4">
                            <Avatar className="h-20 w-20 border-2 border-background shadow-sm group-hover:scale-105 transition-transform">
                              <AvatarImage src={rm.photoUrl || undefined} className="object-cover" />
                              <AvatarFallback className="text-2xl font-light text-primary bg-primary/10">
                                {getInitials(rm.fullName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-lg">{rm.fullName}</p>
                              <Badge variant="secondary" className="mt-1.5 font-medium">Bed {rm.bedLabel}</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground bg-muted/30 w-full rounded-lg p-3">
                              {rm.occupationType === "STUDENT" ? (
                                <div className="space-y-1">
                                  <p className="font-semibold text-foreground text-xs uppercase tracking-wider">Student</p>
                                  <p className="truncate">{rm.collegeName || "N/A"}</p>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <p className="font-semibold text-foreground text-xs uppercase tracking-wider">Professional</p>
                                  <p className="truncate">{rm.designation || "Employee"} at {rm.companyName || "N/A"}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
}
