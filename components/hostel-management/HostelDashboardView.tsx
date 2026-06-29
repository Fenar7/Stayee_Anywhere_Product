import { BedDouble, CalendarCheck, IndianRupee, Clock, Bed, Ban, Play, AlertCircle } from "lucide-react";
import { UserRole } from "@prisma/client";
import { ActionAlertsClient } from "@/components/dashboard/ActionAlertsClient";
import { getWardenHostelStats } from "@/services/hostel/dashboard.service";

// Modular Dashboard Components
import { DashboardHeader } from "./dashboard/DashboardHeader";
import { StatCard } from "./dashboard/StatCard";
import { StatusListCard, StatusItem } from "./dashboard/StatusListCard";
import { ActivityFeed } from "./dashboard/ActivityFeed";
import { TasksList } from "./dashboard/TasksList";

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
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
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

  const occupancyItems: StatusItem[] = [
    { id: "1", label: "Bedspaces Available", value: stats.availableBeds, iconUrl: "/icons/available-stat-icon.png" },
    { id: "2", label: "Bedspaces on Hold", value: 9, iconUrl: "/icons/on-hold-stat-icon.png" },
    { id: "3", label: "Bedspaces Reserved", value: 65, iconUrl: "/icons/reserved-stat-icon.png" },
    { id: "4", label: "Bedspaces Occupied", value: stats.occupiedBeds, iconUrl: "/icons/occupied-stat-icon.png" },
    { id: "5", label: "BedspacesBlocked", value: 3, iconUrl: "/icons/blocked-stat-icon.png" },
  ];

  const bookingItems: StatusItem[] = [
    { id: "1", label: "Onboarding Started", value: 32, iconUrl: "/icons/onboarding-started-icon.png" },
    { id: "2", label: "Submitted for Approval", value: 32, iconUrl: "/icons/submitted-for-approval-icon.png" },
    { id: "3", label: "Payment Pending", value: 32, iconUrl: "/icons/payment-pending-icon.png" },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 w-full px-8 py-8 min-h-full">
      <DashboardHeader />
      
      <div className="space-y-8 mt-8">

      <ActionAlertsClient role={userRole} />

      {/* Overview Title */}
      <h2 className="text-[14px] uppercase tracking-wider font-bold text-black dark:text-white border-b border-[#dedede] dark:border-white/10 pb-2">Overview</h2>

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
          
          <TasksList />
        </div>

        {/* Right Column (1/3) */}
        <div className="xl:col-span-1 h-full">
          <ActivityFeed />
        </div>
      </div>
      </div>
    </div>
  );
}