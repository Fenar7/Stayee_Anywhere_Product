import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { PricingService } from "@/services/food/pricing.service";
import FoodPricingClient from "@/components/hostel-management/food-pricing/FoodPricingClient";
import { prisma } from "@/lib/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = "force-dynamic";

export default async function FoodPricingPage() {
  const session = await requireRole([UserRole.MAIN_ADMIN]);

  const [history, hostels] = await Promise.all([
    PricingService.getPricingHistory(session.user.organizationId),
    prisma.hostel.findMany({
      where: { organizationId: session.user.organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      </div>
      <Tabs defaultValue="food-pricing" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general" disabled>General</TabsTrigger>
          <TabsTrigger value="food-pricing">Food Pricing</TabsTrigger>
        </TabsList>
        <TabsContent value="food-pricing" className="space-y-4">
          <FoodPricingClient history={history} hostels={hostels} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
