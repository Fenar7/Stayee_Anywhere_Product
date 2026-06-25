import HostelOccupancyView from "@/components/hostel-management/HostelOccupancyView";

export default async function AdminHostelOccupancyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <HostelOccupancyView hostelId={id} baseRoute={`/admin/hostels/${id}`} />;
}
