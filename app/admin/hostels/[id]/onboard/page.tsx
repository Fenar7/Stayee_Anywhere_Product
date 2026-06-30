import HostelOnboardView from "@/components/hostel-management/HostelOnboardView";
import { prisma } from "@/lib/db";

export default async function AdminHostelOnboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const hostel = await prisma.hostel.findUnique({
    where: { id },
    select: { name: true },
  });
  return <HostelOnboardView hostelId={id} hostelName={hostel?.name} baseRoute={`/admin/hostels/${id}`} />;
}
