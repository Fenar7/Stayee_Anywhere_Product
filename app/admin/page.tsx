import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { BedDouble, Users, CalendarCheck, IndianRupee, Bed, Clock, AlertCircle, Play, Ban } from "lucide-react";
import { getAdminPortfolioStats } from "@/services/hostel/dashboard.service";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { AdminDashboardClient } from "./dashboard-client";
import { ActionAlertsClient } from "@/components/dashboard/ActionAlertsClient";

// Modular Dashboard Components
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusListCard, StatusItem } from "@/components/dashboard/StatusListCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { TasksList } from "@/components/dashboard/TasksList";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireRole([UserRole.MAIN_ADMIN]);
  const stats = await getAdminPortfolioStats();

  const occupancyItems: StatusItem[] = [
    { id: "1", label: "Bedspaces Available", value: stats.totalBeds - stats.totalOccupiedBeds, icon: Bed, iconColor: "text-green-500" },
    { id: "2", label: "Bedspaces on Hold", value: 9, icon: Clock, iconColor: "text-yellow-500" },
    { id: "3", label: "Bedspaces Reserved", value: 65, icon: CalendarCheck, iconColor: "text-blue-500" },
    { id: "4", label: "Bedspaces Occupied", value: stats.totalOccupiedBeds, icon: BedDouble, iconColor: "text-red-500" },
    { id: "5", label: "BedspacesBlocked", value: 3, icon: Ban, iconColor: "text-gray-500" },
  ];

  const bookingItems: StatusItem[] = [
    { id: "1", label: "Onboarding Started", value: 32, icon: Play, iconColor: "text-black dark:text-white" },
    { id: "2", label: "Submitted for Approval", value: 32, icon: AlertCircle, iconColor: "text-black dark:text-white" },
    { id: "3", label: "Payment Pending", value: 32, icon: IndianRupee, iconColor: "text-black dark:text-white" },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 w-full max-w-[1400px] mx-auto px-4 py-5 bg-white dark:bg-black min-h-screen">
      <DashboardHeader />
      
      <div className="space-y-4">

      <ActionAlertsClient role="MAIN_ADMIN" />

      {/* Overview Title */}
      <h2 className="text-[17px] font-bold text-black dark:text-white">Overview</h2>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Available Beds" 
          value={stats.totalBeds - stats.totalOccupiedBeds} 
          subtitle="Ready for booking"
          icon={BedDouble}
          trend="23%"
          trendUp={true}
        />
        <StatCard 
          title="Occupied Beds" 
          value={stats.totalOccupiedBeds} 
          subtitle="Active tenants"
          icon={BedDouble}
          trend="78%"
          trendUp={true}
        />
        <StatCard 
          title="Pending Bookings" 
          value={6} 
          subtitle="onboarding/approval"
          icon={CalendarCheck}
          trend="+10%"
          trendUp={true}
        />
        <StatCard 
          title="Rent Due" 
          value={stats.totalPendingPayments} 
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
