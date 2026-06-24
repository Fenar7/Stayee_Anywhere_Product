import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, UserPlus, Users, Shield, ShieldAlert, AlertCircle, TrendingUp, Building, Bed, Activity } from "lucide-react";
import { getAdminPortfolioStats } from "@/services/hostel/dashboard.service";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { AdminDashboardClient } from "./dashboard-client";
import { ActionAlertsClient } from "@/components/dashboard/ActionAlertsClient";

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
      
      <ActionAlertsClient role="MAIN_ADMIN" />

      {/* Portfolio Stats */}
      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-b-4 border-b-primary shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hostels</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHostels}</div>
            <p className="text-xs text-muted-foreground">Across all regions</p>
          </CardContent>
        </Card>
        
        <Card className="border-b-4 border-b-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Beds</CardTitle>
            <Bed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBeds}</div>
            <p className="text-xs text-muted-foreground">Total capacity</p>
          </CardContent>
        </Card>

        <Card className="border-b-4 border-b-emerald-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Occupancy</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className={`text-2xl font-bold ${occupancyColor(stats.portfolioOccupancyRate)}`}>
                {stats.portfolioOccupancyRate}%
              </div>
              <p className="text-xs text-muted-foreground">({stats.totalOccupiedBeds} occupied)</p>
            </div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div 
                className={`h-full rounded-full ${occupancyBgColor(stats.portfolioOccupancyRate)} transition-all duration-1000 ease-out`} 
                style={{ width: `${stats.portfolioOccupancyRate}%` }} 
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-b-4 border-b-rose-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.totalPendingPayments > 0 ? "text-rose-500" : ""}`}>
              {stats.totalPendingPayments}
            </div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Hostels List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Properties</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {stats.hostels.map((hostel) => (
            <Card key={hostel.id} className="flex flex-col hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      <Link href={`/admin/hostels/${hostel.id}`} className="hover:text-primary transition-colors">
                        {hostel.name}
                      </Link>
                    </CardTitle>
                    <CardDescription className="truncate max-w-[250px] mt-1">{hostel.address}</CardDescription>
                  </div>
                  <Badge variant="outline" className={accommodationTypeColors[hostel.accommodationType] || ""}>
                    {hostel.accommodationType}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 pb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Occupancy</p>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{hostel.occupiedBeds} / {hostel.totalBeds}</p>
                      <span className={`text-xs font-medium ${occupancyColor(hostel.occupancyRate)}`}>
                        ({hostel.occupancyRate}%)
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Payments</p>
                    <p className="font-semibold">
                      {hostel.pendingPayments} <span className="text-muted-foreground text-xs font-normal lowercase">pending</span>
                    </p>
                  </div>
                </div>
                <div className="mt-4 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${occupancyBgColor(hostel.occupancyRate)} transition-all duration-1000 ease-out`} 
                    style={{ width: `${hostel.occupancyRate}%` }} 
                  />
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 border-t px-6 py-3 flex justify-between items-center rounded-b-xl">
                <p className="text-xs text-muted-foreground">ID: {hostel.id.slice(0, 8)}</p>
                <div className="flex gap-2">
                  <AdminDashboardClient 
                    hostelId={hostel.id} 
                    hostelName={hostel.name} 
                    hasWarden={!!hostel.warden} 
                  />
                  <Link href={`/admin/hostels/${hostel.id}/occupancy`}>
                    <Button variant="ghost" size="sm">Map</Button>
                  </Link>
                  <Link href={`/admin/hostels/${hostel.id}`}>
                    <Button variant="secondary" size="sm">Manage</Button>
                  </Link>
                </div>
              </CardFooter>
            </Card>
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
