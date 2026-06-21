import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { getAdminPortfolioStats } from "@/services/hostel/dashboard.service";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireRole([UserRole.MAIN_ADMIN]);
  const stats = await getAdminPortfolioStats();



  const accommodationTypeColors: Record<string, string> = {
    MENS: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    WOMENS: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  };

  const occupancyColor = (rate: number) => {
    if (rate >= 80) return "bg-green-500";
    if (rate >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Portfolio overview and management</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/leads">
            <Button variant="outline">
              <Users className="mr-2 h-4 w-4" />
              All Leads
            </Button>
          </Link>
          <Link href="/admin/hostels/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Hostel
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Total Hostels</p>
          <p className="text-2xl font-bold">{stats.totalHostels}</p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Total Beds</p>
          <p className="text-2xl font-bold">{stats.totalBeds}</p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Total Occupied</p>
          <p className="text-2xl font-bold">{stats.totalOccupiedBeds}</p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Portfolio Occupancy</p>
          <p className="text-2xl font-bold">{stats.portfolioOccupancyRate}%</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <div className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">Hostels</h2>
          {stats.hostels.map((hostel) => (
            <div
              key={hostel.id}
              className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{hostel.name}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      accommodationTypeColors[hostel.accommodationType]
                    }`}
                  >
                    {hostel.accommodationType === "MENS" ? "Men's" : "Women's"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{hostel.address}</p>
              </div>

              <div className="flex items-center gap-6 sm:justify-end">
                <div className="flex gap-6">
                  <div>
                    <p className="text-sm font-medium">{hostel.totalBeds}</p>
                    <p className="text-xs text-muted-foreground">Total Beds</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{hostel.occupiedBeds}</p>
                    <p className="text-xs text-muted-foreground">Occupied</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{hostel.availableBeds}</p>
                    <p className="text-xs text-muted-foreground">Available</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{hostel.activeTenants}</p>
                    <p className="text-xs text-muted-foreground">Active Tenants</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{hostel.pendingOnboarding}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-2 w-32 rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${occupancyColor(hostel.occupancyRate)}`}
                      style={{ width: `${hostel.occupancyRate}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{hostel.occupancyRate}%</span>
                </div>

                <div className="flex gap-2">
                  <Link href={`/admin/hostels/${hostel.id}/occupancy`}>
                    <Button variant="outline" size="sm">
                      View Occupancy
                    </Button>
                  </Link>
                  <Link href={`/admin/hostels/${hostel.id}/builder`}>
                    <Button variant="outline" size="sm">
                      Manage Structure
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}