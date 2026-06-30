import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { notFound } from "next/navigation";
import StayDetailsPageView from "@/components/hostel-management/StayDetailsPageView";
import { ResetPasswordButton } from "@/components/admin/ResetPasswordButton";
import Link from "next/link";
import { ChevronRight, Phone, Mail, Shield, User as UserIcon } from "lucide-react";

export default async function AdminUserDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole([UserRole.MAIN_ADMIN]);
  const { id: userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      tenant: true,
      warden: true,
    },
  });

  if (!user) {
    notFound();
  }

  // If the user is a tenant, try to find their most recent stay to show full details
  if (user.role === "TENANT" && user.tenant) {
    const latestStay = await prisma.stay.findFirst({
      where: { tenantId: user.tenant.id },
      orderBy: { createdAt: "desc" },
      include: {
        hostel: true,
        tenant: {
          include: {
            user: true,
            documents: true,
          },
        },
        bed: {
          include: {
            room: true,
          },
        },
        payments: true,
        foodOrders: {
          orderBy: { forDate: "desc" },
        },
      },
    });

    if (latestStay) {
      return <StayDetailsPageView stay={latestStay} baseRoute="/admin" backUrl="/admin/users" />;
    }
  }

  const profileName = user.tenant?.fullName || user.phone;

  // Fallback for non-tenants or tenants with no stays
  return (
    <div className="flex flex-col bg-white dark:bg-black w-full min-h-screen">
      {/* Top Bar: Breadcrumbs + Title + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 md:px-6 xl:px-8 py-2.5 border-b border-[#dedede] dark:border-white/10 shrink-0 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          <h1 className="text-[18px] font-bold tracking-tight text-black dark:text-white flex items-center gap-2">
            User Profile
          </h1>
          
          <div className="flex items-center gap-3 text-[13px] text-[#767676]">
            <span className="w-px h-4 bg-[#dedede] dark:bg-white/20" />
            <div className="flex items-center gap-1.5">
              <Link href="/admin/users" className="hover:text-black dark:hover:text-white transition-colors">
                Users
              </Link>
              <ChevronRight className="size-3.5" />
              <span className="text-black dark:text-white font-medium">{profileName}</span>
            </div>
            <span className="w-px h-4 bg-[#dedede] dark:bg-white/20" />
            <span className="font-medium">{user.role}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-3 sm:mt-0 flex-wrap sm:flex-nowrap">
          <ResetPasswordButton userId={user.id} userPhone={user.phone} />
        </div>
      </div>

      <div className="p-4 md:p-6 xl:p-8 flex justify-center">
        <div className="premium-card p-8 w-full max-w-2xl relative overflow-hidden flex flex-col gap-8">
          {/* Subtle background glow for dark mode */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#58ff48] opacity-0 dark:opacity-[0.03] blur-3xl rounded-full pointer-events-none z-0"></div>
          
          {/* Header Row */}
          <div className="flex items-center gap-6 relative z-10">
            <div className="size-20 rounded-full bg-[#f4f4f4] dark:bg-white/5 border-2 border-white dark:border-zinc-800 shadow-sm flex items-center justify-center shrink-0">
              <UserIcon className="size-10 text-[#a1a1a1] dark:text-zinc-500" />
            </div>
            <div>
              <h2 className="text-[24px] font-bold text-black dark:text-white tracking-tight leading-none mb-2">{profileName}</h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e3f2fd] text-[#0d47a1] dark:bg-blue-900/20 dark:text-blue-400 text-[12px] font-semibold uppercase tracking-wider">
                <Shield className="size-3.5" />
                {user.role}
              </span>
            </div>
          </div>

          <div className="h-px w-full bg-[#dedede] dark:bg-white/10 relative z-10" />

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#767676] dark:text-[#a0a0a0] uppercase tracking-wider">
                <Phone className="size-3.5" />
                Phone Number
              </div>
              <div className="text-[15px] font-medium text-black dark:text-white">{user.phone}</div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#767676] dark:text-[#a0a0a0] uppercase tracking-wider">
                <Mail className="size-3.5" />
                Email Address
              </div>
              <div className="text-[15px] font-medium text-black dark:text-white">{user.email || "—"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
