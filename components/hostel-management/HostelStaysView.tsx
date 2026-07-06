import { prisma } from "@/lib/db";
import { format, differenceInDays } from "date-fns";
import { Bed } from "lucide-react";
import ExtendStaySheet from "@/components/warden/ExtendStaySheet";
import EarlyExitSheet from "@/components/warden/EarlyExitSheet";
import NaturalCheckoutButton from "@/components/warden/NaturalCheckoutButton";
import StayDetailsTrigger from "@/components/warden/StayDetailsTrigger";
import { HostelWorkspaceLayout } from "./HostelWorkspaceLayout";

export default async function HostelStaysView({
  hostelId,
  baseRoute,
}: {
  hostelId: string | null;
  baseRoute: string;
}) {
  if (!hostelId) {
    return (
      <div className="space-y-4 p-8">
        <h1 className="text-3xl font-bold tracking-tight">Stays Management</h1>
        <p className="text-muted-foreground">No hostel assigned.</p>
      </div>
    );
  }

  const hostel = await prisma.hostel.findUnique({
    where: { id: hostelId },
    select: { name: true },
  });

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

  const Actions = (
    <>
      <button className="flex items-center justify-center gap-2 premium-button-outline whitespace-nowrap">
        Export Data
      </button>
      <button className="flex items-center justify-center gap-2 premium-button whitespace-nowrap">
        Add Stay <span className="text-[14px]">→</span>
      </button>
    </>
  );

  return (
    <HostelWorkspaceLayout
      hostelId={hostelId}
      hostelName={hostel?.name}
      title="Stays Management"
      subtitle="Manage active and extended stays"
      actions={Actions}
    >
      <div className="w-full overflow-x-auto bg-white dark:bg-[#0a0a0a] border border-[#dedede] dark:border-white/10 rounded-sm">
        <table className="premium-table">
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Room & Bed</th>
              <th>Duration</th>
              <th>Days Remaining</th>
              <th>Balance</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {stays.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center h-24 text-[#767676]">
                  No active stays found.
                </td>
              </tr>
            ) : (
              stays.map((stay) => {
                const daysRemaining = differenceInDays(new Date(stay.endDate), new Date());
                const isEndingSoon = daysRemaining < 7;
                const isEndingMedium = daysRemaining >= 7 && daysRemaining < 14;

                const daysColor = isEndingSoon
                  ? "text-red-500 font-bold"
                  : isEndingMedium
                  ? "text-[#e1a918] font-bold"
                  : "text-[#58ff48] font-bold";

                const totalPayments = stay.payments.reduce((acc, p) => {
                  if (p.paymentStatus === "PAID") return acc + p.amountPaidPaise;
                  return acc;
                }, 0);
                const balancePaise = stay.totalPayablePaise - totalPayments;
                const balanceLabel = balancePaise > 0 ? `₹${(balancePaise / 100).toFixed(2)}` : "Cleared";
                const balanceColor = balancePaise > 0 ? "text-[#e1a918] font-bold" : "text-[#767676] font-medium";

                const roomName = stay.bed?.room?.roomNumber || "N/A";
                const bedLabel = stay.bed?.label || "N/A";

                return (
                  <tr key={stay.id} className="transition-colors">
                    <td>
                      <p className="font-bold text-black dark:text-white tracking-tight">{stay.tenant?.fullName || "Unknown"}</p>
                      <p className="text-[12px] text-[#767676] font-medium uppercase tracking-wider mt-0.5">{stay.tenant?.user?.phone}</p>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Bed className="h-4 w-4 text-[#767676]" />
                        <span className="font-medium text-[#767676]">Room {roomName}, {bedLabel}</span>
                      </div>
                    </td>
                    <td>
                      <p className="text-[13px] font-medium text-black dark:text-white">{format(new Date(stay.joiningDate), "PP")}</p>
                      <p className="text-[11px] text-[#767676] uppercase tracking-wider font-bold mt-0.5">to {format(new Date(stay.endDate), "PP")}</p>
                    </td>
                    <td>
                      <span className={daysColor}>
                        {daysRemaining < 0 ? `Overdue by ${Math.abs(daysRemaining)} days` : `${daysRemaining} days`}
                      </span>
                    </td>
                    <td>
                      <span className={balanceColor}>{balanceLabel}</span>
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <StayDetailsTrigger stayId={stay.id} baseRoute={baseRoute} />
                        <ExtendStaySheet stayId={stay.id} currentEndDate={stay.endDate} balancePaise={balancePaise} />
                        <EarlyExitSheet stayId={stay.id} joiningDate={stay.joiningDate} endDate={stay.endDate} />
                        {daysRemaining <= 0 && <NaturalCheckoutButton stayId={stay.id} />}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </HostelWorkspaceLayout>
  );
}
