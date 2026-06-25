import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { notFound } from "next/navigation";
import StayDetailsPageView from "@/components/hostel-management/StayDetailsPageView";

export default async function WardenStayDetailsPage({
  params,
}: {
  params: Promise<{ stayId: string }>;
}) {
  const { user } = await requireRole([UserRole.WARDEN]);
  const { stayId } = await params;

  if (!user.warden) {
    notFound();
  }

  const stay = await prisma.stay.findUnique({
    where: { id: stayId, hostelId: user.warden.hostelId },
    include: {
      hostel: true,
      tenant: {
        include: {
          user: true,
          documents: true,
        },
      },
      bed: {
        include: {
          room: true,
        },
      },
      payments: true,
      foodOrders: {
        orderBy: { forDate: "desc" },
      },
    },
  });

  if (!stay) {
    notFound();
  }

  return <StayDetailsPageView stay={stay} baseRoute="/warden" />;
}
