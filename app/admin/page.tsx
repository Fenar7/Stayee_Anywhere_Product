import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, UserPlus, Users, Shield, ShieldAlert, AlertCircle, TrendingUp, Building, Bed, Activity } from "lucide-react";
import { getAdminPortfolioStats } from "@/services/hostel/dashboard.service";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { AdminDashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireRole([UserRole.MAIN_ADMIN]);
  const stats = await getAdminPortfolioStats();

  const accommodationTypeColors: Record<string, string> = {
    MENS: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    WOMENS: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
  };

  const occupancyColor = (rate: number) => {
    if (rate >= 80) return "text-emerald-600 dark:text-emerald-400";
    if (rate >= 50) return "text-amber-500 dark:text-amber-400";
    return "text-rose-500 dark:text-rose-400";
  };

  const occupancyBgColor = (rate: number) => {
    if (rate >= 80) return "bg-emerald-500";
    if (rate >= 50) return "bg-amber-500";
    return "bg-rose-500";
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between pb-6 border-b border-border/40">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Portfolio overview and real-time management</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/warden/onboard">
            <Button variant="outline" className="backdrop-blur-sm bg-background/50 border-border/50 shadow-sm hover:bg-accent transition-all">
              <UserPlus className="mr-2 h-4 w-4" />
              Onboard Tenant
            </Button>
          </Link>
          <Link href="/admin/leads">
            <Button variant="outline" className="backdrop-blur-sm bg-background/50 border-border/50 shadow-sm hover:bg-accent transition-all">
              <Users className="mr-2 h-4 w-4" />
              All Leads
            </Button>
          </Link>
          <Link href="/admin/hostels/new">
            <Button className="shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-95">
              <Plus className="mr-2 h-4 w-4" />
              Add Hostel
            </Button>
          </Link>
        </div>
      </div>

      {/* Alert Banner */}
      {stats.totalPendingPayments > 0 && (
        <div className="group relative overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-sm transition-all hover:bg-amber-500/10">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-300">Action Required: Payment Verification</h3>
                <p className="text-sm text-amber-700/80 dark:text-amber-400/80">
                  {stats.totalPendingPayments} onboarding payment(s) are awaiting verification.
                </p>
              </div>
            </div>
            <Link href="/admin/onboards" className="shrink-0 w-full sm:w-auto">
              <Button className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white border-none shadow-sm shadow-amber-600/20 transition-all active:scale-95">
                Review Payments
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 p-6 shadow-sm backdrop-blur-xl transition-all hover:shadow-md hover:border-border">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Total Hostels</p>
            <Building className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight">{stats.totalHostels}</p>
        </div>
        
        <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 p-6 shadow-sm backdrop-blur-xl transition-all hover:shadow-md hover:border-border">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Total Beds</p>
            <Bed className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight">{stats.totalBeds}</p>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 p-6 shadow-sm backdrop-blur-xl transition-all hover:shadow-md hover:border-border">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Portfolio Occupancy</p>
            <Activity className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <p className={`text-3xl font-bold tracking-tight ${occupancyColor(stats.portfolioOccupancyRate)}`}>
              {stats.portfolioOccupancyRate}%
            </p>
            <p className="text-sm text-muted-foreground">({stats.totalOccupiedBeds} occupied)</p>
          </div>
          {/* Mini progress bar */}
          <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div 
              className={`h-full rounded-full ${occupancyBgColor(stats.portfolioOccupancyRate)} transition-all duration-1000 ease-out`} 
              style={{ width: `${stats.portfolioOccupancyRate}%` }} 
            />
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 p-6 shadow-sm backdrop-blur-xl transition-all hover:shadow-md hover:border-border">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Pending Payments</p>
            <TrendingUp className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
          </div>
          <p className={`mt-4 text-3xl font-bold tracking-tight ${stats.totalPendingPayments > 0 ? "text-rose-500" : ""}`}>
            {stats.totalPendingPayments}
          </p>
        </div>
      </div>

      {/* Hostels List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Properties</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {stats.hostels.map((hostel) => (
            <div
              key={hostel.id}
              className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-border/50 bg-background/50 shadow-sm backdrop-blur-xl transition-all hover:shadow-md hover:border-border"
            >
              <div className="p-6 flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/admin/hostels/${hostel.id}`}
                      className="font-semibold text-lg hover:text-primary transition-colors focus:outline-none"
                    >
                      {hostel.name}
                    </Link>
                    <p className="text-sm text-muted-foreground mt-1 truncate max-w-[250px]">{hostel.address}</p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                      accommodationTypeColors[hostel.accommodationType] || "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {hostel.accommodationType}
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Occupancy</p>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-base">{hostel.occupiedBeds} / {hostel.totalBeds}</p>
                      <span className={`text-xs font-medium ${occupancyColor(hostel.occupancyRate)}`}>
                        ({hostel.occupancyRate}%)
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Payments</p>
                    <p className="font-semibold text-base">
                      {hostel.pendingPayments}{" "}
                      <span className="text-muted-foreground text-xs font-normal lowercase">pending</span>
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${occupancyBgColor(hostel.occupancyRate)} transition-all duration-1000 ease-out`} 
                    style={{ width: `${hostel.occupancyRate}%` }} 
                  />
                </div>
              </div>

              <div className="bg-muted/30 px-6 py-3 border-t border-border/50 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">ID: {hostel.id.slice(0, 8)}</p>
                <div className="flex gap-2 items-center">
                  <AdminDashboardClient 
                    hostelId={hostel.id} 
                    hostelName={hostel.name} 
                    hasWarden={!!hostel.warden} 
                  />
                  <Link href={`/admin/hostels/${hostel.id}/occupancy`}>
                    <Button variant="ghost" size="sm" className="h-8 text-xs hover:bg-background/80">
                      Map
                    </Button>
                  </Link>
                  <Link href={`/admin/hostels/${hostel.id}`}>
                    <Button variant="secondary" size="sm" className="h-8 text-xs bg-background/50 hover:bg-background shadow-sm border border-border/50">
                      Manage
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
          {stats.hostels.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed p-12 text-center bg-muted/10">
              <Building className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No properties added yet.</p>
              <Link href="/admin/hostels/new" className="mt-4 inline-block">
                <Button variant="outline" size="sm">Add your first hostel</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
