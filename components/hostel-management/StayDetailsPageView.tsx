"use client";

import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { User, ArrowLeft, Download, FileText, CheckCircle2, MapPin, Phone, Mail, Building, Briefcase, Hash, Calendar, Layers, ShieldCheck, Utensils } from "lucide-react";
import Link from "next/link";
import { paiseToRupees } from "@/lib/money";
import { ResetPasswordButton } from "@/components/admin/ResetPasswordButton";

type StayData = any; // I'll type this properly or rely on any since it's a massive nested object from prisma

export default function StayDetailsPageView({ stay, baseRoute, backUrl }: { stay: StayData; baseRoute: string; backUrl?: string }) {
  const t = stay.tenant;
  const docs = t.documents || [];
  const idDoc = docs.find((d: any) => ["AADHAAR", "PASSPORT_PHOTO", "PAN"].includes(d.documentType));
  
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href={backUrl || `${baseRoute}/stays`}>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-muted/50 hover:bg-muted">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent flex items-center gap-3">
              {t.fullName}'s Profile
              <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${stay.status === "ACTIVE" || stay.status === "EXTENDED" ? "bg-green-100 text-green-700 border-green-200" : "bg-muted text-muted-foreground border-border"}`}>
                {stay.status}
              </span>
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" /> 
              Room {stay.bed.room.roomNumber} &middot; Bed {stay.bed.label} &middot; {stay.hostel.name}
            </p>
          </div>
        </div>
        {baseRoute === "/admin" && t.user && (
          <ResetPasswordButton userId={t.user.id} userPhone={t.user.phone} />
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Profile & Quick Actions */}
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-primary/10 to-primary/5"></div>
            <div className="relative">
              {t.photoUrl ? (
                <img src={t.photoUrl} alt="Profile" className="h-32 w-32 rounded-full border-4 border-background shadow-md object-cover mx-auto bg-card" />
              ) : (
                <div className="h-32 w-32 rounded-full border-4 border-background shadow-md flex items-center justify-center bg-muted text-muted-foreground mx-auto relative z-10">
                  <User className="h-12 w-12" />
                </div>
              )}
              <h3 className="font-bold text-xl mt-4">{t.fullName}</h3>
              <p className="text-sm text-muted-foreground mt-1 font-medium">{t.occupationType?.replace("_", " ") || "Tenant"}</p>
              
              <div className="flex flex-col gap-2 mt-6 text-sm text-left">
                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                  <Phone className="h-4 w-4 text-primary" />
                  <span className="font-medium">{t.user?.phone || "—"}</span>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="font-medium truncate">{t.user?.email || "—"}</span>
                </div>
                {t.dateOfBirth && (
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="font-medium">{format(new Date(t.dateOfBirth), "PP")}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ID Document Card */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Identity Verification</h3>
            {idDoc ? (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-md text-blue-700 dark:text-blue-300">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{idDoc.documentType}</p>
                    <p className="text-xs text-muted-foreground">Verified Document</p>
                  </div>
                </div>
                <Button className="w-full" variant="outline" onClick={() => window.open(idDoc.storagePath, "_blank")}>
                  <Download className="h-4 w-4 mr-2" /> View Document
                </Button>
              </div>
            ) : (
              <div className="text-center p-6 bg-muted/20 rounded-lg border border-dashed">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">No ID document uploaded</p>
              </div>
            )}
          </div>
        </div>

        {/* Middle & Right Column - Details */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Stay Details Grid */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><Building className="h-5 w-5 text-primary" /> Stay & Accommodation</h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Joining Date</p>
                <p className="font-semibold">{format(new Date(stay.joiningDate), "PP")}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">End Date</p>
                <p className="font-semibold">{format(new Date(stay.endDate), "PP")}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Duration</p>
                <p className="font-semibold">{stay.durationType}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Food Plan</p>
                <p className="font-semibold flex items-center gap-1.5"><Utensils className="h-3.5 w-3.5 text-muted-foreground"/> {stay.foodPlan.replace("_", " ")}</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-xl bg-gradient-to-br from-card to-muted/20">
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Payable</p>
                <p className="text-2xl font-bold">₹ {paiseToRupees(stay.totalPayablePaise).toLocaleString()}</p>
              </div>
              <div className="p-4 border rounded-xl bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 border-green-100 dark:border-green-900">
                <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">Paid Amount</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  ₹ {stay.payments.filter((p: any) => p.paymentStatus === "PAID").reduce((sum: number, p: any) => sum + paiseToRupees(p.amountPaidPaise), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Personal Info Grid */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><Layers className="h-5 w-5 text-primary" /> Personal Information</h3>
            
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Place of Birth</p>
                  <p className="font-semibold">{t.placeOfBirth || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Permanent Address</p>
                  <p className="font-semibold leading-relaxed">{t.permanentAddress || "Not provided"}</p>
                </div>
              </div>
              
              <div className="space-y-4 border-l pl-6 border-border/50">
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Emergency Contact</p>
                  <p className="font-semibold">{t.emergencyContactName || "Not provided"}</p>
                  <p className="text-sm text-muted-foreground">{t.emergencyContactNumber} {t.relationship ? `(${t.relationship})` : ""}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Parent / Guardian</p>
                  <p className="font-semibold">{t.parentGuardianName || "Not provided"}</p>
                  <p className="text-sm text-muted-foreground">{t.parentGuardianContact}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Professional/Academic */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" /> Academic & Professional</h3>
            
            <div className="grid sm:grid-cols-2 gap-6">
              {t.occupationType === "STUDENT" ? (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">College / University</p>
                    <p className="font-semibold">{t.collegeName || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Course / Branch</p>
                    <p className="font-semibold">{t.courseOrBranch || "Not provided"}</p>
                  </div>
                </>
              ) : t.occupationType === "WORKING_PROFESSIONAL" ? (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Company Name</p>
                    <p className="font-semibold">{t.companyName || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Designation</p>
                    <p className="font-semibold">{t.designation || "Not provided"}</p>
                  </div>
                </>
              ) : (
                <div className="col-span-2 text-muted-foreground text-sm italic">
                  No professional or academic information provided.
                </div>
              )}
            </div>
          </div>

          {/* Payment History */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Payment History</h3>
            {stay.payments && stay.payments.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {stay.payments.map((payment: any) => (
                  <div key={payment.id} className="p-3 border rounded-lg flex items-center justify-between bg-muted/10">
                    <div>
                      <span className="font-medium text-sm block">₹ {paiseToRupees(payment.amountPaidPaise).toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(payment.createdAt), "PP")} &middot; {payment.paymentMode.replace("_", " ")}</span>
                    </div>
                    <div>
                      <span className={`px-2.5 py-1 text-xs rounded-full font-semibold border ${payment.paymentStatus === "PAID" ? "bg-green-100 text-green-700 border-green-200" : payment.paymentStatus === "PENDING" ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-red-100 text-red-700 border-red-200"}`}>
                        {payment.paymentStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-6 bg-muted/20 rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">No payments recorded</p>
              </div>
            )}
          </div>

          {/* Food Order History */}
          {stay.foodOrders && stay.foodOrders.length > 0 && (
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><Utensils className="h-5 w-5 text-primary" /> Food Order History</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {stay.foodOrders.map((order: any) => (
                  <div key={order.id} className="p-3 border rounded-lg flex items-center justify-between bg-muted/10">
                    <span className="font-medium text-sm">{format(new Date(order.forDate), "PP")}</span>
                    <div className="flex gap-2">
                      <span className={`px-2 py-0.5 text-xs rounded font-semibold ${order.breakfast ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>B</span>
                      <span className={`px-2 py-0.5 text-xs rounded font-semibold ${order.lunch ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>L</span>
                      <span className={`px-2 py-0.5 text-xs rounded font-semibold ${order.dinner ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>D</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
