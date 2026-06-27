import { BedDouble, CalendarCheck, IndianRupee, Clock, Bed, Ban, Play, AlertCircle } from "lucide-react";
import { UserRole } from "@prisma/client";
import { ActionAlertsClient } from "@/components/dashboard/ActionAlertsClient";
import { getWardenHostelStats } from "@/services/hostel/dashboard.service";

// Modular Dashboard Components
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusListCard, StatusItem } from "@/components/dashboard/StatusListCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { TasksList } from "@/components/dashboard/TasksList";

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
    { id: "1", label: "Bedspaces Available", value: stats.availableBeds, icon: Bed, iconColor: "text-green-500" },
    { id: "2", label: "Bedspaces on Hold", value: 9, icon: Clock, iconColor: "text-yellow-500" },
    { id: "3", label: "Bedspaces Reserved", value: 65, icon: CalendarCheck, iconColor: "text-blue-500" },
    { id: "4", label: "Bedspaces Occupied", value: stats.occupiedBeds, icon: BedDouble, iconColor: "text-red-500" },
    { id: "5", label: "BedspacesBlocked", value: 3, icon: Ban, iconColor: "text-gray-500" },
  ];

  const bookingItems: StatusItem[] = [
    { id: "1", label: "Onboarding Started", value: 32, icon: Play, iconColor: "text-black dark:text-white" },
    { id: "2", label: "Submitted for Approval", value: 32, icon: AlertCircle, iconColor: "text-black dark:text-white" },
    { id: "3", label: "Payment Pending", value: 32, icon: IndianRupee, iconColor: "text-black dark:text-white" },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 w-full max-w-[1400px] mx-auto p-5 bg-white dark:bg-black min-h-screen">
      <DashboardHeader />
      
      <div className="space-y-4">

      <ActionAlertsClient role={userRole} />

      {/* Overview Title */}
      <h2 className="text-[17px] font-bold text-black dark:text-white">Overview</h2>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Available Beds" 
          value={stats.availableBeds} 
          subtitle="Ready for booking"
          icon={BedDouble}
          trend="23%"
          trendUp={true}
        />
        <StatCard 
          title="Occupied Beds" 
          value={stats.occupiedBeds} 
          subtitle="Active tenants"
          icon={BedDouble}
          trend="78%"
          trendUp={true}
        />
        <StatCard 
          title="Pending Bookings" 
          value={stats.pendingOnboarding} 
          subtitle="onboarding/approval"
          icon={CalendarCheck}
          trend="+10%"
          trendUp={true}
        />
        <StatCard 
          title="Rent Due" 
          value={stats.pendingPayments} 
          subtitle="Tenants need payment"
          icon={IndianRupee}
          trend="-10%"
          trendUp={false}
        />
      </div>

      {/* Main Content Layout */}
      <div className="grid gap-4 grid-cols-1 xl:grid-cols-3 items-start">
        {/* Left Column (2/3) */}
        <div className="xl:col-span-2 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
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