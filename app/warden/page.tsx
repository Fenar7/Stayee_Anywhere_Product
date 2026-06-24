import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Plus, ClipboardList, Users, AlertCircle, TrendingUp, Bed, Activity, UserCheck, Utensils } from "lucide-react";
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
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Warden Dashboard
        </h1>
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 shadow-sm">
          <p className="text-red-800 dark:text-red-400 font-medium">
            {user.role === UserRole.MAIN_ADMIN
              ? "No hostels found in the system."
              : "Warden account is not provisioned properly. Please contact your administrator."}
          </p>
        </div>
      </div>
    );
  }
  const stats = await getWardenHostelStats(hostelId);

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
            Warden Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Manage your assigned hostel</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/warden/onboard${hostelId ? `?hostelId=${hostelId}` : ""}`}>
            <Button variant="outline" className="backdrop-blur-sm bg-background/50 border-border/50 shadow-sm hover:bg-accent transition-all">
              <UserCheck className="mr-2 h-4 w-4" />
              Onboard Tenant
            </Button>
          </Link>
          <Link href="/warden/occupancy">
            <Button className="shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-95">
              <Bed className="mr-2 h-4 w-4" />
              Occupancy Map
            </Button>
          </Link>
        </div>
      </div>

      {/* Alert Banner */}
      {stats.pendingPayments > 0 && (
        <div className="group relative overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-sm transition-all hover:bg-amber-500/10">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-300">Payment Verification Required</h3>
                <p className="text-sm text-amber-700/80 dark:text-amber-400/80">
                  {stats.pendingPayments} onboarding payment(s) are pending verification for your hostel.
                </p>
              </div>
            </div>
            <Link href="/warden/onboards" className="shrink-0 w-full sm:w-auto">
              <Button className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white border-none shadow-sm shadow-amber-600/20 transition-all active:scale-95">
                Review Payments
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="lg:col-span-2 border-b-4 border-b-primary shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Occupancy</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              <div className={`text-4xl font-bold tracking-tight ${occupancyColor(stats.occupancyRate)}`}>
                {stats.occupancyRate}%
              </div>
              <p className="text-sm text-muted-foreground mb-1">
                {stats.occupiedBeds} occupied / {stats.totalBeds} total beds
              </p>
            </div>
            <div className="mt-4 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div 
                className={`h-full rounded-full ${occupancyBgColor(stats.occupancyRate)} transition-all duration-1000 ease-out`} 
                style={{ width: `${stats.occupancyRate}%` }} 
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-b-4 border-b-emerald-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Beds</CardTitle>
            <Bed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{stats.availableBeds}</div>
          </CardContent>
        </Card>

        <Card className="border-b-4 border-b-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{stats.activeTenants}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/warden/food" className="group">
              <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-border/50 bg-background/50 shadow-sm backdrop-blur-xl transition-all hover:shadow-md hover:border-primary/50 hover:bg-primary/5 h-full">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Utensils className="h-6 w-6" />
                </div>
                <h3 className="font-medium text-foreground text-center">Kitchen Dashboard</h3>
                <p className="text-xs text-muted-foreground text-center mt-1">Manage daily meals & feedback</p>
              </div>
            </Link>
            
            <Link href={`/warden/worklists${queryHostelId ? `?hostelId=${queryHostelId}` : ""}`} className="group">
              <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-border/50 bg-background/50 shadow-sm backdrop-blur-xl transition-all hover:shadow-md hover:border-primary/50 hover:bg-primary/5 h-full">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <h3 className="font-medium text-foreground text-center">Worklists</h3>
                <p className="text-xs text-muted-foreground text-center mt-1">Task management & routines</p>
              </div>
            </Link>

            <Link href="/warden/leads" className="group">
              <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-border/50 bg-background/50 shadow-sm backdrop-blur-xl transition-all hover:shadow-md hover:border-primary/50 hover:bg-primary/5 h-full">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="font-medium text-foreground text-center">Manage Leads</h3>
                <p className="text-xs text-muted-foreground text-center mt-1">Process new inquiries</p>
              </div>
            </Link>

            <Link href="/warden/occupancy" className="group">
              <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-border/50 bg-background/50 shadow-sm backdrop-blur-xl transition-all hover:shadow-md hover:border-primary/50 hover:bg-primary/5 h-full">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Bed className="h-6 w-6" />
                </div>
                <h3 className="font-medium text-foreground text-center">Occupancy</h3>
                <p className="text-xs text-muted-foreground text-center mt-1">Visual map & bed status</p>
              </div>
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Today's Tasks</h2>
          <div className="flex flex-col gap-4">
            <Card className="hover:border-primary/50 transition-colors">
              <Link href="/warden/onboards" className="group block">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Applications to Review</CardTitle>
                    <UserCheck className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <div className="text-3xl font-bold tracking-tight group-hover:text-primary transition-colors">
                      {stats.pendingOnboarding}
                    </div>
                    <span className="text-sm text-muted-foreground font-medium group-hover:text-primary/70 transition-colors">
                      &rarr; Review
                    </span>
                  </div>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:border-rose-500/50 transition-colors">
              <Link href="/warden/onboards" className="group block">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Payments to Verify</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground group-hover:text-rose-500 transition-colors" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <div className={`text-3xl font-bold tracking-tight transition-colors ${stats.pendingPayments > 0 ? "text-rose-500 group-hover:text-rose-600" : "group-hover:text-primary"}`}>
                      {stats.pendingPayments}
                    </div>
                    <span className={`text-sm font-medium transition-colors ${stats.pendingPayments > 0 ? "text-rose-500/70 group-hover:text-rose-600" : "text-muted-foreground group-hover:text-primary/70"}`}>
                      &rarr; Verify
                    </span>
                  </div>
                </CardContent>
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}