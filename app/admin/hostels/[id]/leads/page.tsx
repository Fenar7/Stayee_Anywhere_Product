import HostelLeadsView from "@/components/hostel-management/HostelLeadsView";
import { prisma } from "@/lib/db";

export default async function AdminHostelLeadsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const hostel = await prisma.hostel.findUnique({
    where: { id },
    select: { name: true },
  });
  return <HostelLeadsView hostelId={id} hostelName={hostel?.name} baseRoute={`/admin/hostels/${id}`} />;
}
