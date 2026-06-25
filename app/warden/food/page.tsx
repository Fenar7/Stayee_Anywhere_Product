import HostelFoodView from "@/components/hostel-management/HostelFoodView";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function WardenFoodPage({
  searchParams,
}: {
  searchParams: Promise<{ hostelId?: string }>;
}) {
  const { hostelId: queryHostelId } = await searchParams;
  const { user } = await requireRole([UserRole.WARDEN]);

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

  return <HostelFoodView hostelId={hostelId} baseRoute="/warden" />;
}
