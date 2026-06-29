import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, MapPin, Users, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminHostelsPage() {
  const hostels = await prisma.hostel.findMany({
    include: { warden: true,
      _count: {
        select: {
          
          floors: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hostels</h1>
          <p className="text-muted-foreground mt-2">Manage all hostel properties and branches.</p>
        </div>
        <Link href="/admin/hostels/new">
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" /> Add Hostel
          </Button>
        </Link>
      </div>

      {hostels.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <Building2 className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold">No Hostels Found</h3>
            <p className="text-muted-foreground mt-2 mb-6">Get started by creating your first hostel branch.</p>
            <Link href="/admin/hostels/new">
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" /> Create Hostel
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hostels.map((hostel) => (
            <Link key={hostel.id} href={`/admin/hostels/${hostel.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full group">
                <CardHeader className="pb-4 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl group-hover:text-emerald-600 transition-colors">
                      {hostel.name}
                    </CardTitle>
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <CardDescription className="flex items-center gap-1 mt-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="truncate">{hostel.address}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      <span>{hostel.warden ? 1 : 0} Wardens</span>
                    </div>
                    <div>
                      <span>{hostel._count.floors} Floors</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      {hostel.accommodationType}
                    </span>
                    <span className="text-xs text-muted-foreground group-hover:text-emerald-600 transition-colors font-medium">
                      Manage →
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
