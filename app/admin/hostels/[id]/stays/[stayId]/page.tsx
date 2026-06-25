import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { notFound } from "next/navigation";
import StayDetailsPageView from "@/components/hostel-management/StayDetailsPageView";

export default async function AdminStayDetailsPage({
  params,
}: {
  params: Promise<{ id: string; stayId: string }>;
}) {
  await requireRole([UserRole.MAIN_ADMIN]);
  const { id: hostelId, stayId } = await params;

  const stay = await prisma.stay.findUnique({
    where: { id: stayId, hostelId },
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

  return <StayDetailsPageView stay={stay} baseRoute={`/admin/hostels/${hostelId}`} />;
}
