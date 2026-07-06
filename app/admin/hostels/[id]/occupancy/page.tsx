import HostelOccupancyView from "@/components/hostel-management/HostelOccupancyView";
import { prisma } from "@/lib/db";

export default async function AdminHostelOccupancyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const hostel = await prisma.hostel.findUnique({
    where: { id },
    select: { name: true },
  });
  return <HostelOccupancyView hostelId={id} hostelName={hostel?.name} baseRoute={`/admin/hostels/${id}`} />;
}
