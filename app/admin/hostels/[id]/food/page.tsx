import HostelFoodView from "@/components/hostel-management/HostelFoodView";

export default async function AdminHostelFoodPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <HostelFoodView hostelId={id} baseRoute={`/admin/hostels/${id}`} />;
}
