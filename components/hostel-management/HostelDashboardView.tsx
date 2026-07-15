import { Bell, Plus } from "lucide-react";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ActionAlertsClient } from "@/components/dashboard/ActionAlertsClient";
import { getWardenHostelStats } from "@/services/hostel/dashboard.service";

// Modular Dashboard Components
import { StatCard } from "./dashboard/StatCard";
import { StatusListCard, StatusItem } from "./dashboard/StatusListCard";
import { ActivityFeed } from "./dashboard/ActivityFeed";
import { TasksList } from "./dashboard/TasksList";
import { HostelWorkspaceLayout } from "./HostelWorkspaceLayout";
import { NotificationBellClient } from "@/components/notifications/NotificationBellClient";

export const dynamic = "force-dynamic";

export default async function HostelDashboardView({
  hostelId,
  baseRoute,
  userRole,
}: {
  hostelId: string | null;
  baseRoute: string;
  userRole: "MAIN_ADMIN" | "WARDEN";
}) {
  if (!hostelId) {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 p-8">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Hostel Dashboard
        </h1>
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 shadow-sm">
          <p className="text-red-800 dark:text-red-400 font-medium">
            {userRole === UserRole.MAIN_ADMIN
              ? "No hostels found in the system."
              : "Account is not provisioned properly. Please contact your administrator."}
          </p>
        </div>
      </div>
    );
  }
  
  const stats = await getWardenHostelStats(hostelId);
  
  // We need organizationId for the ActivityFeed real-time channel
  const hostel = await prisma.hostel.findUnique({
    where: { id: hostelId },
    select: { organizationId: true }
  });
  const organizationId = hostel?.organizationId;

  const occupancyItems: StatusItem[] = [
    { id: "1", label: "Bedspaces Available", value: stats.availableBeds, iconUrl: "/icons/available-stat-icon.png", href: `${baseRoute}/occupancy` },
    { id: "2", label: "Bedspaces on Hold", value: stats.bedsOnHold, iconUrl: "/icons/on-hold-stat-icon.png", href: `${baseRoute}/occupancy` },
    { id: "3", label: "Bedspaces Reserved", value: stats.bedsReserved, iconUrl: "/icons/reserved-stat-icon.png", href: `${baseRoute}/occupancy` },
    { id: "4", label: "Bedspaces Occupied", value: stats.occupiedBeds, iconUrl: "/icons/occupied-stat-icon.png", href: `${baseRoute}/occupancy` },
    { id: "5", label: "BedspacesBlocked", value: stats.bedsBlocked, iconUrl: "/icons/blocked-stat-icon.png", href: `${baseRoute}/occupancy` },
  ];

  const bookingItems: StatusItem[] = [
    { id: "1", label: "Onboarding Started", value: stats.pendingOnboarding, iconUrl: "/icons/onboarding-started-icon.png", href: `${baseRoute}/onboards?tab=form` },
    { id: "2", label: "Submitted for Approval", value: stats.submittedForApproval, iconUrl: "/icons/submitted-for-approval-icon.png", href: `${baseRoute}/onboards?tab=review` },
    { id: "3", label: "Payment Pending", value: stats.pendingPayments, iconUrl: "/icons/payment-pending-icon.png", href: `${baseRoute}/onboards?tab=payment` },
  ];

  const dateStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(new Date());

  const Actions = (
    <>
      <NotificationBellClient role={userRole === "MAIN_ADMIN" ? UserRole.MAIN_ADMIN : UserRole.WARDEN} baseRoute={baseRoute} />
      <button className="flex items-center justify-center gap-2 h-10 px-5 rounded-[6px] border border-[#dedede] dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-black dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-all font-semibold text-[15px] whitespace-nowrap">
        Manage Rent <Plus className="size-4 text-[#58ff48]" />
      </button>
      <button className="flex items-center justify-center gap-2 h-10 px-5 rounded-[6px] bg-[#282828] dark:bg-[#58ff48] text-white dark:text-black hover:bg-black transition-all font-semibold text-[15px] whitespace-nowrap">
        On Board a User <Plus className="size-4 text-[#58ff48] dark:text-black" />
      </button>
    </>
  );

  return (
    <HostelWorkspaceLayout
      hostelId={hostelId}
      hostelName={stats.hostelName}
      title="Dashboard"
      subtitle={dateStr}
      actions={Actions}
      hideAdminNav={baseRoute === "/warden"}
    >
      <div className="space-y-8">
        <ActionAlertsClient role={userRole} />

        {/* Stats Grid */}
        <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Available Beds" 
            value={stats.availableBeds} 
            subtitle="Ready for booking"
            iconUrl="/icons/available-bed-card.png"
            trend="23%"
            trendUp={true}
          />
          <StatCard 
            title="Occupied Beds" 
            value={stats.occupiedBeds} 
            subtitle="Active tenants"
            iconUrl="/icons/occupied-bed-card.png"
            trend="78%"
            trendUp={true}
          />
          <StatCard 
            title="Pending Bookings" 
            value={stats.pendingOnboarding} 
            subtitle="onboarding/approval"
            iconUrl="/icons/pending-bookings-card.png"
            trend="+10%"
            trendUp={true}
          />
          <StatCard 
            title="Rent Due" 
            value={stats.pendingPayments} 
            subtitle="Tenants need payment"
            iconUrl="/icons/rent-due-card.png"
            trend="-10%"
            trendUp={false}
          />
        </div>

        {/* Main Content Layout */}
        <div className="grid gap-6 grid-cols-1 xl:grid-cols-3 items-stretch">
          {/* Left Column (2/3) */}
          <div className="xl:col-span-2 flex flex-col gap-6">
            <div className="grid gap-6 md:grid-cols-2">
              <StatusListCard 
                title="Occupancy Status"
                items={occupancyItems}
              />
              <StatusListCard 
                title="Booking Status"
                items={bookingItems}
              />
            </div>
            
            {userRole === "WARDEN" && <TasksList />}
          </div>

          {/* Right Column (1/3) */}
          <div className="xl:col-span-1 h-full">
            {organizationId ? (
              <ActivityFeed 
                role={userRole} 
                hostelId={hostelId} 
                organizationId={organizationId} 
              />
            ) : null}
          </div>
        </div>
      </div>
    </HostelWorkspaceLayout>
  );
}