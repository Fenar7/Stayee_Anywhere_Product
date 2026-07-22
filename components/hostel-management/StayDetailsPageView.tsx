"use client";

import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { 
  User, ArrowLeft, Download, FileText, MapPin, 
  Phone, Mail, Building, Briefcase, Calendar, 
  Layers, ShieldCheck, Utensils, CreditCard, Clock, Activity,
  CheckCircle2, IndianRupee
} from "lucide-react";
import Link from "next/link";
import { paiseToRupees } from "@/lib/money";
import { ResetPasswordButton } from "@/components/admin/ResetPasswordButton";
import { ServiceRequestModal } from "./ServiceRequestModal";
import { RevokeFoodModal } from "./RevokeFoodModal";
import { Prisma } from "@prisma/client";

type StayData = Prisma.StayGetPayload<{
  include: {
    hostel: true;
    tenant: {
      include: {
        user: true;
        documents: true;
      };
    };
    bed: {
      include: {
        room: true;
      };
    };
    payments: true;
    foodOrders: true;
  };
}>;

// Helper component for standard label/value pairs
const DataRow = ({ label, value, icon: Icon }: { label: string, value: string | React.ReactNode, icon?: any }) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2">
    <div className="w-[160px] shrink-0 text-[12px] font-semibold text-[#767676] dark:text-[#a0a0a0] uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
      {Icon && <Icon className="size-3.5" />}
      {label}
    </div>
    <div className="flex-1 text-[14px] font-medium text-[#222222] dark:text-white break-words">
      {value}
    </div>
  </div>
);

// Helper for section headers
const SectionHeader = ({ title, icon: Icon }: { title: string, icon: any }) => (
  <div className="bg-[#fcfcfc] dark:bg-white/5 border-b border-[#dedede] dark:border-white/10 px-6 py-4">
    <h3 className="font-bold text-[14px] text-[#222222] dark:text-white uppercase tracking-wider flex items-center gap-2">
      <Icon className="size-4 text-[#767676] dark:text-[#a0a0a0]" /> {title}
    </h3>
  </div>
);

