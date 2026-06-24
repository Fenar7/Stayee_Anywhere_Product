import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { format, differenceInDays } from "date-fns";
import { Bed } from "lucide-react";
import ExtendStaySheet from "@/components/warden/ExtendStaySheet";
import EarlyExitSheet from "@/components/warden/EarlyExitSheet";
import NaturalCheckoutButton from "@/components/warden/NaturalCheckoutButton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function StaysPage({
  searchParams,
}: {
  searchParams: Promise<{ hostelId?: string }>;
}) {
  const { hostelId: queryHostelId } = await searchParams;
  const { user } = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);

  let hostelId: string | null = null;
  if (user.role === UserRole.MAIN_ADMIN) {
    if (queryHostelId) {
      hostelId = queryHostelId;
    } else {
      const firstHostel = await prisma.hostel.findFirst({ select: { id: true } });
      hostelId = firstHostel?.id ?? null;
    }
  } else {
    hostelId = user.warden?.hostelId ?? null;
  }

  if (!hostelId) {
    return (
      <div className="space-y-4 p-8">
        <h1 className="text-3xl font-bold tracking-tight">Stays Management</h1>
        <p className="text-muted-foreground">No hostel assigned.</p>
      </div>
    );
  }

  const stays = await prisma.stay.findMany({
    where: {
      status: { in: ["ACTIVE", "EXTENDED"] },
      hostelId,
    },
    include: {
      tenant: { include: { user: true } },
      bed: {
        include: {
          room: true,
        },
      },
      payments: true,
    },
    orderBy: { endDate: "asc" },
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between pb-6 border-b border-border/40">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Stays Management
          </h1>
          <p className="text-muted-foreground mt-1">Manage active and extended stays</p>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Room & Bed</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Days Remaining</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stays.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  No active stays found.
                </TableCell>
              </TableRow>
            ) : (
              stays.map((stay) => {
                const daysRemaining = differenceInDays(new Date(stay.endDate), new Date());
                const isEndingSoon = daysRemaining < 7;
                const isEndingMedium = daysRemaining >= 7 && daysRemaining < 14;

                const daysColor = isEndingSoon
                  ? "text-red-600 font-semibold"
                  : isEndingMedium
                  ? "text-amber-600 font-medium"
                  : "text-emerald-600";

                const totalPayments = stay.payments.reduce((acc, p) => {
                  if (p.paymentStatus === "PAID") return acc + p.amountPaidPaise;
                  return acc;
                }, 0);
                const balancePaise = stay.totalPayablePaise - totalPayments;
                const balanceLabel = balancePaise > 0 ? `₹${(balancePaise / 100).toFixed(2)}` : "Cleared";
                const balanceColor = balancePaise > 0 ? "text-amber-600 font-medium" : "text-emerald-600";

                const roomName = stay.bed?.room?.roomNumber || "N/A";
                const bedLabel = stay.bed?.label || "N/A";

                return (
                  <TableRow key={stay.id}>
                    <TableCell>
                      <p className="font-medium">{stay.tenant?.fullName || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{stay.tenant?.user?.phone}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Bed className="h-4 w-4 text-muted-foreground" />
                        <span>Room {roomName}, {bedLabel}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{format(new Date(stay.joiningDate), "PP")}</p>
                      <p className="text-xs text-muted-foreground">to {format(new Date(stay.endDate), "PP")}</p>
                    </TableCell>
                    <TableCell>
                      <span className={daysColor}>
                        {daysRemaining < 0 ? `Overdue by ${Math.abs(daysRemaining)} days` : `${daysRemaining} days`}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={balanceColor}>{balanceLabel}</span>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <div className="flex justify-end gap-2">
                        <ExtendStaySheet stayId={stay.id} currentEndDate={stay.endDate} balancePaise={balancePaise} />
                        <EarlyExitSheet stayId={stay.id} joiningDate={stay.joiningDate} endDate={stay.endDate} />
                        {daysRemaining <= 0 && <NaturalCheckoutButton stayId={stay.id} />}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
