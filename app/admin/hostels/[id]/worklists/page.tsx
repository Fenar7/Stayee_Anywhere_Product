import HostelWorklistsView from "@/components/hostel-management/HostelWorklistsView";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminHostelWorklistsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const hostel = await prisma.hostel.findUnique({
    where: { id },
    select: { name: true },
  });
  return <HostelWorklistsView hostelId={id} hostelName={hostel?.name} baseRoute={`/admin/hostels/${id}`} />;
}
