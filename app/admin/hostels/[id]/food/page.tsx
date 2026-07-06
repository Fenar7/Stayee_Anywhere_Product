import HostelFoodView from "@/components/hostel-management/HostelFoodView";
import { prisma } from "@/lib/db";

export default async function AdminHostelFoodPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const hostel = await prisma.hostel.findUnique({
    where: { id },
    select: { name: true },
  });
  return <HostelFoodView hostelId={id} hostelName={hostel?.name} baseRoute={`/admin/hostels/${id}`} />;
}
