import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, ClipboardList } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getWardenHostelStats } from "@/services/hostel/dashboard.service";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function WardenPage({
  searchParams,
}: {
  searchParams: Promise<{ hostelId?: string }>;
}) {
  const { hostelId: queryHostelId } = await searchParams;

  const { user } = await requireRole([UserRole.WARDEN]);

  // For MAIN_ADMIN, resolve the hostel from query param or fall back to first available
  let hostelId: string | null = null;
  if (user.role === UserRole.MAIN_ADMIN) {
    if (queryHostelId) {
      const hostel = await prisma.hostel.findUnique({ where: { id: queryHostelId }, select: { id: true } });
      hostelId = hostel?.id ?? null;
    } else {
      const firstHostel = await prisma.hostel.findFirst({ select: { id: true } });
      hostelId = firstHostel?.id ?? null;
    }
  } else {
    hostelId = user.warden?.hostelId ?? null;
  }

  if (!hostelId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Warden Dashboard</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {user.role === UserRole.MAIN_ADMIN
            ? "No hostels found in the system."
            : "Warden account is not provisioned properly."}
        </div>
      </div>
    );
  }
  const stats = await getWardenHostelStats(hostelId);


  const occupancyColor = (rate: number) => {
    if (rate >= 80) return "bg-green-500";
    if (rate >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Warden Dashboard</h1>
        <p className="text-muted-foreground">Manage your assigned hostel</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Total Beds</p>
          <p className="text-2xl font-bold">{stats.totalBeds}</p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Occupied</p>
          <p className="text-2xl font-bold">{stats.occupiedBeds}</p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Available</p>
          <p className="text-2xl font-bold">{stats.availableBeds}</p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Active Tenants</p>
          <p className="text-2xl font-bold">{stats.activeTenants}</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <div className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Hostel Overview</h2>
            <div className="flex items-center gap-3">
              <div className="h-2 w-48 rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${occupancyColor(stats.occupancyRate)}`}
                  style={{ width: `${stats.occupancyRate}%` }}
                />
              </div>
              <span className="text-sm font-medium">{stats.occupancyRate}%</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link href="/warden/occupancy">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                View Occupancy Map
              </Button>
            </Link>
            <Link href="/warden/onboard">
              <Button variant="outline">
                Onboard New Tenant
              </Button>
            </Link>
            <Link href="/warden/food">
              <Button variant="outline">
                Kitchen Dashboard
              </Button>
            </Link>
            <Link href={`/warden/worklists${queryHostelId ? `?hostelId=${queryHostelId}` : ""}`}>
              <Button variant="outline">
                <ClipboardList className="mr-2 h-4 w-4" />
                Warden Worklists
              </Button>
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Link href="/warden/onboards" className="block hover:opacity-90 transition">
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm font-medium text-muted-foreground">Pending Onboarding</p>
                <p className="text-2xl font-bold text-primary">{stats.pendingOnboarding} →</p>
              </div>
            </Link>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm font-medium text-muted-foreground">Occupancy Rate</p>
              <p className="text-2xl font-bold">{stats.occupancyRate}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}