import { Building2, BedSingle, UtensilsCrossed, CalendarDays } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function StayCard({
  stay,
  hostel,
  bed,
  formatDate
}: {
  stay: any;
  hostel: any;
  bed: any;
  formatDate: (dateStr: string) => string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <Building2 className="h-5 w-5 text-primary" /> Current Stay Details
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 text-sm">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground block">Hostel</span>
          <span className="font-semibold">{hostel?.name || "—"}</span>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground block">Room</span>
          <span className="font-semibold flex items-center gap-1">
            <BedSingle className="h-3.5 w-3.5 text-muted-foreground" />
            {bed?.roomNumber} – {bed?.label} ({bed?.sharingType})
          </span>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground block">Duration Type</span>
          <span className="font-semibold">{stay.durationType}</span>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground block">Monthly Rent</span>
          <span className="font-semibold">₹ {stay.monthlyRent.toLocaleString("en-IN")}</span>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground block">Security Deposit</span>
          <span className="font-semibold">₹ {stay.securityDeposit.toLocaleString("en-IN")}</span>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground block">Food Plan</span>
          <span className="font-semibold flex items-center gap-1">
            <UtensilsCrossed className="h-3.5 w-3.5 text-muted-foreground" />
            {stay.foodPlan?.replace(/_/g, " ") || "Not Included"}
          </span>
          {stay.foodPlan !== "NOT_INCLUDED" && (
            <Link href="/tenant/food" className="block mt-1">
              <Button size="sm" variant="outline" className="h-7 text-xs px-2">
                Manage Meals
              </Button>
            </Link>
          )}
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground block">Joining Date</span>
          <span className="font-semibold flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            {formatDate(stay.joiningDate)}
          </span>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground block">Check-out Date</span>
          <span className="font-semibold flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            {formatDate(stay.endDate)}
          </span>
        </div>
      </div>
    </div>
  );
}
