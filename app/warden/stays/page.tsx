import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";
import HostelStaysView from "@/components/hostel-management/HostelStaysView";

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

  return <HostelStaysView hostelId={hostelId} baseRoute="/warden" />;
}
