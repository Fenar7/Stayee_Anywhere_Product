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

export default function StayDetailsPageView({ stay, baseRoute, backUrl }: { stay: StayData; baseRoute: string; backUrl?: string }) {
  const t = stay.tenant;
  const docs = t.documents || [];
  const idDoc = docs.find((d: any) => ["AADHAAR", "PASSPORT_PHOTO", "PAN"].includes(d.documentType));
  
  const totalPaid = stay.payments.filter((p: any) => p.paymentStatus === "PAID").reduce((sum: number, p: any) => sum + paiseToRupees(p.amountPaidPaise), 0);
  const totalPayable = paiseToRupees(stay.totalPayablePaise);

  return (
    <div className="flex flex-col bg-[#f5f5f5] dark:bg-black w-full min-h-screen pb-16">
      
      {/* 1. Global Premium Top Bar - Single Line */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 md:px-6 xl:px-8 py-2.5 border-b border-[#dedede] dark:border-white/10 shrink-0 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          <Link href={backUrl || `${baseRoute}/stays`} className="mr-1 text-[#767676] hover:text-black dark:hover:text-white transition-colors">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-[18px] font-bold tracking-tight text-[#222222] dark:text-white flex items-center gap-2">
            Profile Details
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${stay.status === "ACTIVE" || stay.status === "EXTENDED" ? "bg-[#58ff48]/10 text-green-700 dark:text-[#58ff48] border-[#58ff48]/30" : "bg-white dark:bg-white/5 text-[#767676] dark:text-[#a0a0a0] border-[#dedede] dark:border-white/10"}`}>
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
          <button className="hidden sm:flex bg-[#222222] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-white/90 font-semibold shadow-sm h-9 px-4 text-[13px] rounded-md transition-colors">
            Contact Tenant
          </button>
          {baseRoute === "/admin" && t.user && (
            <ResetPasswordButton userId={t.user.id} userPhone={t.user.phone} />
          )}
        </div>
      </div>

      {/* Main Content Area - Exact Dashboard Padding & Width */}
      <div className="px-4 md:px-6 xl:px-8 w-full mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* 2. Vibrant Hero Profile Section */}
        <div className="relative rounded-2xl bg-white dark:bg-[#0a0a0a] border border-[#dedede] dark:border-white/10 overflow-hidden shadow-sm">
          {/* Subtle colorful gradient banner */}
          <div className="h-32 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-[#58ff48]/10 dark:from-blue-900/30 dark:via-purple-900/30 dark:to-[#58ff48]/20 w-full absolute top-0 left-0"></div>
          
          <div className="relative pt-16 px-6 pb-6 flex flex-col md:flex-row items-center md:items-end gap-6">
            <div className="relative">
              {t.photoUrl ? (
                <img src={t.photoUrl} alt="Profile" className="size-28 rounded-full border-4 border-white dark:border-[#0a0a0a] shadow-md object-cover bg-white" />
              ) : (
                <div className="size-28 rounded-full border-4 border-white dark:border-[#0a0a0a] shadow-md flex items-center justify-center bg-white dark:bg-[#1a1a1a] text-[#767676] dark:text-[#a0a0a0]">
                  <User className="size-10" />
                </div>
              )}
              {/* Status Dot */}
              <div className={`absolute bottom-2 right-2 size-4 border-2 border-white dark:border-[#0a0a0a] rounded-full ${(stay.status === "ACTIVE" || stay.status === "EXTENDED") ? "bg-[#58ff48]" : "bg-[#dedede] dark:bg-[#333333]"}`}></div>
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-[28px] font-bold text-[#222222] dark:text-white leading-tight tracking-tight">{t.fullName}</h2>
              <p className="text-[15px] text-[#767676] dark:text-[#a0a0a0] font-medium mt-1">{t.occupationType?.replace("_", " ") || "Tenant"} &middot; Joined {format(new Date(stay.joiningDate), "MMM yyyy")}</p>
            </div>
          </div>
        </div>

        {/* 3. High-Level Metrics Bar - Soft Whitespace Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#0a0a0a] border border-[#dedede] dark:border-white/10 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
                 <Activity className="size-4" />
              </div>
              <h4 className="text-[12px] font-bold text-[#767676] dark:text-[#a0a0a0] uppercase tracking-wider">Stay Status</h4>
            </div>
            <p className="text-[22px] font-bold text-[#222222] dark:text-white">{stay.status}</p>
          </div>
          
          <div className="bg-white dark:bg-[#0a0a0a] border border-[#dedede] dark:border-white/10 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg">
                 <Clock className="size-4" />
              </div>
              <h4 className="text-[12px] font-bold text-[#767676] dark:text-[#a0a0a0] uppercase tracking-wider">Duration</h4>
            </div>
            <p className="text-[22px] font-bold text-[#222222] dark:text-white">{stay.durationType}</p>
          </div>

          <div className="bg-white dark:bg-[#0a0a0a] border border-[#dedede] dark:border-white/10 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
                 <CreditCard className="size-4" />
              </div>
              <h4 className="text-[12px] font-bold text-[#767676] dark:text-[#a0a0a0] uppercase tracking-wider">Total Payable</h4>
            </div>
            <p className="text-[22px] font-bold text-[#222222] dark:text-white">₹ {totalPayable.toLocaleString()}</p>
          </div>

          <div className="bg-[#58ff48]/5 dark:bg-[#58ff48]/5 border border-[#58ff48]/30 dark:border-[#58ff48]/20 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-[#58ff48]/20 text-green-700 dark:text-[#58ff48] rounded-lg">
                 <CheckCircle2 className="size-4" />
              </div>
              <h4 className="text-[12px] font-bold text-green-700 dark:text-[#58ff48] uppercase tracking-wider">Amount Paid</h4>
            </div>
            <p className="text-[22px] font-bold text-green-700 dark:text-[#58ff48]">₹ {totalPaid.toLocaleString()}</p>
          </div>
        </div>

        {/* 4. Beautiful Whitespace-Driven Data Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column (Sticky info) */}
          <div className="lg:col-span-1 space-y-6">
             {/* Personal Details */}
             <div className="bg-white dark:bg-[#0a0a0a] border border-[#dedede] dark:border-white/10 rounded-2xl p-6 shadow-sm">
               <h3 className="font-bold text-[16px] text-[#222222] dark:text-white mb-6 flex items-center gap-2">
                 <Layers className="size-5 text-[#767676] dark:text-[#a0a0a0]" /> Personal Details
               </h3>
               
               <div className="space-y-5">
                 <div>
                   <p className="text-[11px] font-bold text-[#767676] dark:text-[#a0a0a0] uppercase tracking-wider mb-1">Phone Number</p>
                   <p className="text-[15px] font-bold text-[#222222] dark:text-white flex items-center gap-2">
                     <Phone className="size-3.5 text-[#767676] dark:text-[#a0a0a0]" /> {t.user?.phone || "—"}
                   </p>
                 </div>
                 
                 <div>
                   <p className="text-[11px] font-bold text-[#767676] dark:text-[#a0a0a0] uppercase tracking-wider mb-1">Email Address</p>
                   <p className="text-[15px] font-bold text-[#222222] dark:text-white flex items-center gap-2 break-all">
                     <Mail className="size-3.5 text-[#767676] dark:text-[#a0a0a0]" /> {t.user?.email || "—"}
                   </p>
                 </div>
                 
                 <div>
                   <p className="text-[11px] font-bold text-[#767676] dark:text-[#a0a0a0] uppercase tracking-wider mb-1">Date of Birth</p>
                   <p className="text-[15px] font-bold text-[#222222] dark:text-white flex items-center gap-2">
                     <Calendar className="size-3.5 text-[#767676] dark:text-[#a0a0a0]" /> {t.dateOfBirth ? format(new Date(t.dateOfBirth), "PP") : "—"}
                   </p>
                 </div>

                 <div>
                   <p className="text-[11px] font-bold text-[#767676] dark:text-[#a0a0a0] uppercase tracking-wider mb-1">Permanent Address</p>
                   <p className="text-[15px] font-bold text-[#222222] dark:text-white flex items-start gap-2 leading-relaxed">
                     <MapPin className="size-4 text-[#767676] dark:text-[#a0a0a0] shrink-0 mt-0.5" /> {t.permanentAddress || "Not provided"}
                   </p>
                 </div>
               </div>
             </div>

             {/* Emergency Contacts */}
             <div className="bg-white dark:bg-[#0a0a0a] border border-[#dedede] dark:border-white/10 rounded-2xl p-6 shadow-sm">
               <h3 className="font-bold text-[16px] text-[#222222] dark:text-white mb-6 flex items-center gap-2">
                 <ShieldCheck className="size-5 text-[#767676] dark:text-[#a0a0a0]" /> Emergency Contacts
               </h3>
               
               <div className="space-y-6">
                 <div className="flex items-start gap-4">
                   <div className="p-2.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl shrink-0">
                     <Phone className="size-5" />
                   </div>
                   <div>
                     <p className="text-[11px] font-bold text-[#767676] dark:text-[#a0a0a0] uppercase tracking-wider mb-0.5">Emergency Contact</p>
                     <p className="text-[15px] font-bold text-[#222222] dark:text-white">{t.emergencyContactName || "Not provided"}</p>
                     <p className="text-[14px] font-medium text-[#767676] dark:text-[#a0a0a0] mt-0.5">{t.emergencyContactNumber} {t.relationship ? `(${t.relationship})` : ""}</p>
                   </div>
                 </div>
                 
                 <div className="h-px w-full bg-[#dedede] dark:bg-white/10"></div>
                 
                 <div className="flex items-start gap-4">
                   <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
                     <User className="size-5" />
                   </div>
                   <div>
                     <p className="text-[11px] font-bold text-[#767676] dark:text-[#a0a0a0] uppercase tracking-wider mb-0.5">Parent / Guardian</p>
                     <p className="text-[15px] font-bold text-[#222222] dark:text-white">{t.parentGuardianName || "Not provided"}</p>
                     <p className="text-[14px] font-medium text-[#767676] dark:text-[#a0a0a0] mt-0.5">{t.parentGuardianContact}</p>
                   </div>
                 </div>
               </div>
             </div>
          </div>

          {/* Right Area (Main Data) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Stay & Accommodation + Document */}
            <div className="grid sm:grid-cols-2 gap-6">
              
              <div className="bg-white dark:bg-[#0a0a0a] border border-[#dedede] dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-[16px] text-[#222222] dark:text-white mb-6 flex items-center gap-2">
                    <Building className="size-5 text-[#767676] dark:text-[#a0a0a0]" /> Stay Configuration
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <div>
                      <p className="text-[11px] font-bold text-[#767676] dark:text-[#a0a0a0] uppercase tracking-wider mb-1">Start Date</p>
                      <p className="text-[15px] font-bold text-[#222222] dark:text-white">{format(new Date(stay.joiningDate), "PP")}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[#767676] dark:text-[#a0a0a0] uppercase tracking-wider mb-1">End Date</p>
                      <p className="text-[15px] font-bold text-[#222222] dark:text-white">{format(new Date(stay.endDate), "PP")}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[11px] font-bold text-[#767676] dark:text-[#a0a0a0] uppercase tracking-wider mb-1">Food Plan</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Utensils className="size-4 text-[#767676] dark:text-[#a0a0a0]" />
                        <p className="text-[15px] font-bold text-[#222222] dark:text-white">{stay.foodPlan.replace("_", " ")}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3">
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
              
              <div className="bg-white dark:bg-[#0a0a0a] border border-[#dedede] dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                   <h3 className="font-bold text-[16px] text-[#222222] dark:text-white mb-6 flex items-center gap-2">
                     <FileText className="size-5 text-[#767676] dark:text-[#a0a0a0]" /> ID Verification
                   </h3>
                   
                   {idDoc ? (
                     <div className="p-5 rounded-2xl bg-[#58ff48]/5 border border-[#58ff48]/20 flex items-center gap-4 mb-6">
                        <div className="p-3 bg-[#58ff48]/20 rounded-xl text-green-700 dark:text-[#58ff48]">
                          <CheckCircle2 className="size-6" />
                        </div>
                        <div>
                          <p className="font-bold text-[16px] text-[#222222] dark:text-white tracking-tight">{idDoc.documentType}</p>
                          <p className="text-[12px] font-bold text-green-700 dark:text-[#58ff48] uppercase tracking-wider mt-0.5">Verified Document</p>
                        </div>
                     </div>
                   ) : (
                     <div className="text-center p-8 bg-[#f5f5f5] dark:bg-white/5 rounded-2xl border border-dashed border-[#dedede] dark:border-white/10 mb-6">
                       <FileText className="size-10 text-[#dedede] dark:text-white/20 mx-auto mb-3" />
                       <p className="text-[14px] font-bold text-[#767676] dark:text-[#a0a0a0]">No ID document uploaded</p>
                     </div>
                   )}
                </div>
                
                {idDoc && (
                   <Button variant="outline" className="w-full h-11 border-[#dedede] dark:border-white/10 text-[#222222] dark:text-white font-semibold rounded-xl shadow-sm hover:bg-[#f5f5f5] dark:hover:bg-white/5" onClick={() => window.open(idDoc.storagePath, "_blank")}>
                     <Download className="size-4 mr-2 text-[#767676] dark:text-[#a0a0a0]" /> View Document
                   </Button>
                )}
              </div>

            </div>

            {/* Academic / Professional */}
            <div className="bg-white dark:bg-[#0a0a0a] border border-[#dedede] dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-[16px] text-[#222222] dark:text-white mb-6 flex items-center gap-2">
                <Briefcase className="size-5 text-[#767676] dark:text-[#a0a0a0]" /> Academic & Professional
              </h3>
              
              <div className="grid sm:grid-cols-2 gap-8">
                {t.occupationType === "STUDENT" ? (
                  <>
                    <div>
                      <p className="text-[11px] font-bold text-[#767676] dark:text-[#a0a0a0] uppercase tracking-wider mb-1">College / University</p>
                      <p className="text-[16px] font-bold text-[#222222] dark:text-white">{t.collegeName || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[#767676] dark:text-[#a0a0a0] uppercase tracking-wider mb-1">Course / Branch</p>
                      <p className="text-[16px] font-bold text-[#222222] dark:text-white">{t.courseOrBranch || "Not provided"}</p>
                    </div>
                  </>
                ) : t.occupationType === "WORKING_PROFESSIONAL" ? (
                  <>
                    <div>
                      <p className="text-[11px] font-bold text-[#767676] dark:text-[#a0a0a0] uppercase tracking-wider mb-1">Company Name</p>
                      <p className="text-[16px] font-bold text-[#222222] dark:text-white">{t.companyName || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[#767676] dark:text-[#a0a0a0] uppercase tracking-wider mb-1">Designation</p>
                      <p className="text-[16px] font-bold text-[#222222] dark:text-white">{t.designation || "Not provided"}</p>
                    </div>
                  </>
                ) : (
                  <div className="col-span-2 text-[14px] text-[#767676] dark:text-[#a0a0a0] font-medium italic">
                    No professional or academic information provided.
                  </div>
                )}
              </div>
            </div>
            
            {/* History Lists inside beautiful containers */}
            <div className="grid lg:grid-cols-2 gap-6">
              
              {/* Payment History */}
              <div className="bg-white dark:bg-[#0a0a0a] border border-[#dedede] dark:border-white/10 rounded-2xl p-0 shadow-sm overflow-hidden flex flex-col">
                 <div className="p-5 border-b border-[#dedede] dark:border-white/10 bg-[#fbfbfb] dark:bg-white/5">
                   <h3 className="font-bold text-[15px] text-[#222222] dark:text-white flex items-center gap-2">
                     <CreditCard className="size-4 text-[#767676] dark:text-[#a0a0a0]" /> Payment History
                   </h3>
                 </div>
                 
                 <div className="max-h-[350px] overflow-y-auto">
                   {stay.payments && stay.payments.length > 0 ? (
                     <div className="divide-y divide-[#dedede] dark:divide-white/10">
                       {stay.payments.map((payment: any) => (
                         <div key={payment.id} className="p-4 flex items-center justify-between hover:bg-[#fcfcfc] dark:hover:bg-white/5 transition-colors">
                           <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-xl ${payment.paymentStatus === 'PAID' ? 'bg-[#58ff48]/10 text-green-700 dark:text-[#58ff48]' : 'bg-[#f5f5f5] dark:bg-white/10 text-[#767676] dark:text-[#a0a0a0]'}`}>
                                 <IndianRupee className="size-4" />
                              </div>
                              <div>
                                <span className="font-bold text-[15px] text-[#222222] dark:text-white block tracking-tight">₹ {paiseToRupees(payment.amountPaidPaise).toLocaleString()}</span>
                                <span className="text-[12px] font-medium text-[#767676] dark:text-[#a0a0a0]">{format(new Date(payment.createdAt), "PP")}</span>
                              </div>
                           </div>
                           <div>
                             <span className={`px-2.5 py-1 text-[10px] rounded-full font-bold uppercase tracking-wider border ${payment.paymentStatus === "PAID" ? "bg-[#58ff48]/10 text-green-700 dark:text-[#58ff48] border-[#58ff48]/30" : payment.paymentStatus === "PENDING" ? "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-500 border-amber-200 dark:border-amber-500/30" : "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30"}`}>
                               {payment.paymentStatus}
                             </span>
                           </div>
                         </div>
                       ))}
                     </div>
                   ) : (
                     <div className="p-8 text-center text-[13px] text-[#767676] dark:text-[#a0a0a0] font-medium">
                       No payments recorded
                     </div>
                   )}
                 </div>
              </div>

              {/* Food Order History List */}
              {stay.foodOrders && stay.foodOrders.length > 0 && (
                <div className="bg-white dark:bg-[#0a0a0a] border border-[#dedede] dark:border-white/10 rounded-2xl p-0 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-5 border-b border-[#dedede] dark:border-white/10 bg-[#fbfbfb] dark:bg-white/5">
                    <h3 className="font-bold text-[15px] text-[#222222] dark:text-white flex items-center gap-2">
                      <Utensils className="size-4 text-[#767676] dark:text-[#a0a0a0]" /> Food Order History
                    </h3>
                  </div>
                  
                  <div className="max-h-[350px] overflow-y-auto">
                    <div className="divide-y divide-[#dedede] dark:divide-white/10">
                      {stay.foodOrders.map((order: any) => (
                        <div key={order.id} className="p-4 flex items-center justify-between hover:bg-[#fcfcfc] dark:hover:bg-white/5 transition-colors">
                          <div className="flex items-center gap-3">
                             <div className="p-2 rounded-xl bg-[#f5f5f5] dark:bg-white/10 text-[#767676] dark:text-[#a0a0a0]">
                               <Utensils className="size-4" />
                             </div>
                             <span className="font-bold text-[14px] text-[#222222] dark:text-white">{format(new Date(order.forDate), "PP")}</span>
                          </div>
                          <div className="flex gap-1.5">
                            <span className={`px-2 py-0.5 text-[10px] rounded-md font-bold uppercase tracking-wider ${order.breakfast ? "bg-[#58ff48]/20 text-green-800 dark:text-[#58ff48]" : "bg-transparent text-[#dedede] dark:text-white/20 border border-[#dedede] dark:border-white/10"}`}>B</span>
                            <span className={`px-2 py-0.5 text-[10px] rounded-md font-bold uppercase tracking-wider ${order.lunch ? "bg-[#58ff48]/20 text-green-800 dark:text-[#58ff48]" : "bg-transparent text-[#dedede] dark:text-white/20 border border-[#dedede] dark:border-white/10"}`}>L</span>
                            <span className={`px-2 py-0.5 text-[10px] rounded-md font-bold uppercase tracking-wider ${order.dinner ? "bg-[#58ff48]/20 text-green-800 dark:text-[#58ff48]" : "bg-transparent text-[#dedede] dark:text-white/20 border border-[#dedede] dark:border-white/10"}`}>D</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
