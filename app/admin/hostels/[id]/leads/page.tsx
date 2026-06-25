import HostelLeadsView from "@/components/hostel-management/HostelLeadsView";

export default async function AdminHostelLeadsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <HostelLeadsView hostelId={id} baseRoute={`/admin/hostels/${id}`} />;
}