export default function StayDetailsPageView({ stay, baseRoute, backUrl }: { stay: StayData; baseRoute: string; backUrl?: string }) {
  const t = stay.tenant;
  const docs = t.documents || [];
  const idDoc = docs.find((d: any) => ["AADHAAR", "PASSPORT_PHOTO", "PAN"].includes(d.documentType));
  
  const totalPaid = stay.payments.filter((p: any) => p.paymentStatus === "PAID").reduce((sum: number, p: any) => sum + paiseToRupees(p.amountPaidPaise), 0);
  const totalPayable = paiseToRupees(stay.totalPayablePaise);

  return (
    <div className="flex flex-col bg-transparent w-full min-h-screen pb-16">
      
      {/* 1. Global Premium Top Bar - Single Line */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 md:px-6 xl:px-8 py-2.5 border-b border-[#dedede] dark:border-white/10 shrink-0 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          <Link href={backUrl || `${baseRoute}/stays`} className="mr-1 text-[#767676] hover:text-[#222222] dark:hover:text-white transition-colors">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-[18px] font-bold tracking-tight text-[#222222] dark:text-white flex items-center gap-2">
            Profile Details
            <span className={`text-[10px] px-2 py-0.5 rounded-sm border font-bold uppercase tracking-wider ${stay.status === "ACTIVE" || stay.status === "EXTENDED" ? "bg-[#58ff48]/10 text-green-700 dark:text-[#58ff48] border-[#58ff48]/30" : "bg-transparent text-[#767676] dark:text-[#a0a0a0] border-[#dedede] dark:border-white/10"}`}>
              {stay.status}
            </span>
          </h1>
          
          <div className="hidden sm:flex items-center gap-3 text-[13px] text-[#767676] dark:text-[#a0a0a0]">
            <span className="w-px h-4 bg-[#dedede] dark:bg-white/20" />
            <span className="font-medium flex items-center gap-1.5"><MapPin className="size-3.5" /> {stay.hostel.name}</span>
            <span className="w-px h-4 bg-[#dedede] dark:bg-white/20" />
            <span className="font-medium">Room {stay.bed.room.roomNumber} &middot; Bed {stay.bed.label}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-3 sm:mt-0">
          <button className="hidden sm:flex premium-button h-9 items-center justify-center">
            Contact Tenant
          </button>
          {baseRoute === "/admin" && t.user && (
            <ResetPasswordButton userId={t.user.id} userPhone={t.user.phone} />
          )}
        </div>
      </div>

      {/* Main Content Area - Exact Dashboard Padding & Width */}
      <div className="px-4 md:px-6 xl:px-8 w-full mt-6 space-y-6">
        
        {/* 2. Unified Master Header Card */}
        <div className="premium-card flex flex-col xl:flex-row items-stretch">
          
          {/* Identity Block */}
          <div className="p-6 xl:w-2/5 border-b xl:border-b-0 xl:border-r border-[#dedede] dark:border-white/10 flex items-center gap-5">
            <div className="relative shrink-0">
              {t.photoUrl ? (
                <img src={t.photoUrl} alt="Profile" className="size-20 rounded-sm border border-[#dedede] dark:border-white/10 object-cover bg-white" />
              ) : (
                <div className="size-20 rounded-sm border border-[#dedede] dark:border-white/10 flex items-center justify-center bg-[#f5f5f5] dark:bg-white/5 text-[#767676] dark:text-[#a0a0a0]">
                  <User className="size-8" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-[22px] font-bold text-[#222222] dark:text-white leading-tight tracking-tight">{t.fullName}</h2>
              <p className="text-[13px] text-[#767676] dark:text-[#a0a0a0] font-medium mt-0.5">{t.occupationType?.replace("_", " ") || "Tenant"} &middot; Joined {format(new Date(stay.joiningDate), "MMM yyyy")}</p>
            </div>
          </div>

          {/* Metrics Ledger */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 border-[#dedede] dark:border-white/10 [&>div]:border-[#dedede] dark:[&>div]:border-white/10">
            <div className="p-6 flex flex-col justify-center">
              <h4 className="text-[11px] font-bold text-[#767676] dark:text-[#a0a0a0] uppercase tracking-wider mb-1 flex items-center gap-1.5"><Activity className="size-3.5" /> Stay Status</h4>
              <p className="text-[18px] font-bold text-[#222222] dark:text-white">{stay.status}</p>
            </div>
            
            <div className="p-6 flex flex-col justify-center">
              <h4 className="text-[11px] font-bold text-[#767676] dark:text-[#a0a0a0] uppercase tracking-wider mb-1 flex items-center gap-1.5"><Clock className="size-3.5" /> Duration</h4>
              <p className="text-[18px] font-bold text-[#222222] dark:text-white">{stay.durationType}</p>
            </div>

            <div className="p-6 flex flex-col justify-center">
              <h4 className="text-[11px] font-bold text-[#767676] dark:text-[#a0a0a0] uppercase tracking-wider mb-1 flex items-center gap-1.5"><CreditCard className="size-3.5" /> Total Payable</h4>
              <p className="text-[18px] font-bold text-[#222222] dark:text-white">₹ {totalPayable.toLocaleString()}</p>
            </div>

            <div className="p-6 flex flex-col justify-center bg-[#58ff48]/5 border-l border-[#dedede] dark:border-white/10">
              <h4 className="text-[11px] font-bold text-green-700 dark:text-[#58ff48] uppercase tracking-wider mb-1 flex items-center gap-1.5"><CheckCircle2 className="size-3.5" /> Amount Paid</h4>
              <p className="text-[18px] font-bold text-green-700 dark:text-[#58ff48]">₹ {totalPaid.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* 3. 2-Column Data Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column - Master Card */}
          <div className="premium-card flex flex-col divide-y divide-[#dedede] dark:divide-white/10">
             
             {/* Personal Details */}
             <div>
               <SectionHeader title="Identity & Background" icon={Layers} />
               <div className="p-6 space-y-3">
                 <DataRow icon={Phone} label="Phone Number" value={t.user?.phone || "—"} />
                 <DataRow icon={Mail} label="Email Address" value={t.user?.email || "—"} />
                 <DataRow icon={Calendar} label="Date of Birth" value={t.dateOfBirth ? format(new Date(t.dateOfBirth), "PP") : "—"} />
                 <DataRow icon={MapPin} label="Permanent Address" value={t.permanentAddress || "Not provided"} />
               </div>
             </div>

             {/* Emergency Contacts */}
             <div>
               <SectionHeader title="Emergency Contacts" icon={ShieldCheck} />
               <div className="p-6 space-y-5">
                 <div>
                   <p className="text-[11px] font-bold text-[#767676] dark:text-[#a0a0a0] uppercase tracking-wider mb-1">Emergency Contact</p>
                   <p className="text-[14px] font-bold text-[#222222] dark:text-white">{t.emergencyContactName || "Not provided"}</p>
                   <p className="text-[13px] font-medium text-[#767676] dark:text-[#a0a0a0] mt-0.5">{t.emergencyContactNumber} {t.relationship ? `(${t.relationship})` : ""}</p>
                 </div>
                 
                 <div>
                   <p className="text-[11px] font-bold text-[#767676] dark:text-[#a0a0a0] uppercase tracking-wider mb-1">Parent / Guardian</p>
                   <p className="text-[14px] font-bold text-[#222222] dark:text-white">{t.parentGuardianName || "Not provided"}</p>
                   <p className="text-[13px] font-medium text-[#767676] dark:text-[#a0a0a0] mt-0.5">{t.parentGuardianContact}</p>
                 </div>
               </div>
             </div>

             {/* Academic / Professional */}
             <div>
               <SectionHeader title="Academic / Professional" icon={Briefcase} />
               <div className="p-6 space-y-3">
                 {t.occupationType === "STUDENT" ? (
                   <>
                     <DataRow label="College / University" value={t.collegeName || "Not provided"} />
                     <DataRow label="Course / Branch" value={t.courseOrBranch || "Not provided"} />
                   </>
                 ) : t.occupationType === "WORKING_PROFESSIONAL" ? (
                   <>
                     <DataRow label="Company Name" value={t.companyName || "Not provided"} />
                     <DataRow label="Designation" value={t.designation || "Not provided"} />
                   </>
                 ) : (
                   <div className="text-[13px] text-[#767676] dark:text-[#a0a0a0] font-medium italic">
                     No professional or academic information provided.
                   </div>
                 )}
               </div>
             </div>
          </div>

          {/* Right Column - Master Card */}
          <div className="premium-card flex flex-col divide-y divide-[#dedede] dark:divide-white/10">
            
            {/* Stay Configuration */}
            <div>
              <SectionHeader title="Stay & Amenities" icon={Building} />
              <div className="p-6 space-y-3">
                <DataRow label="Start Date" value={format(new Date(stay.joiningDate), "PP")} />
                <DataRow label="End Date" value={stay.endDate ? format(new Date(stay.endDate), "PP") : "Open-ended stay"} />
                <DataRow icon={Utensils} label="Food Plan" value={stay.foodPlan.replace("_", " ")} />
                
                <div className="pt-4 mt-4 border-t border-[#dedede] dark:border-white/10 flex gap-3">
                  <div className="flex-1">
                    <ServiceRequestModal stayId={stay.id} tenantPhone={t.user?.phone} />
                  </div>
                  {stay.foodPlan !== "NOT_INCLUDED" && (
                    <div className="flex-1">
                      <RevokeFoodModal stayId={stay.id} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ID Verification */}
            <div>
              <SectionHeader title="ID Verification" icon={FileText} />
              <div className="p-6">
                {idDoc ? (
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <CheckCircle2 className="size-5 text-[#58ff48]" />
                       <div>
                         <p className="font-bold text-[14px] text-[#222222] dark:text-white tracking-tight">{idDoc.documentType}</p>
                         <p className="text-[11px] font-bold text-[#767676] dark:text-[#a0a0a0] uppercase tracking-wider mt-0.5">Verified</p>
                       </div>
                     </div>
                     <button className="premium-button-outline text-[12px] h-8 px-3" onClick={() => window.open(idDoc.storagePath, "_blank")}>
                       <Download className="size-3.5 mr-1.5 inline-block" /> View Document
                     </button>
                  </div>
                ) : (
                  <div className="text-[13px] text-[#767676] dark:text-[#a0a0a0] font-medium italic">
                    No ID document uploaded.
                  </div>
                )}
              </div>
            </div>

            {/* Payment History Table */}
            <div>
              <SectionHeader title="Ledger & Payments" icon={CreditCard} />
              <div className="max-h-[350px] overflow-y-auto">
                {stay.payments && stay.payments.length > 0 ? (
                  <table className="premium-table w-full">
                    <thead className="sticky top-0 bg-white dark:bg-[#0a0a0a] z-10">
                      <tr>
                        <th>Date & Mode</th>
                        <th className="text-right">Amount</th>
                        <th className="text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stay.payments.map((payment: any) => (
                        <tr key={payment.id}>
                          <td>
                            <span className="block text-[13px] font-medium text-[#222222] dark:text-white">{format(new Date(payment.createdAt), "PP")}</span>
                            <span className="text-[11px] font-semibold text-[#767676] dark:text-[#a0a0a0] uppercase tracking-wider">{payment.paymentMode.replace("_", " ")}</span>
                          </td>
                          <td className="text-right font-bold text-[14px] text-[#222222] dark:text-white">
                            ₹ {paiseToRupees(payment.amountPaidPaise).toLocaleString()}
                          </td>
                          <td className="text-right">
                            <span className={`px-2 py-0.5 text-[10px] rounded-sm font-bold uppercase tracking-wider border ${payment.paymentStatus === "PAID" ? "bg-[#58ff48]/10 text-green-700 dark:text-[#58ff48] border-[#58ff48]/30" : payment.paymentStatus === "PENDING" ? "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-500 border-amber-200 dark:border-amber-500/30" : "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30"}`}>
                              {payment.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-[13px] text-[#767676] dark:text-[#a0a0a0] font-medium italic">
                    No payments recorded.
                  </div>
                )}
              </div>
            </div>

            {/* Food Order History */}
            {stay.foodOrders && stay.foodOrders.length > 0 && (
              <div>
                <SectionHeader title="Food History" icon={Utensils} />
                <div className="max-h-[350px] overflow-y-auto">
                  <table className="premium-table w-full">
                    <thead className="sticky top-0 bg-white dark:bg-[#0a0a0a] z-10">
                      <tr>
                        <th>Date</th>
                        <th className="text-right">Meals</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stay.foodOrders.map((order: any) => (
                        <tr key={order.id}>
                          <td className="font-medium text-[13px] text-[#222222] dark:text-white">
                            {format(new Date(order.forDate), "PP")}
                          </td>
                          <td className="text-right flex justify-end gap-1.5 py-3">
                            <span className={`px-2 py-0.5 text-[10px] rounded-sm font-bold uppercase tracking-wider ${order.breakfast ? "bg-[#58ff48]/10 text-green-700 dark:text-[#58ff48] border border-[#58ff48]/30" : "bg-transparent text-[#dedede] dark:text-white/20 border border-[#dedede] dark:border-white/10"}`}>B</span>
                            <span className={`px-2 py-0.5 text-[10px] rounded-sm font-bold uppercase tracking-wider ${order.lunch ? "bg-[#58ff48]/10 text-green-700 dark:text-[#58ff48] border border-[#58ff48]/30" : "bg-transparent text-[#dedede] dark:text-white/20 border border-[#dedede] dark:border-white/10"}`}>L</span>
                            <span className={`px-2 py-0.5 text-[10px] rounded-sm font-bold uppercase tracking-wider ${order.dinner ? "bg-[#58ff48]/10 text-green-700 dark:text-[#58ff48] border border-[#58ff48]/30" : "bg-transparent text-[#dedede] dark:text-white/20 border border-[#dedede] dark:border-white/10"}`}>D</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
