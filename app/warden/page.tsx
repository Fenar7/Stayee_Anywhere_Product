import HostelDashboardView from "@/components/hostel-management/HostelDashboardView";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function WardenPage({
  searchParams,
}: {
  searchParams: Promise<{ hostelId?: string }>;
}) {
  const { hostelId: queryHostelId } = await searchParams;
  const { user } = await requireRole([UserRole.WARDEN]);

  // Use the query parameter hostelId first, then the Warden's assigned hostelId
  let hostelId = queryHostelId || user.warden?.hostelId || null;

  // If the user is MAIN_ADMIN and no hostelId is specified, default to the first hostel in their organization
  if (!hostelId && user.role === UserRole.MAIN_ADMIN) {
    const firstHostel = await prisma.hostel.findFirst({
      where: { organizationId: user.organizationId },
      select: { id: true },
    });
    hostelId = firstHostel?.id ?? null;
  }

  return (
    <HostelDashboardView 
      hostelId={hostelId} 
      baseRoute="/warden" 
      userRole={user.role as "MAIN_ADMIN" | "WARDEN"} 
    />
  );
}